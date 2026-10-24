# Curation report

- Raw extracted patterns: 317
- Final curated patterns: 76
- Merged clusters: 55
- Raw patterns merged away: 212
- Dropped clusters: 4
- Dropped raw patterns: 29

## Operator name merges

| From | To |
| --- | --- |
| Aishwarya Naresh Reganti | Aishwarya Reganti |
| Amy | Ami Vora |
| Dhanji R. Prasanna | Dhanji Prasanna |
| Dr. Marily Nika | Marily Nika |
| HL Hussein | Hamel Husain |
| Mike | Mike Krieger |
| Nick | Nick Ung |
| Ryan J. Salva | Ryan Salva |

## Largest merged clusters

### Error Analysis on Traces (Open and Axial Coding) (15) → `error-analysis-on-traces-open-and-axial-coding`

Kept.

- Error Analysis via Open Coding on Traces (`raw-001`)
- Axial Coding and Failure-Mode Counting (`raw-002`)
- Continuous Error Analysis Loop (`raw-017`)
- Error Analysis of Failed Trajectories (`raw-051`)
- Error analysis before metrics (`raw-081`)
- Open coding (`raw-082`)
- Axial coding (`raw-083`)
- Principal domain expert (benevolent dictator) (`raw-084`)
- Error Pattern Analysis from Weakest Metrics (`raw-131`)
- Stuck-Point Identification and Quantitative Tuning Loop (`raw-152`)
- Error Analysis on Traces (`raw-231`)
- Open Coding (First-Error Note Taking) (`raw-232`)
- Axial Coding and Failure-Mode Counting (`raw-233`)
- Benevolent Dictator (`raw-234`)
- Theoretical Saturation (When to Stop Reviewing Traces) (`raw-235`)

### LLM-as-a-Judge (15) → `llm-as-a-judge`

Kept.

- Binary LLM-as-a-Judge for a Specific Failure Mode (`raw-004`)
- Actionable Binary LLM Judges Tied to Business Outcomes (`raw-013`)
- Pointwise over Pairwise Judging (`raw-023`)
- RAG-Grounded Judge with Shared Living Policy (`raw-027`)
- LLM-as-a-Judge Evals (`raw-061`)
- The Four-Part Eval Formula (`raw-064`)
- Few-Shot Examples in Eval Prompts (`raw-069`)
- LLM-as-a-judge (`raw-087`)
- Binary pass/fail over Likert scales (`raw-088`)
- LLM-as-a-Judge (`raw-101`)
- Few-Shot Calibration Scale (`raw-115`)
- LLM-graded search relevance for offline evaluation (`raw-133`)
- LLM-as-a-Judge for Writing Quality (Judging Loop) (`raw-193`)
- Rubric-Based Model-as-Judge Auto-Evaluation (`raw-219`)
- Binary LLM-as-a-Judge for a Single Failure Mode (`raw-236`)

### Custom Private Benchmarks on Your Own Use Case (12) → `custom-private-benchmarks-on-your-own-use-case`

Kept.

- Best-Model, Prompt-Engineered Benchmarking (`raw-106`)
- Hard-Task Benchmark Mapped to a Job Skills Framework (`raw-107`)
- Model Evals vs Product Evals (`raw-138`)
- Benchmark Saturation Awareness (`raw-157`)
- Enterprise Value-Chain Eval (`raw-168`)
- Senior Engineer Benchmark (custom rewrite-from-first-principles benchmark) (`raw-187`)
- Benchmark Saturation Caveat (benchmarks only score what we can frame) (`raw-190`)
- Private Real-World Benchmark (CEO Benchmark) (`raw-192`)
- Benchmark Skepticism (Benchmark Gaming and Hill-Climbing) (`raw-200`)
- Leaderboard Critique: LLM Arena Style Preference Voting (`raw-201`)
- Custom Evals for Use-Case-Specific Fine-Tuned Models (`raw-264`)
- Customer-Specific Use-Case Benchmarks ("Cursor Bench") (`raw-275`)

### Validating an LLM Judge Against Human Labels (10) → `validating-an-llm-judge-against-human-labels`

Kept.

- Judge Alignment with TPR/TNR (Avoiding the Agreement Trap) (`raw-005`)
- Judge Validation with Precision and Recall on Human Labels (`raw-014`)
- Criteria Drift and Validating the Validators (`raw-015`)
- Judge Calibration Against a Human-Labeled Golden Dataset (`raw-025`)
- Agreement Gate in CI (`raw-026`)
- Train/dev/test split for judge validation (`raw-089`)
- TPR/TNR over accuracy (`raw-090`)
- Validate an AI Detector on Known-Label Sets Before Using It (`raw-210`)
- Judge-Human Alignment via Confusion Matrix (`raw-237`)
- Criteria Drift (`raw-240`)

### Internal Dogfooding for Quality Vetting (9) → `internal-dogfooding-for-quality-vetting`

Kept.

- Internal Dogfooding Quality Bar (`raw-042`)
- Dogfooding as Qualitative Quality Vetting (`raw-047`)
- Dogfooding with Audience-Bias Calibration (`raw-143`)
- Internal Trial Before Broad Rollout of an AI Coding Assistant (`raw-196`)
- Leadership Hands-On Dogfooding of AI Tools on Real Tasks (`raw-198`)
- Dogfooding to Vet Product Quality (`raw-217`)
- Dogfooding the AI Product (`raw-227`)
- Dogfooding as Informal Error Analysis (`raw-243`)
- Internal Dogfooding Before Shipping (`raw-251`)

### AI Reviewer Agents (Cross-Model Critique) (8) → `ai-reviewer-agents-cross-model-critique`

Re-synthesized so this pattern absorbs the patterns merged into it.

- AI code review as a checklist with human triage (`raw-113`)
- AI Supervising AI (Layered Reviewer Agents) (`raw-170`)
- External Code Review for Diagnosis (`raw-269`)
- Cross-Model Critique (LLM Council) (`raw-272`)
- AI Review Plus Human Acceptance Testing for AI-Generated Code (`raw-278`)
- Cross-Model Peer Review with Dev-Lead Rebuttal (`raw-316`)
- Checked-In 'What Good Looks Like' Specs with Automated AI Review (`raw-045`)
- Spec-Based Automated Code Review (`raw-214`)

### Eval Type Selection and Prioritization (8) → `eval-type-selection-and-prioritization`

Kept.

- Code-Based vs LLM-as-Judge Eval Selection (`raw-003`)
- Cost Ladder: Deterministic First, Judge Last (`raw-029`)
- Start Small: First Eval on One Critical Feature (`raw-072`)
- Context-Dependent Choice Between LLM Judges and User Signals (`raw-139`)
- Build 10 Great Evals (`raw-176`)
- Eval ROI Triage (Vibe Checks vs. Formal Evals) (`raw-183`)
- Goal-Driven Eval Coverage (Evals Guide Product Development) (`raw-184`)
- Prioritizing Which Evals to Write (`raw-242`)

### Golden Dataset Regression Evals in CI (8) → `golden-dataset-regression-evals-in-ci`

Kept.

- Using the Eval Suite for Fast Iteration and Regression Checks (`raw-006`)
- Config-Driven Eval Harness with Pre-Commit and CI/CD Regression Gates (`raw-020`)
- Evals as Fuzzy Unit Tests (`raw-021`)
- Regression Evals Across Model Versions (`raw-054`)
- Evals as Unit Tests/Benchmarks for AI (`raw-060`)
- Eval-Driven Regression Testing and Benchmarking for Changes (`raw-070`)
- Golden dataset CI regression evals (`raw-095`)
- Evals as Unit Tests for Models (`raw-262`)

### Capability Backlog Re-Testing on New Models (7) → `capability-backlog-re-testing-on-new-models`

Kept.

- Park and Retest Projects in an Eval Harness on Each New Model (`raw-055`)
- Re-test model boundaries on every new model release (`raw-174`)
- Swap-in New Model on Ahead-of-Capability Prototypes (`raw-180`)
- Re-run the Hard Task on Every New Model (turn the rock over) (`raw-188`)
- Personal Regression Benchmark: Rebuild Your Own Site Each Model Release (`raw-225`)
- Adversarial 'Find What It Can't Build' Fitness Function (`raw-226`)
- Capability Probing Backlog of Tasks AI Can't Yet Do (`raw-308`)

### Code-Based Evaluators (7) → `code-based-evaluators`

Kept.

