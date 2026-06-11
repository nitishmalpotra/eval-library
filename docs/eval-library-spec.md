# The Eval Library — Master Spec

**Product name (working):** The AI PM Eval Library
**Tagline:** "Every AI eval pattern from Lenny's operators, made buildable."

A free, open-source, citation-first reference site that extracts AI evaluation patterns from Lenny's newsletter and podcast corpus, organizes them by feature type, and ships each pattern with a ready-to-paste Codex prompt.

This document is the canonical reference for the build. Codex should read this first.

---

## 1. Why this product exists

**The pain it solves.** "Evals are the new PRD" is the most-repeated phrase in AI PM commentary in 2026. Working AI PMs ship without evals because they don't know what an eval looks like for their feature type. Aspiring AI PMs can define "eval" but can't write one. Both audiences face the same gap: there is no concrete, browseable, citable library of eval patterns by feature type.

**Why this corpus is uniquely suited.** Lenny's content contains the canonical AI eval thinking from Hamel Husain, Shreya Shankar, Brendan Foody, Cat Wu (Anthropic), Aman Khan (Arize), and Lenny himself. The patterns exist; they're scattered across podcast transcripts and newsletters. This product extracts, structures, and ships them.

**Why other Lenny-corpus tools don't fill this gap.** Lennybot, Ask Lenny, Lenny's Vault, and the Knowledge Graph are all generic "ask the corpus" interfaces. None extract artifact-level structured patterns. This product is the opposite: pre-extracted, pre-structured, opinionated for one specific job.

---

## 2. Target users

**Primary (working AI PMs):** PMs shipping AI features who need to plug "what evals should we run for X?" into their workflow. They browse and copy patterns directly into Cursor/Codex.

**Secondary (aspiring AI PMs):** Career builders learning AI PM craft. They take a guided tour, see what evals look like with worked examples, and pick up vocabulary.

---

## 3. Information architecture

Five top-level pages:

1. **`/` — Home.** Hero + value prop + three entry points: Browse / Learn / Find an eval.
2. **`/browse` — Browse.** Card grid of all extracted eval patterns. Filter by feature type, difficulty, methodology. Search by keyword.
3. **`/eval/[id]` — Eval detail.** Full pattern: definition, when-to-use, when-not-to-use, metric/method, pitfalls, source operator with citation, source excerpt, difficulty, Codex prompt template with one-click copy.
4. **`/find` — Find an eval.** RAG-powered: user describes their AI feature in natural language, gets the genuinely relevant eval patterns (1–5, no padding) with a one-line rationale per match. Gibberish, off-topic, or hopelessly vague queries are rejected with reason-specific guidance instead of results.
5. **`/learn` — Guided tour for aspiring PMs.** A linear, opinionated walkthrough: "What is an eval?" → "The 4 eval categories" → "Your first eval (a worked example)" → "Reading the library." Pulls content from the same eval pattern data, framed differently.
6. **`/about` — About + methodology.** How the patterns were extracted, attribution to Lenny, source-licensing transparency, link to GitHub repo.

---

## 4. The core data model — eval pattern schema

This is the single most important artifact. The whole product hangs off this schema.

