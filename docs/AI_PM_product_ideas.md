# AI PM Field Guide — Product Ideation

A synthesis of corpus analysis + external research into concrete product ideas you could build on top of Lenny's newsletter & podcast corpus, aimed at **working AI PMs + aspiring AI PMs**, shipped as a free, open-source, static-site-plus-RAG-API web product.

> Note: this doc draws on two companion analyses (`ai_corpus_analysis.md` — corpus contents and sub-themes; `ai_pm_market_research.md` — pain points and competitive landscape) that are **not included in this repo**. Their key findings are summarized inline in Part 1 below.

---

## Part 1 — What the research tells us

### The corpus
- 652 files, ~5.65M words. **166 strict-AI files (~25%)**, but trend is sharp: 2024: 25% → 2025: 61% → **2026 YTD: 81% AI-tagged**.
- Lenny has interviewed the operators inside frontier labs: Cat Wu (Claude Code), Nick Turley (OpenAI), Michael Truell (Cursor), Scott Wu (Cognition), Aparna Chennapragada (Microsoft), Howie Liu (Airtable), Boris Cherny (Anthropic), Simon Willison, Marc Andreessen, Keith Rabois, Sherwin Wu (OpenAI), Amol Avasare (Anthropic growth), and dozens more.
- Strongest sub-themes inside the AI subset: AI product strategy (32 files), prototyping & vibe coding (~15), evals (~10), prompting/context engineering, AI agents, AI growth/AEO/distribution, personal AI productivity, AI org design, AI PM career change.

### What the corpus is uniquely strong at (do lean in)
- **Operator stories with numbers** ("Anthropic $1B → $19B in 16 months")
- **Named tactics** (JSON-first prototyping, LLM-as-a-judge, build-for-next-model, rebuild test, style unbundling, synthetic bootstrap)
- **Conflicting expert takes** (Rabois vs. Lenny on "are PMs in trouble"; Schulhoff vs. Cat Wu on prompt engineering; Howie Liu vs. Marily Nika on shiny object trap)
- **Concept timelines** (evals: vibe checks → structured → LLM-as-a-judge → expert eval economy)
- **Insider vocabulary** (AGI-pilled, AEO, OpenClaw, CC/CD lifecycle, full-stack builder, vibe coder)
- **Career-and-role-change advice** for the AI era

### What the corpus is weak at (do NOT promise to solve)
- ML/foundation model fundamentals (no transformers/attention/embeddings deep-dive)
- Hands-on RAG architecture, code, vector DBs
- Statistical eval rigor (BLEU/ROUGE/perplexity)
- Interview question banks (Exponent owns this)
- Comp/leveling data for AI PM roles
- Reusable code snippets / agent harnesses
- Head-to-head model comparisons
- A/B test design for non-deterministic features
- Token cost / unit economics math