- Deterministic Code-Assertion Evaluators (`raw-012`)
- Deterministic Tool-Call Checks (Exact Match and Schema Validation) (`raw-030`)
- Code-Based Evals (`raw-062`)
- Code-based evaluators (`raw-086`)
- Code-Based Evaluators (`raw-238`)
- Deterministic Pass/Fail Evals with Ground-Truth Labels (`raw-256`)
- Programmatic Accuracy Evaluation on Verifiable Datasets (`raw-296`)

### Minimum Viable Quality Thresholds with Cost Envelope (7) → `minimum-viable-quality-thresholds-with-cost-envelope`

Re-synthesized so this pattern absorbs the patterns merged into it.

- Minimum Viable Quality (MVQ) (`raw-077`)
- Cost Envelope Estimation (`raw-078`)
- Fault-Tolerant UI Matched to Model Hit Rate (`raw-228`)
- Context-Dependent Hit Rate Thresholds (`raw-229`)
- Accuracy-Threshold Fit Assessment for Automation (`raw-254`)
- Reliability "Nines" Gap Between POC and Production (`raw-255`)
- Accuracy-Tier-Driven Product Design (`raw-265`)

### Root-Cause Postmortem of AI Failures (7) → `root-cause-postmortem-of-ai-failures`

Re-synthesized so this pattern absorbs the patterns merged into it.

- Meta-Feedback Loop (Improve the AI Tool from Observed Results) (`raw-119`)
- Debug Your Inputs Before Blaming the Model (`raw-123`)
- Root Cause Analysis on Bad AI Outputs (Context Engineering) (`raw-171`)
- Model Introspection for Failure Diagnosis (`raw-177`)
- Post-Fix Retrospective into Rules File (`raw-270`)
- Failure Root-Cause Postmortem Loop for AI Mistakes (`raw-317`)
- Agent Escalation to Human with Trace Capture (`raw-058`)

### Continuous Calibration / Eval Improvement Flywheel (6) → `continuous-calibration-eval-improvement-flywheel`

Kept.

- Living Dataset via Production Traffic Skimming (`raw-028`)
- Iterative Four-Phase Eval Workflow (`raw-065`)
- Eval improvement flywheel (`raw-098`)
- Continuous Calibration/Continuous Development (CC/CD) (`raw-125`)
- Eval Redesign Against Real Behavior (`raw-132`)
- Continuous Calibration, Continuous Development (CC/CD) (`raw-134`)

### Evals as Product Requirements (6) → `evals-as-product-requirements`

Re-synthesized so this pattern absorbs the patterns merged into it.

- Use-Case-Driven Evals for Research Collaboration (`raw-041`)
- Evals as the New PRDs (Eval-Driven Product Development) (`raw-050`)
- Eval as Product Requirement Document (`raw-165`)
- Evals as Living PRDs (`raw-241`)
- Evals as Articulated Success Criteria (`raw-279`)
- PM-Authored Evals Relayed to Engineering (`raw-039`)

### Progressive Autonomy Ladder with Human Review Logging (6) → `progressive-autonomy-ladder-with-human-review-logging`

Kept.

- Low-Downside Human Review Gating (`raw-121`)
- Incremental Trust Calibration Through Review Cycles (`raw-122`)
- Agency-Control Versioning Ladder (`raw-126`)
- Progressive Autonomy with Human-Behavior Logging (`raw-137`)
- Minimizing Surprise as a Calibration Readiness Signal (`raw-141`)
- Human-in-the-Loop Review with Gradual Replacement by Guideline Skills (`raw-150`)

40 smaller merged clusters are not listed above.

## Top 10 most-cited operators

| Operator | Citations |
| --- | ---: |
| Hamel Husain | 41 |
| Shreya Shankar | 41 |
| Lenny Rachitsky | 29 |
| Aishwarya Reganti | 17 |
| Kiriti Badam | 17 |
| Akshay Sharma | 12 |
| Aman Khan | 12 |
| Nick Ung | 12 |
| Tejas Kumar | 11 |
| Mike Taylor | 10 |

Kept counts final patterns that still carry the value. A merged pattern can count toward more than one publication or feature type.

## Publication coverage

| Value | Raw | Kept |
| --- | ---: | ---: |
| Aakash Gupta | 8 | 7 |
| AI Engineer | 23 | 14 |
| Lenny's Newsletter | 75 | 35 |
| Lenny's Podcast | 211 | 62 |

## Category coverage

| Value | Raw | Kept |
| --- | ---: | ---: |
| framework | 52 | 13 |
| methodology | 111 | 32 |
| metric | 39 | 9 |
| process | 115 | 22 |

## Feature type coverage

| Value | Raw | Kept |
| --- | ---: | ---: |
| agent | 184 | 60 |
| chatbot | 118 | 49 |
| classification | 22 | 12 |
| code_generation | 81 | 30 |
| general | 250 | 62 |
| multimodal | 16 | 9 |
| rag | 36 | 19 |
| search_ranking | 17 | 11 |
| summarization | 20 | 10 |

## Coverage gaps

- None. Every publication, category, and feature type in the raw set is still present on a kept pattern.

## Preserved concepts

- Statistical Score Correction using Judge Error Rates: not a separate kept pattern. Published "Statistical Score Correction using Judge Error Rates" is nearest to validating-an-llm-judge-against-human-labels (Validating an LLM Judge Against Human Labels, score 0.550).
- Three-Layer Model Safety Evaluation: kept as three-layer-model-safety-evaluation-interpretability-lab-evals-in-the-wild. Published "Three-Layer Model Safety Evaluation" is nearest to three-layer-model-safety-evaluation-interpretability-lab-evals-in-the-wild (Three-Layer Model Safety Evaluation (Interpretability, Lab Evals, In-the-Wild), score 0.873).

## Redirects

