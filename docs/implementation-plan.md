# Implementation Plan: OpenRouter, Multi-Source Corpus, Production RAG, Redesign, Docs

**Written:** 2026-10-23 · **For:** an AI implementer (Codex / Claude Code / Cursor) · **Owner:** Nitish Malpotra

Read this whole file before starting. It records decisions the owner has **already made**, so don't reopen them. Where this plan says "verify", check the live docs or code before acting. **Per `AGENTS.md`, this Next.js version may differ from your training data, so read the relevant guide in `node_modules/next/dist/docs/` before writing any Next.js code.** The installed version is Next 15.5.18 and that docs folder doesn't exist in it. Use https://nextjs.org/docs (v15) instead, and don't assume Next 16 APIs.

---

## 0. Decisions already made (from the owner Q&A)

| Topic | Decision |
|---|---|
| LLM + embeddings provider | **OpenRouter for everything.** Remove the DeepSeek API and the direct OpenAI API. |
| Rebuild mode | **Full rebuild from scratch** over the entire corpus (old Lenny archive plus all new files). Quality matters more than preserving the current 43 patterns. |
| File selection | **LLM triage over every file**, then a stronger model extracts from the files that qualify. The regex eval-signal gate is retired. |
| Pipeline budget | **≤ $30–35 USD per full rebuild.** Enforce it in code (see §3.1). |
| Corpus location | **In-repo `corpus/`, gitignored.** Never commit corpus content. |
| Positioning | **Multi-source library.** Drop "Lenny's operators" as the identity. Show the publication on every card, and make publication a filter. |
| Low-confidence /find results | **Show them as "weak matches"**, visibly muted and labeled. Gibberish, off-topic, and injection input is still rejected outright. |
| Abuse protection | **Simple in-memory per-IP limiter, 10 queries/day.** Tell users up front ("10 searches a day") and, when the limit is reached, point them to the full library. |
| Search quality | **Add a labeled search eval set.** The AI drafts it, **the owner reviews it**, and thresholds are tuned against it. |
| Design reference | **Borrow openrouter.ai's *feel* but use our own palette.** Personality: **"lab notebook / field guide."** **CSS-only motion** (no new animation dependency). The scope is **the entire site**: Home, Library and detail, Find, Learn, About, OG image. |
| Historical docs | **Move them to `docs/archive/`** with a "superseded" banner. Keep README and the spec current. |
| Provider restrictions | None. Choose on quality and price. |
| Delivery | **One PR per workstream**, in the order in §2. |

---

## 1. What the repo is today (ground truth, verified 2026-10-23)

### 1.1 Product
A Next.js 15 (App Router) + React 19 + Tailwind v4 site, deployed on Vercel at `eval-library.vercel.app`. It serves **43 AI eval patterns** from `data/evals.json`, all extracted from Lenny Rachitsky's newsletter and podcast archive. Pages: `/` (home), `/browse` (filters), `/eval/[id]` (detail, statically generated), `/find` (semantic search), `/learn` (5-step tutorial), `/about`. The only API route is `POST /api/find`.

### 1.2 Data pipeline (`scripts/`, run with `tsx`)
| Script | What it does | Coupling to change |
|---|---|---|
| `01-select-files.ts` | Reads `$LENNY_CORPUS_PATH/index.json`, hard-coded Tier 1 list (8 files) + Tier 2 regex eval-signal scoring (cap 25) → `data/files-to-process.json` | Requires `index.json` and the `podcasts/`/`newsletters/` layout |
| `02-extract-patterns.ts` | DeepSeek (`deepseek-v4-pro`) per file, `json_object` mode, chunking at 50k chars split on `**` speaker lines → `data/extracted/<file-id>.json` | The `**` speaker heuristic doesn't fit the new `[0:00]` timestamp transcripts. Retry is blind (no error feedback). |
| `03-curate.ts` | One LLM clustering call merges duplicates, validates, assigns slug IDs → `data/evals.json` + `data/curation-report.md` | **Reads every file in `data/extracted/`** (stale files from earlier runs get curated in). Looks up metadata in `index.json`. Infers the operator from the `podcasts/` prefix. Has a Lenny-specific `applyManualClusterOverrides` (AEO/SEO split) hack. Overwrites the whole of `evals.json`. |
| `04-embed.ts` | OpenAI `text-embedding-3-small` (1536-d) → `data/eval-embeddings.json` (1.8 MB) | Direct OpenAI client |
| `05-refine.ts` | Tightens `one_liner`, `codex_prompt_template`, `feature_types` | DeepSeek client |
| `06-backfill.ts` | Fills empty `when_not_to_use` / `common_pitfalls` | DeepSeek client |
| `07-deepen-explanations.ts` | Expands explanations under 300 chars | DeepSeek client |

Every script carries its own ~40-line copy of `loadLocalEnv()` (seven copies in total).

### 1.3 `/api/find` today (`src/app/api/find/route.ts`)
1. zod validation: query of 5–2000 chars. A magic query `TEST_CREDITS_EXHAUSTED` forces the credits-exhausted UI, **including in production**.
2. Embeds the query with OpenAI `text-embedding-3-small`.
3. Dot product against every pattern vector, then takes the **top 5**.
4. DeepSeek `deepseek-v4-flash` (`json_object`, temperature 0.3) judges `query_ok` (lenient) and picks 0–5 matches with rationales.
5. Returns `{queryOk, reason?, matches[{id, rationale, score}]}`. **Matches are not sorted, and the similarity score is never used to gate anything.**

**Live probe results (2026-10-23, production):**
- `"asdkjh qwe zxcv blorp"` → rejected (`gibberish`) ✅
- `"how do I make pizza dough"` → rejected (`off_topic`) ✅
- A prompt-injection attempt → rejected ✅
- `"chatbot"` → **accepted, 4 weak matches** at cosine ≈ 0.35
- `"a support chatbot that answers from our help center docs"` → accepted, but the **best cosine was only ≈ 0.30**

