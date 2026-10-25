# The AI Eval Field Guide — Current Spec

**Canonical spec.** This file describes the product as it ships. `docs/implementation-plan.md` is the historical plan (completed 2026-10-25) and was not rewritten to match the code. Older notes live in `docs/archive/`.

**Product name:** The AI Eval Field Guide
**Tagline:** "Eval patterns from the people who ship AI, sourced, cited, and ready to use."

A free, open-source, citation-first reference. It extracts AI evaluation patterns from several publications, organizes them by feature type, and ships each pattern with a ready-to-paste prompt. The committed library has **76 patterns** (`data/evals.json`, curated 2026-10-24).

Live site: https://eval-library.vercel.app

---

## 1. Why this product exists

**The pain it solves.** Working AI PMs ship without evals because they don't know what an eval looks like for their feature type. Aspiring AI PMs can define "eval" but can't write one. Both audiences need a concrete, browseable, citable library of eval patterns by feature type.

**Where the patterns come from.** The library is built from Lenny's Newsletter, Lenny's Podcast, Aakash Gupta, and AI Engineer. The same pattern often shows up in more than one of those, so each card names the publication and a pattern can carry more than one source.

**What it is for.** Generic "ask the corpus" tools answer questions. This product does the opposite: pre-extracted, pre-structured patterns for one job, evaluating an AI feature.

---

## 2. Target users

**Primary (working AI PMs):** PMs shipping AI features who need "what evals should we run for X?" in their workflow. They browse and copy patterns into Cursor, Codex, or a similar tool.

**Secondary (aspiring AI PMs):** Career builders learning AI PM craft. They take a guided tour, see what evals look like with a worked example, and pick up vocabulary.

---

## 3. Information architecture

1. **`/` — Home.** Serif hero, tagline, a sources line built from the data, and a stat row: patterns, publications, operators, files scanned. Three notebook-tab entry points: Browse, Find, Learn. A short row of recently dated specimens. A sources strip of publication names.
2. **`/browse` — Library.** Card grid of every pattern. Filters, synced to the query string: keyword (`q`), feature type, publication (`pub`), difficulty, and category. The nav label is "Library".
3. **`/eval/[id]` — Pattern detail.** Statically generated. Definition, explanation, when to use, when not to use, metric, pitfalls, numbered sources, a verbatim excerpt, and a prompt with one-click copy. Old ids redirect from `data/id-redirects.json`.
4. **`/find` — Find an eval.** The user describes an AI feature. The page returns up to five patterns, each strong or weak, with a one-line rationale. Gibberish, off-topic, vague, and non-request input is rejected with a reason. Weak matches render in a separate muted section.
5. **`/learn` — Five chapters.** "What is an eval?", "Four categories", "A worked example", "How to read one", "Where next". Content is drawn from the same pattern data.
6. **`/about` — Methodology.** How patterns are extracted, live counts from `data/library-stats.json` and `data/evals.json`, the latest search-eval headline from `data/search-eval-report.md`, and multi-source attribution.

---

## 4. The core data model — eval pattern schema

`src/lib/evals.ts` validates `data/evals.json` with zod at import time. Embeddings live in `data/eval-embeddings.json` (one vector per pattern).

```typescript
type EvalPattern = {
  id: string;                          // kebab-case, unique
  name: string;
  one_liner: string;
  category: "methodology" | "metric" | "process" | "framework";
  feature_types: FeatureType[];
  difficulty: "beginner" | "intermediate" | "advanced";

  definition: string;
  explanation: string;
  when_to_use: string[];
  when_not_to_use: string[];
  metric_or_method: string;
  common_pitfalls: string[];

  source_operator: string;             // primary citation; may name more than one person
  source_publication: string;          // "Lenny's Podcast", "Lenny's Newsletter", "Aakash Gupta", "AI Engineer"
  source_file: string;                 // path relative to corpus/, e.g. "lenny/podcasts/hamel-husain--shreya-shankar.md"
  source_title: string;
  source_date: string;                 // ISO date, or "" when the source has no date
  source_url?: string;
  source_excerpt: string;              // verbatim passage, with [...] for elisions
  sources?: Array<{                    // further citations when a pattern was merged
    file: string;
    title: string;
    date: string;
    operator: string;
    publication: string;
    url?: string;
    excerpt: string;
  }>;

  codex_prompt_template: string;       // paste-ready prompt; uses [PLACEHOLDERS]
  keywords: string[];
  curation_status: "auto" | "verified" | "edited";
};

type FeatureType =
  | "chatbot"
  | "agent"
  | "rag"
  | "classification"
  | "summarization"
  | "code_generation"
  | "search_ranking"
  | "multimodal"
  | "general";
```

