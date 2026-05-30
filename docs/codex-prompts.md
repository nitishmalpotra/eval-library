# Codex Prompts — The Eval Library Build

A sequenced set of prompts to drive Codex through the build. Each prompt is self-contained but references `eval-library-spec.md` (the master spec) — keep that file open in the Codex session.

**How to use:** Run prompts in order. After each prompt, verify the acceptance criteria before moving on. If Codex deviates, paste the acceptance criteria back at it.

**Before you start:**
1. Put `eval-library-spec.md` in the working directory or paste it as the first message in your Codex session so Codex has full context.
2. Have your `DEEPSEEK_API_KEY` and `OPENAI_API_KEY` ready.
3. Make sure you know the absolute path to your Lenny corpus: `/Users/nitishmalpotra/Downloads/devDEVdev/lennys-newsletterpodcastdata-all`

---

## Prompt 1 — Initialize the project

```
I'm building "The AI PM Eval Library" — see eval-library-spec.md for full context.

TASK
Set up a fresh Next.js 15 project with the App Router, TypeScript, Tailwind CSS v4, and ESLint. Match the structure in Section 6 of the spec.

REQUIREMENTS
1. Run `npx create-next-app@latest eval-library --typescript --tailwind --eslint --app --no-src-dir=false --import-alias "@/*"` (use src-dir).
2. Inside the created directory, set up the additional folders shown in Section 6 of the spec: `data/`, `data/extracted/`, `scripts/`, `src/components/`, `src/lib/`.
3. Add `.gitignore` entries for `.env.local`, `data/extracted/`, and `node_modules/`.
4. Create `.env.example` with these keys (no values): `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, `LENNY_CORPUS_PATH`, `NEXT_PUBLIC_SITE_URL`.
5. Install dependencies: `openai` (used for both DeepSeek via custom baseURL and OpenAI embeddings), `gray-matter` (frontmatter parsing), `tsx` (for running .ts scripts), `zod` (schema validation).
6. Update `package.json` scripts:
   - `dev`, `build`, `start`, `lint` (defaults)
   - `extract:select`: `tsx scripts/01-select-files.ts`
   - `extract:patterns`: `tsx scripts/02-extract-patterns.ts`
   - `extract:curate`: `tsx scripts/03-curate.ts`
   - `extract:embed`: `tsx scripts/04-embed.ts`
   - `extract:all`: runs all four in sequence
7. Configure Tailwind v4 with the design tokens in Section 11 of the spec: Inter for sans, JetBrains Mono for mono. Add Google Fonts via `next/font` in the root layout. Set `slate-900` as primary text and `blue-600` as accent.
8. Replace the default home page with a minimal placeholder that just says "Eval Library — under construction" so we know the app builds and runs.

ACCEPTANCE
- `npm run dev` starts and renders the placeholder home page at localhost:3000.
- `npm run lint` passes.
- `npm run build` succeeds.
- The folder structure matches the spec.

When you're done, summarize what you created (file tree + key versions of deps) so I can verify.
```

---

## Prompt 2 — File selection script

```
Following eval-library-spec.md.

TASK
Write `scripts/01-select-files.ts`. It chooses which Lenny corpus files to send to extraction.

INPUTS
- The Lenny corpus directory at the absolute path in `LENNY_CORPUS_PATH` env var.
- Inside it: `index.json` (corpus metadata) and `newsletters/` + `podcasts/` directories of .md files.

LOGIC
- Read `index.json` to get the list of files with metadata (title, tags, date, guest, word_count).
- Build a TIER 1 list of these exact files (hard-code by filename from Section 5 of the spec):
  1. newsletters/building-eval-systems-that-improve-your-ai-product.md
  2. newsletters/beyond-vibe-checks-a-pms-complete-guide-to-evals.md
  3. newsletters/why-your-ai-product-needs-a-different-development-lifecycle.md
  4. podcasts/hamel-husain--shreya-shankar.md
  5. podcasts/brendan-foody.md
  6. newsletters/counterintuitive-advice-for-building-ai-products.md
  7. newsletters/an-ai-glossary.md
  8. newsletters/how-close-is-ai-to-replacing-product-managers.md
