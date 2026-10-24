import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

export type CorpusKind = "podcast" | "newsletter" | "talk" | "video";

export type CorpusDoc = {
  file: string;
  publication: string;
  kind: CorpusKind;
  title: string;
  operator: string;
  date: string;
  url?: string;
  body: string;
  hash: string;
};

export type LoadedDoc = CorpusDoc & {
  hasFrontmatter: boolean;
  indexed: boolean;
  urls: string[];
};

export type IndexEntry = {
  title: string;
  filename: string;
  date?: string;
  guest?: string;
  post_url?: string;
  url?: string;
  youtube_url?: string;
};

export type Duplicate = {
  dropped: string;
  kept: string;
  reason: string;
};

type CorpusIndex = {
  podcasts?: IndexEntry[];
  newsletters?: IndexEntry[];
};

const SOURCES: Record<string, { publication: string; kind: CorpusKind }> = {
  lenny: { publication: "Lenny's Newsletter & Podcast", kind: "newsletter" },
  "lenny-transcripts": { publication: "Lenny's Podcast", kind: "podcast" },
  aakash: { publication: "Aakash Gupta", kind: "podcast" },
  "ai-engineer": { publication: "AI Engineer", kind: "talk" },
};

let lastDuplicates: Duplicate[] = [];

export function lastCorpusDuplicates(): Duplicate[] {
  return lastDuplicates;
}

export function publicationFor(
  folderName: string,
  kind: CorpusKind,
  relative: string,
  fallback: string,
): string {
  if (
    folderName === "lenny-transcripts" ||
    (folderName === "lenny" && (kind === "podcast" || relative.startsWith("podcasts/")))
  ) {
    return "Lenny's Podcast";
  }

  if (folderName === "lenny" && (kind === "newsletter" || relative.startsWith("newsletters/"))) {
    return "Lenny's Newsletter";
  }

  return fallback;
}

export function resolveIndexFilename(filename: string): string {
  const [first, ...rest] = filename.split("/");
  return [first.replace(/^\d+-/, ""), ...rest].join("/");
}

export function operatorFromTitle(title: string): string {
  const parts = title.split("|");

  if (parts.length < 2) {
    return "";
  }

  return (parts[parts.length - 1] ?? "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function documentFromRaw(options: {
  raw: string;
  file: string;
  publication: string;
  kind: CorpusKind;
  indexed?: boolean;
  indexEntry?: IndexEntry;
}): LoadedDoc {
  const parsed = matter(options.raw);
  const data = parsed.data as Record<string, unknown>;
  const hasFrontmatter = Object.keys(data).length > 0;
  const content = parsed.content.replace(/^\uFEFF/, "");
  const urls = collectUrls(data, content, options.indexEntry);
  const indexed = options.indexed ?? Boolean(options.indexEntry);
  let title = "";
  let body = "";
  let operator = "";
  let date = "";

  if (options.indexEntry) {
    title = options.indexEntry.title;
    date = options.indexEntry.date ?? "";
    operator =
      options.kind === "newsletter"
        ? asString(data.author) || "Lenny Rachitsky"
        : (options.indexEntry.guest ?? "");
    body = content.trim();
  } else if (isHeaderDoc(content, data)) {
    const header = parseHeader(content);
    title = header.title;
    body = header.body;
    date = isoDate(data.date);
    operator =
      asString(data.guest) ||
      asString(data.author) ||
      operatorFromTitle(title) ||
      (options.kind === "newsletter" ? "Lenny Rachitsky" : "");
  } else {
    title = asString(data.title) ?? "";
    body = content.trim();
    date = isoDate(data.date);
    operator =
      asString(data.guest) ||
      asString(data.author) ||
      operatorFromTitle(title) ||
      (options.kind === "newsletter" ? "Lenny Rachitsky" : "");
  }

  const url = preferredUrl(data, options.indexEntry, urls);

  return {
    file: options.file,
    publication: options.publication,
    kind: options.kind,
    title,
    operator,
    date,
    ...(url ? { url } : {}),
    body,
    hash: createHash("sha256").update(options.raw).digest("hex"),
    hasFrontmatter,
    indexed,
    urls,
  };
}