### What working AI PMs actually struggle with (top 6)
1. **Evals are missing.** "Most AI products ship without evals" is the #1 cited problem. OpenAI's CPO: "the most important thing a PM can learn to do is write evals."
2. **PRDs are broken for AI** (probabilistic outputs can't be specified upfront).
3. **Choosing prompt vs. RAG vs. fine-tune vs. agent vs. rules.**
4. **Token / inference cost surprise** (reportedly 85% of enterprise AI budgets).
5. **Stakeholder education** (non-technical leaders don't understand AI tradeoffs).
6. **Agentic system design** (memory loss, context resets, fan-out, cost discipline).

### What aspiring AI PMs actually struggle with (top 6)
1. **"What does an eval actually look like?"** — they can define it, can't write one.
2. **"How do I talk about RAG in an interview?"** — RAG is the #1 fastest-growing AI interview skill.
3. **"What does an AI roadmap look like?"** — no templates anywhere.
4. **Overwhelm** — where do I start? what's the curriculum?
5. **Portfolio anxiety** — "what should I actually build to show I'm an AI PM?"
6. **Translating prior experience** into AI PM language.

### The competitive moat: positioning, not technology
Every other Lenny-corpus tool is positioned as "ask Lenny anything." That's a chat box over content. The wedge is **opinionated structure**: products that take the corpus apart, extract specific artifact types, and serve them through a UI designed for one persona's actual job. The inspirational pattern from Eugene Yan / Karpathy / Datasette / Sahil Lavingia is clear: **novel abstraction > generic chat; clear taxonomy; designed for a specific persona; citation-first; ship fast.**

---

## Part 2 — Strategic constraints (these shape every idea below)

1. **No generic chat.** That space is over-served and ill-suited for the corpus's real strengths.
2. **Opinionated for AI PMs specifically.** Other tools serve all PMs. Be the niche.
3. **Artifact-driven, not search-driven.** Pre-extract evals, tactics, decisions, conflicts at build time. Don't make users prompt for them.
4. **Citation-first.** Every claim links back to source episode/post with timestamp where possible. This is both legally safer and trust-building.
5. **Lean into corpus strengths** (operator stories, named tactics, conflicts, timelines, insider vocabulary).
6. **Don't promise corpus weaknesses** (ML fundamentals, code snippets, interview banks, comp data).
7. **Two-audience design** — working AI PMs (deep) + aspiring AI PMs (scaffolded). Most ideas should have a "level switch" or two distinct entry points.
8. **Static-site-plus-RAG-API** — preprocess heavy stuff at build time, save RAG layer for the dynamic / personalized parts.
9. **Beautifully designed.** Existing competitors are visually plain. Aesthetics is a real moat for a personal project.

---

## Part 3 — Fourteen product ideas (scan view)

For each: **target**, **content match** (how well does the corpus actually serve this?), **uniqueness vs. existing tools**, **build effort**, **portfolio appeal**.

| # | Idea | Target | Content match | Uniqueness | Build effort | Portfolio |
|---|------|--------|---------------|------------|--------------|-----------|
| 1 | **The Eval Library** — extracted AI eval patterns indexed by feature type | Both | ★★★★★ | ★★★★★ | Medium | ★★★★★ |
| 2 | **Named Tactics Playbook** — every "X-named tactic" pulled out as cards | Both | ★★★★★ | ★★★★★ | Medium | ★★★★★ |
| 3 | **Operator Disagreement Engine** — surface conflicting takes side-by-side | Both | ★★★★★ | ★★★★★ | Medium-high | ★★★★★ |
| 4 | **Concept Timeline** — how each AI PM concept evolved across episodes | Both | ★★★★ | ★★★★★ | Medium | ★★★★★ |
| 5 | **AI PM Insider Glossary** — hyperlinked vocab, sourced and dated | Aspiring > Working | ★★★★ | ★★★★ | Low | ★★★ |
| 6 | **AI PM Curriculum Generator** — personalized 4-week study plan from corpus | Aspiring | ★★★★ | ★★★ | Medium | ★★★ |
| 7 | **"Show Me an AI PM Day"** — workflow walkthroughs extracted from operator stories | Aspiring | ★★★ | ★★★★ | Medium-high | ★★★★ |
| 8 | **Portfolio Project Generator** — extracted AI product ideas + vibe-code starter prompts | Aspiring | ★★★ | ★★★★ | Medium | ★★★★ |
| 9 | **Interview Mode** — common AI PM interview questions + 3-5 operator framings | Aspiring | ★★★ | ★★★ (vs. Exponent) | Medium | ★★★ |
| 10 | **What-Would-X-Do Coach** — query in voice/style of named operator | Both | ★★★ | ★★★★ | High; ethics risk | ★★★ |
| 11 | **AI PM News → Operator Take** — paste news article, get relevant operator commentary | Working | ★★★ | ★★★★ | High (needs freshness) | ★★★ |
| 12 | **AI PM Career Decision Tree** — interactive tree for AI PM career questions | Both | ★★★★ | ★★★ | Medium | ★★★ |
| 13 | **AI PM Quote Cards / Wall** — beautifully designed quote cards, shareable | Both | ★★★ | ★★ | Low | ★★★ |
| 14 | **Token & Cost Calculator with Operator Lore** — inference cost math + sourced quotes | Working | ★★ | ★★★ | Medium | ★★★ |

---

## Part 4 — Top 5 deep dives

### Idea 1: The Eval Library ★ (my top pick)
**The hook:** "We extracted every eval pattern in Lenny's corpus and made them searchable by feature type."

**Why it wins:**
- Evals are the #1 cited AI PM pain. "Evals are the new PRD." OpenAI's CPO calls them the most important PM skill.
- The corpus has rich, named eval thinking from Hamel Husain, Shreya Shankar, Cat Wu, Aman Khan, others.
- "Show me the eval" is the most-requested concrete artifact from aspiring AI PMs.
- No existing tool has done this extraction. Every Lenny tool would just answer "what are evals?" with paragraphs.

**Core UX:**
- Browse evals by feature type: chatbot, classification, summarization, code-gen, agent, RAG, multimodal.
- For each eval pattern: definition, when to use, when NOT to use, metric, common pitfalls, originating operator with citation + timestamp link.
- "Find the eval for my situation" — a small RAG-powered prompt: describe your AI feature, get 3 recommended eval patterns from the library.
- Two views: "Browse" (working PMs) and "Learn" (aspiring PMs — guided tour of "what is an eval, with examples").

**Killer feature:** every eval card is downloadable as a markdown template you can drop into Cursor/Codex to generate the eval scaffolding.

**Build:** Build-time extraction with LLM over the eval-tagged subset (10-15 files); store extracted artifacts as JSON; static site renders cards. RAG layer for the "find an eval for my situation" mode. ~3-5 days of focused work.

**Risk:** Eval extraction quality depends on the LLM doing the extraction. Plan for hand-curation pass.

---

### Idea 2: Named Tactics Playbook
**The hook:** "Every named AI PM tactic, extracted from operator stories, with source links."

**Why it wins:**
- The corpus is full of *named* tactics (JSON-first prototyping, LLM-as-a-judge, build-for-next-model, rebuild test, style unbundling). These are the bits that stick when listening to a podcast.
- Aspiring PMs want a "PM vocabulary" they can deploy in interviews and meetings.
- Working PMs want a quick-reference for tactics they remember by name but can't relocate.
- No existing tool indexes named tactics specifically.

**Core UX:**
- A card grid of named tactics. Each card: name, one-line definition, who named/popularized it, when to apply, source episode/post with link.
- Filter by sub-theme (prototyping, evals, agents, growth, hiring, prompting).
- Save tactics to a "my playbook" view (localStorage; no auth).
- Each card has a "Use this with Codex" button — copies a prompt template that bakes the tactic into a Codex instruction.

**Killer feature:** the "Use this with Codex" prompt buttons make the library actively useful inside your dev workflow.

**Build:** Same shape as Eval Library — build-time LLM extraction + curation + static cards. ~3-5 days. Could be combined with Idea 1 into a single "Artifact Library" — see Hybrid Concept below.

---

### Idea 3: Operator Disagreement Engine
**The hook:** "The smartest operators in AI disagree. Here's where, and why."

**Why it wins:**
- This is the most *unique* idea here — no existing tool does this for any content corpus.
- Disagreements are where the highest signal lives. Conventional wisdom is in books. Hot takes and conflicts are in podcasts.
- The corpus has rich conflicts: Rabois vs. Lenny vs. Singhal on the PM role's future; Schulhoff vs. Cat Wu on prompt engineering; Howie Liu vs. Marily Nika on shiny-object risk; Zevi vs. Rabois vs. Scott Wu on junior PMs.
- Highly portfolio-viral. The Show HN post writes itself.

**Core UX:**
- A list of "open questions" in AI PM (e.g., "Are AI PMs in trouble?" / "Is prompt engineering a real skill?" / "Should PMs vibe-code?").
- For each, a side-by-side panel of operator positions: name, photo (if licensable from Lenny), one-paragraph position, source link + timestamp, and a 5-point alignment slider for the reader.
- Reader's positions visible at the top: "you side with Lenny on PMs-in-trouble, but with Rabois on prompt engineering."

**Killer feature:** the alignment slider. Personally meaningful, social-shareable ("87% of readers side with Cat Wu").

**Build:** Hardest of the top 5 — disagreement detection needs a careful LLM pipeline (find paired claims, verify they're truly opposed, summarize stances). Plan ~7-10 days with manual curation pass. Could ship with 8-12 hand-curated debates and grow over time.

**Risk:** misattributing positions. Mitigated by inline source quotes and human review.

---

### Idea 4: Concept Timeline
**The hook:** "How AI PM concepts evolved — see the discipline forming in real time."

**Why it wins:**
- The corpus literally captures the AI era's PM disciplines forming. Evals went from "vibe checks" in 2023 to "LLM-as-a-judge" in 2024 to "expert eval economy" in 2026.
- Visually rich; an interactive timeline is portfolio gold.
- Educational for aspiring AI PMs ("here's how we got here").
- Working AI PMs love being reminded of intellectual genealogies.

**Core UX:**
- Pick a concept: Evals / Prompting / AI Prototyping / Agents / AI PM Role / Distribution.
- See a horizontal timeline showing key episodes/posts in chronological order, with a synthesized "what changed at this point" label.
- Click any node → episode/post detail with quoted source passages.

**Killer feature:** the synthesized stage-name labels ("vibe checks era," "evals-as-PRD era") feel curated and authoritative.

**Build:** Medium. Concept extraction is straightforward; the timeline UI is the heavy lift. ~4-6 days. d3 or visx for the timeline.

---

### Idea 5: AI PM Insider Glossary
**The hook:** "Speak the language. Every AI PM term, sourced and dated, with operator context."

**Why it wins:**
- Aspiring AI PMs explicitly say they don't know the vocabulary. Working PMs use it inconsistently.
- A glossary is the most natural way to scaffold corpus knowledge — wiki-style is familiar, low-barrier.
- Quick to build, low risk, evergreen.

**Core UX:**
- A-Z glossary of terms (AGI-pilled, AEO, full-stack builder, CC/CD lifecycle, OpenClaw, vibe coder, etc.).
- Each entry: definition, who coined/popularized, date of earliest mention, related terms, episode/post citations.
- Search + filter.
- A "term cloud" landing page that's visually striking.

**Killer feature:** every term shows date of earliest mention in the corpus — captures the timeline of discipline-formation.

**Build:** Easiest of the top 5 — could ship in 2-3 days. Term extraction is mechanical (LLM pass + curation). Static site renders. No RAG needed (the corpus is finite).

---

---

## Part 4b — The remaining nine, expanded to the same depth

### Idea 6: AI PM Curriculum Generator
**Hook:** "Tell us where you are. Get a 4-week curated plan from Lenny's corpus to become an AI PM."

**Why it wins:** Aspiring AI PMs' top "where do I start" complaint maps to a 166-file AI subset nobody has organized as a learning path. You'd be operationalizing Lenny's implicit curriculum.

**Core UX:** A short intake (role, AI experience, goal). Outputs a 4-week plan with 3 podcasts + 2 newsletters per week, weekly themes, what to listen for, and a "what you'll be able to discuss after this" preview. Mark-as-completed tracking via localStorage. "Generate next 4 weeks" continues the path.

**Killer feature:** each item shows estimated time + the specific skill/vocabulary you'll pick up — progress feels measurable.

**Build:** Medium. Build-time LLM extraction of "learning value" for each file (level, role-fit, prerequisites), then a small rules engine + light RAG to assemble plans. ~4-6 days.

**Risk:** can feel course-y (many "AI tutor" projects exist). Differentiate by being explicitly *not* a course — just Lenny content in smart order.

---

### Idea 7: "Show Me an AI PM Day"
**Hook:** "What does an AI PM actually do? Eight real workflows pulled from Lenny operators."

**Why it wins:** The corpus is full of in-the-trenches workflow descriptions — how Cat Wu runs roadmap meetings, how Marily Nika runs evals, how Zevi vibe-codes specs, how Amol Avasare runs experiments at Anthropic. Aspiring AI PMs say "I don't know what the actual job is." This closes that gap; no other Lenny tool does.

**Core UX:** A grid of "Days in the Life" — each is a synthesized workflow (roadmap meeting, eval review, PRD draft, agent design, A/B test review, exec update, customer interview, vibe-code prototype). Each shows agenda, key meetings, artifacts produced, tools used, decisions made, citations to source operators. Side-by-side comparison: same activity at a frontier lab vs. enterprise vs. early-stage.

**Killer feature:** every workflow links to "the artifacts produced that day" — natural cross-links to the eval library / tactics playbook ideas.

**Build:** Medium-high. Careful narrative synthesis from operator content. ~6-8 days for 8 workflows.

**Risk:** synthesis quality. Hand-curation is essential.

---

### Idea 8: Portfolio Project Generator
**Hook:** "Stop overthinking your AI PM portfolio. 30 buildable projects extracted from operator stories, each with a starter Codex prompt."

**Why it wins:** Aspiring AI PMs' portfolio anxiety is a real pain. The corpus is full of micro-products operators describe building (Claire Vo's OpenClaw, Lazar's internal tools, Lenny's own AI copilot). Vibe coding is the 2026 cultural moment — projects you can ship in a weekend with Cursor/Codex. No Lenny tool addresses this.

**Core UX:** Browse projects by difficulty (weekend / week / month) and by skill demonstrated (evals / agents / RAG / growth / product taste). Each card: what it is, inspiring operator, skill demonstrated, expected time, starter prompt for Codex/Cursor, links to source episodes. "Generate my portfolio plan" picks 3 projects across difficulty, returns a 6-week build plan.

**Killer feature:** starter prompts are pre-engineered to produce a working scaffold in Codex. Removes the gap between "I have an idea" and "I have a thing."

**Build:** Medium. ~4-5 days for project extraction + curation + UI.

**Risk:** prompt quality. Each starter prompt needs testing.

---

### Idea 9: Interview Mode
**Hook:** "Every common AI PM interview question, answered by 3-5 operators in their own words."

**Why it wins:** Aspiring AI PMs need to articulate RAG, evals, agents in interviews. Differentiation from Exponent: not a question bank — an *operator-perspective layer*. See how Cat Wu, Aman Khan, Marily Nika would each frame the same answer.

**Core UX:** Categorized questions ("How would you build evals for X?" / "When would you use RAG vs fine-tuning?" / "How do you handle hallucinations?" / "How would you scope an AI feature PRD?"). For each: synthesized model answer + 3-5 operator-specific framings with citations. Practice mode: write your own answer, then see operator framings side-by-side.

**Killer feature:** practice-then-compare flow feels like actual coaching, not reading.

**Build:** Medium. ~5-7 days. Question taxonomy curation is the hard part.

**Risk:** Exponent is much bigger and could clone in a week. Mitigated by positioning as operator-perspective layer, not bank.

---

### Idea 10: What-Would-X-Do Coach
**Hook:** "Ask any AI PM question. Get answers in the voice of Cat Wu, Boris Cherny, or Lenny himself."

**Why it wins:** Deeply unique — no other tool does persona-driven retrieval. Sticky and viral ("I asked Marc Andreessen how to think about my product strategy"). Each operator has enough corpus to support a distinct voice and style.

**Core UX:** Choose your "advisor" (10-15 named operators). Ask a question. Get an answer in that operator's voice and framing, grounded in their actual transcripts/posts. Each answer cites source passages. "Compare advisors" puts three operators side-by-side on the same question.

**Killer feature:** the compare-advisors mode surfaces real disagreements naturally.

**Build:** High. Persona-conditioning + grounding requires careful prompt engineering and per-operator content slicing. ~10-14 days.

**Risk:** ethical/legal — impersonating real people. Mitigate with strict "based on their actual content" framing + source quotes + ideally explicit Lenny permission for the named operators. Could even be the reason to reach out to Lenny.

---

### Idea 11: News → Operator Take
**Hook:** "Paste an AI news article. Get the relevant operator commentary from Lenny's corpus."

**Why it wins:** Working AI PMs' "keep up with research" pain is real. Framing daily news through operator lenses adds context to ephemeral content. Daily/weekly habit-forming.

**Core UX:** Paste URL or text. Get a summary, then 3-5 related operator takes with timestamps and citations. "Trending now" feed of recent AI news with prepared operator-take cards.

**Killer feature:** the trending feed makes it a daily destination, not a one-off tool.

**Build:** High. News ingestion + operator-take matching both have to work. ~8-10 days.

**Risk:** freshness — news ingestion needs upkeep. Solvable with a cron-fed feed from curated sources (HN, TechCrunch, X).

---

### Idea 12: AI PM Career Decision Tree
**Hook:** "Should you join a frontier lab or an enterprise? Code or not? Generalist or AI specialist? Decide with operator-grounded branches."

**Why it wins:** The corpus has *a lot* of career advice (Singhal, Rabois, Lenny himself, Marily Nika). Both audiences (working + aspiring) face these questions. Visual + interactive — a tree is portfolio-friendly.

**Core UX:** Start with "Where are you?" Branches are strategic questions (lab vs. enterprise; AI generalist vs. AI specialist; vibe-code or not; eval-heavy or design-heavy). Each branch shows operator stances with citations. End state: a personal "AI PM career profile" with recommended reading from corpus.

**Killer feature:** branches expose operator disagreements naturally (the "junior PM" question is a real fork: Zevi vs. Rabois vs. Scott Wu).

**Build:** Medium. ~5-7 days. The taxonomy work is the heavy part.

**Risk:** can feel static. Mitigated by 80% pre-built tree + 20% RAG-driven branch expansion.

---

### Idea 13: AI PM Quote Cards / Wall
**Hook:** "The internet's most beautiful collection of AI PM wisdom."

**Why it wins:** Lowest-effort idea — pure design + curation play. Highly shareable on Twitter/LinkedIn. Builds the tool's brand through the quotes themselves.

**Core UX:** A wall of beautifully-designed quote cards (operator name, photo, quote, source link, date). Filter by topic, operator, year. Click any card to download a 1080×1080 share image. "Generate my quote wall" — pick 10, share as a curated set.

**Killer feature:** download-as-1080×1080 makes the site self-distributing.

**Build:** Low. ~2-4 days. Extraction is mechanical; design is the real work.

**Risk:** not enough functional utility on its own. Better as a companion module than a standalone product.

---

### Idea 14: Token & Cost Calculator with Operator Lore
**Hook:** "Estimate your AI feature's token cost. With operator quotes on the cost surprises they hit and how they fixed them."

**Why it wins:** Working AI PMs' "token cost surprise" pain is a top-5 issue. The corpus has operator anecdotes on cost (Amol Avasare, Sherwin Wu, Boris Cherny) that map cleanly to calculator inputs. Token calculators exist; calculators-with-operator-context don't.

**Core UX:** Input feature description, expected daily users, model, token budget per call. Output: monthly cost estimate, breakdown, and an "operator lore" panel with relevant cost-surprise quotes. "What would change cost most" mode shows the impact of prompt-cache, model choice, RAG vs. fine-tune.

**Killer feature:** the operator-lore sidebar — calculator + storytelling is the unique combination.

**Build:** Medium. ~5-7 days. Math is easy; lore-matching is the work.

**Risk:** cost data goes stale fast — need a clean update cadence.

---

## Part 5 — Hybrid concept: "The AI PM Field Guide"

If you want one product instead of one feature, bundle the strongest ideas into a single multi-module site:

**Modules:**
1. **The Eval Library** (Idea 1) — solves the #1 working AI PM pain
2. **The Named Tactics Playbook** (Idea 2) — high-signal artifact library
3. **The Disagreement Engine** (Idea 3) — the visually viral hook
4. **The Concept Timeline** (Idea 4) — educational + portfolio polish
5. **The Insider Glossary** (Idea 5) — low-effort scaffolding entry point

Plus a small RAG-powered "ask the field guide" search across all five modules, citation-first.

**Why bundle:** each module is a different surface area for the corpus's strengths. Together they're "the AI PM Field Guide" — a single, polished, opinionated reference that *no other Lenny tool comes close to*. Each module is shippable independently, so you can launch the glossary first (3 days), evals second (5 days), etc., and let momentum compound.

**Why not bundle:** if your goal is one tight Show-HN moment, picking one (Eval Library or Disagreement Engine) and shipping it hard is more focused.

---

## Part 6 — My recommendation, if I had to choose

**Single-product play:** Build **The Eval Library** (Idea 1) first. Highest pain, highest content match, clearest differentiation, clearest "I solved a problem you actually have" pitch. Ship it in a week. Strong portfolio piece.

**Hybrid play:** Build **The AI PM Field Guide** with the Glossary (Idea 5) as v1 in week 1, Named Tactics (Idea 2) as v2 in week 2, and Eval Library (Idea 1) as v3 in week 3-4. Disagreement Engine (Idea 3) as v4 if there's traction. This becomes the canonical AI PM reference in 3-4 weeks and is harder for competitors to clone.

**If portfolio-virality is the goal:** Build the **Disagreement Engine** (Idea 3). It's the most "wait, what?" idea. Maximally novel. Will get HN front page if the design is right.

---

## Decision points for you

Before I write Codex prompts, three things to decide:

1. **One focused product, or the bundled Field Guide?** (Affects time investment and structure.)
2. **Which idea(s) to start with?** (See top 5 above; my picks: Eval Library or the Field Guide path starting from Glossary.)
3. **Aesthetic direction.** Pick a vibe — clean utilitarian (Linear/Vercel), editorial (NYT Magazine/Stratechery), playful (Are.na/Glitch), or technical-archival (Datasette). This shapes the UI prompts.