- Build a TIER 2 list: every file in `index.json` whose tags include "ai" OR whose title/description contains "eval" (case-insensitive). For each candidate, read the .md body and compute an **eval-signal score** — standalone "eval(s)" mentions + 4×"LLM-as-a-judge" + 2×compound eval terms ("eval set/framework/pipeline"). Do NOT rank on the bare substring "eval" (it matches "retrieval" and generic "evaluate"). Keep files with genuine signal (≥2 eval mentions or any judge reference). Skip any file already in Tier 1.
- Combine: `tier1` files always selected; `tier2` files **ranked by eval-signal score** (not word_count), capped at 25.

OUTPUT
- Write `data/files-to-process.json` with shape:
  ```json
  {
    "generated_at": "<iso>",
    "tier1": [ { "file": "newsletters/...", "title": "...", "date": "...", "guest": "...", "word_count": N } ],
    "tier2": [ { ...same shape, plus "eval_mention_count": N } ]
  }
  ```
- Print a console summary at the end: "Tier 1: N files. Tier 2: M files. Total to process: K. Estimated total words: W."

ACCEPTANCE
- Running `npm run extract:select` produces a valid `data/files-to-process.json`.
- Tier 1 has all 8 files exactly.
- Tier 2 has between 8 and 25 files.
- Console summary prints.

Show me the console output and the first 30 lines of the JSON when you're done.
```

---

## Prompt 3 — DeepSeek extraction pipeline

```
Following eval-library-spec.md, especially Section 10 (the extraction prompt) and Section 4 (the schema).

TASK
Write `scripts/02-extract-patterns.ts`. It reads `data/files-to-process.json`, processes each file through DeepSeek, and saves raw extraction output per file.

SETUP
- Use the `openai` npm package configured for DeepSeek:
  ```ts
  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com/v1",
  });
  ```
- Model: `deepseek-v4-pro` for pipeline extraction/curation/refinement, with live /find using `deepseek-v4-flash`.
- Use `gray-matter` to strip YAML frontmatter and pull metadata before sending the body to DeepSeek.