The shipped library is all `curation_status: "edited"`, set by `scripts/05-refine.ts`. `auto` and `verified` are reserved and unused. Specimen numbers on the cards are the 1-based index of the id after sorting ids, from `getSpecimenNumber`.

Shipped snapshot (2026-10-24): **76 patterns**, **34 operators**, four publications. A merged pattern can count toward more than one publication. Kept coverage in `data/curation-report.md`: Lenny's Podcast 62, Lenny's Newsletter 35, AI Engineer 14, Aakash Gupta 7.

---

## 5. How files become patterns

`scripts/01-triage.ts` asks a model about every file, then extraction runs on the files that qualify.

### Corpus

`scripts/lib/corpus.ts` walks `CORPUS_DIR` (default `./corpus`). `corpus/` is gitignored. Registered folders:

| Folder | Publication | Kind |
|---|---|---|
| `lenny` | Lenny's Newsletter, or Lenny's Podcast for files under `podcasts/` | newsletter, refined per subfolder |
| `lenny-transcripts` | Lenny's Podcast | podcast |
| `aakash` | Aakash Gupta | podcast |
| `ai-engineer` | AI Engineer | talk |

`lenny/` is the archive with `index.json`, `podcasts/`, and `newsletters/`. The other three folders are markdown transcripts: a `# Title` line, a `**Source:**` URL, then the body. Optional YAML frontmatter can supply `date` and `guest`. Adding a source is one new folder plus one line in the `SOURCES` map. An unknown folder still loads, under its folder name, as kind `video`, with a console warning.

The loader dedupes on normalized URL, and on normalized title-before-`|` plus operator. On a collision it keeps the copy that has frontmatter.

### Triage

For each file, `OPENROUTER_MODEL_TRIAGE` (default `anthropic/claude-haiku-5.5`) returns strict JSON:

```typescript
{
  eval_relevance: 0 | 1 | 2 | 3,  // 0 none, 1 passing mention, 2 substantive section, 3 primarily about evals
  operators: string[],
  eval_topics: string[],
  rationale: string
}
```

Results are cached in `data/triage.json` by file hash. A file is selected when `eval_relevance >= 1` or it is in `FORCE_INCLUDE` (eight Lenny files that were the old primary set, plus the Aakash eval talk and the two AI Engineer eval talks). There is no count cap. The budget guard is the cap.

Committed `data/library-stats.json` (generated 2026-10-24): **686 files scanned**, **99 selected**.

| Publication | Files scanned |
|---|---:|
| Lenny's Newsletter | 349 |
| Lenny's Podcast | 334 |
| AI Engineer | 2 |
| Aakash Gupta | 1 |

Triage prints a projected extraction cost and aborts if that projection exceeds the remaining `PIPELINE_BUDGET_USD` (default $35). Spend is the sum of OpenRouter `usage.cost`, stored in `data/extracted/.spend.json` (gitignored).

### Extraction, curation, and the eval-pattern bar

`scripts/02-extract-patterns.ts` reads `data/files-to-process.json` and calls `OPENROUTER_MODEL_PIPELINE` (default `anthropic/claude-sonnet-5.5`). A file goes out in one call up to 300,000 characters. Longer files split on blank lines or `###` headings.

`scripts/03-curate.ts` clusters with `OPENROUTER_MODEL_CLUSTER` (default `anthropic/claude-opus-5.5`). The model may drop a cluster that is not an AI-eval pattern. After that, a fixed **eval-pattern bar** edits the library: a kept pattern has to measure AI output quality with a repeatable decision signal a product team can run on its own product. The script drops five patterns that fail that bar, merges six narrower patterns into parents, rescues one previously dropped raw pattern ("PM-Authored Evals Relayed to Engineering") into `evals-as-product-requirements`, and refuses to write `data/evals.json` unless the result is **76** patterns. The ids live in `BAR_DROPS` and `BAR_MERGES` in `scripts/03-curate.ts`. The curation report records the drops under that bar sentence.

The 2026-10-24 run: 317 raw extractions, 76 kept, 55 merged clusters, 4 clusters dropped by the model plus the bar edits. Every pattern's primary excerpt is checked, `[...]`-split, against the corpus body before the file is written. Retired ids are mapped to the nearest new id in `data/id-redirects.json`, and `next.config.ts` serves those as permanent redirects.