```typescript
type EvalPattern = {
  id: string;                          // kebab-case, unique, e.g. "llm-as-a-judge"
  name: string;                        // Human-readable, e.g. "LLM-as-a-Judge"
  one_liner: string;                   // <120 chars hook for cards
  category: "methodology" | "metric" | "process" | "framework";
  feature_types: FeatureType[];        // Which AI feature types this applies to
  difficulty: "beginner" | "intermediate" | "advanced";

  // Body
  definition: string;                  // 1-2 sentence formal definition
  explanation: string;                 // 2-4 paragraphs, plain language
  when_to_use: string[];               // Bulleted scenarios
  when_not_to_use: string[];           // Bulleted scenarios
  metric_or_method: string;            // What you measure or how
  common_pitfalls: string[];           // Bulleted gotchas

  // Source
  source_operator: string;             // "Hamel Husain & Shreya Shankar"
  source_file: string;                 // "podcasts/hamel-husain--shreya-shankar.md"
  source_title: string;                // Full Lenny episode/newsletter title
  source_date: string;                 // ISO date
  source_url?: string;                 // Lenny's public URL (if extractable from frontmatter)
  source_excerpt: string;              // The actual passage the pattern came from, 100-300 words

  // Buildable
  codex_prompt_template: string;       // Pre-engineered prompt for Codex/Cursor; uses [PLACEHOLDERS]

  // Search
  keywords: string[];                  // Free-form, for keyword search

  // Quality flag
  curation_status: "auto" | "verified" | "edited";  // auto=unreviewed, verified=human-checked, edited=refined. Shipped library is all "edited" (set by 05-refine.ts); auto/verified are reserved but unused.
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

All extracted patterns are stored as **`/data/evals.json`** at the project root. Embeddings live in **`/data/eval-embeddings.json`** (one vector per pattern, computed once at build/cron).

---

## 5. Source files for extraction

### Tier 1 — Primary eval files (extract definitively)
These have evals as primary topic or in the title. Each should yield 2-6 patterns.

1. `newsletters/building-eval-systems-that-improve-your-ai-product.md` (2025-09-09)
2. `newsletters/beyond-vibe-checks-a-pms-complete-guide-to-evals.md` (2025-04-08)
3. `newsletters/why-your-ai-product-needs-a-different-development-lifecycle.md` (2025-08-19) — CC/CD eval framework
4. `podcasts/hamel-husain--shreya-shankar.md` (2025-09-25) — canonical evals episode
5. `podcasts/brendan-foody.md` (2025-09-18) — expert evals
6. `newsletters/counterintuitive-advice-for-building-ai-products.md` — Aman Khan / observability
7. `newsletters/an-ai-glossary.md` — definitions that include eval terms
8. `newsletters/how-close-is-ai-to-replacing-product-managers.md` (touches evals)

### Tier 2 — AI files where evals appear as a secondary theme
Sweep AI-tagged podcasts/newsletters (or any file with "eval" in its title/description). For each candidate, score the body on **eval-signal density** — standalone "eval(s)" mentions (the term of art), "LLM-as-a-judge" references, and compound terms like "eval set/framework/pipeline" — deliberately ignoring the noisy bare substring "eval" (which also matches "retrieval" and generic "evaluate"). Keep files with genuine signal (≥2 eval mentions or any LLM-as-a-judge reference), **rank by that score** (not word count), and cap at 25. Actual yields include `cat-wu`, `kevin-weil`, `karina-nguyen`, `edwin-chen`, `chip-huyen`, `aishwarya-naresh-reganti--kiriti-badam`, `jason-droege`, `howie-liu`, `nick-turley`, `boris-cherny`.

Target a final library of **30-60 high-quality patterns** for v1. The current shipped library is **43** (57 raw extractions → 43 after conservative de-duplication).

---

## 6. Project structure

```
eval-library/
├── README.md
├── AGENTS.md                        # Agent build rules
├── CLAUDE.md                        # Imports AGENTS.md
├── LICENSE                          # MIT (code)
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs               # Tailwind v4 — no tailwind.config.ts
├── eslint.config.mjs
├── .env.example
├── .env.local                       # gitignored
├── data/
│   ├── evals.json                   # Source of truth for all extracted patterns
│   ├── evals.pre-refine.json        # Backup written by 05-refine.ts
│   ├── evals.pre-backfill.json      # Backup written by 06-backfill.ts
│   ├── evals.pre-deepen.json        # Backup written by 07-deepen-explanations.ts
│   ├── eval-embeddings.json         # One vector per pattern
│   ├── files-to-process.json        # Output of 01-select-files.ts
│   ├── curation-report.md           # Output of 03-curate.ts
│   └── extracted/                   # Raw per-file extraction output (gitignored)
│                                    # Corpus read via LENNY_CORPUS_PATH env var, not a symlink
├── scripts/
│   ├── 01-select-files.ts           # Choose files to process (Tier 2 ranked by eval-signal density)
│   ├── 02-extract-patterns.ts       # DeepSeek extraction pipeline
│   ├── 03-curate.ts                 # Dedupe, merge, validate (conservative clustering)
│   ├── 04-embed.ts                  # Embeddings via OpenAI text-embedding-3-small
│   ├── 05-refine.ts                 # DeepSeek refinement pass (run before 04-embed)
│   ├── 06-backfill.ts               # Fill empty when_not_to_use / common_pitfalls (idempotent)
│   └── 07-deepen-explanations.ts    # Expand thin explanations (run before 04-embed)
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # Home
│   │   ├── globals.css
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   ├── opengraph-image.tsx
│   │   ├── browse/
│   │   │   └── page.tsx
│   │   ├── eval/[id]/
│   │   │   └── page.tsx
│   │   ├── find/
│   │   │   ├── page.tsx
│   │   │   └── FindClient.tsx
│   │   ├── learn/
│   │   │   ├── page.tsx
│   │   │   └── LearnClient.tsx
│   │   ├── about/
│   │   │   └── page.tsx
│   │   └── api/
│   │       └── find/
│   │           └── route.ts         # RAG endpoint (inlines OpenAI/DeepSeek clients + cosine)
│   ├── components/
│   │   ├── EvalCard.tsx
│   │   ├── BrowseFilters.tsx
│   │   ├── BrowseResults.tsx
│   │   ├── FeatureTypeFilter.tsx
│   │   ├── CategoryBadge.tsx
│   │   ├── DifficultyBadge.tsx
│   │   ├── SourceCitation.tsx
│   │   ├── PromptTemplateCopier.tsx
│   │   ├── SiteNav.tsx
│   │   ├── Providers.tsx
│   │   └── ThemeToggle.tsx
│   └── lib/
│       └── evals.ts                 # Load + Zod-validate evals.json
└── public/
    └── ...