PER FILE
1. Read the .md file from `LENNY_CORPUS_PATH/<relative_path>`.
2. Parse frontmatter to extract metadata.
3. Build the user message using the extraction prompt from Section 10 of the spec, substituting the file metadata and body.
4. If the body is longer than ~50k characters (rough proxy for ~12k tokens), chunk by speaker boundaries (lines starting with `**`) into segments of ~30k chars each. Run extraction on each segment, then concatenate the resulting JSON arrays.
5. Use JSON mode (`response_format: { type: "json_object" }`). Wrap the schema as `{ "patterns": [...] }` so JSON-object mode works (we'll unwrap on read).
6. Validate the response with Zod against the schema in Section 4 — but only the extraction-time fields (skip `id`, `curation_status`, `source_file`, `source_title`, `source_date`, `source_url`, `source_operator` — those get added in curation).
7. Save the validated patterns to `data/extracted/<file-id>.json` where `<file-id>` is the file path with slashes replaced by `__` and `.md` stripped.

LOGGING
- Print one line per file: `[12/27] ✓ podcasts/hamel-husain--shreya-shankar.md → 5 patterns extracted (8.2s)`
- On error, print `[12/27] ✗ <file> → <error message>` and continue.
- At end, print summary: total files, total patterns, total cost estimate (rough: $0.27 per million input tokens and $1.10 per million output tokens for DeepSeek; log estimated cost based on actual token usage from API responses).

PARALLELISM
- Run with concurrency 3 (use Promise.all with batching, or a simple semaphore). Don't hammer the API.

RETRY
- On any error, retry once with a 5-second delay before counting as failure.

ACCEPTANCE
- Running `npm run extract:patterns` processes all files in `data/files-to-process.json`.
- `data/extracted/` contains one JSON file per source file (or zero patterns for some, that's fine).
- Tier 1 files should average 2+ patterns each. Tier 2 files often 0-2.
- Final extraction count: 20-80 raw patterns.

Show me the console summary when done and one example extracted JSON file (any Tier 1).
```

---

## Prompt 4 — Curation script

```
Following eval-library-spec.md Section 4 (schema) and Section 6 (file paths).

TASK
Write `scripts/03-curate.ts`. It reads all `data/extracted/*.json` files, dedupes and merges, adds metadata, and writes the final `data/evals.json`.

LOGIC
1. Load all files in `data/extracted/`. Flatten into an array of raw patterns, each annotated with its source file id.
2. Look up each source file's metadata from `index.json` to fill in: `source_file`, `source_title`, `source_date`, `source_operator` (use `guest` field for podcasts, or "Lenny Rachitsky" for newsletters), `source_url` (read from the actual .md frontmatter — the `url` field).
3. Normalize names: lowercase + trim + collapse whitespace. Group patterns by normalized name.
4. For each group with >1 entry, merge:
   - Keep the entry with the longest `explanation`.
   - Merge `when_to_use`, `when_not_to_use`, `common_pitfalls`, `keywords` as deduplicated unions.
   - Merge `feature_types` as a set union.
   - Keep ALL source citations: convert single-source fields into an array `sources: [{ file, title, date, operator, url, excerpt }, ...]`.
   - Pick the strongest `source_excerpt` (longest, but ≤300 words) for the primary display.
5. Assign each merged pattern an `id` (kebab-case slug of the name; if collision, append `-2`, etc.).
6. Set `curation_status: "auto"` on every pattern (manual review can flip to "verified" or "edited" later).
7. Validate every entry against the full EvalPattern Zod schema in Section 4 of the spec.
8. Sort by `id` alphabetically and write to `data/evals.json`.

ALSO
- Write a `data/curation-report.md` summarizing: total raw → final patterns, top 10 most-cited operators, distribution by category and feature type. This helps me decide if extraction needs another pass.

ACCEPTANCE
- `data/evals.json` is well-formed and validates.
- At least 25 distinct patterns.
- Multi-source patterns have a `sources` array with all citations preserved.
- Curation report is readable.

Show me the curation report and the first pattern in `data/evals.json` when you're done.
```

---

## Prompt 5 — Embeddings

```
Following eval-library-spec.md Section 9 (the /find endpoint design).

TASK
Write `scripts/04-embed.ts`. It produces a vector per eval pattern in `data/evals.json` using OpenAI's `text-embedding-3-small`.

EMBEDDING TEXT CONSTRUCTION
For each pattern, build the text to embed by concatenating:
- name
- one_liner
- definition
- explanation (first 1000 chars to keep under token limits)
- when_to_use joined as "When to use: ..."
- keywords joined
- feature_types joined

OUTPUT FORMAT
Write `data/eval-embeddings.json`:
```json
{
  "model": "text-embedding-3-small",
  "dimension": 1536,
  "generated_at": "<iso>",
  "vectors": [
    { "id": "llm-as-a-judge", "vector": [0.123, ...] }
  ]
}
```

DETAILS
- Use the same `openai` package configured for OpenAI (not DeepSeek). New client instance with the OpenAI API key.
- Batch up to 100 inputs per API call (this endpoint supports batching).
- Print cost estimate at end (text-embedding-3-small = $0.02 / 1M tokens).

ACCEPTANCE
- One vector per pattern in `data/evals.json`.
- Each vector has length 1536.
- Total API cost <$0.01 for a 60-pattern library.

Show me the cost summary and confirm vector dimension when done.
```

---

## Prompt 6 — Home, Browse, and Eval Detail pages

```
Following eval-library-spec.md Sections 3 (IA), 4 (schema), and 11 (UI).

TASK
Build three pages: `/` (Home), `/browse` (Browse), `/eval/[id]` (Eval Detail). Also build the shared components.

SHARED COMPONENTS (in `src/components/`)
- `EvalCard.tsx` — card view of a pattern (name, one_liner, badges for category + difficulty + first feature_type, source operator + date). Click → /eval/[id]. Use Tailwind, hoverable.
- `FeatureTypeFilter.tsx` — multi-select chip filter for feature types. URL-synced via `useSearchParams` and `useRouter`.
- `DifficultyBadge.tsx` and `CategoryBadge.tsx` — mono-font small badges with subtle background.
- `SourceCitation.tsx` — renders operator + title + date + link in a tasteful inline block.
- `CodexPromptCopier.tsx` — code block with copy button (use `navigator.clipboard.writeText`).

DATA LAYER (in `src/lib/evals.ts`)
- Load `data/evals.json` at build time (server component). Type-validate with the Zod schema. Export `getAllEvals()` and `getEvalById(id)`.

HOME (`/`)
- Hero: "The AI PM Eval Library" (large), one-line value prop ("Every AI eval pattern from Lenny's operators, made buildable."), small subtext, attribution to Lenny.
- Three large entry-point cards in a row: "Browse all patterns" → /browse, "Find an eval for your feature" → /find, "Learn the basics" → /learn.
- Below: a small "Recently added" strip showing 3-4 random patterns (cards).
- Footer with About link, GitHub link, attribution.

BROWSE (`/browse`)
- Two-column layout: filter sidebar (left, ~280px) + card grid (right, responsive).
- Filters: feature type (multi), difficulty (single), category (multi), keyword search input.
- Filter state in URL params (e.g., `/browse?ft=chatbot,agent&cat=methodology`).
- Card grid: responsive (2-3 cols).
- Empty state: "No patterns match. Try clearing some filters."

EVAL DETAIL (`/eval/[id]`)
- Long-form, readable. Max-width ~720px.
- Header: name, one_liner, badges, source operator + episode.
- Sections: "What it is" (definition + explanation), "When to use" (bullets), "When NOT to use" (bullets), "Metric or method" (paragraph), "Common pitfalls" (bullets), "Source excerpt" (blockquote, smaller type), "Drop into Codex" (the codex_prompt_template in a code block with copy button), "All sources" (if multi-source, list each citation).
- "Back to Browse" link at top. "Find similar patterns" link at bottom → /find.

ACCEPTANCE
- All three pages render data from `data/evals.json`.
- Filters work and update the URL.
- Codex prompt copy button works.
- No console errors.
- `npm run build` succeeds.

Show me a screenshot of `/browse` and `/eval/llm-as-a-judge` (or any other id you have) when done.
```

---

## Prompt 7 — Find page + RAG API

```
Build the /find feature for the AI PM Eval Library: a textarea where users describe their AI feature, and a backend RAG endpoint that returns the top 3 matching eval patterns with one-line rationales.

Reference eval-library-spec.md Section 9 (API design) for the contract.

==== BACKEND ====

Create src/app/api/find/route.ts as a POST handler.

Imports:
- OpenAI from "openai" (used for both OpenAI embeddings and DeepSeek chat)
- Zod for request validation
- fs/promises and path for loading JSON data files
- The eval pattern type from src/lib/evals.ts

Module-scope caching: load data/eval-embeddings.json and data/evals.json once when the module is first imported. Keep them in module-level variables so subsequent requests reuse them.

Two OpenAI clients:
- openai: standard config, uses process.env.OPENAI_API_KEY (for embedding the query)
- deepseek: same OpenAI SDK with baseURL "https://api.deepseek.com/v1" and apiKey process.env.DEEPSEEK_API_KEY (for the rationale generation)

POST handler logic:
1. Parse and validate body with Zod: { query: string }, where query is min 5 and max 2000 chars.
2. Embed the query with model "text-embedding-3-small". Take the resulting 1536-dim vector.
3. For every entry in the cached eval-embeddings.json, compute cosine similarity vs the query vector. Since the stored vectors are already L2-normalized, cosine similarity = dot product — just sum element-wise products.
4. Sort by similarity descending. Take the top 5 candidates.
5. Look up the corresponding eval patterns from evals.json (by id).
6. Build a DeepSeek prompt that includes the user's query and a compact summary of the 5 candidates (id, name, one_liner, definition, first 3 when_to_use bullets). Ask DeepSeek to pick the 3 most relevant and write a single-sentence rationale per pick (<25 words). Use JSON mode. The shape of the requested response: { "matches": [{ "id": "...", "rationale": "..." }, ...] }
7. The DeepSeek model: read from process.env.DEEPSEEK_MODEL, fall back to `deepseek-v4-pro` for build pipeline scripts and `deepseek-v4-flash` for live /find usage. Temperature 0.3. max_tokens 600.
8. Parse the model's JSON. For each match, look up the eval pattern by id, attach the cosine score from step 4, and return:

  {
    "matches": [
      { "id": "<eval-id>", "rationale": "<one sentence>", "score": 0.81 }
    ]
  }

Error handling:
- 400 if body validation fails — return { error: "<message>" }
- 502 if the embedding call or DeepSeek call throws — return { error: "Model service unavailable, try again" }
- 500 for everything else with a generic message
- All errors logged server-side with console.error

==== FRONTEND ====

Create src/app/find/page.tsx.

Layout:
- Two-column on desktop is overkill — use a single centered column, max-w-3xl, py-12.
- Top: heading "Find an eval for your feature" (h1, slate-900), subtitle in slate-600 ("Describe what you are building. We will surface the three closest patterns from the library.").
- Form section:
  - A textarea (id "query"), 5 rows, w-full, rounded-md, border-gray-300, focus:border-blue-600 focus:ring-blue-600, placeholder: "I'm building a customer support chatbot that pulls answers from a help center. What evals should I have?"
  - Below the textarea, right-aligned submit button: "Find evals" (blue-600 bg, white text, rounded-md, px-5 py-2.5, hover darken). Disable + show "Finding..." while loading.
- Below the form (vertical stack with gap-6):
  - Loading state: 3 skeleton cards (animate-pulse, slate-100 background, h-40)
  - Error state: a slim red-bordered alert with the error message and a "Try again" link
  - Empty state (no submission yet): a muted hint "Try: 'I'm building an agent that books meetings on my calendar' or 'I need evals for a RAG-based search over our docs.'"
  - Results state: 3 results stacked. For each, show a slate-600 italic rationale line ("Why this fits:"), then render an EvalCard (reuse the existing component from /browse) below it.
- Bottom of page (when results shown): a footer link "Not seeing the right pattern? Browse all 43 →" linking to /browse.

Client behavior:
- Use "use client" directive.
- State: query (string), isLoading (bool), error (string|null), results (array|null).
- On submit: POST to /api/find with { query }. Handle 400/502/500 with appropriate user-visible errors.
- Scroll the results into view after they render (optional polish).

Reuse EvalCard from src/components/EvalCard.tsx exactly as-is — do not modify it.

==== TYPES ====

Update src/lib/evals.ts (or create src/lib/find.ts) to export a FindMatch type:

  type FindMatch = {
    id: string;
    rationale: string;
    score: number;
    pattern: EvalPattern;
  };

The /find page should attach the looked-up pattern to each match for rendering.

==== ENV ====

Make sure .env.local has both DEEPSEEK_API_KEY and OPENAI_API_KEY set before testing. The root layout or a top-level check can warn in development if they're missing.

==== ACCEPTANCE ====

1. Submitting "I'm building a chatbot that answers customer support questions from our docs" returns 3 patterns in under 5 seconds.
2. The 3 cards link correctly to their /eval/[id] detail pages.
3. The DevTools network tab shows exactly one POST to /api/find per submission.
4. Empty submission shows a 400 error message gracefully (not a crash).
5. npm run build succeeds.
6. npm run lint passes.
7. Test with 3 more queries and confirm rationales make sense:
   - "I'm building an autonomous agent that books meetings on my calendar"
   - "I need to evaluate a RAG system over our help docs"
   - "How do I measure if my AI-generated marketing copy is good"

When done, paste back the three rationale outputs from those three test queries so the retrieval + rationale layer can be sanity-checked.
```

---

## Prompt 8 — Learn, About, README, Deploy

```
Following eval-library-spec.md Sections 3, 13, and 14.

TASK
Build the final two pages, write the README, and deploy.

LEARN (`/learn`)
- A linear, opinionated walkthrough for aspiring AI PMs.
- Five steps with progress dots at the top:
  1. "What is an eval?" — short prose + one example pattern card (pick a "beginner" pattern from data).
  2. "The 4 eval categories" — explains methodology/metric/process/framework with one card from each.
  3. "Your first eval (a worked example)" — pick a high-quality beginner pattern, walk through every field with annotations explaining why.
  4. "Reading any pattern" — labeled diagram of an eval card showing what to look at first.
  5. "Where to go next" — link to /browse and /find with prompts to try.
- Next/Previous buttons. Progress persisted in localStorage so users can resume.

ABOUT (`/about`)
- Sections per Section 13 of the spec.
- Methodology: how patterns were extracted (DeepSeek over a curated set of Lenny files, manual review of "verified" status), what the schema is, how to suggest corrections.
- Attribution to Lenny Rachitsky with a clear "all source content belongs to Lenny" notice.
- Link to GitHub repo.
- "If you're Lenny": a polite note inviting feedback or a takedown request.

README (in repo root)
- Project description with tagline.
- Live demo URL.
- Stack summary.
- Quickstart for local dev (clone, `.env.local` setup, run scripts).
- How extraction works.
- Attribution and license (MIT for code, content attributed to Lenny).
- Contribution guide: how to suggest a missing pattern or flag an extraction error (open a GitHub issue with template).

DEPLOY
- Initialize a Git repo, commit, push to a new public GitHub repo named `eval-library` (use `gh repo create eval-library --public --source=. --push`).
- Connect to Vercel via CLI: `npx vercel`.
- Set env vars on Vercel: `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, `NEXT_PUBLIC_SITE_URL`. (The LENNY_CORPUS_PATH is only needed for the scripts, not for the deployed site — `data/evals.json` and `data/eval-embeddings.json` are checked into the repo.)
- Confirm production deploy works end-to-end: visit each page, test /find.

ACCEPTANCE
- /learn flows correctly with persisted progress.
- /about renders all sections and links.
- README is complete.
- Production site live at a Vercel URL.
- /find works in production.

Send me the final URL when done.
```

---

## Notes on running these

- **You can paste the spec doc into Codex once at the start** so it's always referenced.
- **Run each prompt as a separate Codex session/conversation** if you want clean context. Or run them sequentially in one session for continuity.
- **If Codex gets confused on a prompt, ask it to re-read the spec section referenced** before retrying.
- **Don't skip the acceptance check.** Each prompt has criteria — verify before moving on, especially after Prompt 3 (extraction) where the data quality determines everything downstream.
- **Manual curation pass.** After Prompt 4 generates `data/evals.json`, spend 30-60 minutes reading through it and editing patterns by hand. Flip `curation_status: "auto"` to `"verified"` or `"edited"` as you go. This is the single biggest quality lever.
- **Cost expectation.** Whole extraction: ~$0.50-2.00 in DeepSeek calls, <$0.01 in OpenAI embeddings. Each /find query at runtime: <$0.001. Vercel hosting: free tier.

If anything in the spec or any prompt is unclear once you start, come back and ask — better to fix a prompt than fight Codex's interpretation.
