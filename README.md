# AI PM Eval Library

> Every AI eval pattern from Lenny's operators, made buildable.

[Live demo](https://eval-library.vercel.app)

A curated, opinionated library of AI evaluation patterns extracted from Lenny Rachitsky's newsletter and podcast corpus. Browse 43 patterns, find evals matched to your AI feature via semantic search, and paste pre-engineered prompt templates straight into your workflow. Compatible with Codex, Cursor, Claude Code, ChatGPT, and similar AI tools.

## Stack
- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- OpenRouter for the /find judge and for embeddings, through the OpenAI SDK
- Hosted on Vercel

## Quickstart
The deployed demo uses paid APIs; self-hosting lets you use your own keys.

1. Clone: `git clone <repo-url> && cd eval-library`
2. Install: `npm install`
3. Copy env: `cp .env.example .env.local`
4. Configure `.env.local`:
   - `OPENROUTER_API_KEY` — create a key at https://openrouter.ai
   - `OPENROUTER_MODEL_RUNTIME` — optional; model used by the live /find endpoint. Default: `anthropic/claude-haiku-5.5`
   - `OPENROUTER_MODEL_EMBED` — optional; embeddings model. Default: `google/gemini-embedding-2`
   - `OPENROUTER_MODEL_PIPELINE`, `OPENROUTER_MODEL_CLUSTER`, and `OPENROUTER_MODEL_TRIAGE` — optional; used by the data scripts. Defaults are in `.env.example`
   - `NEXT_PUBLIC_SITE_URL` — optional; sent to OpenRouter as the `HTTP-Referer` header
   - `NEXT_PUBLIC_REPO_URL` — optional; GitHub link shown in the UI
   - `FIND_DAILY_LIMIT` — optional; searches per IP per day on `/find`. Default: `10`
5. Run: `npm run dev` and open http://localhost:3000

You do NOT need a corpus checkout unless you're regenerating the data — the extracted patterns and embeddings are already committed in `data/`. Regeneration reads `CORPUS_DIR` (default `./corpus`).

## Data pipeline (only needed to regenerate the library)
- `npm run extract:triage` — LLM-scores every file in the corpus → `data/triage.json`, `data/files-to-process.json`, and `data/library-stats.json`
- `npm run extract:patterns` — extraction using `OPENROUTER_MODEL_PIPELINE` (default `anthropic/claude-sonnet-5.5`)
- `npm run extract:curate` — dedup + merge + validate → `data/evals.json` using `OPENROUTER_MODEL_CLUSTER` (default `anthropic/claude-opus-5.5`). Writes `data/id-redirects.json` for old pattern URLs.
- `npm run refine` — pass that tightens each pattern's `one_liner`, `codex_prompt_template`, and `feature_types` in `data/evals.json` (backs up the prior version to `data/evals.pre-refine.json`), using `OPENROUTER_MODEL_PIPELINE`
- `npm run backfill` — fills any empty `when_not_to_use` / `common_pitfalls` bullet lists, grounded in each pattern's content (idempotent; backs up to `data/evals.pre-backfill.json`)
- `npm run deepen` — expands thin (<300 char) `explanation` fields into 2-3 grounded paragraphs (idempotent; backs up to `data/evals.pre-deepen.json`)
- `npm run extract:embed` — embeddings via `OPENROUTER_MODEL_EMBED` (default `google/gemini-embedding-2`). The vector dimension is read from the response. Vector values are rounded to 6 decimals.
- `npm run library:build` — full rebuild: triage → patterns → curate → refine → backfill → deepen → embed. The quality passes are part of the rebuild because they change text that feeds the embeddings. A run stops if projected or actual spend would pass `PIPELINE_BUDGET_USD` (default $35).

## Search quality
`npm run eval:search` runs `data/search-evals.json` through `findEvals` (no HTTP server). It prints junk rejection, false rejection on accepted queries, precision@strong, primary and all-labels recall@5, the share of primary ids shown as strong, latency, cost, and a `SIM_FLOOR` sweep that reuses the embeddings and judge output from that run. It overwrites `data/search-eval-report.md` with the same report. `SIM_FLOOR` lives in `src/lib/find.ts`. The script does not edit it.

## Attribution
All source content belongs to Lenny Rachitsky. This project presents extracted summaries and analysis with attribution and direct links back to the originals.

## License
MIT for the code. Source content remains the property of Lenny Rachitsky.

## Contribute
Spotted a missing pattern or an extraction error? Open a GitHub issue.