```

---

## 7. Stack & dependencies

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 (clean utilitarian — Linear / Vercel aesthetic)
- **LLM (extraction + RAG synthesis):** DeepSeek API (`deepseek-v4-pro` for pipeline extraction/curation/refinement, `deepseek-v4-flash` for live /find usage; OpenAI-compatible at `https://api.deepseek.com/v1`)
- **Embeddings:** OpenAI `text-embedding-3-small` (cheapest production-grade; ~$0.02/1M tokens)
- **Search:** In-memory cosine similarity over pre-computed vectors. No vector DB needed for ~60 patterns.
- **Deployment:** Vercel (free tier)
- **Open source:** MIT license, GitHub repo, attribution to Lenny in README and on /about

### Why this stack
- DeepSeek is OpenAI-API-compatible → one client, two providers, easy swap.
- OpenAI embeddings are dirt cheap and reliable; can be swapped to local model later.
- In-memory search avoids hosting a vector DB for a tiny corpus.
- Next.js + Vercel is one-command deploy and Codex's strongest territory.

---

## 8. Environment variables

```bash
# .env.local
DEEPSEEK_API_KEY=sk-...
OPENAI_API_KEY=sk-...               # for embeddings only
DEEPSEEK_MODEL_PIPELINE=deepseek-v4-pro
DEEPSEEK_MODEL_RUNTIME=deepseek-v4-flash
LENNY_CORPUS_PATH=/abs/path/to/lennys-newsletterpodcastdata-all   # used only by scripts/, not at runtime
NEXT_PUBLIC_SITE_URL=https://...
```