| Old id | Old name | New id | New name | Score | Redirect |
| --- | --- | --- | --- | ---: | --- |
| binary-judgments-for-evals | Binary Judgments for Evals | llm-as-a-judge | LLM-as-a-Judge | 0.731 | yes |
| blind-human-preference-test | Blind Human Preference Test | blind-pairwise-human-preference-evaluation | Blind Pairwise Human Preference Evaluation | 0.793 | yes |
| code-based-eval | Code-Based Eval | code-based-evaluators | Code-Based Evaluators | 0.821 | yes |
| continuous-calibration-continuous-development-cccd | Continuous Calibration, Continuous Development (CCCD) | continuous-calibration-eval-improvement-flywheel | Continuous Calibration / Eval Improvement Flywheel | 0.697 | yes |
| diy-data-inspection-dashboards | DIY Data Inspection Dashboards | custom-trace-review-and-annotation-tooling | Custom Trace Review and Annotation Tooling | 0.455 | override |
| dual-purpose-evaluations | Dual-Purpose Evaluations | rubrics-and-verifiers-as-rl-reward-signals | Rubrics and Verifiers as RL Reward Signals | 0.511 | override |
| error-analysis-open-axial-coding | Error Analysis (Open/Axial Coding) | error-analysis-on-traces-open-and-axial-coding | Error Analysis on Traces (Open and Axial Coding) | 0.869 | yes |
| eval-driven-improvement-flywheel | Eval-Driven Improvement Flywheel | continuous-calibration-eval-improvement-flywheel | Continuous Calibration / Eval Improvement Flywheel | 0.771 | yes |
| evals | Evals | evals-as-product-requirements | Evals as Product Requirements | 0.629 | yes |
| expert-human-evaluation | Expert Human Evaluation | expert-human-evaluations-for-measuring-model-progress | Expert Human Evaluations for Measuring Model Progress | 0.762 | yes |
| four-part-eval-formula | Four-Part Eval Formula | llm-as-a-judge | LLM-as-a-Judge | 0.519 | yes |
| golden-dataset-for-ci-regression-testing | Golden Dataset for CI Regression Testing | golden-dataset-regression-evals-in-ci | Golden Dataset Regression Evals in CI | 0.780 | yes |
| guardrail-evaluators | Guardrail Evaluators | guardrail-evals-runtime-blocking | Guardrail Evals (Runtime Blocking) | 0.780 | yes |
| hallucination-eval | Hallucination Eval | faithfulness-and-hallucination-evaluation | Faithfulness and Hallucination Evaluation | 0.655 | yes |
| hero-use-case-eval-loop | Hero Use Case Eval Loop | use-case-category-hill-climbing | Use-Case Category Hill Climbing | 0.601 | yes |
| human-evals | Human Evals | expert-human-evaluations-for-measuring-model-progress | Expert Human Evaluations for Measuring Model Progress | 0.622 | yes |
| iterative-eval-development-workflow | Iterative Eval Development Workflow | continuous-calibration-eval-improvement-flywheel | Continuous Calibration / Eval Improvement Flywheel | 0.693 | yes |
| judge-alignment-via-confusion-matrix | Judge Alignment via Confusion Matrix | validating-an-llm-judge-against-human-labels | Validating an LLM Judge Against Human Labels | 0.695 | yes |
| llm-arena-voting | LLM Arena Voting | custom-private-benchmarks-on-your-own-use-case | Custom Private Benchmarks on Your Own Use Case | 0.348 | override |
| llm-as-a-judge | LLM-as-a-Judge | llm-as-a-judge | LLM-as-a-Judge | 0.900 | no |
| llm-introspection-debugging | LLM Introspection Debugging | root-cause-postmortem-of-ai-failures | Root-Cause Postmortem of AI Failures | 0.482 | override |
| off-the-shelf-metric-mining | Off-the-Shelf Metric Mining | off-the-shelf-metrics-as-exploration-tools | Off-the-shelf metrics as exploration tools | 0.767 | yes |
| overall-correctness-eval | Overall Correctness Eval | llm-as-a-judge | LLM-as-a-Judge | 0.393 | override |
| pesky-failure-first-eval-selection | Pesky-Failure-First Eval Selection | eval-type-selection-and-prioritization | Eval Type Selection and Prioritization | 0.630 | yes |
| production-monitoring-with-asynchronous-evaluators | Production Monitoring with Asynchronous Evaluators | production-monitoring-with-continuous-evals | Production Monitoring with Continuous Evals | 0.786 | yes |
| reference-dataset-evaluation | Reference Dataset Evaluation | ground-truth-reference-dataset-curation | Ground-Truth Reference Dataset Curation | 0.636 | yes |
| reinforcement-learning-environments | Reinforcement Learning Environments | rl-environments-for-evaluating-and-training-agents | RL Environments for Evaluating and Training Agents | 0.784 | yes |
| retriever-generator-split-evaluation | Retriever/Generator Split Evaluation | rag-retrieval-evaluation-recall-k | RAG Retrieval Evaluation (Recall@k) | 0.683 | yes |
| role-specific-skill-taxonomy-for-ai-benchmarking | Role-Specific Skill Taxonomy for AI Benchmarking | custom-private-benchmarks-on-your-own-use-case | Custom Private Benchmarks on Your Own Use Case | 0.427 | override |
| rubrics-and-verifiers | Rubrics and Verifiers | rubrics-and-verifiers-as-rl-reward-signals | Rubrics and Verifiers as RL Reward Signals | 0.786 | yes |
| single-turn-reproduction-for-multi-turn-debugging | Single-Turn Reproduction for Multi-turn Debugging | multi-turn-conversation-evaluation-with-single-turn-reproduction | Multi-turn conversation evaluation with single-turn reproduction | 0.674 | yes |
| small-batch-eval-building | Small-Batch Eval Building | eval-type-selection-and-prioritization | Eval Type Selection and Prioritization | 0.552 | override |
| spreadsheet-based-ideal-behavior-specification | Spreadsheet-Based Ideal Behavior Specification | evals-as-product-requirements | Evals as Product Requirements | — | override |
| standardized-benchmark-evaluation | Standardized Benchmark Evaluation | custom-private-benchmarks-on-your-own-use-case | Custom Private Benchmarks on Your Own Use Case | 0.597 | yes |
| statistical-score-correction-using-judge-error-rates | Statistical Score Correction using Judge Error Rates | validating-an-llm-judge-against-human-labels | Validating an LLM Judge Against Human Labels | 0.550 | yes |
| team-vibe-check | Team Vibe Check | vibe-checks | Vibe Checks | 0.832 | yes |
| three-layer-model-safety-evaluation | Three-Layer Model Safety Evaluation | three-layer-model-safety-evaluation-interpretability-lab-evals-in-the-wild | Three-Layer Model Safety Evaluation (Interpretability, Lab Evals, In-the-Wild) | 0.873 | yes |
| three-stage-eval-lifecycle | Three-Stage Eval Lifecycle | continuous-calibration-eval-improvement-flywheel | Continuous Calibration / Eval Improvement Flywheel | 0.624 | yes |
| toxicity-tone-eval | Toxicity/Tone Eval | toxicity-and-offensive-content-detection | Toxicity and Offensive Content Detection | 0.653 | yes |
| tpr-tnr-over-accuracy-for-judge-validation | TPR/TNR over Accuracy for Judge Validation | validating-an-llm-judge-against-human-labels | Validating an LLM Judge Against Human Labels | 0.517 | yes |
| trajectory-evaluation | Trajectory Evaluation | trajectory-level-agent-evaluation | Trajectory-Level Agent Evaluation | 0.775 | yes |
| transition-failure-matrix | Transition Failure Matrix | transition-failure-matrix | Transition failure matrix | 0.875 | no |
| vibes-before-evals | Vibes Before Evals | vibe-checks | Vibe Checks | 0.729 | yes |

## Dropped clusters

### Not an AI-eval technique; general product/engineering advice or opinion.

Not an AI-eval technique; general product/engineering advice or opinion.

- Output-Based Quality Standard Anchored in a Point of View (`raw-033`)
- Encoding Standards into a Design-System Harness (`raw-034`)
- Four-Question AI Product Rigor Check (`raw-059`)
- Anti-Sycophancy Directness Calibration and Adversarial Prompting (`raw-118`)
- Multi-Signal Worker and Output Quality Measurement (`raw-207`)
- Separating Habit-Breaking Backlash from Genuine Design Failure in Recommendation UI Redesigns (`raw-230`)
- Four-by-Four Debugging Escalation (`raw-268`)
- Human Code-Level Oversight of AI Coding Output (`raw-273`)
- 2X Smarter Model, 2X Better Feature Litmus Test (`raw-283`)
- Scope Agent Tasks by Verifiability (`raw-300`)

### Launch tactics or generic business/survey metrics, not AI-eval techniques.

Launch tactics or generic business/survey metrics, not AI-eval techniques.

- Early Retention and Fresh-User Experience Check (`raw-145`)
- Before/After Task Effort Comparison for Acceleration (`raw-146`)
- Internal Dogfooding Adoption as Product Success Signal (`raw-194`)
- Time to Value (`raw-249`)
- Developer Survey-Based Impact Measurement (`raw-252`)
- Internal Dogfooding Buzz as a Launch Signal (`raw-266`)

### Sales/marketing use, not measuring AI output quality.

Sales/marketing use, not measuring AI output quality.

- Capability Evals as Sales Collateral (`raw-169`)
- Answer Tracking with Repeated Sampling and Share of Voice (`raw-209`)
- Control-Group Experiments for Measuring Changes in LLM Answer Visibility (`raw-211`)
- Reproduce Experiments Before Trusting a Tactic (`raw-212`)

### Fails the eval-pattern bar: it does not measure AI output quality with a repeatable decision signal a product team can run on its own product.

Fails the eval-pattern bar: it does not measure AI output quality with a repeatable decision signal a product team can run on its own product.

- Randomized Trial for AI Tool Productivity (`raw-186`)
- Validating Self-Reported AI Time Savings with Objective Check Metrics (`raw-197`)
- Outcome-Over-Output Metric Review for AI Productivity (`raw-216`)
- Composite Input Metrics Leading to Developer Happiness (`raw-248`)
- Balanced SPACE-style metrics for AI coding tool impact (`raw-284`)
- AI Safety Levels (ASL) Risk Tiering (`raw-159`)
- Social Media Sentiment Monitoring (Reddit/Twitter Vibes) (`raw-144`)
- Latency Threshold Experiments for Inline Suggestions (`raw-290`)
- Economic Turing Test (`raw-156`)

## Coverage table