**Conclusion:** the guardrail is deployed, but accepting or rejecting a query rests **entirely on one lenient, non-deterministic LLM judgment**. There are no deterministic checks, no calibrated similarity floor, no confidence tiers, no rate limit, no caching, and no measurement. Absolute cosine values are low with this model (strong queries sit around 0.30), so **any threshold must be calibrated against a labeled set, never guessed.**

Other issues:
- `FindClient.tsx` imports `getAllEvals()`, which ships all of `evals.json` (176 KB, and growing after the rebuild) into the client bundle.
- The OpenAI SDK clients have no timeout.

### 1.4 UI today
- Tailwind slate + blue-600, Inter + JetBrains Mono, white cards with gray borders.
- The only motion is a `hover:-translate-y-0.5` and an unused `fadeIn` keyframe.
- `globals.css` is 41 lines.
- The design reads as generic, which is the "AI slop" complaint.
- Branding copy says "Lenny" in `layout.tsx`, `page.tsx`, `about/page.tsx`, and `opengraph-image.tsx`.

### 1.5 Corpus inventory
- **Old Lenny archive**: now in `corpus/lenny/` (newer copy, dated up to 2026-06-21). It has `index.json` plus `podcasts/*.md` (305) and `newsletters/*.md` (361), with YAML frontmatter (`title`, `date`, `guest`, `url`/`post_url`/`youtube_url`). It's about 5.65M words. `docs/corpus_topic_map_rebuilt.csv` describes it (latest date 2026-04-26).
- **New files** (currently in `../evals/`, outside the repo), 33 `.md` files, about 0.73M words:
  - `Lenny/`: 30 YouTube podcast transcripts. **None of them overlap with the old archive by title.** Only about 4 have meaningful eval content (Dianne Penn has 46 "eval" mentions; most have 0).
  - `Aakash/`: 1 transcript, "How to Build AI Evals in 2026" (92 mentions).
  - `AI Engineer/`: 2 conference talks, Lyft (54 mentions) and IBM/Tejas Kumar (165 mentions).
  - **Format:** no frontmatter. Line 1 is `# <Title>` (often `Title | Guest (Company)`), then `**Source:** <YouTube URL>`, then `## Transcript`, `### <section>` headings, and `[m:ss]` timestamped lines. There are no speaker labels and **no date**.
- Total is about 8.6M tokens across about 685 files.

---

## 2. Workstreams and PR order

Each one ships as its own PR off `main`. Each PR updates the docs it touches. PR 5 does the final docs sweep.

