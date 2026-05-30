# Documentation Audit Report

**Date:** 2026-05-24
**Scope:** Every `.md` file in the repo, cross-checked against the actual code, data, and configuration.
**Verdict:** Mostly trustworthy, but **not fully a source of truth.** One doc is materially stale, one feature is documented but not shipped, the build pipeline is under-documented, and several structural references have drifted.

> **Resolution (2026-05-24):** All findings below have since been fixed — `sources[]` is now schema-validated and rendered (#2), `curation-report.md` regenerated from shipped data (#1), the refine step documented in README + spec (#3), spec §6 file map corrected (#4), the broken companion-doc pointers softened (#5), a `LICENSE` file added (#6), and the `curation_status` reality noted in the spec (#7). The `@vercel/analytics` typecheck failure was just a missing local install (`npm install`), not a code bug. `npm run build` now passes (84/84 pages). This report is retained as the historical record.

> **Update (2026-05-30):** The library was rebuilt on the `deepseek-v4-pro`/`deepseek-v4-flash` models with an improved file selection (Tier 2 ranked by eval-signal density, not word count; CC/CD newsletter promoted to Tier 1). The shipped library is now **43 patterns** (57 raw → 43 after conservative de-duplication), not 73. Every "73" in the body below refers to the pre-rebuild state. Build now passes 54/54 pages.

---

## Files reviewed

| File | Role | Trust |
| --- | --- | --- |
| `README.md` | User-facing project doc | ✅ Trustworthy (one omission) |
| `AGENTS.md` | Agent rules (Next.js) | ✅ Accurate |
| `CLAUDE.md` | Imports AGENTS.md | ✅ Accurate |
| `src/app/about/page.tsx` (in-app docs) | Methodology / stats shown to users | ✅ Accurate |
| `data/curation-report.md` | Pipeline output report | ❌ **Stale — wrong counts** |
| `docs/eval-library-spec.md` | Master design spec | ⚠️ Design doc, drifted from built state |
| `docs/codex-prompts.md` | Historical build prompts | ⚠️ Historical; omits refine step |
| `docs/AI_PM_product_ideas.md` | Ideation doc | ⚠️ Broken companion-doc references |

Ground truth checked: `data/evals.json` (**73** patterns), `data/eval-embeddings.json` (**73** vectors, 1536-dim, `text-embedding-3-small`), `package.json`, `src/lib/evals.ts`, `src/app/api/find/route.ts`, `scripts/01–05`, actual `src/` tree.

---

## Findings by severity

### 🔴 1. `data/curation-report.md` is stale — every count is wrong

The report claims **82 final curated patterns**; the shipped library has **73** (`evals.json` and embeddings agree on 73). All tables reflect the older 82-pattern state, not what's shipped:

| Metric | Report says | Actual (evals.json) |
| --- | --- | --- |
| Final patterns | 82 | **73** |
| Category: methodology / process / framework / metric | 28 / 32 / 12 / 10 | **23 / 29 / 11 / 10** |
| Top operator (Lenny Rachitsky) | 31 | **14** |
| Kevin Weil | 9 | **6** |
| Top-10 list | includes Garrett Lord, Mike Krieger, Edwin Chen | not in actual top 10 |

The "Raw 133 → 82 clusters" stage may be accurate for that run, but the **final number and all distributions no longer describe the product.** This is the single most misleading doc.

### 🔴 2. Multi-source citations are documented but not shipped

Spec §4 and `codex-prompts.md` (Prompts 4 & 6) promise that merged patterns preserve **all** source citations in a `sources[]` array, rendered in an "All sources" section on the eval detail page.

Reality:
- `evals.json` **does** contain a `sources[]` array per pattern.
- But `src/lib/evals.ts` Zod schema **omits `sources`**, so it's silently stripped on load.
- The eval detail page's "All sources" section ([src/app/eval/[id]/page.tsx:124](../src/app/eval/%5Bid%5D/page.tsx)) renders **only the single primary citation**, not the array.

So the multi-source feature the docs describe is effectively dead in the UI.

### 🟠 3. The `refine` build step is undocumented everywhere

`scripts/05-refine.ts` + `npm run refine` exist and demonstrably ran (all 73 patterns have `curation_status: "edited"`, set by this script; `data/evals.pre-refine.json` backup exists). Yet:
- `README.md` "Data pipeline" lists only 4 scripts (select / patterns / curate / embed).
- `eval-library-spec.md` §6 lists scripts `01–04` only.
- `codex-prompts.md` stops at Prompt 8 with a 4-script pipeline.

The actual pipeline is **5 steps**, not 4. (Note: refine maps index-to-index and does **not** change pattern count — so it is *not* what reduced 82→73; that drop happened via a separate manual/curation trim that left no doc trail.)

### 🟠 4. `eval-library-spec.md` §6 project structure has drifted

The spec is a *design* doc, but its file map no longer matches the build:

| Spec says | Actual |
| --- | --- |
| `next.config.mjs` | `next.config.ts` |
| `tailwind.config.ts` | none (Tailwind v4, no config file) |
| `src/styles/globals.css` | `src/app/globals.css` |
| `src/lib/deepseek.ts`, `openai.ts`, `embeddings.ts` | none — logic inlined in `api/find/route.ts`; only `src/lib/evals.ts` exists |
| `CodexPromptCopier.tsx` | `PromptTemplateCopier.tsx` |
| `data/source-corpus-symlink/` | not used (env var `LENNY_CORPUS_PATH` instead) |

Also: spec target is "30–60 patterns"; shipped is 73 (fine, just above target).

### 🟠 5. `AI_PM_product_ideas.md` references two missing companion docs

It points readers to `ai_corpus_analysis.md` and `ai_pm_market_research.md` "for the underlying evidence." Neither exists in the repo (`docs/` only has the spec, codex-prompts, this ideation doc, and `corpus_topic_map_rebuilt.csv`). Broken pointers. The doc's own content is historical ideation and fine read as such.

### 🟡 6. README claims MIT license but there is no `LICENSE` file

`README.md` states "MIT for the code," but no `LICENSE`/`LICENSE.md` exists at the repo root. The claim is unbacked.

### 🟡 7. `curation_status` taxonomy is partly fictional

Spec/about/codex-prompts describe an `auto` → `verified` → `edited` review flow. In reality **all 73 patterns are `"edited"`** (blanket-set by the refine script); there are zero `auto` or `verified` entries. The about-page wording ("a manual curation pass checks quality") is loosely defensible, but the documented three-state workflow doesn't reflect the data.

---

## What IS trustworthy (verified accurate)

- **`README.md`** — pattern count (73 ✓), stack, quickstart, env vars, attribution all correct. Only gaps: missing refine step (#3) and missing LICENSE file (#6).
- **In-app About page** — "73 patterns," "354 newsletters · 298 podcasts" (= 652 total, internally consistent with the ideation doc), "12+ operators" (actual: 20 distinct, so conservatively true), stack description — all accurate.
- **API design** — `api/find/route.ts` faithfully implements spec §9 (OpenAI embedding → cosine top-5 → DeepSeek rationale → top-3). It even adds graceful credits-exhausted handling (undocumented but harmless).
- **Data model** — the Zod schema in `src/lib/evals.ts` matches spec §4 (aside from the dropped `sources` field, #2).
- **`AGENTS.md` / `CLAUDE.md`** — accurate and generic.
- **`codex-prompts.md`** — internally consistent as a *historical* build script (e.g., "Browse all 73" footer matches). Just don't read it as current-state docs.

---

## Recommended fixes (not applied — analysis only)

1. **Regenerate `data/curation-report.md`** from the shipped `evals.json` (or delete it). Highest priority — it actively misleads.
2. **Reconcile the `sources` feature**: either add `sources` to the `evals.ts` schema and render the array, or drop the field from `evals.json` and the docs.
3. **Document the refine step** in README + spec, and note what trimmed 82→73.
4. **Refresh spec §6** file map, or add a header marking it "original design — see code for current structure."
5. **Add the missing `LICENSE` file** (or soften the README claim).
6. Either ship the missing companion docs referenced by `AI_PM_product_ideas.md` or remove the pointers.
7. Reconcile the `curation_status` story with the all-`edited` reality.

---

**Bottom line:** The user-facing docs (README, About) are reliable on the headline facts. The internal/build docs are not a dependable source of truth: `curation-report.md` is numerically wrong, the spec has drifted, the refine step is invisible, and a documented multi-source feature isn't actually wired up.