| Raw id | Raw name | Result |
| --- | --- | --- |
| raw-001 | Error Analysis via Open Coding on Traces | error-analysis-on-traces-open-and-axial-coding |
| raw-002 | Axial Coding and Failure-Mode Counting | error-analysis-on-traces-open-and-axial-coding |
| raw-003 | Code-Based vs LLM-as-Judge Eval Selection | eval-type-selection-and-prioritization |
| raw-004 | Binary LLM-as-a-Judge for a Specific Failure Mode | llm-as-a-judge |
| raw-005 | Judge Alignment with TPR/TNR (Avoiding the Agreement Trap) | validating-an-llm-judge-against-human-labels |
| raw-006 | Using the Eval Suite for Fast Iteration and Regression Checks | golden-dataset-regression-evals-in-ci |
| raw-007 | Synthetic Inputs to Bootstrap Traces | synthetic-test-input-generation |
| raw-008 | Domain-Expert-Led Error Analysis with Custom Trace Tooling | custom-trace-review-and-annotation-tooling |
| raw-009 | Offline Multi-Turn Simulation with Launch Gate | simulated-multi-turn-conversations-with-a-realistic-user-llm |
| raw-010 | Realistic User Simulator (Fine-Tuned User LLM and Personas) | simulated-multi-turn-conversations-with-a-realistic-user-llm |
| raw-011 | Production-Grounded Synthetic Dataset with Mutation | synthetic-test-input-generation |
| raw-012 | Deterministic Code-Assertion Evaluators | code-based-evaluators |
| raw-013 | Actionable Binary LLM Judges Tied to Business Outcomes | llm-as-a-judge |
| raw-014 | Judge Validation with Precision and Recall on Human Labels | validating-an-llm-judge-against-human-labels |
| raw-015 | Criteria Drift and Validating the Validators | validating-an-llm-judge-against-human-labels |
| raw-016 | Confidence Intervals on Eval Scores | confidence-intervals-and-significance-testing-on-eval-results |
| raw-017 | Continuous Error Analysis Loop | error-analysis-on-traces-open-and-axial-coding |
| raw-018 | Tracing and Annotation Queues for Ground-Truth Labels | custom-trace-review-and-annotation-tooling |
| raw-019 | Closing the Eval Loop: Model, Context, and Harness Learning | closing-the-eval-loop-model-context-and-harness-learning |
| raw-020 | Config-Driven Eval Harness with Pre-Commit and CI/CD Regression Gates | golden-dataset-regression-evals-in-ci |
| raw-021 | Evals as Fuzzy Unit Tests | golden-dataset-regression-evals-in-ci |
| raw-022 | Ahead-of-Time Evals plus Just-in-Time Harnesses | guardrail-evals-runtime-blocking |
| raw-023 | Pointwise over Pairwise Judging | llm-as-a-judge |
| raw-024 | Judge Bias Audit (Position, Sycophancy, Self-Preference, Verbosity) | judge-bias-audit-position-sycophancy-self-preference-verbosity |
| raw-025 | Judge Calibration Against a Human-Labeled Golden Dataset | validating-an-llm-judge-against-human-labels |
| raw-026 | Agreement Gate in CI | validating-an-llm-judge-against-human-labels |
| raw-027 | RAG-Grounded Judge with Shared Living Policy | llm-as-a-judge |
| raw-028 | Living Dataset via Production Traffic Skimming | continuous-calibration-eval-improvement-flywheel |
| raw-029 | Cost Ladder: Deterministic First, Judge Last | eval-type-selection-and-prioritization |
| raw-030 | Deterministic Tool-Call Checks (Exact Match and Schema Validation) | code-based-evaluators |
| raw-031 | Synthetic Evals and Red-Team Datasets | synthetic-test-input-generation |
| raw-032 | Post-Build Editor Review (Experience It Like a User) | human-end-to-end-output-review |
| raw-033 | Output-Based Quality Standard Anchored in a Point of View | dropped: Not an AI-eval technique; general product/engineering advice or opinion. |
| raw-034 | Encoding Standards into a Design-System Harness | dropped: Not an AI-eval technique; general product/engineering advice or opinion. |
| raw-035 | Iterative Scrutiny and Adversarial Stress-Testing of AI Output | human-end-to-end-output-review |
| raw-036 | Task-Category Hill Climbing on Real User Tasks | use-case-category-hill-climbing |
| raw-037 | Agent-Run QA Regression Testing Across Releases | agentic-qa-testing |
| raw-038 | Unbiased Manual Onboarding and Diverse Early-Access Observation | qualitative-user-testing-of-ai-products |
| raw-039 | PM-Authored Evals Relayed to Engineering | evals-as-product-requirements |
| raw-040 | Prompt Debugging with an LLM Observability Platform | custom-trace-review-and-annotation-tooling |
| raw-041 | Use-Case-Driven Evals for Research Collaboration | evals-as-product-requirements |
| raw-042 | Internal Dogfooding Quality Bar | internal-dogfooding-for-quality-vetting |
| raw-043 | Empirical Testing With Users and Fast Iteration | qualitative-user-testing-of-ai-products |
| raw-044 | Bad vs. Sad Quality Framework | bad-vs-sad-severity-framework |
| raw-045 | Checked-In 'What Good Looks Like' Specs with Automated AI Review | ai-reviewer-agents-cross-model-critique |
| raw-046 | Frustration-Signal Dashboard (Swear Word Tracking) | implicit-user-signals-as-quality-metrics |
| raw-047 | Dogfooding as Qualitative Quality Vetting | internal-dogfooding-for-quality-vetting |
| raw-048 | Agentic Rubric-Based QA of AI Responses | agentic-qa-testing |
| raw-049 | Opt-In User Feedback Mining and Stack-Ranking | llm-assisted-feedback-mining-and-stack-ranking |
| raw-050 | Evals as the New PRDs (Eval-Driven Product Development) | evals-as-product-requirements |
| raw-051 | Error Analysis of Failed Trajectories | error-analysis-on-traces-open-and-axial-coding |
| raw-052 | Building an Eval Set from User Feedback | converting-user-feedback-and-failures-into-eval-sets |
| raw-053 | On-Distribution Eval Coverage (Positive and Negative Cases) | ground-truth-reference-dataset-curation |
| raw-054 | Regression Evals Across Model Versions | golden-dataset-regression-evals-in-ci |
| raw-055 | Park and Retest Projects in an Eval Harness on Each New Model | capability-backlog-re-testing-on-new-models |
| raw-056 | Pareto Efficiency for Model Selection | multi-method-model-swap-evaluation |
| raw-057 | Model Sommelier: Ship Something With Every Model | vibe-checks |
| raw-058 | Agent Escalation to Human with Trace Capture | root-cause-postmortem-of-ai-failures |
| raw-059 | Four-Question AI Product Rigor Check | dropped: Not an AI-eval technique; general product/engineering advice or opinion. |
| raw-060 | Evals as Unit Tests/Benchmarks for AI | golden-dataset-regression-evals-in-ci |
| raw-061 | LLM-as-a-Judge Evals | llm-as-a-judge |
| raw-062 | Code-Based Evals | code-based-evaluators |
| raw-063 | Human Evals and User Feedback Loops | in-product-explicit-feedback-capture |
| raw-064 | The Four-Part Eval Formula | llm-as-a-judge |
| raw-065 | Iterative Four-Phase Eval Workflow | continuous-calibration-eval-improvement-flywheel |
| raw-066 | Ground Truth Dataset from Real Interactions | ground-truth-reference-dataset-curation |
| raw-067 | Hallucination Detection Eval | faithfulness-and-hallucination-evaluation |
| raw-068 | Toxicity and Tone Eval | toxicity-and-offensive-content-detection |
| raw-069 | Few-Shot Examples in Eval Prompts | llm-as-a-judge |
| raw-070 | Eval-Driven Regression Testing and Benchmarking for Changes | golden-dataset-regression-evals-in-ci |
| raw-071 | Production Monitoring with Continuous Evals | production-monitoring-with-continuous-evals |
| raw-072 | Start Small: First Eval on One Critical Feature | eval-type-selection-and-prioritization |
| raw-073 | Weekly Failure-Mode Mapping Rituals | failure-mode-probing-rituals |
| raw-074 | Wrong-vs-Ideal Output Comparison | failure-mode-probing-rituals |
| raw-075 | Ambiguous Prompt Testing | failure-mode-probing-rituals |
| raw-076 | First-Point-of-Failure Stress Test | failure-mode-probing-rituals |
| raw-077 | Minimum Viable Quality (MVQ) | minimum-viable-quality-thresholds-with-cost-envelope |
| raw-078 | Cost Envelope Estimation | minimum-viable-quality-thresholds-with-cost-envelope |
| raw-079 | Repeated-Run Consistency Comparison | repeated-sampling-for-stochastic-outputs-pass-k-and-consistency |
| raw-080 | Failure-Response Guardrail Patterns | failure-mode-probing-rituals |
| raw-081 | Error analysis before metrics | error-analysis-on-traces-open-and-axial-coding |
| raw-082 | Open coding | error-analysis-on-traces-open-and-axial-coding |
| raw-083 | Axial coding | error-analysis-on-traces-open-and-axial-coding |
| raw-084 | Principal domain expert (benevolent dictator) | error-analysis-on-traces-open-and-axial-coding |
| raw-085 | Off-the-shelf metrics as exploration tools | off-the-shelf-metrics-as-exploration-tools |
| raw-086 | Code-based evaluators | code-based-evaluators |
| raw-087 | LLM-as-a-judge | llm-as-a-judge |
| raw-088 | Binary pass/fail over Likert scales | llm-as-a-judge |
| raw-089 | Train/dev/test split for judge validation | validating-an-llm-judge-against-human-labels |
| raw-090 | TPR/TNR over accuracy | validating-an-llm-judge-against-human-labels |
| raw-091 | Multi-turn conversation evaluation with single-turn reproduction | multi-turn-conversation-evaluation-with-single-turn-reproduction |
| raw-092 | RAG retriever evaluation with recall@k | rag-retrieval-evaluation-recall-k |
| raw-093 | RAG generator evaluation: faithfulness and answer relevance | faithfulness-and-hallucination-evaluation |
| raw-094 | Transition failure matrix | transition-failure-matrix |
| raw-095 | Golden dataset CI regression evals | golden-dataset-regression-evals-in-ci |
| raw-096 | Asynchronous production monitoring of LLM judges | production-monitoring-with-continuous-evals |
| raw-097 | Guardrail evals | guardrail-evals-runtime-blocking |
| raw-098 | Eval improvement flywheel | continuous-calibration-eval-improvement-flywheel |
| raw-099 | AI User Testing Framework: Longitudinal, High-Touch, Attitudinal Segmentation | qualitative-user-testing-of-ai-products |
| raw-100 | Acceptance Rate | suggestion-acceptance-rate |
| raw-101 | LLM-as-a-Judge | llm-as-a-judge |
| raw-102 | Synthetic Bootstrap for Test Cases | synthetic-test-input-generation |
| raw-103 | Blind Pairwise Human Preference Evaluation (AI vs. Human) | blind-pairwise-human-preference-evaluation |
| raw-104 | Guess-the-AI Detection Rate Alongside Preference | blind-pairwise-human-preference-evaluation |
| raw-105 | Human Baseline from Real-World Examples | human-baseline-comparison |
| raw-106 | Best-Model, Prompt-Engineered Benchmarking | custom-private-benchmarks-on-your-own-use-case |
| raw-107 | Hard-Task Benchmark Mapped to a Job Skills Framework | custom-private-benchmarks-on-your-own-use-case |
| raw-108 | Counting Ties as AI Wins (Cost-Adjusted Parity) | blind-pairwise-human-preference-evaluation |
| raw-109 | Private Blind Voting to Avoid Public-Vote Bias | blind-pairwise-human-preference-evaluation |
| raw-110 | Avoiding Data Contamination in Public Benchmarks | benchmark-contamination-and-gaming-defense |
| raw-111 | Item-by-item human review of batch-generated AI outputs | human-end-to-end-output-review |
| raw-112 | Prompt refinement on a sample set before scaling generation | sample-then-scale-prompt-validation |
| raw-113 | AI code review as a checklist with human triage | ai-reviewer-agents-cross-model-critique |
| raw-114 | Quote Verification Pass | source-grounded-verification-pass-quotes-and-citations |
| raw-115 | Few-Shot Calibration Scale | llm-as-a-judge |
| raw-116 | LLM Self-Audit Verification Pass | source-grounded-verification-pass-quotes-and-citations |
| raw-117 | Cross-Model Comparison | cross-model-comparison |
| raw-118 | Anti-Sycophancy Directness Calibration and Adversarial Prompting | dropped: Not an AI-eval technique; general product/engineering advice or opinion. |
| raw-119 | Meta-Feedback Loop (Improve the AI Tool from Observed Results) | root-cause-postmortem-of-ai-failures |
| raw-120 | Known-Answer Probing Against the Source Corpus | known-answer-probing-against-the-source-corpus |
| raw-121 | Low-Downside Human Review Gating | progressive-autonomy-ladder-with-human-review-logging |
| raw-122 | Incremental Trust Calibration Through Review Cycles | progressive-autonomy-ladder-with-human-review-logging |
| raw-123 | Debug Your Inputs Before Blaming the Model | root-cause-postmortem-of-ai-failures |
| raw-124 | Traceable Outputs with Links to Raw Source | source-grounded-verification-pass-quotes-and-citations |
| raw-125 | Continuous Calibration/Continuous Development (CC/CD) | continuous-calibration-eval-improvement-flywheel |
| raw-126 | Agency-Control Versioning Ladder | progressive-autonomy-ladder-with-human-review-logging |
| raw-127 | Reference Dataset | ground-truth-reference-dataset-curation |
| raw-128 | Routing Accuracy | routing-accuracy |
| raw-129 | Retrieval Quality Eval | rag-retrieval-evaluation-recall-k |
| raw-130 | Live Interaction Data and Proxy-Signal Sampling | production-monitoring-with-continuous-evals |
| raw-131 | Error Pattern Analysis from Weakest Metrics | error-analysis-on-traces-open-and-axial-coding |
| raw-132 | Eval Redesign Against Real Behavior | continuous-calibration-eval-improvement-flywheel |
| raw-133 | LLM-graded search relevance for offline evaluation | llm-as-a-judge |
| raw-134 | Continuous Calibration, Continuous Development (CC/CD) | continuous-calibration-eval-improvement-flywheel |
| raw-135 | Evals plus Production Monitoring (Avoiding the False Dichotomy) | production-monitoring-with-continuous-evals |
| raw-136 | Implicit User Signals for AI Monitoring | implicit-user-signals-as-quality-metrics |
| raw-137 | Progressive Autonomy with Human-Behavior Logging | progressive-autonomy-ladder-with-human-review-logging |
| raw-138 | Model Evals vs Product Evals | custom-private-benchmarks-on-your-own-use-case |
| raw-139 | Context-Dependent Choice Between LLM Judges and User Signals | eval-type-selection-and-prioritization |
| raw-140 | Failure-Mode-Driven Evaluation Dataset | ground-truth-reference-dataset-curation |
| raw-141 | Minimizing Surprise as a Calibration Readiness Signal | progressive-autonomy-ladder-with-human-review-logging |
| raw-142 | Balanced Evals, A/B Tests and Customer Feedback for Coding Agents | multi-method-model-swap-evaluation |
| raw-143 | Dogfooding with Audience-Bias Calibration | internal-dogfooding-for-quality-vetting |
| raw-144 | Social Media Sentiment Monitoring (Reddit/Twitter Vibes) | dropped: Fails the eval-pattern bar: it does not measure AI output quality with a repeatable decision signal a product team can run on its own product. |
| raw-145 | Early Retention and Fresh-User Experience Check | dropped: Launch tactics or generic business/survey metrics, not AI-eval techniques. |
| raw-146 | Before/After Task Effort Comparison for Acceleration | dropped: Launch tactics or generic business/survey metrics, not AI-eval techniques. |
| raw-147 | Four-Stage Shipping Lifecycle Eval with Hill Climbing | use-case-category-hill-climbing |
| raw-148 | Win Rate Benchmarked Against Human PM Seniority | human-baseline-comparison |
| raw-149 | Week-on-Week Improvement Tracking for Agent Scaling | use-case-category-hill-climbing |
| raw-150 | Human-in-the-Loop Review with Gradual Replacement by Guideline Skills | progressive-autonomy-ladder-with-human-review-logging |
| raw-151 | False Positive / False Negative Rate Monitoring for Proactive AI Assistants | false-positive-false-negative-rate-monitoring-for-proactive-ai-assistants |
| raw-152 | Stuck-Point Identification and Quantitative Tuning Loop | error-analysis-on-traces-open-and-axial-coding |
| raw-153 | Qualitative Signal Over Premature Metrics (Zero-to-One) | vibe-checks |
| raw-154 | Rewards Design Plus Rigorous A/B Testing in Parallel Tracks | a-b-testing-ai-changes |
| raw-155 | Expert-Annotated vs Synthetic Fine-Tuning Data, Measured by Acceptance Rate | suggestion-acceptance-rate |
| raw-156 | Economic Turing Test | dropped: Fails the eval-pattern bar: it does not measure AI output quality with a repeatable decision signal a product team can run on its own product. |
| raw-157 | Benchmark Saturation Awareness | custom-private-benchmarks-on-your-own-use-case |
| raw-158 | Pass@k Repeated Sampling | repeated-sampling-for-stochastic-outputs-pass-k-and-consistency |
| raw-159 | AI Safety Levels (ASL) Risk Tiering | dropped: Fails the eval-pattern bar: it does not measure AI output quality with a repeatable decision signal a product team can run on its own product. |
| raw-160 | Uplift Trial A/B Test Against Search | human-baseline-comparison |
| raw-161 | METR Time-Horizon Tracking for Product Planning | task-time-horizon-metric |
| raw-162 | Three-Layer Model Safety Evaluation (Interpretability, Lab Evals, In-the-Wild) | three-layer-model-safety-evaluation-interpretability-lab-evals-in-the-wild |
| raw-163 | Internal Dogfooding and Early Research-Preview Release for Real-World Safety | staged-release-via-trusted-testers-and-research-previews |
| raw-164 | Use-Case Checklist Pass Rate Before Launch | use-case-category-hill-climbing |
| raw-165 | Eval as Product Requirement Document | evals-as-product-requirements |
| raw-166 | Expert-Written Rubric Evaluation | expert-authored-rubric-evaluation |
| raw-167 | Verifiable Success Criteria as RL Verifiers (RLAIF) | rubrics-and-verifiers-as-rl-reward-signals |
| raw-168 | Enterprise Value-Chain Eval | custom-private-benchmarks-on-your-own-use-case |
| raw-169 | Capability Evals as Sales Collateral | dropped: Sales/marketing use, not measuring AI output quality. |
| raw-170 | AI Supervising AI (Layered Reviewer Agents) | ai-reviewer-agents-cross-model-critique |
| raw-171 | Root Cause Analysis on Bad AI Outputs (Context Engineering) | root-cause-postmortem-of-ai-failures |
| raw-172 | Autonomous Resolution Rate as Agent Outcome Metric | autonomous-resolution-rate-as-agent-outcome-metric |
| raw-173 | Layered Deterministic Verification for AI-Generated Code | execution-based-verification-of-ai-generated-code |
| raw-174 | Re-test model boundaries on every new model release | capability-backlog-re-testing-on-new-models |
| raw-175 | Manual Verification of LLM-Generated Quotes | source-grounded-verification-pass-quotes-and-citations |
| raw-176 | Build 10 Great Evals | eval-type-selection-and-prioritization |
| raw-177 | Model Introspection for Failure Diagnosis | root-cause-postmortem-of-ai-failures |
| raw-178 | Trusted User Feedback Panel | trusted-user-feedback-panel |
| raw-179 | Team Vibe Check to Hypothesis Testing | vibe-checks |
| raw-180 | Swap-in New Model on Ahead-of-Capability Prototypes | capability-backlog-re-testing-on-new-models |
| raw-181 | Research Preview Shipping with Internal Dogfooding | staged-release-via-trusted-testers-and-research-previews |
| raw-182 | Per-Step Pipeline Evaluation | per-step-pipeline-evaluation |
| raw-183 | Eval ROI Triage (Vibe Checks vs. Formal Evals) | eval-type-selection-and-prioritization |
| raw-184 | Goal-Driven Eval Coverage (Evals Guide Product Development) | eval-type-selection-and-prioritization |
| raw-185 | Task-Specific Eval Design | expert-authored-rubric-evaluation |
| raw-186 | Randomized Trial for AI Tool Productivity | dropped: Fails the eval-pattern bar: it does not measure AI output quality with a repeatable decision signal a product team can run on its own product. |
| raw-187 | Senior Engineer Benchmark (custom rewrite-from-first-principles benchmark) | custom-private-benchmarks-on-your-own-use-case |
| raw-188 | Re-run the Hard Task on Every New Model (turn the rock over) | capability-backlog-re-testing-on-new-models |
| raw-189 | Human-with-AI Baseline for Benchmarks | human-baseline-comparison |
| raw-190 | Benchmark Saturation Caveat (benchmarks only score what we can frame) | custom-private-benchmarks-on-your-own-use-case |
| raw-191 | Vibe Checks | vibe-checks |
| raw-192 | Private Real-World Benchmark (CEO Benchmark) | custom-private-benchmarks-on-your-own-use-case |
| raw-193 | LLM-as-a-Judge for Writing Quality (Judging Loop) | llm-as-a-judge |
| raw-194 | Internal Dogfooding Adoption as Product Success Signal | dropped: Launch tactics or generic business/survey metrics, not AI-eval techniques. |
| raw-195 | Agent Autonomy 'Leash Length' Metric | task-time-horizon-metric |
| raw-196 | Internal Trial Before Broad Rollout of an AI Coding Assistant | internal-dogfooding-for-quality-vetting |
| raw-197 | Validating Self-Reported AI Time Savings with Objective Check Metrics | dropped: Fails the eval-pattern bar: it does not measure AI output quality with a repeatable decision signal a product team can run on its own product. |
| raw-198 | Leadership Hands-On Dogfooding of AI Tools on Real Tasks | internal-dogfooding-for-quality-vetting |
| raw-199 | Expert Human Evaluations for Measuring Model Progress | expert-human-evaluations-for-measuring-model-progress |
| raw-200 | Benchmark Skepticism (Benchmark Gaming and Hill-Climbing) | custom-private-benchmarks-on-your-own-use-case |
| raw-201 | Leaderboard Critique: LLM Arena Style Preference Voting | custom-private-benchmarks-on-your-own-use-case |
| raw-202 | Evals for Training vs. Evals for Measurement | rubrics-and-verifiers-as-rl-reward-signals |
| raw-203 | RL Environments for Evaluating and Training Agents | rl-environments-for-evaluating-and-training-agents |
| raw-204 | Trajectory-Level Evaluation | trajectory-level-agent-evaluation |
| raw-205 | Rubrics and Verifiers | rubrics-and-verifiers-as-rl-reward-signals |
| raw-206 | Rich Objective Functions Over Simplistic Proxies | outcome-metrics-over-engagement-proxies |
| raw-207 | Multi-Signal Worker and Output Quality Measurement | dropped: Not an AI-eval technique; general product/engineering advice or opinion. |
| raw-208 | Deterministic Run/Not-Run Verification of Generated Code | execution-based-verification-of-ai-generated-code |
| raw-209 | Answer Tracking with Repeated Sampling and Share of Voice | dropped: Sales/marketing use, not measuring AI output quality. |
| raw-210 | Validate an AI Detector on Known-Label Sets Before Using It | validating-an-llm-judge-against-human-labels |
| raw-211 | Control-Group Experiments for Measuring Changes in LLM Answer Visibility | dropped: Sales/marketing use, not measuring AI output quality. |
| raw-212 | Reproduce Experiments Before Trusting a Tactic | dropped: Sales/marketing use, not measuring AI output quality. |
| raw-213 | Bad vs. Sad Severity Framework | bad-vs-sad-severity-framework |
| raw-214 | Spec-Based Automated Code Review | ai-reviewer-agents-cross-model-critique |
| raw-215 | Frustration Signal Dashboard (Swear-Word Tracking) | implicit-user-signals-as-quality-metrics |
| raw-216 | Outcome-Over-Output Metric Review for AI Productivity | dropped: Fails the eval-pattern bar: it does not measure AI output quality with a repeatable decision signal a product team can run on its own product. |
| raw-217 | Dogfooding to Vet Product Quality | internal-dogfooding-for-quality-vetting |
| raw-218 | Automated Feedback Channel Triage with Routines | llm-assisted-feedback-mining-and-stack-ranking |
| raw-219 | Rubric-Based Model-as-Judge Auto-Evaluation | llm-as-a-judge |
| raw-220 | Expert-Authored Failure Cases with Ground Truth and Step-Level Reasoning | expert-authored-failure-cases-with-ground-truth-and-step-level-reasoning |
| raw-221 | Rapid Prototype Testing with Zero-Skin-in-the-Game Users | qualitative-user-testing-of-ai-products |
| raw-222 | Per-Step Multi-Model Testing and Selection in Production | multi-method-model-swap-evaluation |
| raw-223 | In-Product User Feedback Loop (Thumbs Up/Down and Feedback Capture) | in-product-explicit-feedback-capture |
| raw-224 | Exposure Hours (Watching Real Users Use Your Product) | qualitative-user-testing-of-ai-products |
| raw-225 | Personal Regression Benchmark: Rebuild Your Own Site Each Model Release | capability-backlog-re-testing-on-new-models |
| raw-226 | Adversarial 'Find What It Can't Build' Fitness Function | capability-backlog-re-testing-on-new-models |
| raw-227 | Dogfooding the AI Product | internal-dogfooding-for-quality-vetting |
| raw-228 | Fault-Tolerant UI Matched to Model Hit Rate | minimum-viable-quality-thresholds-with-cost-envelope |
| raw-229 | Context-Dependent Hit Rate Thresholds | minimum-viable-quality-thresholds-with-cost-envelope |
| raw-230 | Separating Habit-Breaking Backlash from Genuine Design Failure in Recommendation UI Redesigns | dropped: Not an AI-eval technique; general product/engineering advice or opinion. |
| raw-231 | Error Analysis on Traces | error-analysis-on-traces-open-and-axial-coding |
| raw-232 | Open Coding (First-Error Note Taking) | error-analysis-on-traces-open-and-axial-coding |
| raw-233 | Axial Coding and Failure-Mode Counting | error-analysis-on-traces-open-and-axial-coding |
| raw-234 | Benevolent Dictator | error-analysis-on-traces-open-and-axial-coding |
| raw-235 | Theoretical Saturation (When to Stop Reviewing Traces) | error-analysis-on-traces-open-and-axial-coding |
| raw-236 | Binary LLM-as-a-Judge for a Single Failure Mode | llm-as-a-judge |
| raw-237 | Judge-Human Alignment via Confusion Matrix | validating-an-llm-judge-against-human-labels |
| raw-238 | Code-Based Evaluators | code-based-evaluators |
| raw-239 | Online Monitoring with LLM Judges on Production Traces | production-monitoring-with-continuous-evals |
| raw-240 | Criteria Drift | validating-an-llm-judge-against-human-labels |
| raw-241 | Evals as Living PRDs | evals-as-product-requirements |
| raw-242 | Prioritizing Which Evals to Write | eval-type-selection-and-prioritization |
| raw-243 | Dogfooding as Informal Error Analysis | internal-dogfooding-for-quality-vetting |
| raw-244 | Error-Analysis-Grounded A/B Testing | a-b-testing-ai-changes |
| raw-245 | Custom Trace Annotation Interfaces | custom-trace-review-and-annotation-tooling |
| raw-246 | Vibes First, Evals Later | vibe-checks |
| raw-247 | Functional Prototype Testing on Realistic, Non-Golden-Path Prompts | vibe-checks |
| raw-248 | Composite Input Metrics Leading to Developer Happiness | dropped: Fails the eval-pattern bar: it does not measure AI output quality with a repeatable decision signal a product team can run on its own product. |
| raw-249 | Time to Value | dropped: Launch tactics or generic business/survey metrics, not AI-eval techniques. |
| raw-250 | Feature-Specific Outcome Metrics | outcome-metrics-over-engagement-proxies |
| raw-251 | Internal Dogfooding Before Shipping | internal-dogfooding-for-quality-vetting |
| raw-252 | Developer Survey-Based Impact Measurement | dropped: Launch tactics or generic business/survey metrics, not AI-eval techniques. |
| raw-253 | Expert-Defined "What Good Looks Like" Evals | expert-authored-rubric-evaluation |
| raw-254 | Accuracy-Threshold Fit Assessment for Automation | minimum-viable-quality-thresholds-with-cost-envelope |
| raw-255 | Reliability "Nines" Gap Between POC and Production | minimum-viable-quality-thresholds-with-cost-envelope |
| raw-256 | Deterministic Pass/Fail Evals with Ground-Truth Labels | code-based-evaluators |
| raw-257 | Human Win-Rate Evals Against Previous Models | blind-pairwise-human-preference-evaluation |
| raw-258 | Prompted-Baseline Hill-Climb Evals | use-case-category-hill-climbing |
| raw-259 | Eval-Driven Synthetic Data Training for Product Behaviors | eval-driven-synthetic-data-training-for-product-behaviors |
| raw-260 | PM-Authored Behavior Spreadsheet (Current vs Ideal) | converting-user-feedback-and-failures-into-eval-sets |
| raw-261 | Simulated Jury Evaluation of LLM-Generated Notes | simulated-jury-evaluation-of-llm-generated-notes |
| raw-262 | Evals as Unit Tests for Models | golden-dataset-regression-evals-in-ci |
| raw-263 | Hero-Use-Case Evals with Hill Climbing | use-case-category-hill-climbing |
| raw-264 | Custom Evals for Use-Case-Specific Fine-Tuned Models | custom-private-benchmarks-on-your-own-use-case |
| raw-265 | Accuracy-Tier-Driven Product Design | minimum-viable-quality-thresholds-with-cost-envelope |
| raw-266 | Internal Dogfooding Buzz as a Launch Signal | dropped: Launch tactics or generic business/survey metrics, not AI-eval techniques. |
| raw-267 | Read the Agent Output, Not the Code | trajectory-level-agent-evaluation |
| raw-268 | Four-by-Four Debugging Escalation | dropped: Not an AI-eval technique; general product/engineering advice or opinion. |
| raw-269 | External Code Review for Diagnosis | ai-reviewer-agents-cross-model-critique |
| raw-270 | Post-Fix Retrospective into Rules File | root-cause-postmortem-of-ai-failures |
| raw-271 | Reproducible Failure Examples (Shared Chats) | converting-user-feedback-and-failures-into-eval-sets |
| raw-272 | Cross-Model Critique (LLM Council) | ai-reviewer-agents-cross-model-critique |
| raw-273 | Human Code-Level Oversight of AI Coding Output | dropped: Not an AI-eval technique; general product/engineering advice or opinion. |
| raw-274 | Inspect the Agent's Work to Locate Errors | trajectory-level-agent-evaluation |
| raw-275 | Customer-Specific Use-Case Benchmarks ("Cursor Bench") | custom-private-benchmarks-on-your-own-use-case |
| raw-276 | Repeatable Multi-Method Model-Swap Evaluation | multi-method-model-swap-evaluation |
| raw-277 | Outcome-Based Metrics Over Engagement for AI Assistants | outcome-metrics-over-engagement-proxies |
| raw-278 | AI Review Plus Human Acceptance Testing for AI-Generated Code | ai-reviewer-agents-cross-model-critique |
| raw-279 | Evals as Articulated Success Criteria | evals-as-product-requirements |
| raw-280 | Real-World Failure Cases Over Saturated Benchmarks | converting-user-feedback-and-failures-into-eval-sets |
| raw-281 | Sycophancy Regression Metric per Release | sycophancy-regression-metric-per-release |
| raw-282 | Conversation Classifiers for Use-Case Discovery | conversation-and-query-stream-classification |
| raw-283 | 2X Smarter Model, 2X Better Feature Litmus Test | dropped: Not an AI-eval technique; general product/engineering advice or opinion. |
| raw-284 | Balanced SPACE-style metrics for AI coding tool impact | dropped: Fails the eval-pattern bar: it does not measure AI output quality with a repeatable decision signal a product team can run on its own product. |
| raw-285 | Online outcome-based evaluation of ranking models (vs. offline prediction accuracy) | online-outcome-and-causal-evaluation-of-ranking-models |
| raw-286 | Prediction vs. causal decision evaluation (incremental impact of model-driven actions) | online-outcome-and-causal-evaluation-of-ranking-models |
| raw-287 | Staged Qualitative-to-Real-Query Rollout (Trusted Testers → Labs → Launch) | staged-release-via-trusted-testers-and-research-previews |
| raw-288 | Human Rater Guidelines as Information-Quality Criteria | expert-authored-rubric-evaluation |
| raw-289 | Query-Stream Mining for Unmet Needs and Coverage Gaps | conversation-and-query-stream-classification |
| raw-290 | Latency Threshold Experiments for Inline Suggestions | dropped: Fails the eval-pattern bar: it does not measure AI output quality with a repeatable decision signal a product team can run on its own product. |
| raw-291 | Model-Based Offensive Content Detection (Replacing Block Lists) | toxicity-and-offensive-content-detection |
| raw-292 | Acceptance Rate and Lines-Written Share as Suggestion Quality Metrics | suggestion-acceptance-rate |
| raw-293 | Technical Preview with Community Feedback and Healthy Skepticism | staged-release-via-trusted-testers-and-research-previews |
| raw-294 | Crowdsourced AI Red-Teaming Competition | adversarial-red-team-datasets-and-defense-testing |
| raw-295 | Statistical Significance Check for Prompt Technique Claims | confidence-intervals-and-significance-testing-on-eval-results |
| raw-296 | Programmatic Accuracy Evaluation on Verifiable Datasets | code-based-evaluators |
| raw-297 | Scale Testing Prompts on Large Input Batteries | sample-then-scale-prompt-validation |
| raw-298 | Empirical Testing of Defenses Against Adversarial Datasets | adversarial-red-team-datasets-and-defense-testing |
| raw-299 | Automated Code Execution Feedback Loop | execution-based-verification-of-ai-generated-code |
| raw-300 | Scope Agent Tasks by Verifiability | dropped: Not an AI-eval technique; general product/engineering advice or opinion. |
| raw-301 | Task-Length Horizon Benchmark (METR-style 50%/80% success) | task-time-horizon-metric |
| raw-302 | Human-baseline safety benchmarking | human-baseline-comparison |
| raw-303 | Paired safety and progress metrics (stops and strands) | paired-safety-and-progress-metrics-stops-and-strands |
| raw-304 | Pelican Riding a Bicycle SVG Benchmark (with Secret Alternates for Gaming Detection) | benchmark-contamination-and-gaming-defense |
| raw-305 | Simulated QA Agent Swarm with Simulated Dependencies | agentic-qa-testing |
| raw-306 | Red/Green TDD for Coding Agents | execution-based-verification-of-ai-generated-code |
| raw-307 | Human Usability Testing over AI-Simulated Users | qualitative-user-testing-of-ai-products |
| raw-308 | Capability Probing Backlog of Tasks AI Can't Yet Do | capability-backlog-re-testing-on-new-models |
| raw-309 | Lethal Trifecta Risk Check for Agents | lethal-trifecta-risk-check-for-agents |
| raw-310 | Skepticism of Prompt Injection Detection Scores | adversarial-red-team-datasets-and-defense-testing |
| raw-311 | Randomized Carve-Out Cohort for AI Feed Experiments | a-b-testing-ai-changes |
| raw-312 | Downstream Engagement Metrics for AI Feed Objectives | outcome-metrics-over-engagement-proxies |
| raw-313 | Write Down the Algorithm Objective | outcome-metrics-over-engagement-proxies |
| raw-314 | Acceptance rate as a product-quality signal | suggestion-acceptance-rate |
| raw-315 | Implicit user feedback as a retrieval-quality signal | implicit-user-signals-as-quality-metrics |
| raw-316 | Cross-Model Peer Review with Dev-Lead Rebuttal | ai-reviewer-agents-cross-model-critique |
| raw-317 | Failure Root-Cause Postmortem Loop for AI Mistakes | root-cause-postmortem-of-ai-failures |

