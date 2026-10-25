# The AI Eval Field Guide

> Eval patterns from the people who ship AI, sourced, cited, and ready to use.

[Live demo](https://eval-library.vercel.app)

A citation-first library of AI evaluation patterns from Lenny's Newsletter, Lenny's Podcast, Aakash Gupta, and AI Engineer. Browse the patterns, describe a feature to get the closest evals, and copy a prompt into Codex, Cursor, Claude Code, ChatGPT, or a similar tool.

The committed library has **76 patterns**. The site reads `data/evals.json`, so the counts on the pages come from that file.

The description of what shipped is [`docs/eval-library-spec.md`](docs/eval-library-spec.md). [`docs/implementation-plan.md`](docs/implementation-plan.md) is the historical plan.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- OpenRouter for chat and embeddings, through the OpenAI SDK (`src/lib/openrouter.ts`)
- Hosted on Vercel

| Role | Env var | Default |
|---|---|---|
| Triage | `OPENROUTER_MODEL_TRIAGE` | `anthropic/claude-haiku-5.5` |
| Extraction and quality passes | `OPENROUTER_MODEL_PIPELINE` | `anthropic/claude-sonnet-5.5` |
| Clustering | `OPENROUTER_MODEL_CLUSTER` | `anthropic/claude-opus-5.5` |
| Live `/find` judge | `OPENROUTER_MODEL_RUNTIME` | `anthropic/claude-haiku-5.5` |
| Embeddings | `OPENROUTER_MODEL_EMBED` | `google/gemini-embedding-2` |

The judge falls back to `google/gemini-3.1-flash-lite` when the runtime model is unavailable. The committed vectors are `google/gemini-embedding-2`, 3072 dimensions. `/find` refuses to serve if `OPENROUTER_MODEL_EMBED` disagrees with the `model` field in `data/eval-embeddings.json`.

## Quickstart

Node 22 or newer. The data scripts use Node's `--env-file-if-exists`.

1. `git clone https://github.com/nitishmalpotra/eval-library.git && cd eval-library`
2. `npm install`
3. `cp .env.example .env.local`
4. Set `OPENROUTER_API_KEY` in `.env.local`. Create a key at https://openrouter.ai
5. `npm run dev` and open http://localhost:3000

The running site uses the committed files in `data/`. A corpus checkout is only for `npm run library:build`.

## Environment variables

`npm run dev` and `npm run build` read `.env.local`. The data scripts read the same file through `tsx --env-file-if-exists=.env.local`. Vercel uses the project environment, not `.env.local`.

Keep a pipeline key in `.env.local` and a separate runtime key on Vercel, with a credit limit on the runtime key. The daily search cap is in memory on each server instance. The key limit is the ceiling that survives a cold start.

| Variable | Local `.env.local` | Vercel |
|---|---|---|
| `OPENROUTER_API_KEY` | Required for `/find` and for a rebuild | Required |
| `OPENROUTER_MODEL_RUNTIME` | Optional. Default above | Optional. Same default |
| `OPENROUTER_MODEL_EMBED` | Optional. Leave it on `google/gemini-embedding-2` unless you re-embed | Optional. Same constraint. A different value makes `/find` fail at load |
| `FIND_DAILY_LIMIT` | Optional. Default `10` searches per IP per day | Optional. Same default |
| `NEXT_PUBLIC_SITE_URL` | Optional. Sent to OpenRouter as `HTTP-Referer` | Set the production URL |
| `NEXT_PUBLIC_REPO_URL` | Optional. GitHub link in the footer and on About | Set the repository URL |
| `OPENROUTER_MODEL_TRIAGE` | Optional. Rebuild only | Unused |
| `OPENROUTER_MODEL_PIPELINE` | Optional. Rebuild only | Unused |
| `OPENROUTER_MODEL_CLUSTER` | Optional. Rebuild only | Unused |
| `CORPUS_DIR` | Optional. Default `./corpus` | Unused. `corpus/` is gitignored |
| `PIPELINE_BUDGET_USD` | Optional. Default `35` | Unused. A rebuild stops before a call that would pass this |

## Corpus layout

```
corpus/                      # gitignored
├── lenny/                   # archive: index.json, podcasts/, newsletters/
├── lenny-transcripts/       # later Lenny podcast transcripts
├── aakash/
└── ai-engineer/
```

`scripts/lib/corpus.ts` registers each folder in `SOURCES`:

| Folder | Publication | Kind |
|---|---|---|
| `lenny` | Lenny's Newsletter, or Lenny's Podcast for `podcasts/` | newsletter, refined per subfolder |
| `lenny-transcripts` | Lenny's Podcast | podcast |
| `aakash` | Aakash Gupta | podcast |
| `ai-engineer` | AI Engineer | talk |

To add a source, drop a folder of `.md` files into `corpus/` and add one line to `SOURCES` in `scripts/lib/corpus.ts`. A folder missing from that map is still loaded: the publication name is the folder name, the kind is `video`, and the loader prints a warning.

## Rebuilding the library

`npm run library:build` runs, in order:

1. `extract:triage` — score every file. Writes `data/triage.json`, `data/files-to-process.json`, and `data/library-stats.json`.
2. `extract:patterns` — extract from the selected files with `OPENROUTER_MODEL_PIPELINE`.
3. `extract:curate` — cluster, apply the eval-pattern bar, and write `data/evals.json`, `data/curation-report.md`, and `data/id-redirects.json` with `OPENROUTER_MODEL_CLUSTER`.
4. `refine`, `backfill`, and `deepen` — quality passes on `OPENROUTER_MODEL_PIPELINE`. They are part of the rebuild because they change text that is embedded.
5. `extract:embed` — write `data/eval-embeddings.json` with `OPENROUTER_MODEL_EMBED`. The vector dimension is read from the response. Values are rounded to 6 decimals.

A full rebuild of the current corpus costs about **$20**. The run stops if projected or actual spend would pass `PIPELINE_BUDGET_USD` (default $35).

The individual npm scripts above can rerun one stage. Per-file extraction output and the pre-pass backups (`data/extracted/`, `data/evals.pre-*.json`) are gitignored.

## Search quality

`npm run eval:search` runs `data/search-evals.json` through `findEvals` with no HTTP server. It prints junk rejection, false rejection on accepted queries, precision@strong, primary and all-labels recall@5, the share of primary ids shown as strong, latency, cost, and a `SIM_FLOOR` sweep that reuses the embeddings and judge output from that run. It overwrites [`data/search-eval-report.md`](data/search-eval-report.md) with the same report. It does not edit `SIM_FLOOR` (`src/lib/find.ts`, currently `0.5`).

The committed report (2026-10-24, `google/gemini-embedding-2`) met its hard gates:

| Metric | Value | Target |
|---|---|---|
| Junk rejection | 1.000 | ≥ 0.95 |
| Prompt-injection cases missed | 0 | 0 |
| False rejection | 0.000 | ≤ 0.05 |
| Primary recall@5 | 0.980 | ≥ 0.9 |
| Latency p95 | 4187 ms | ≤ 5000 ms |
| Robustness | 1.000 | 100% |

Printed for context, and not a failing gate on that run: precision@strong 0.732, all-labels recall@5 0.700, primary shown as strong 0.757. Median latency 3467 ms. Run cost $0.1301.

## Attribution

Source content belongs to its creators: Lenny Rachitsky (Lenny's Newsletter and Lenny's Podcast), Aakash Gupta, and AI Engineer. Each pattern cites the operator, the publication, and a link to the original when one is known, and may include a short verbatim excerpt.

## License

MIT for the code. See [`LICENSE`](LICENSE). The newsletters, podcasts, and talks are not covered by that license.

## Contribute

Corrections and missing patterns are welcome as GitHub issues.
