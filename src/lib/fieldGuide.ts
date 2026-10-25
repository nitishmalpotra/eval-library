import libraryStatsJson from "../../data/library-stats.json";
import { getAllEvals } from "./evals";

const libraryStats = libraryStatsJson;

export function getLibraryGeneratedAt() {
  return libraryStats.generated_at;
}

export function formatGeneratedAt(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function getHeroStats() {
  const patterns = getAllEvals();
  const publications = publicationNames();
  const operators = new Set(patterns.map((pattern) => pattern.source_operator).filter(Boolean));

  return [
    { label: "Patterns", value: patterns.length },
    { label: "Publications", value: publications.length },
    { label: "Operators", value: operators.size },
    { label: "Files scanned", value: libraryStats.files_scanned },
  ];
}

export function getSourcesLine() {
  const ordered = pairSameStemPublications(publicationNames());
  if (ordered.length === 0) return "";
  return `From ${ordered.join(", ")}, and more`;
}

export function getLibraryFacts() {
  const patterns = getAllEvals();
  const operators = new Set(patterns.map((pattern) => pattern.source_operator).filter(Boolean));
  const counts: Record<string, number> = libraryStats.files_by_publication;

  return {
    patternCount: patterns.length,
    operatorCount: operators.size,
    filesScanned: libraryStats.files_scanned,
    filesSelected: libraryStats.files_selected,
    publications: getPublicationStrip().map((name) => ({
      name,
      files: counts[name] ?? 0,
    })),
  };
}

const podcastSuffix = " Podcast";
const newsletterSuffix = " Newsletter";

function pairSameStemPublications(names: string[]) {
  const used = new Set<string>();
  const paired: string[] = [];

  for (const name of names) {
    if (!name.endsWith(podcastSuffix)) continue;
    const stem = name.slice(0, -podcastSuffix.length);
    const newsletter = `${stem}${newsletterSuffix}`;
    if (!names.includes(newsletter)) continue;
    paired.push(`${stem} Podcast & Newsletter`);
    used.add(name);
    used.add(newsletter);
  }

  const rest = names.filter((name) => !used.has(name)).sort((left, right) => left.localeCompare(right));
  return [...paired, ...rest];
}

export function getPublicationStrip() {
  const counts: Record<string, number> = libraryStats.files_by_publication;
  const names = publicationNames();

  return names.sort((left, right) => (counts[right] ?? 0) - (counts[left] ?? 0) || left.localeCompare(right));
}

function publicationNames() {
  const names = new Set(Object.keys(libraryStats.files_by_publication));

  for (const pattern of getAllEvals()) {
    if (pattern.source_publication) names.add(pattern.source_publication);
    for (const source of pattern.sources ?? []) {
      if (source.publication) names.add(source.publication);
    }
  }

  return [...names];
}
