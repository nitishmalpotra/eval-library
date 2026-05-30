# AI PM Eval Library

> Every AI eval pattern from Lenny's operators, made buildable.

[Live demo](https://eval-library.vercel.app)

A curated, opinionated library of AI evaluation patterns extracted from Lenny Rachitsky's newsletter and podcast corpus. Browse 73 patterns, find evals matched to your AI feature via semantic search, and paste pre-engineered prompt templates straight into your workflow. Compatible with Codex, Cursor, Claude Code, ChatGPT, and similar AI tools.

## Stack
- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- DeepSeek API (extraction + rationale generation)
- OpenAI text-embedding-3-small (semantic search)
- Hosted on Vercel

## Quickstart
The deployed demo uses paid APIs; self-hosting lets you use your own keys.

1. Clone: `git clone <repo-url> && cd eval-library`
2. Install: `npm install`
3. Copy env: `cp .env.example .env.local`
4. Configure `.env.local`:
   - `DEEPSEEK_API_KEY` — sign up at https://platform.deepseek.com
   - `OPENAI_API_KEY` — sign up at https://platform.openai.com (only used for embeddings — a few cents)
   - `DEEPSEEK_MODEL_PIPELINE` — optional; model used by extraction/curation/refinement. Default: `deepseek-v4-pro`
   - `DEEPSEEK_MODEL_RUNTIME` — optional; model used by the live /find endpoint. Default: `deepseek-v4-flash`
   - `DEEPSEEK_MODEL` — optional fallback for both pipeline and runtime if you prefer a single var
5. Run: `npm run dev` and open http://localhost:3000

You do NOT need `LENNY_CORPUS_PATH` unless you're regenerating the data — the extracted patterns and embeddings are already committed in `data/`.

## Data pipeline (only needed to regenerate the library)
- `npm run extract:select` — picks files from Lenny's corpus
- `npm run extract:patterns` — DeepSeek extraction using `DEEPSEEK_MODEL_PIPELINE` (default `deepseek-v4-pro`)
- `npm run extract:curate` — dedup + merge + validate → `data/evals.json` using `DEEPSEEK_MODEL_PIPELINE`
- `npm run refine` — DeepSeek pass that tightens each pattern's `one_liner`, `codex_prompt_template`, and `feature_types` in `data/evals.json` (backs up the prior version to `data/evals.pre-refine.json`), using `DEEPSEEK_MODEL_PIPELINE`
- `npm run extract:embed` — OpenAI embeddings
- `npm run extract:all` — runs select → patterns → curate → embed (run `refine` separately, before `extract:embed`, when you want it)

## Attribution
All source content belongs to Lenny Rachitsky. This project presents extracted summaries and analysis with attribution and direct links back to the originals.

## License
MIT for the code. Source content remains the property of Lenny Rachitsky.

## Contribute
Spotted a missing pattern or an extraction error? Open a GitHub issue.