`npm run library:build` then runs `refine`, `backfill`, and `deepen` before `extract:embed`, because those passes change text that is embedded. A full rebuild of this corpus costs about **$20**, inside the $35 stop.

---

## 6. Project structure

```
eval-library/
├── README.md
├── AGENTS.md
├── CLAUDE.md
├── LICENSE                          # MIT for the code; source content excluded
├── package.json
├── next.config.ts                   # permanent redirects from data/id-redirects.json
├── .env.example
├── .env.local                       # gitignored
├── data/
│   ├── evals.json                   # 76 patterns
│   ├── eval-embeddings.json         # model, dimension, one vector per pattern
│   ├── files-to-process.json        # triage selection
│   ├── triage.json                  # cached per-file scores
│   ├── library-stats.json           # scanned / selected counts for the UI
│   ├── curation-report.md
│   ├── id-redirects.json
│   ├── search-evals.json            # labeled /find cases
│   ├── search-eval-report.md        # last npm run eval:search report
│   └── extracted/                   # gitignored per-file extraction and .spend.json
├── corpus/                          # gitignored; see §5
├── docs/
│   ├── eval-library-spec.md         # this file
│   ├── implementation-plan.md       # historical plan
│   └── archive/                     # superseded notes
├── scripts/
│   ├── 01-triage.ts
│   ├── 02-extract-patterns.ts
│   ├── 03-curate.ts
│   ├── 04-embed.ts
│   ├── 05-refine.ts
│   ├── 06-backfill.ts
│   ├── 07-deepen-explanations.ts
│   ├── 08-eval-search.ts
│   └── lib/                         # corpus.ts, llm.ts, and helpers
└── src/
    ├── app/                         # /, /browse, /eval/[id], /find, /learn, /about, /api/find
    ├── components/
    └── lib/
        ├── evals.ts
        ├── openrouter.ts
        ├── find.ts                  # findEvals, SIM_FLOOR
        ├── findQuota.ts             # daily cap
        ├── queryQuality.ts          # gibberish pre-filter
        ├── fieldGuide.ts            # counts and sources line
        └── searchEval.ts            # About-page headline from the report
```

`data/evals.pre-*.json` is written by the quality passes and gitignored. Unit tests sit next to the modules (`node:test`) and run with `npx tsx --test`.

---

## 7. Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4. The visual language is a lab notebook / field guide: Fraunces for display, Inter for UI, JetBrains Mono for meta, a paper/blueprint palette, CSS-only motion. No animation dependency.
- **Provider:** OpenRouter, called with the `openai` SDK at `https://openrouter.ai/api/v1`. One client in `src/lib/openrouter.ts`, created on first use.

| Role | Model |
|---|---|
| Triage | `anthropic/claude-haiku-5.5` |
| Extraction, refine, backfill, deepen | `anthropic/claude-sonnet-5.5` |
| Clustering | `anthropic/claude-opus-5.5` |
| `/find` judge | `anthropic/claude-haiku-5.5`, fallback `google/gemini-3.1-flash-lite` |
| Embeddings | `google/gemini-embedding-2` (3072-d in the committed file) |

- **Search:** in-memory cosine over the committed vectors. No vector database.
- **Deployment:** Vercel.
- **License:** MIT for the code. Source content stays with its creators. See §13.

Pipeline calls sum `usage.cost`. The runtime judge sets OpenRouter reasoning to `effort: "none"`. Pipeline calls leave reasoning on and use a large `max_tokens`. Structured outputs send `provider: { require_parameters: true }`.

Changing the embedding model means re-running `npm run extract:embed` and `npm run eval:search`, then setting `SIM_FLOOR` from that report. Cosine scales are model-specific.

---

## 8. Environment variables

Copy `.env.example` to `.env.local`. Next.js reads `.env.local`. Scripts read it via `tsx --env-file-if-exists=.env.local`. On Vercel, set the project environment. Vercel never sees `.env.local`.