export function dedupeDocs(docs: LoadedDoc[]): { docs: LoadedDoc[]; duplicates: Duplicate[] } {
  const parent = docs.map((_, index) => index);
  const reasons = new Map<number, Set<string>>();

  const find = (index: number): number => {
    if (parent[index] !== index) {
      parent[index] = find(parent[index]);
    }

    return parent[index];
  };

  const union = (left: number, right: number, reason: string): void => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    const merged = new Set<string>([...(reasons.get(leftRoot) ?? []), reason]);

    if (leftRoot !== rightRoot) {
      for (const item of reasons.get(rightRoot) ?? []) {
        merged.add(item);
      }

      parent[rightRoot] = leftRoot;
      reasons.delete(rightRoot);
    }

    reasons.set(leftRoot, merged);
  };

  const byUrl = new Map<string, number>();
  const byTitle = new Map<string, number>();

  docs.forEach((doc, index) => {
    for (const url of doc.urls) {
      const key = normalizeUrl(url);

      if (!key) {
        continue;
      }

      const previous = byUrl.get(key);

      if (previous === undefined) {
        byUrl.set(key, index);
      } else {
        union(previous, index, "url");
      }
    }

    const title = normalizeText(doc.title.split("|")[0] ?? "");
    const operator = normalizeText(doc.operator);

    if (!title || !operator) {
      return;
    }

    const key = `${title}\n${operator}`;
    const previous = byTitle.get(key);

    if (previous === undefined) {
      byTitle.set(key, index);
    } else {
      union(previous, index, "title+operator");
    }
  });

  const groups = new Map<number, number[]>();

  docs.forEach((_, index) => {
    const root = find(index);
    const group = groups.get(root) ?? [];
    group.push(index);
    groups.set(root, group);
  });

  const kept: LoadedDoc[] = [];
  const duplicates: Duplicate[] = [];

  for (const [root, indexes] of groups) {
    const winner = indexes.reduce((best, index) =>
      preferDoc(docs[index], index, docs[best], best) ? index : best,
    );
    const reason = [...(reasons.get(root) ?? [])].sort().join("+");

    kept.push(docs[winner]);

    for (const index of indexes) {
      if (index === winner) {
        continue;
      }

      duplicates.push({
        dropped: docs[index].file,
        kept: docs[winner].file,
        reason: reason || "duplicate",
      });
    }
  }

  kept.sort((left, right) => left.file.localeCompare(right.file));
  duplicates.sort((left, right) => left.dropped.localeCompare(right.dropped));

  return { docs: kept, duplicates };
}