## Excerpt check

- Patterns checked: 76
- Primary misses: 0
- Primary excerpts repaired: 2
- Patterns with a dropped secondary citation: 5
- Secondary citations removed: 5
- a-b-testing-ai-changes: primary pass
- adversarial-red-team-datasets-and-defense-testing: primary pass
- agentic-qa-testing: primary pass
- ai-reviewer-agents-cross-model-critique: primary pass
- autonomous-resolution-rate-as-agent-outcome-metric: primary pass
- bad-vs-sad-severity-framework: primary pass
- benchmark-contamination-and-gaming-defense: primary pass
- blind-pairwise-human-preference-evaluation: primary pass
- capability-backlog-re-testing-on-new-models: primary pass; dropped secondary: Personal Regression Benchmark: Rebuild Your Own Site Each Model Release (lenny/podcasts/guillermo-rauch.md)
- closing-the-eval-loop-model-context-and-harness-learning: primary pass
- code-based-evaluators: primary pass
- confidence-intervals-and-significance-testing-on-eval-results: primary pass
- continuous-calibration-eval-improvement-flywheel: primary pass
- conversation-and-query-stream-classification: primary pass
- converting-user-feedback-and-failures-into-eval-sets: primary pass
- cross-model-comparison: primary pass
- custom-private-benchmarks-on-your-own-use-case: primary pass; dropped secondary: Private Real-World Benchmark (CEO Benchmark) (lenny/podcasts/dan-shipper.md)
- custom-trace-review-and-annotation-tooling: primary pass
- error-analysis-on-traces-open-and-axial-coding: primary pass
- eval-driven-synthetic-data-training-for-product-behaviors: primary pass
- eval-type-selection-and-prioritization: primary pass
- evals-as-product-requirements: primary pass
- execution-based-verification-of-ai-generated-code: primary pass
- expert-authored-failure-cases-with-ground-truth-and-step-level-reasoning: primary pass
- expert-authored-rubric-evaluation: primary pass
- expert-human-evaluations-for-measuring-model-progress: primary pass
- failure-mode-probing-rituals: primary pass
- faithfulness-and-hallucination-evaluation: primary pass
- false-positive-false-negative-rate-monitoring-for-proactive-ai-assistants: primary pass
- golden-dataset-regression-evals-in-ci: primary pass
- ground-truth-reference-dataset-curation: primary pass
- guardrail-evals-runtime-blocking: primary pass
- human-baseline-comparison: primary pass
- human-end-to-end-output-review: primary pass
- implicit-user-signals-as-quality-metrics: primary pass
- in-product-explicit-feedback-capture: primary pass
- internal-dogfooding-for-quality-vetting: primary pass
- judge-bias-audit-position-sycophancy-self-preference-verbosity: primary pass
- known-answer-probing-against-the-source-corpus: primary pass
- lethal-trifecta-risk-check-for-agents: primary pass
- llm-as-a-judge: primary pass
- llm-assisted-feedback-mining-and-stack-ranking: primary pass
- minimum-viable-quality-thresholds-with-cost-envelope: primary pass
- multi-method-model-swap-evaluation: primary pass
- multi-turn-conversation-evaluation-with-single-turn-reproduction: primary pass
- off-the-shelf-metrics-as-exploration-tools: primary pass
- online-outcome-and-causal-evaluation-of-ranking-models: primary pass
- outcome-metrics-over-engagement-proxies: primary pass
- paired-safety-and-progress-metrics-stops-and-strands: primary repaired
- per-step-pipeline-evaluation: primary pass
- production-monitoring-with-continuous-evals: primary pass
- progressive-autonomy-ladder-with-human-review-logging: primary pass
- qualitative-user-testing-of-ai-products: primary pass; dropped secondary: AI User Testing Framework: Longitudinal, High-Touch, Attitudinal Segmentation (lenny/newsletters/counterintuitive-advice-for-building-ai-products.md)
- rag-retrieval-evaluation-recall-k: primary pass
- repeated-sampling-for-stochastic-outputs-pass-k-and-consistency: primary pass
- rl-environments-for-evaluating-and-training-agents: primary pass
- root-cause-postmortem-of-ai-failures: primary pass
- routing-accuracy: primary pass
- rubrics-and-verifiers-as-rl-reward-signals: primary pass; dropped secondary: Evals for Training vs. Evals for Measurement (lenny/podcasts/edwin-chen.md)
- sample-then-scale-prompt-validation: primary pass
- simulated-jury-evaluation-of-llm-generated-notes: primary pass
- simulated-multi-turn-conversations-with-a-realistic-user-llm: primary pass
- source-grounded-verification-pass-quotes-and-citations: primary pass
- staged-release-via-trusted-testers-and-research-previews: primary pass
- suggestion-acceptance-rate: primary pass
- sycophancy-regression-metric-per-release: primary pass
- synthetic-test-input-generation: primary pass
- task-time-horizon-metric: primary pass
- three-layer-model-safety-evaluation-interpretability-lab-evals-in-the-wild: primary pass
- toxicity-and-offensive-content-detection: primary repaired
- trajectory-level-agent-evaluation: primary pass
- transition-failure-matrix: primary pass
- trusted-user-feedback-panel: primary pass
- use-case-category-hill-climbing: primary pass
- validating-an-llm-judge-against-human-labels: primary pass
- vibe-checks: primary pass; dropped secondary: Functional Prototype Testing on Realistic, Non-Golden-Path Prompts (lenny/podcasts/howie-liu.md)