| Variable | Local `.env.local` | Vercel |
|---|---|---|
| `OPENROUTER_API_KEY` | Required for `/find` and for a rebuild | Required. Prefer a runtime key with a dashboard credit limit |
| `OPENROUTER_MODEL_RUNTIME` | Optional | Optional |
| `OPENROUTER_MODEL_EMBED` | Optional. Must match `data/eval-embeddings.json` | Optional. Same constraint. A mismatch fails `/find` at load |
| `FIND_DAILY_LIMIT` | Optional. Default `10` | Optional. Same default |
| `NEXT_PUBLIC_SITE_URL` | Optional. OpenRouter `HTTP-Referer` | Set the production URL |
| `NEXT_PUBLIC_REPO_URL` | Optional. Footer and About | Set the repository URL |
| `OPENROUTER_MODEL_TRIAGE` | Optional. Rebuild only | Unused |
| `OPENROUTER_MODEL_PIPELINE` | Optional. Rebuild only | Unused |
| `OPENROUTER_MODEL_CLUSTER` | Optional. Rebuild only | Unused |
| `CORPUS_DIR` | Optional. Default `./corpus` | Unused |
| `PIPELINE_BUDGET_USD` | Optional. Default `35` | Unused |

The running site needs `OPENROUTER_API_KEY`. Model vars fall back to the defaults in `src/lib/openrouter.ts` and `.env.example`. `CORPUS_DIR` is read only by the scripts.

---

## 9. `/api/find`

The only API route. Logic lives in `findEvals` (`src/lib/find.ts`). The route handles HTTP, the daily cap, and errors.

**Request:**

```json
POST /api/find
{ "query": "I'm building a customer support chatbot that pulls answers from a help center." }
```

The query is a string, trimmed, whitespace-collapsed, trailing punctuation stripped, and capped at 1000 characters. Empty or non-string input is HTTP 400.

**Pipeline:**

1. **Pre-filter** (`src/lib/queryQuality.ts`). Obvious junk is `gibberish` with no model call: too few real words, a low letter ratio, a high share of vowelless tokens or 5-consonant runs, a character repeated six times, or a keyboard-row smash. A single real word such as "chatbot" passes. The heuristic only saves calls. The judge is the real gate.
2. **Cache.** An in-memory map of about 500 normalized queries. A hit skips the models and does not spend quota.
3. **Embed** the query with `OPENROUTER_MODEL_EMBED`. At load, the embedding file's `model` must equal that env value.
4. **Retrieve the top 12** by cosine.
5. **Similarity floor.** `SIM_FLOOR` is `0.5` in `src/lib/find.ts`. It is the lowest accept-case top-1 on the committed search eval (0.609) minus 0.10, rounded down. If the top score is below the floor, the route returns `no_match` and does not call the judge. `npm run eval:search` still judges those queries so the threshold sweep can replay without another model call.
6. **Judge.** `OPENROUTER_MODEL_RUNTIME`, temperature 0, strict JSON schema, `require_parameters`, reasoning off, fallback model `google/gemini-3.1-flash-lite`. The query is inside `<user_query>` and the candidates inside `<candidates>`. Those tags are data. A verdict is `ok`, `gibberish`, `too_vague`, `off_topic`, or `not_a_request`. On `ok`, the model returns a fit for every candidate: `strong` (it evaluates a specific behavior the query names), `weak` (it could be used, including for part of the job), or `none`. A query that only names a broad type or topic ("chatbot", "RAG evals", "hallucination") must not be marked strong. One validation retry appends the error.
7. **Combine.** Unknown ids are dropped. At most two `strong` fits are kept, the two with the higher cosine. Any further `strong` fit is shown as `weak`. Results sort strong first, then by score, and stop at five. `ok` with an empty list is an honest empty state.

Strength is the judge's fit, then that two-strong cap. `SIM_FLOOR` is the only cosine cutoff.

**Responses.** Every body includes `remaining`, the searches left for this IP today.

Accepted shape. The `pattern` object is the committed `llm-as-a-judge` card (specimen 41). `score`, `fit`, and `rationale` show the field types. A live response fills them for that query.

```json
{
  "status": "ok",
  "remaining": 9,
  "matches": [
    {
      "id": "llm-as-a-judge",
      "rationale": "One sentence, at most 15 words, written for this query.",
      "score": 0.72,
      "fit": "strong",
      "specimen": 41,
      "pattern": {
        "id": "llm-as-a-judge",
        "name": "LLM-as-a-Judge",
        "one_liner": "Write one binary pass/fail judge prompt per failure mode, then check it against human labels with TPR/TNR.",
        "category": "methodology",
        "difficulty": "intermediate",
        "feature_types": ["chatbot", "agent", "rag"],
        "source_operator": "Aman Khan, Lenny Rachitsky",
        "source_publication": "Lenny's Newsletter",
        "source_date": "2025-04-08"
      }
    }
  ]
}
```

