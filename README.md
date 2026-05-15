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
1. Clone and install: `git clone ... && cd eval-library && npm install`
2. Copy `.env.example` to `.env.local` and fill in `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, and `LENNY_CORPUS_PATH`
3. `npm run dev` to start locally

## Data pipeline (only needed to regenerate the library)
- `npm run extract:select` — picks files from Lenny's corpus
- `npm run extract:patterns` — DeepSeek extraction
- `npm run extract:curate` — dedup + cluster + bullet cap
- `npm run extract:embed` — OpenAI embeddings
- `npm run extract:all` — runs all four

## Attribution
All source content belongs to Lenny Rachitsky. This project presents extracted summaries and analysis with attribution and direct links back to the originals.

## License
MIT for the code. Source content remains the property of Lenny Rachitsky.

## Contribute
Spotted a missing pattern or an extraction error? Open a GitHub issue.