The corpus path is needed only at extraction time. Once `data/evals.json` and `data/eval-embeddings.json` are committed to the repo, the running site needs **only** `DEEPSEEK_API_KEY` (for the /find RAG endpoint generation step) and `OPENAI_API_KEY` (for embedding the user's query).

---

## 9. API design — `/api/find`

The only API route in the product.

**Request:**
```json
POST /api/find
{ "query": "I'm building a customer support chatbot that pulls answers from a help center. What evals should I have?" }
```

**Server logic:**
1. Embed `query` with OpenAI `text-embedding-3-small`.
2. Compute cosine similarity vs. every vector in `data/eval-embeddings.json`.
3. Take top 5 candidates.
4. Send the candidates' summaries + the user's query to DeepSeek, which first gates the query — leniently, so a short-but-real feature like "a chatbot" passes; only unreadable gibberish, queries too vague to identify any feature, or clearly off-topic input are rejected — and then picks every genuinely relevant pattern (0–5, no padding to a fixed count) with a one-sentence rationale per pick.
5. Return one of two shapes.

Accepted query:

```json
{
  "queryOk": true,
  "matches": [
    { "id": "llm-as-a-judge", "rationale": "Best for grading freeform helpfulness on a known FAQ.", "score": 0.81 },
    { "id": "rag-faithfulness", "rationale": "Catches when the bot invents content beyond the source.", "score": 0.79 }
  ]
}
```

Rejected query (guardrail):

```json
{ "queryOk": false, "reason": "gibberish" }
```

where `reason` is one of `"gibberish" | "too_vague" | "off_topic"`.

The page renders the matches as eval cards (linking to `/eval/[id]`) with the rationale shown. A rejection renders a reason-specific nudge telling the user how to rephrase. An accepted query with zero matches renders an honest empty state ("nothing in the library is a strong match yet") with a link to `/browse`.

---

## 10. Extraction prompt — the key piece

Codex will write a Node/TS script that loops over each file in the source set and sends it to DeepSeek with this extraction prompt (template — Codex should embed it in `scripts/02-extract-patterns.ts`):

```
You are an expert AI Product Manager and technical writer. You are reading an interview transcript or newsletter from Lenny Rachitsky's publication. Your job is to extract every distinct AI EVALUATION PATTERN discussed in the text.

An "eval pattern" is a named, reusable approach for evaluating an AI product or feature. It can be a methodology (e.g., "LLM-as-a-Judge"), a metric (e.g., "TPR/TNR on a labeled set"), a process (e.g., "Error analysis before metrics"), or a framework ("Three-stage eval pipeline").

For each pattern in the text, output a JSON object matching this schema:

{
  "name": string,                        // Human readable, distinctive
  "one_liner": string,                   // < 120 chars
  "category": "methodology" | "metric" | "process" | "framework",
  "feature_types": ["chatbot" | "agent" | "rag" | "classification" | "summarization" | "code_generation" | "search_ranking" | "multimodal" | "general"],
  "difficulty": "beginner" | "intermediate" | "advanced",
  "definition": string,                  // 1-2 sentences
  "explanation": string,                 // 2-4 paragraphs in plain English
  "when_to_use": string[],
  "when_not_to_use": string[],
  "metric_or_method": string,
  "common_pitfalls": string[],
  "source_excerpt": string,              // verbatim passage(s), 100-300 words, demonstrating the pattern
  "codex_prompt_template": string,       // Pre-engineered prompt for Codex/Cursor that uses [PLACEHOLDERS] like [FEATURE_DESCRIPTION], [DATASET_SIZE]
  "keywords": string[]
}

RULES:
- Only extract patterns substantively discussed (not just name-dropped). If a term is mentioned in passing with no explanation, skip it.
- Be faithful: every claim must come from the text. No inventing.
- Source excerpts must be verbatim from the input. Mark elided text with [...].
- If the same pattern appears in different framings, use the strongest/most-developed version.
- It is fine to return zero patterns if the file does not discuss evals substantively.
- Output a JSON array. No prose around it.

INPUT FILE METADATA:
{ "file": "<filename>", "guest_or_author": "<name>", "title": "<title>", "date": "<date>" }

INPUT TEXT:
<file contents>

OUTPUT:
```

The script writes raw extraction output to `data/extracted/<file-id>.json`, then a separate curation step (`03-curate.ts`) dedupes by `name`, merges duplicates (e.g., "LLM-as-a-Judge" appearing in 3 episodes), preserves all source citations, assigns final `id`s, and writes the merged result to `data/evals.json`.

### Refinement pass (`05-refine.ts`)

After curation, an optional refinement pass (`npm run refine`) sends each pattern in `data/evals.json` back to DeepSeek to tighten three weak fields only: `one_liner` (forced under 120 chars), `codex_prompt_template` (must contain at least one `[PLACEHOLDER]`, or be emptied for purely conceptual patterns), and `feature_types` (narrowed to 1–3 specific types, avoiding `general`). All other fields are preserved, `curation_status` is set to `edited`, and the pre-refinement version is backed up to `data/evals.pre-refine.json`. Run this **before** `04-embed.ts` so embeddings reflect the refined text. `extract:all` does **not** include this step.

### Quality passes (`06-backfill.ts`, `07-deepen-explanations.ts`)

Two further optional, idempotent passes repair fields the extraction occasionally leaves weak. **`npm run backfill`** regenerates any empty `when_not_to_use` / `common_pitfalls` bullet lists (grounded in each pattern's curated content); it does not touch embedding text. **`npm run deepen`** expands `explanation` fields shorter than 300 chars into 2–3 grounded paragraphs; because `explanation` feeds the embeddings, run it **before** `04-embed.ts`. Each backs up the prior `data/evals.json` (`evals.pre-backfill.json`, `evals.pre-deepen.json`) and is a no-op when nothing needs fixing. Neither is part of `extract:all`.

---

## 11. UI direction — clean utilitarian

Inspirations: Linear, Vercel, Stripe Docs, Resend.

Design tokens (Tailwind config):
- Typography: Inter (sans) + JetBrains Mono (mono accents on metric/method labels)
- Background: pure white, subtle gray-50 sections
- Primary accent: a single restrained color — slate-900 for text, blue-600 for interactive
- Cards: white, gray-200 border, subtle shadow on hover, generous padding
- Mono labels for `category` / `difficulty` / `feature_type` badges
- No emoji in chrome. Generous whitespace. Confident type scale.

Page-level patterns:
- Home: hero with one-line value prop, three large entry-point cards, no marketing fluff.
- Browse: filter sidebar (left) + responsive card grid (right). Sticky filters. URL-synced filter state for shareability.
- Eval detail: long-form readable layout. Source citation prominent. Codex prompt in a copy-button code block.
- Find: a single big textarea, "Find evals" button, results below.
- Learn: linear stepped layout with progress dots. Same content as eval cards but reframed as a guided narrative.

---

## 12. Acceptance criteria — phase by phase

### Phase 0 — Project setup
- `npx create-next-app@latest` with TS + Tailwind + ESLint + App Router
- Tailwind v4 configured with custom design tokens
- `.env.example` committed with placeholder keys
- `package.json` scripts: `dev`, `build`, `extract`, `curate`, `embed`, `start`

### Phase 1 — Data extraction (Codex runs the scripts)
- `scripts/01-select-files.ts` reads `index.json` + the corpus, outputs `data/files-to-process.json` containing Tier 1 (always) + Tier 2 (gated and ranked by eval-signal density)
- `scripts/02-extract-patterns.ts` calls DeepSeek per file, writes raw `data/extracted/<id>.json`
- `scripts/03-curate.ts` merges + dedupes + validates → `data/evals.json`
- `scripts/04-embed.ts` calls OpenAI per pattern, writes `data/eval-embeddings.json`
- Output: at least 25 distinct, well-formed patterns

### Phase 2 — Static site
- Home, Browse, Eval detail pages render correctly from `data/evals.json`
- Filters work (feature type, difficulty, category)
- Source citation links work (deep-link into Lenny's source URL where present)
- Codex prompt copy-to-clipboard works

### Phase 3 — RAG /find
- `/api/find` returns the relevant results (1–5) in < 3 seconds, and rejects gibberish/vague/off-topic queries with a reason
- `/find` page renders results as small eval cards with rationale
- Embedding cost per query stays under $0.0001

### Phase 4 — Polish + ship
- About page with methodology + Lenny attribution + GitHub link
- README in repo
- Vercel deployment live
- Open-source GitHub repo public

---

## 13. Attribution, IP, and ethical notes

Even though this is a personal/open-source project with no commercial use, follow these practices:

- **Every pattern card cites the source operator, episode/newsletter title, date, and a deep link.**
- **Source excerpts are limited to 100-300 words** — short, transformative, with full attribution. Reasonable fair-use posture.
- **About page is explicit:** the corpus belongs to Lenny Rachitsky; patterns are extracted summaries with attribution.
- **README invites Lenny to comment or take down.** Lenny has the official LennysNewsletter/lennys-newsletterpodcastdata starter pack on GitHub inviting builders, but a courtesy heads-up is good practice.

---

## 14. What this product is NOT

- **Not a chatbot over the whole corpus** — that's Lennybot's job.
- **Not an ML fundamentals tutorial** — corpus is weak there, and other resources exist.
- **Not an interview question bank** — Exponent owns that space.
- **Not a code generator** — Codex prompts are pointers, not executed code.
- **Not a comp/level explainer** — corpus has nothing on this.

The product stays narrow. That's the whole point.