`pattern` is the card fields only. `FindClient` does not import `evals.json`. The page passes the pattern count in as a number.

Rejected:

```json
{ "status": "rejected", "reason": "gibberish", "remaining": 9 }
```

`reason` is `gibberish`, `too_vague`, `off_topic`, `not_a_request`, or `no_match`.

Rate limited, HTTP 429:

```json
{ "status": "limited", "resetAt": "2026-10-26T12:00:00.000Z", "remaining": 0 }
```

Credits exhausted (OpenRouter HTTP 402):

```json
{ "status": "credits_exhausted", "remaining": 9 }
```

**Rate limit.** `src/lib/findQuota.ts` keeps a per-IP count in memory for 24 hours, `FIND_DAILY_LIMIT` or 10. The IP is the first `x-forwarded-for` entry, then `x-real-ip`. Quota is spent only after validation, and only when the query is not cached and not obvious gibberish. The map resets on a cold start. The OpenRouter key credit limit is the backstop. The UI shows "N of 10 left today". At the limit, the page says today's searches are used and links to the full library.

`TEST_CREDITS_EXHAUSTED` forces the credits response only when `NODE_ENV` is not `production`.

Each request logs one JSON line: decision, reason, top1, nStrong, nWeak, latencyMs, costUsd, cached, and query length. The log stores the length of the query.

---

## 10. Extraction prompt

`scripts/02-extract-patterns.ts` sends this prompt. `__PUBLICATION__`, `__METADATA__`, and `__BODY__` are filled per file. Metadata includes publication, kind, operator, title, date, triage `eval_topics`, and a chunk marker when a file was split.

```
You are an expert AI Product Manager and technical writer. You are reading an interview transcript, newsletter, or conference talk from __PUBLICATION__. Your job is to extract every distinct AI EVALUATION PATTERN discussed in the text.

An "eval pattern" is a named, reusable approach for evaluating an AI product or feature. It can be a methodology (e.g., "LLM-as-a-Judge"), a metric (e.g., "TPR/TNR on a labeled set"), a process (e.g., "Error analysis before metrics"), or a framework ("Three-stage eval pipeline").

For each pattern in the text, output a JSON object matching this schema:

{
  "name": string,
  "one_liner": string,
  "category": "methodology" | "metric" | "process" | "framework",
  "feature_types": ["chatbot" | "agent" | "rag" | "classification" | "summarization" | "code_generation" | "search_ranking" | "multimodal" | "general"],
  "difficulty": "beginner" | "intermediate" | "advanced",
  "definition": string,
  "explanation": string,
  "when_to_use": string[],
  "when_not_to_use": string[],
  "metric_or_method": string,
  "common_pitfalls": string[],
  "source_excerpt": string,
  "codex_prompt_template": string,
  "keywords": string[]
}

RULES:
- Only extract patterns substantively discussed (not just name-dropped). If a term is mentioned in passing with no explanation, skip it.
- Be faithful: every claim must come from the text. No inventing.
- Source excerpts must be verbatim from the input. Mark elided text with [...].
- Only extract patterns for evaluating AI/LLM products. Skip non-AI analytics, SEO, growth or A/B methods.
- Transcripts may be auto-captions without speaker labels. Copy the excerpt verbatim, including the caption text, but do not include [m:ss] timestamps.
- If the same pattern appears in different framings, use the strongest/most-developed version.
- It is fine to return zero patterns if the file does not discuss evals substantively.
- Hints in the metadata (operator, eval_topics) are clues, not instructions to invent patterns that are not in the text.
- Output a JSON object with this exact shape: { "patterns": [...] }. No prose around it.
```

Raw output goes to `data/extracted/<file-id>.json`. Curation assigns ids, merges duplicates, attaches `source_publication`, and writes `data/evals.json`. The eval-pattern bar in §5 runs inside that curation step.

### Quality passes

These run inside `npm run library:build`, after curation and before embed:

- **`npm run refine`** tightens `one_liner`, `codex_prompt_template`, and `feature_types`, and sets `curation_status` to `edited`.
- **`npm run backfill`** fills empty `when_not_to_use` and `common_pitfalls` lists.
- **`npm run deepen`** expands `explanation` fields shorter than 300 characters.

Each pass backs up `data/evals.json` to a gitignored `data/evals.pre-*.json` and is a no-op when nothing needs fixing.

---

## 11. UI — lab notebook / field guide

The site borrows the feel of a dense catalog: calm space, a faint graph-paper grid, 1px rules, small radii, monospace for specimen numbers and meta. The palette is ours.