1. **PR 1: OpenRouter swap** (plumbing only, no data change). Ship it and verify it live first.
2. **PR 2: Multi-source corpus + pipeline rebuild** (scripts, then run, then commit the new `data/`).
3. **PR 3: Production RAG hardening + search evals** (needs PR 2's data for labels).
4. **PR 4: Redesign, "lab notebook / field guide"** (after PR 3 so `FindClient` isn't edited twice).
5. **PR 5: Docs sweep + archive.**

---

## 3. Prerequisites (owner does these before or during implementation)

- [ ] **P1. OpenRouter account and keys.** Create an API key at openrouter.ai and load **about $45 of credits** (a $35 rebuild cap plus runtime headroom).
  - Recommended: **two keys**. A *pipeline* key (local only), and a *runtime* key (Vercel) with a **credit limit** set in the OpenRouter dashboard, e.g. $5/month. The dashboard key limit is the real backstop behind the in-memory rate limiter.
- [ ] **P2. Corpus placement.** Create these folders (paths are relative to the repo root; `corpus/` will be gitignored in PR 2):
  ```
  corpus/
  ├── lenny/                 ← the OLD archive, copied as-is: index.json, podcasts/, newsletters/
  ├── lenny-transcripts/     ← contents of ../evals/Lenny/*.md
  ├── aakash/                ← contents of ../evals/Aakash/*.md
  └── ai-engineer/           ← contents of ../evals/AI Engineer/*.md
  ```
  - **Future additions:** drop a new folder of `.md` files into `corpus/` (one folder per publication or source) and add one line for it to the source map in `scripts/lib/corpus.ts` (see §5.1). Nothing else is needed.
- [ ] **P3. (Optional, about 10 min) Dates for new files.** The 33 new transcripts have no date, so they will show no date and sort last under "recent." To fix that, add frontmatter at the top of each file:
  ```yaml
  ---
  date: 2026-09-14
  ---
  ```
  You can also add `guest:` here to override the auto-detected speaker.
- [ ] **P4.** `npm install` (`node_modules/` is currently absent). Node ≥ 22 is required for `--env-file-if-exists` (the machine has v26).
- [ ] **P5. Rights check.** Confirm you're comfortable quoting short verbatim excerpts from Aakash Gupta's and AI Engineer's content with attribution and links. This is the same stance the site already takes with Lenny.
- [ ] **P6. Review checkpoint (PR 3).** Review the AI-drafted `data/search-evals.json` (about 60 labeled queries) before thresholds are tuned. Budget about 20 minutes.
- [ ] **P7. Vercel env cutover (PR 1).** Add `OPENROUTER_API_KEY` (runtime key) and the `OPENROUTER_MODEL_*` vars. Remove `DEEPSEEK_*` and `OPENAI_API_KEY` after PR 1 is verified live.

---

## 4. Model selection (from the live OpenRouter catalog, 2026-10-23)

Prices are USD per 1M tokens (input / output). **Re-check slugs and prices at https://openrouter.ai/models before running.** The catalog changes weekly.

| Role | Env var | Recommended | Why | Fallback |
|---|---|---|---|---|
| Triage (read about 685 files, score eval relevance) | `OPENROUTER_MODEL_TRIAGE` | `anthropic/claude-haiku-5.5` ($0.10 / $0.50, 1M ctx, structured outputs) | Cheapest strong long-context reader. The whole corpus costs about $1. | `google/gemini-3.1-flash-lite` ($0.25 / $1.50) |
| Extraction (qualifying files) and quality passes (refine, backfill, deepen) | `OPENROUTER_MODEL_PIPELINE` | `anthropic/claude-sonnet-5.5` ($2 / $10, 1M ctx) | Frontier-grade faithfulness for verbatim excerpts and structured JSON. Fits most files in one call, so no chunking. | `google/gemini-3.8-flash` ($0.825 / $4.125), about half the cost |
| Clustering / dedup (one big judgment call) | `OPENROUTER_MODEL_CLUSTER` | `anthropic/claude-opus-5.5` ($4 / $20) | One call over every raw pattern. Merge judgment drives library quality, and the call costs about $1–2. | `anthropic/claude-sonnet-5.5` |
| Runtime /find judge + rationale | `OPENROUTER_MODEL_RUNTIME` | `anthropic/claude-haiku-5.5` | Fast, cheap (about $0.0005/query), strong at instruction-following and injection resistance. | Passed via the OpenRouter `models: [...]` fallback array: `google/gemini-3.1-flash-lite` |
| Embeddings (patterns + queries) | `OPENROUTER_MODEL_EMBED` | `openai/text-embedding-3-small` ($0.02) | Same model as today, so **PR 1 needs no re-embedding** and the existing vectors stay valid. | Candidate upgrade: `qwen/qwen3-embedding-8b` ($0.01). Adopt only if it beats the incumbent on `npm run eval:search` (§6.6). |

**Estimated full rebuild cost:**

| Stage | Estimate |
|---|---|
| Triage | ~8.6M input tokens on Haiku ≈ **$1** |
| Extraction | ~60–120 files × ~16k tokens in / ~6k out on Sonnet ≈ **$8–15** |
| Clustering | ≈ **$1–2** |
| Quality passes | ≈ **$2–3** |
| Embeddings | ≈ $0 |
| **Total** | **≈ $12–22**, under the $35 cap with retry headroom |

The `:batch` model variants are about half price. Skip them unless the cost guard trips.

---

## 5. PR 1: OpenRouter swap

**Goal:** identical behavior, one provider. **No new npm dependency.** Keep the `openai` SDK (OpenRouter is OpenAI-compatible) and don't add `@openrouter/sdk`.

### 5.1 Changes
1. **`src/lib/openrouter.ts`** (new, server-only, used by both the route and the scripts):
   ```ts
   import OpenAI from "openai";
   export const openrouter = new OpenAI({
     baseURL: "https://openrouter.ai/api/v1",
     apiKey: process.env.OPENROUTER_API_KEY,
     timeout: 20_000,
     maxRetries: 1,
     defaultHeaders: {
       "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
       "X-OpenRouter-Title": "AI Eval Field Guide", // or final name from PR 4
     },
   });
   export const models = {
     triage: process.env.OPENROUTER_MODEL_TRIAGE ?? "anthropic/claude-haiku-5.5",
     pipeline: process.env.OPENROUTER_MODEL_PIPELINE ?? "anthropic/claude-sonnet-5.5",
     cluster: process.env.OPENROUTER_MODEL_CLUSTER ?? "anthropic/claude-opus-5.5",
     runtime: process.env.OPENROUTER_MODEL_RUNTIME ?? "anthropic/claude-haiku-5.5",
     embed: process.env.OPENROUTER_MODEL_EMBED ?? "openai/text-embedding-3-small",
   };
   ```
   - Scripts need a longer timeout. Override it per call, e.g. `{ timeout: 300_000 }` for extraction.
2. **`src/app/api/find/route.ts`:** replace the `openai` and `deepseek` clients with `openrouter`. Use `models.embed` for the query embedding and `models.runtime` for the judge.
   - Keep `isCreditsExhaustedError`. OpenRouter returns **402** when credits run out, and the existing check handles it.
3. **All 7 scripts:** replace the DeepSeek/OpenAI clients with `openrouter` and `models.*`. Update the hard-coded DeepSeek cost math to sum **`response.usage.cost`**, which OpenRouter returns on every response.
4. **Delete all seven `loadLocalEnv()` copies.** Change the `package.json` scripts to `tsx --env-file-if-exists=.env.local scripts/…` (a Node built-in).
5. **`.env.example`:**
   ```
   OPENROUTER_API_KEY=
   OPENROUTER_MODEL_TRIAGE=anthropic/claude-haiku-5.5
   OPENROUTER_MODEL_PIPELINE=anthropic/claude-sonnet-5.5
   OPENROUTER_MODEL_CLUSTER=anthropic/claude-opus-5.5
   OPENROUTER_MODEL_RUNTIME=anthropic/claude-haiku-5.5
   OPENROUTER_MODEL_EMBED=openai/text-embedding-3-small
   CORPUS_DIR=./corpus
   PIPELINE_BUDGET_USD=35
   FIND_DAILY_LIMIT=10
   NEXT_PUBLIC_SITE_URL=
   NEXT_PUBLIC_REPO_URL=
   ```
   - `NEXT_PUBLIC_REPO_URL` is already used in the code but was never documented.
   - `CORPUS_DIR`, `PIPELINE_BUDGET_USD`, and `FIND_DAILY_LIMIT` are only read from PR 2/3 onward. Add them here so the file stays stable.
6. **Reasoning models:** for the runtime judge, disable or minimize reasoning for latency using OpenRouter's `reasoning` request parameter. **Verify the exact shape** at https://openrouter.ai/docs (search "reasoning tokens"). For pipeline calls, leave reasoning on, but set a generous `max_tokens` (the existing `03-curate.ts` comment explains why: reasoning can consume a small cap and leave empty content).

### 5.2 Acceptance
- `npm run build` passes.
- `npm run lint` is clean.
- `grep -ri deepseek src scripts .env.example` returns nothing.
- The same five probe queries from §1.3 give equivalent results locally and on a Vercel preview.
- `eval-embeddings.json` is unchanged.

---

## 6. PR 2: Multi-source corpus + full pipeline rebuild

### 6.1 Corpus loader: `scripts/lib/corpus.ts` (new)
One function, `loadCorpus(): CorpusDoc[]`, that walks `CORPUS_DIR` (default `./corpus`).

```ts
type CorpusDoc = {
  file: string;          // path relative to CORPUS_DIR, e.g. "lenny/podcasts/cat-wu.md", "aakash/How_to_….md"
  publication: string;   // display name from SOURCES map
  kind: "podcast" | "newsletter" | "talk" | "video";
  title: string;
  operator: string;      // guest/author; may be "" until triage fills it
  date: string;          // ISO or ""
  url?: string;
  body: string;          // markdown with frontmatter + header lines stripped
  hash: string;          // sha256 of raw file (node:crypto), for caching
};
```

- **The `SOURCES` map** (committed; this is the only place a new folder gets registered):
  ```ts
  const SOURCES: Record<string, { publication: string; kind: CorpusDoc["kind"] }> = {
    "lenny": { publication: "Lenny's Newsletter & Podcast", kind: "newsletter" }, // kind refined per subfolder
    "lenny-transcripts": { publication: "Lenny's Podcast", kind: "podcast" },
    "aakash": { publication: "Aakash Gupta", kind: "podcast" },
    "ai-engineer": { publication: "AI Engineer", kind: "talk" },
  };
  ```
  Unknown folders fall back to the folder name as the publication and `kind: "video"`, with a console warning.
- **Folders that contain `index.json`** (the old Lenny archive): use the index for `title`, `date`, and `guest`. **Verified 2026-10-23:** index `filename`s carry numeric folder prefixes (`03-podcasts/x.md`, `02-newsletters/x.md`), but the folders on disk are `podcasts/` and `newsletters/`. Strip a leading `^\d+-` from the first path segment when resolving. All 666 entries (305 podcasts, 361 newsletters) resolve once it's stripped. The newer archive puts `post_url` (lennysnewsletter.com) in the index, and podcast frontmatter may also carry `youtube_url`. `podcasts/` maps to `kind: podcast` with the guest as operator. `newsletters/` maps to `kind: newsletter` with the operator set to "Lenny Rachitsky" unless the frontmatter has an `author`. The URL comes from frontmatter `url` / `post_url` / `youtube_url`, as `03-curate.ts` does today.
- **All other `.md` files:** parse frontmatter with `gray-matter` (already a dependency). Fall back to `# Title` on line 1 and `**Source:** <url>` for the URL.
  - Operator heuristic: take the text after the last `|` in the title and strip the parenthetical company, e.g. "Dianne Penn (Anthropic)" becomes "Dianne Penn". Triage (§6.2) may overwrite it.
  - Strip the title, Source line, and `## Transcript` header from `body`.
- **Dedupe:** match on **any** of: the normalized URL (compare every URL a file has: `post_url`, `youtube_url`, `url`, `**Source:**`); or the normalized title text **before the first `|`**, together with the same operator. If two files collide, keep the one with frontmatter (the archive copy) and log the duplicate. Known case: `lenny-transcripts/The_hidden_pattern_behind_successful_products_Mark_transcript.md` duplicates `lenny/podcasts/mark-pincus.md`. Their URLs differ (YouTube vs. newsletter), and their titles differ after the `|`, so URL-only or full-title dedupe misses it.
- **Self-check:** add `scripts/lib/corpus.test.ts` using `node:test` + `node:assert`. Cover parsing one fixture string in each format (frontmatter / header-only / index-backed) and the operator-from-title heuristic. Run it with `npx tsx --test scripts/lib/corpus.test.ts`.

### 6.2 `scripts/01-triage.ts` (replaces `01-select-files.ts`)
- For every `CorpusDoc`, call `models.triage` with `response_format: { type: "json_schema", strict: true }`.
  - **Generate the JSON Schema from zod with `z.toJSONSchema()`** (built into zod v4, which is already installed).
  - Set `provider: { require_parameters: true }` so OpenRouter routes only to endpoints that support structured outputs.
  - Output shape:
    ```ts
    {
      eval_relevance: 0 | 1 | 2 | 3,  // 0 none, 1 passing mention, 2 substantive section, 3 primarily about evals
      operators: string[],            // people whose eval views are expressed
      eval_topics: string[],          // e.g. ["LLM-as-judge","error analysis"]
      rationale: string               // one sentence
    }
    ```
- **Cache** results in `data/triage.json`, keyed by `file + hash`, so reruns only re-triage changed or new files. This file *is* committed: it's small and records provenance.
- **Selection:**
  - Include `eval_relevance >= 2`.
  - Always include `FORCE_INCLUDE`, the existing 8 Tier-1 Lenny files re-pathed under `lenny/`, plus the three non-Lenny eval talks.
  - **Don't cap the count.** The budget guard is the cap.
- **Output:**
  - `data/files-to-process.json`: `{ generated_at, files: [{file, publication, kind, title, operator, date, url, eval_relevance}] }`.
  - `data/library-stats.json`: `{ files_scanned, files_by_publication, files_selected }`. The About page reads this instead of the hard-coded "357 newsletters · 301 podcasts".
  - Print the selected count and the **projected extraction cost** (input tokens × price from `GET https://openrouter.ai/api/v1/models`, or a constant).
  - **Abort if the projection exceeds the remaining budget.**
- Concurrency 8.

### 6.3 Budget guard: `scripts/lib/llm.ts` (new, small)
- `chatJson<T>(zodSchema, { model, messages, max_tokens })`:
  - Calls `openrouter.chat.completions.create` with `json_schema` strict mode + `require_parameters`.
  - Parses the response with zod.
  - **On a parse or validation failure, retries once with the error message appended** (the current scripts retry blind).
  - Adds `usage.cost` to a running total persisted in `data/extracted/.spend.json`.
  - **Throws before a call if `spent >= PIPELINE_BUDGET_USD`.**
- Every pipeline script uses it. This also removes the duplicated client and retry code across 6 scripts.

### 6.4 `02-extract-patterns.ts` changes
- Read from `data/files-to-process.json` (new shape). Load each body via `loadCorpus` (or by re-reading `CORPUS_DIR/file`).
- **Wipe `data/extracted/` at the start of a full run.** Stale per-file JSON from old runs currently pollutes curation. Alternatively, make curate read only the files listed in `files-to-process.json`. Do both.
- **Chunking:** raise `maxBodyChars` to `300_000` (the largest file is about 250k chars and Sonnet has a 1M context), so effectively every file goes in one call. That removes cross-chunk duplicates. Keep the chunker as a fallback, but split on blank lines or `###` headings rather than only `**` speaker lines.
- **Prompt:**
  - Make it source-agnostic: "an interview transcript, newsletter, or conference talk from `<publication>`".
  - Pass `publication`, `kind`, `operator`, and the triage `eval_topics` as hints.
  - Keep every existing faithfulness rule (verbatim excerpts, `[...]` elisions, zero patterns allowed).
  - Add a rule: **"Only extract patterns for evaluating AI/LLM products. Skip non-AI analytics, SEO, growth or A/B methods."** This removes the AEO/SEO noise that needed the manual override.
  - Transcripts are auto-captions without speaker labels. Tell the model the excerpt must be copied verbatim **including the caption text**, but **without `[m:ss]` timestamps**.
- Use `chatJson` with the existing `responseSchema`.

### 6.5 `03-curate.ts` changes
- Source metadata comes from `files-to-process.json`, not `index.json`. Delete `loadSource`'s index lookup and the `podcasts/` operator inference.
- Add **`publication`** to `sourceSchema`, and add `source_publication` to the pattern schema. Update `src/lib/evals.ts` to match. `source_date` stays a string, and `""` is allowed.
- Clustering uses `models.cluster` via `chatJson`. Add an optional `drop: boolean` + `drop_reason` per cluster so the model can drop clusters that aren't AI-eval patterns. Log every drop in `curation-report.md`.
- **Delete `applyManualClusterOverrides`** (the Lenny AEO hack). Re-add a manual override only if the rebuilt output demands one.
- **Stable URLs:** after assigning new IDs, write `data/id-redirects.json` mapping each **old ID that disappeared** to its best new ID (the new pattern whose sources overlap most, ties broken by name similarity). Read it in `next.config.ts` `redirects()` as permanent redirects so old `/eval/<id>` links and search-engine results keep working.
- Keep the `< 25 patterns` sanity guard. Add a report line for patterns per publication.

### 6.6 Quality passes and embed
- `05-refine`, `06-backfill`, `07-deepen`: switch to `chatJson` + `models.pipeline`. No logic change.
- `04-embed`: `openrouter.embeddings.create({ model: models.embed, input })`. Write `model` and `dimension` into the output (already done). Read the dimension from the response instead of hard-coding 1536.
- **New npm script `library:build`**, which runs in order: `extract:triage → extract:patterns → extract:curate → refine → backfill → deepen → extract:embed`. Because this is a full rebuild, the quality passes are no longer optional. Keep the individual scripts for reruns.
- `.gitignore`: add `/corpus/`, `data/extracted/`, and `data/evals.pre-*.json`. Remove the tracked `data/evals.pre-refine.json` (git history keeps it).

### 6.7 Acceptance
- The pipeline completes within budget, and the printed spend is ≤ $35.
- `data/evals.json` validates and has ≥ 25 patterns. Every pattern has `source_publication`, and at least one pattern cites each of Aakash and AI Engineer.
- `curation-report.md` shows the per-publication distribution and the drops.
- `npm run build` passes, and old `/eval/<id>` URLs redirect.
- Spot-check 5 random patterns: the excerpt is verbatim in its source file (write a 10-line check in the report that `includes()` each excerpt, with `[...]`-split segments, against the corpus body, and report the misses).

---

## 7. PR 3: Production-grade RAG for /find

**Goal:** high-quality input gets strong matches; weak but real input gets clearly labeled weak matches; junk is rejected cheaply and deterministically where possible; every decision is measurable.

### 7.1 Refactor
Move the logic into **`src/lib/find.ts`**, which exports `findEvals(query: string): Promise<FindResult>`. The route then only handles HTTP, rate limiting, and errors, and the eval script (§7.6) can call `findEvals` directly without a server.

### 7.2 Pipeline inside `findEvals`
1. **Normalize:** trim, collapse whitespace, cap at 1000 chars (lowered from 2000).
2. **Deterministic pre-filter (free, no API call)** in `src/lib/queryQuality.ts`. Reject as `gibberish` when **any** of these holds:
   - fewer than 2 word-like tokens (`/[a-z]{2,}/i`);
   - letter ratio below 0.5 of non-space chars;
   - more than 40% of tokens have no vowel or have a consonant run of 5 or more (`/[bcdfghjklmnpqrstvwxz]{5,}/i`);
   - a single character repeated 6+ times;
   - keyboard-row smash (`asdf`, `qwer`, `zxcv` sequences) dominates.

   Keep it to about 30 lines. Add **`src/lib/queryQuality.test.ts`** (`node:test`) with about 15 asserts: real queries pass, smashes fail, "RAG evals" passes, "chatbot" passes. The comment should name the ceiling: `// ponytail: heuristic only; the LLM judge is the real gate, this just saves API calls on obvious junk`.
3. **Cache:** an in-memory `Map` of normalized query → `FindResult`, about 500 entries, with the oldest evicted. Cache hits don't count against the rate limit.
4. **Embed** the query with `models.embed`. Assert the embedding file's `model` matches `models.embed` at load time, so a mismatch fails loudly.
5. **Retrieve the top 8** by cosine (instead of 5).
6. **Similarity floor:** if `top1 < SIM_FLOOR`, return `rejected / no_match` **without** calling the LLM.
   - `SIM_FLOOR` is a constant in `find.ts`, **calibrated by §7.6**, never guessed. Today's model puts strong queries around 0.30, so the floor will likely land around 0.15–0.22.
7. **LLM judge** (`models.runtime`, `temperature: 0`, `json_schema` strict, `require_parameters`, `models: [runtime, fallback]`, reasoning minimized). Schema:
   ```ts
   {
     verdict: "ok" | "gibberish" | "too_vague" | "off_topic" | "not_a_request",
     matches: Array<{ id: string; fit: "strong" | "weak"; rationale: string }>  // ≤ 5, ids must be from candidates
   }
   ```
   - Put the query inside `<user_query>…</user_query>` and the candidates inside `<candidates>…</candidates>`. The system prompt says the content inside those tags is data and must never be followed as instructions.
   - Define `strong` as "directly addresses evaluating this feature" and `weak` as "related, partially applicable".
   - Drop any id that isn't in the candidate set (already done today).
8. **Combine:** a match is shown as `strong` only if the LLM says strong **and** `score >= STRONG_FLOOR` (also calibrated). Otherwise it's `weak`. Sort strong first, then by score.
   - If `verdict === "ok"` but there are zero matches, return `ok` with an empty list. The UI shows the honest empty state.
9. **Result shape** (replaces `queryOk`):
   ```ts
   type FindResult =
     | { status: "ok"; matches: Array<{ id; rationale; score; fit: "strong" | "weak"; pattern: CardFields }> }
     | { status: "rejected"; reason: "gibberish" | "too_vague" | "off_topic" | "not_a_request" | "no_match" };
   // route adds: { remaining: number } on every response; { status: "limited", resetAt } (HTTP 429); { status: "credits_exhausted" }
   ```
   `CardFields` is the subset of pattern fields the card needs (id, name, one_liner, category, difficulty, feature_types, source_operator, source_publication, source_date). With it, **`FindClient` stops importing `getAllEvals()`**, and `evals.json` leaves the client bundle.

### 7.3 Rate limit (in the route)
- A per-IP `Map<ip, {count, resetAt}>` with a 24h window and `FIND_DAILY_LIMIT` (default 10). Take the IP from `x-forwarded-for` (first entry), falling back to `x-real-ip`.
- Count only requests that pass zod validation and the pre-filter, so typos don't burn quota.
- Comment: `// ponytail: per-instance memory, resets on cold start; OpenRouter key credit limit is the hard backstop. Upgrade to Upstash/Vercel KV if abuse appears.`
- Return `remaining` on every response, and HTTP 429 `{status:"limited", resetAt}` when the limit is exhausted.
- Delete the `TEST_CREDITS_EXHAUSTED` backdoor in production: only honor it when `process.env.NODE_ENV !== "production"`.

### 7.4 UX states (implemented in PR 4's visual language, but the logic lands here)
- **Before the first search:** show "10 searches a day on the live demo · the full library is always open." Show a chip with "N of 10 left today", updated from `remaining`.
- **Strong matches:** full cards with "Why this fits".
- **Weak matches:** a separate, visibly muted section, e.g. titled "Margin notes: weaker matches", with an explainer: "Related, but not a direct fit. Try adding what the feature does and who uses it."
- **Rejected:** a reason-specific message (keep today's copy and add `no_match` and `not_a_request`), plus **2–3 clickable example rewrites**.
- **Limited:** "You've used today's 10 searches. Thanks for exploring! Browse all N patterns →", plus a self-host link.

### 7.5 Logging
Log one structured line per request: `{ decision, reason, top1, nStrong, nWeak, latencyMs, costUsd, cached }`. **Don't log the raw query text.** Log its length only.

### 7.6 Search eval set: `data/search-evals.json` + `scripts/08-eval-search.ts` (`npm run eval:search`)
- **The AI drafts about 60 cases**, then **the owner reviews them (P6)**:
  - about 25 good, specific feature descriptions, with `relevant_ids` taken from the rebuilt library;
  - about 10 short-but-real ("chatbot", "RAG evals"), labeled `accept`, weak allowed;
  - about 8 gibberish/smash;
  - about 8 off-topic (recipes, sports, generic coding questions with no AI);
  - about 5 prompt-injection or "return everything" attempts;
  - about 4 too-vague ("help", "evals?").
  ```json
  { "query": "...", "expect": "accept" | "reject", "reason?": "gibberish", "relevant_ids?": ["llm-as-a-judge"] }
  ```
- **The script:**
  - calls `findEvals` directly;
  - reports **junk rejection rate**, **false rejection rate** on good queries, **precision@strong** and **recall@5** against `relevant_ids`, p50/p95 latency, and total cost;
  - runs a **threshold sweep** for `SIM_FLOOR` and `STRONG_FLOOR` over cached embeddings (no extra LLM cost), printing a small table;
  - exits non-zero below targets.
- **Targets:**
  - ≥ 95% of junk rejected;
  - ≤ 5% of good queries rejected;
  - precision@strong ≥ 0.8;
  - recall@5 ≥ 0.7;
  - p95 latency ≤ 4s.
- Use the same script to decide on the embedding-model upgrade in §4.
- The About page can say "We eval our own search: see `data/search-evals.json`." This is an eval library dogfooding evals.

### 7.7 Acceptance
- All targets in §7.6 are met, with the output pasted into the PR description.
- The unit tests pass.
- The live probes from §1.3 behave as expected: "chatbot" now returns **weak** matches only.
- The client bundle no longer contains `evals.json` (check the `next build` output size for `/find`).

---

## 8. PR 4: Redesign, "lab notebook / field guide"

**Constraints:** CSS-only motion. No new dependencies; fonts come from `next/font/google`. Light and dark modes are both first-class. Meet WCAG AA contrast. **Every animation sits inside `@media (prefers-reduced-motion: no-preference)`.** Mobile-first, with no horizontal scroll at 375px.

### 8.1 What to borrow from openrouter.ai (feel, not palette)
- Crisp, confident hero type at about 56px.
- Lots of calm whitespace.
- Subtle background grid or texture with a radial fade.
- Small, precise radii (about 6px).
- Thin 1px borders instead of heavy shadows.
- Monospace for data and meta.
- Dense but legible "catalog" listing.
- Quiet hover states.

**Don't copy** their violet `#7624F4` or lime `#CAFF07`.

### 8.2 Identity
- **Name/tagline (suggested; the owner can override):** "The AI Eval Field Guide": *"Eval patterns from the people who ship AI, sourced, cited, and ready to use."* Show sources as a quiet line: "From Lenny's Podcast & Newsletter, Aakash Gupta, AI Engineer, and more."
- **Type:**
  - Display: **Fraunces** (variable serif with optical sizing) for h1/h2 and pattern names on detail pages.
  - Body/UI: **Inter** (already loaded).
  - Meta, labels, specimen numbers: **JetBrains Mono** (already loaded).
- **Palette** (CSS variables in `globals.css` via `@theme`):

  | Token | Light ("paper") | Dark ("blueprint") |
  |---|---|---|
  | `--paper` (bg) | `#FAF8F3` | `#0E1116` |
  | `--ink` (text) | `#1C1B19` | `#E8E6E1` |
  | `--muted` | `#6B665C` | `#9AA3AE` |
  | `--rule` (grid/borders) | `#E7E1D4` | `#1F2630` |
  | `--accent` (vermilion annotation) | `#D9480F` | `#FF7A59` |
  | `--highlight` (marker) | `#FFE36E` at 70% | `#FFE36E` at 25% |

  Category tab colors: methodology `#2B59C3`, metric `#0F766E`, process `#9A3412`, framework `#6D28D9`. Check each for AA on both backgrounds and adjust lightness in dark mode.
- **Texture:**
  - The body background is a faint graph-paper grid: two `linear-gradient`s at 24px, using `--rule` at low alpha, with a radial mask fading it toward the edges.
  - The hero gets a vermilion left "margin rule" line, like a notebook.

### 8.3 Motion system (in `globals.css`)
- **Tokens:** `--ease-out: cubic-bezier(.2,.8,.2,1)`, `--dur-1: 150ms`, `--dur-2: 250ms`, `--dur-3: 450ms`.
- **Utilities:**
  - `.reveal`: fade + 8px rise. Use `animation-timeline: view()` where supported, and `@starting-style` for on-mount. It degrades to no animation.
  - `.stagger > *`: `animation-delay: calc(var(--i) * 40ms)`, with `--i` set inline by index.
  - `.highlight`: a marker sweep on hover/focus, `background-size: 0 40%` → `100% 40%` on `--highlight`, positioned bottom.
  - `.draw`: an SVG hand-drawn underline that draws in using `stroke-dasharray`/`stroke-dashoffset`.
  - Counter roll-up for hero stats, using `@property --n { syntax: '<integer>' }` + `counter-reset` animation (CSS-only).
- **Page transitions:**
  - *Optional:* enable view transitions only if this Next version supports them. **Read `node_modules/next/dist/docs/` for the `viewTransition` config and React `ViewTransition` before attempting it.**
  - If it's experimental or unclear, skip it and rely on the `.reveal` entrances.

### 8.4 Per-surface spec
- **Nav:**
  - Sticky, with a translucent `--paper` background and `backdrop-filter: blur(8px)`.
  - Wordmark in Fraunces.
  - The active link gets a vermilion underline that animates with `scale-x`.
  - The theme toggle rotates its icon on switch.
- **Home:**
  - Serif hero with a `.draw` underline under one key phrase.
  - A stat row that rolls up: patterns · sources · operators · publications, all computed from data.
  - Three entry points styled as **notebook tabs**: Browse / Find / Learn.
  - "Recently added" as a staggered row of specimen cards.
  - A "Sources" strip listing publications, as text, not logos.
  - Replace the "Updated {today}" pill (it's the build date) with `generated_at` from `data/library-stats.json`.
- **Specimen card** (`EvalCard`):
  - A mono specimen number (`No. 07`), with its index stable by id sort.
  - A colored category tab that peeks from the top edge.
  - Pattern name, then one-liner.
  - Meta row in mono: operator · publication · date (omit the date if blank).
  - Hover: 2px lift, a `rotate(-0.3deg)` paper tilt, a slightly stronger border, and a `.highlight` sweep on the title.
  - Focus-visible gets the same treatment plus an accent outline.
- **Library (`/browse`):**
  - A sticky filter rail with a **Publication filter** (new) next to feature type, difficulty, and category.
  - Filter chips styled as tabs.
  - On filter change, results fade and re-stagger (CSS; re-key the grid).
  - Show the result count as a mono "Showing 18 of 92 specimens".
- **Detail (`/eval/[id]`):**
  - A long-form reading column (max about 68ch) with **marginalia** on desktop: "When to use", "When not to use", and "Pitfalls" sit in a right margin column as annotated notes with a vermilion hairline. They stack inline on mobile.
  - The source excerpt is a pull-quote with large Fraunces quote marks and a "From <operator>, <publication>" caption.
  - The sources list is footnote-style, numbered and linked.
  - The prompt template sits in a "recipe card" code block. On copy, the button text animates to "Copied ✓" (with an `aria-live` announcement).
- **Find:**
  - The textarea is styled as a ruled notebook entry (repeating-linear-gradient lines). It gets an accent margin line on focus.
  - The query-allowance chip sits near the button.
  - **Thinking state:** a scanning highlight sweeps across 3 ghost specimen cards, with rotating status text ("Reading N patterns…" → "Checking fit…" → "Writing margin notes…").
  - Results stagger in.
  - The weak-matches section uses a dashed border and muted ink.
  - Rejections appear as a sticky-note callout (`--highlight` background) with clickable example rewrites.
  - The limit state appears as a friendly "notebook full for today" card.
- **Learn:** the 5 steps become **chapter tabs** across the top. Content slides or fades between steps (CSS transitions keyed on step). Progress gets a small hand-drawn check per completed chapter.
- **About:**
  - Rewrite it for the multi-source positioning.
  - Stats come from `library-stats.json` (no hard-coded "357/301" or "12+ operators"; the true operator count today is 11).
  - Add a "How we eval our own search" paragraph (links to `data/search-evals.json`).
  - Add a multi-source attribution section ("All source content belongs to its respective creators: Lenny Rachitsky, Aakash Gupta, AI Engineer…").
  - **Remove the claim that a "manual curation pass checks quality"** unless the owner actually does one. Every pattern is currently `curation_status: "edited"`, set by the refine script.
  - **Remove the claim about GitHub issue templates**, which don't exist (no `.github/` dir). Alternatively, add `.github/ISSUE_TEMPLATE/missing-pattern.md` and `extraction-error.md`; they're 2 tiny files.
- **OG image** (`opengraph-image.tsx`): paper background, grid texture, Fraunces wordmark, new tagline, a vermilion margin rule, and live pattern/source counts.
- **404 / error pages:** keep the notebook voice, e.g. "This page fell out of the notebook."
- **Remove:** the unused `fadeIn` keyframe, the default `public/*.svg` Next.js assets (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`) if nothing references them, and every `Lenny` hard-code in the UI chrome.

### 8.5 Acceptance
- Screenshots of every page at 375px and 1280px, light and dark, attached to the PR.
- Lighthouse: accessibility ≥ 95, CLS < 0.05.
- With reduced motion on (macOS setting or DevTools emulation), there is no motion.
- No new entries in `package.json` dependencies.

---

## 9. PR 5: Docs sweep and archive

### 9.1 Current doc drift (found 2026-10-23)

| Doc | Issue |
|---|---|
| `README.md` | DeepSeek/OpenAI stack, `LENNY_CORPUS_PATH`, and the Lenny-only positioning. The "43 patterns" count is hard-coded. `NEXT_PUBLIC_REPO_URL` is not documented. |
| `docs/eval-library-spec.md` | Tagline (§0), §5 (regex tiers), §6 (file map; it lists `evals.pre-backfill/deepen.json`, which aren't committed), §7–8 (DeepSeek/OpenAI, env), §9 (old response shape), §10 (Lenny-specific prompt), §11 (the "clean utilitarian" UI direction is being replaced), §12 (acceptance mentions DeepSeek), and §13 (Lenny-only attribution). |
| `src/app/about/page.tsx` | Hard-coded "357 newsletters · 301 podcasts · 12+ operators" (the actual count is 11). The "manual curation pass" claim is not true. It references GitHub issue templates that don't exist. |
| `.env.example` | Missing `NEXT_PUBLIC_REPO_URL`. |
| `data/curation-report.md` | Will be regenerated by PR 2. |
| `docs/DOCS_AUDIT_REPORT.md`, `docs/codex-prompts.md`, `docs/AI_PM_product_ideas.md`, `docs/corpus_topic_map_rebuilt.csv` | Historical artifacts. |

### 9.2 Actions
1. `git mv` the four historical files into `docs/archive/`. Prepend a banner to each `.md`:
   > **Archived 2026-10. Superseded by `README.md`, `docs/eval-library-spec.md`, and `docs/implementation-plan.md`. Kept for history; describes the DeepSeek/Lenny-only v1.**
2. **README:**
   - New positioning and the OpenRouter stack.
   - **"Corpus layout"** section, copying the §3 P2 tree and the "how to add a source" instructions.
   - Env table.
   - `library:build` pipeline with the cost expectations from §4.
   - `eval:search`.
   - Multi-source attribution and license wording.
3. **`docs/eval-library-spec.md`:** update every section listed in §9.1 to match what PRs 1–4 actually shipped. Mark it as the canonical, current spec.
4. Make sure `CLAUDE.md` / `AGENTS.md` are unchanged apart from one optional line pointing agents to `docs/eval-library-spec.md`.
5. **Add a final verification step:** grep for `deepseek|LENNY_CORPUS_PATH|text-embedding-3-small` outside `docs/archive/`. Each hit must be intentional (the embed model name in `.env.example` is fine).
6. Don't touch anything under `corpus/`. Those are owner content, not repo docs.

### 9.3 Acceptance
- A docs-only diff, plus the about-page copy if it wasn't already done in PR 4.
- Every command in the README runs as written on a fresh clone with the env filled in.

---

## 10. Risks and gotchas (read before coding)

- **IDs change on a full rebuild.** Without `id-redirects.json` (§6.5), every shared `/eval/<id>` link breaks.
- **Stale `data/extracted/` files** silently leak into curation (§6.4).
- **Reasoning models plus a small `max_tokens`** give empty content. Keep caps generous for pipeline calls, and minimize reasoning for runtime calls.
- **Structured-output support is per endpoint on OpenRouter.** Always send `provider: { require_parameters: true }` with `json_schema`, or a non-supporting provider may get the request.
- **Cosine scales are model-specific.** If the embedding model changes, re-embed **and** re-run `eval:search` to recalibrate `SIM_FLOOR`/`STRONG_FLOOR`.
- **The in-memory rate limiter is per serverless instance.** The OpenRouter key credit limit (P1) is the real ceiling.
- **Copyright:** `corpus/` must be gitignored *before* the first file lands in it. Verify with `git status` after P2.
- **Next.js version drift:** per `AGENTS.md`, read `node_modules/next/dist/docs/` before using any Next API you think you know (redirects, OG image, view transitions, route handlers).

---

## 11. Done means
- [ ] PR 1 merged, and the live site runs on OpenRouter with the old provider keys removed from Vercel.
- [ ] PR 2 merged: the library is rebuilt from about 685 files across 4 publications within budget, and old URLs redirect.
- [ ] PR 3 merged: `npm run eval:search` meets the targets, the owner has reviewed the eval set, and the rate limit and weak-match UX are live.
- [ ] PR 4 merged: the whole site uses the field-guide design, with motion that respects reduced-motion.
- [ ] PR 5 merged: README and spec are current, and the historical docs are archived.