export async function loadCorpus(
  rootInput?: string,
  options?: { quiet?: boolean },
): Promise<CorpusDoc[]> {
  const root = path.resolve(rootInput ?? process.env.CORPUS_DIR ?? "./corpus");

  try {
    const info = await stat(root);

    if (!info.isDirectory()) {
      throw new Error(`${root} is not a directory.`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.endsWith("is not a directory.")) {
      throw error;
    }

    throw new Error(`Corpus directory not found: ${root}`);
  }

  const loaded: LoadedDoc[] = [];
  const folders = (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();

  for (const folderName of folders) {
    const source = SOURCES[folderName];

    if (!source) {
      console.warn(
        `Unknown corpus folder "${folderName}"; using it as publication "${folderName}" with kind video.`,
      );
    }

    const publication = source?.publication ?? folderName;
    const fallbackKind = source?.kind ?? "video";
    const folder = path.join(root, folderName);
    const covered = new Set<string>();
    const indexPath = path.join(folder, "index.json");

    if (await exists(indexPath)) {
      const index = JSON.parse(await readFile(indexPath, "utf8")) as CorpusIndex;
      const buckets: Array<[IndexEntry[] | undefined, CorpusKind]> = [
        [index.podcasts, "podcast"],
        [index.newsletters, "newsletter"],
      ];

      for (const [entries, bucketKind] of buckets) {
        for (const entry of entries ?? []) {
          const relative = resolveIndexFilename(entry.filename);
          const absolute = path.join(folder, relative);

          if (!(await exists(absolute))) {
            throw new Error(
              `Index entry does not resolve to a file: ${entry.filename} -> ${path.join(folderName, relative)}`,
            );
          }

          const raw = await readFile(absolute, "utf8");
          const kind = kindFor(folderName, bucketKind, relative);
          loaded.push(
            documentFromRaw({
              raw,
              file: `${folderName}/${relative}`,
              publication: publicationFor(folderName, kind, relative, publication),
              kind,
              indexed: true,
              indexEntry: entry,
            }),
          );
          covered.add(relative);
        }
      }
    }

    for (const absolute of await walkMarkdown(folder)) {
      const relative = path.relative(folder, absolute).split(path.sep).join("/");

      if (covered.has(relative)) {
        continue;
      }

      const raw = await readFile(absolute, "utf8");
      const kind = kindFor(folderName, fallbackKind, relative);
      loaded.push(
        documentFromRaw({
          raw,
          file: `${folderName}/${relative}`,
          publication: publicationFor(folderName, kind, relative, publication),
          kind,
        }),
      );
    }
  }

  const { docs, duplicates } = dedupeDocs(loaded);
  lastDuplicates = duplicates;

  if (!options?.quiet) {
    for (const duplicate of duplicates) {
      console.log(
        `duplicate: dropped ${duplicate.dropped}; kept ${duplicate.kept} (${duplicate.reason})`,
      );
    }

    console.log(`Corpus: ${docs.length} files, ${duplicates.length} duplicates dropped.`);
  }

  return docs.map(toCorpusDoc);
}

function toCorpusDoc(doc: LoadedDoc): CorpusDoc {
  return {
    file: doc.file,
    publication: doc.publication,
    kind: doc.kind,
    title: doc.title,
    operator: doc.operator,
    date: doc.date,
    ...(doc.url ? { url: doc.url } : {}),
    body: doc.body,
    hash: doc.hash,
  };
}

function kindFor(folderName: string, fallback: CorpusKind, relative: string): CorpusKind {
  if (folderName === "lenny" && relative.startsWith("podcasts/")) {
    return "podcast";
  }

  if (folderName === "lenny" && relative.startsWith("newsletters/")) {
    return "newsletter";
  }

  return fallback;
}

function isHeaderDoc(content: string, data: Record<string, unknown>): boolean {
  if (asString(data.title)) {
    return false;
  }

  const firstLine = content.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";
  return firstLine.startsWith("# ");
}

function parseHeader(content: string): { title: string; body: string } {
  const bodyLines: string[] = [];
  let title = "";
  let skippedTitle = false;

  for (const line of content.split(/\r?\n/)) {
    if (!skippedTitle && line.startsWith("# ")) {
      title = line.slice(2).trim();
      skippedTitle = true;
      continue;
    }

    if (/^\*\*Source:\*\*\s+\S+/.test(line) || /^##\s+Transcript\s*$/i.test(line)) {
      continue;
    }

    bodyLines.push(line);
  }

  return { title, body: bodyLines.join("\n").trim() };
}

function collectUrls(
  data: Record<string, unknown>,
  content: string,
  entry: IndexEntry | undefined,
): string[] {
  const urls: string[] = [];
  const push = (value: unknown) => {
    const url = asString(value);

    if (url && !urls.includes(url)) {
      urls.push(url);
    }
  };

  push(data.url);
  push(data.post_url);
  push(data.youtube_url);
  push(entry?.url);
  push(entry?.post_url);
  push(entry?.youtube_url);

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\*\*Source:\*\*\s+(\S+)/);
    push(match?.[1]);
  }

  return urls;
}

function preferredUrl(
  data: Record<string, unknown>,
  entry: IndexEntry | undefined,
  urls: string[],
): string | undefined {
  return (
    asString(data.url) ??
    asString(data.post_url) ??
    asString(data.youtube_url) ??
    asString(entry?.url) ??
    asString(entry?.post_url) ??
    asString(entry?.youtube_url) ??
    urls[0]
  );
}

function preferDoc(
  doc: LoadedDoc,
  index: number,
  current: LoadedDoc,
  currentIndex: number,
): boolean {
  const score = (item: LoadedDoc) => (item.indexed ? 2 : 0) + (item.hasFrontmatter ? 1 : 0);
  const diff = score(doc) - score(current);

  if (diff !== 0) {
    return diff > 0;
  }

  return index < currentIndex;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    url.hostname = url.hostname.replace(/^www\./, "").toLowerCase();
    url.hash = "";

    if (url.hostname === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];

      if (id) {
        return `https://youtube.com/watch?v=${id}`;
      }
    }

    if (url.hostname === "youtube.com" || url.hostname.endsWith(".youtube.com")) {
      const id = url.searchParams.get("v");

      if (id) {
        return `https://youtube.com/watch?v=${id}`;
      }
    }

    url.hostname = url.hostname.replace(/^www\./, "");
    const serialized = url.toString().replace(/\/$/, "");
    return serialized.toLowerCase();
  } catch {
    return value.trim().toLowerCase().replace(/\/$/, "");
  }
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isoDate(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return "";
}

async function exists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

async function walkMarkdown(directory: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const full = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walkMarkdown(full)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(full);
    }
  }

  return files;
}