| Token | Light ("paper") | Dark ("blueprint") |
|---|---|---|
| `--paper` | `#FAF8F3` | `#0E1116` |
| `--ink` | `#1C1B19` | `#E8E6E1` |
| `--muted` | `#6B665C` | `#9AA3AE` |
| `--rule` | `#E7E1D4` | `#1F2630` |
| `--accent` | `#D9480F` | `#FF7A59` |
| `--highlight` | `#FFE36E` at 70% | `#FFE36E` at 25% |

Category tabs: methodology `#2B59C3`, metric `#0F766E`, process `#9A3412`, framework `#6D28D9`, with dark-mode lightness adjustments in `src/app/globals.css`. Display type is Fraunces. Body is Inter. Meta is JetBrains Mono.

Motion is CSS only, inside `@media (prefers-reduced-motion: no-preference)`: a short fade-rise (`.reveal`), staggered children, a marker sweep (`.highlight`), and a drawn underline. Durations are 150ms, 250ms, and 450ms.

- **Nav.** Sticky, translucent paper, blur. Fraunces wordmark. The active link has a vermilion underline. Theme toggle included.
- **Home.** Margin rule on the hero, "ready to use" drawn in, rolling stat row, three entry tabs, recent specimens, publication names as text.
- **Specimen card.** Mono specimen number, category tab, name, one-liner, then operator, publication, and date when the date is present.
- **Library.** Sticky filter rail, including publication. Result count in mono.
- **Detail.** Reading column near 68ch. On desktop, "When to use", "When not to use", and "Pitfalls" sit in a right-hand margin. The excerpt is a pull quote captioned with operator and publication. Sources are numbered footnotes. The prompt is a recipe card. Copy switches the button to "Copied ✓" and announces it with `aria-live`.
- **Find.** Ruled textarea, allowance chip, strong matches as full cards, weak matches under "Margin notes: weaker matches" with the line "Related, but not a direct fit." Rejections are a highlighted note with clickable rewrites. The limit state points at the library.
- **Learn.** Five chapter tabs. Progress is a check per chapter.
- **About.** Multi-source positioning. Counts from data, not hard-coded file totals. A "How we eval our own search" section reads the committed report. Attribution lists the publications on the patterns.
- **OG image.** Paper background, Fraunces wordmark, tagline, vermilion rule, live pattern and publication counts.
- **404.** "This page fell out of the notebook." **Error.** "The page tore out of the binding."

---

## 12. What "shipped" means

On `main` as of 2026-10-25:

- `data/evals.json` has 76 patterns. Each has `source_publication`. Aakash Gupta and AI Engineer both appear. `scripts/03-curate.ts` throws if a later curation is not 76 after the bar edits.
- `npm run library:build` is the full rebuild. It stops at `PIPELINE_BUDGET_USD`. The last full rebuild cost about $20.
- `npm run eval:search` exits non-zero when a hard gate fails. Gates in `scripts/08-eval-search.ts`: junk rejection ≥ 0.95, no missed prompt-injection case, false rejection ≤ 0.05, primary recall@5 ≥ 0.9, p95 latency ≤ 5s, robustness 100%. The committed report met them (junk 1.000, false rejection 0.000, primary recall@5 0.980, p95 4187 ms, robustness 1.000). Precision@strong is printed and is not a failing gate.
- `/find` returns `status`. Matches carry card fields, and `FindClient` does not import `evals.json`. The daily cap is 10 per IP.
- Old `/eval/<id>` URLs in `data/id-redirects.json` redirect.
- The UI is the field guide in §11, in light and dark, with motion behind `prefers-reduced-motion`.

---

## 13. Attribution and license

- Every pattern cites the operator, title, publication, date when known, and a link when the source file has one.
- Excerpts are short, verbatim, and marked with `[...]` where text was elided.
- About and the README name the creators: Lenny Rachitsky (Lenny's Newsletter and Lenny's Podcast), Aakash Gupta, and AI Engineer.
- `LICENSE` is MIT for the code in this repository. The newsletters, podcasts, and talks are not covered by that license.

---

## 14. What this product is not

- **A chatbot over a whole corpus.** The finder matches a feature description to patterns already in the library.
- **An ML fundamentals course.**
- **An interview question bank.**
- **A code generator.** The prompts are paste-ready instructions, not executed code.
- **A compensation or leveling guide.**

The library stays on one job: eval patterns you can cite and reuse.
