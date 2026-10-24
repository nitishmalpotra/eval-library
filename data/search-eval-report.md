# Search eval

SIM_FLOOR=0.58  cases=60
Hard gates met: yes

- Generated: 2026-10-24T13:56:50.587Z
- Embedding model: google/gemini-embedding-2
- Latency p50: 3442 ms
- Cost: $0.0669

## Hard gates

Missing any of these fails the run.

| Metric | Value | Target | Met |
| --- | --- | --- | --- |
| Junk rejection | 1.000 | ≥ 0.95 | yes |
| Prompt-injection cases rejected | 0 | 0 missed | yes |
| False rejection | 0.000 | ≤ 0.05 | yes |
| Primary recall@5 | 0.980 | ≥ 0.9 | yes |
| Latency p95 | 4445 ms | ≤ 5000 ms | yes |

## Report only

Printed for context. These do not fail the run.

| Metric | Value |
| --- | --- |
| Precision@strong | 0.683 |
| All-labels recall@5 | 0.670 |
| Primary shown as strong | 0.730 |

## Reason mismatches

Rejected, but not for the labeled reason. These do not fail the run.

- expected off_topic, got no_match: how do I make pizza dough
- expected off_topic, got no_match: who won the world series in 1998
- expected off_topic, got no_match: best sourdough hydration for a country loaf
- expected off_topic, got no_match: explain the offside rule in soccer
- expected off_topic, got no_match: write a python function that sorts a list of integers
- expected off_topic, got no_match: what is the capital of Portugal
- expected off_topic, got no_match: how do I change a flat tire on a bike
- expected off_topic, got no_match: banana bread recipe with walnuts
- expected too_vague, got no_match: make it better

## Failing cases

- A coding agent that writes pull requests and runs the test suite before it asks for review.
  missed primary trajectory-level-agent-evaluation; missed related code-based-evaluators
- An assistant that books meetings on my calendar by emailing the other person and writing the invite.
  missed related trajectory-level-agent-evaluation, autonomous-resolution-rate-as-agent-outcome-metric; extra strong continuous-calibration-eval-improvement-flywheel
- A classifier that routes incoming support tickets to the right team.
  primary shown weak conversation-and-query-stream-classification; missed related false-positive-false-negative-rate-monitoring-for-proactive-ai-assistants
- We summarize sales calls into CRM notes and need to know when the notes invent quotes.
  primary shown weak faithfulness-and-hallucination-evaluation; missed related simulated-jury-evaluation-of-llm-generated-notes
- RAG search over our internal docs. I want to know if the retriever finds the right pages before the model answers.
  primary shown weak per-step-pipeline-evaluation; missed related known-answer-probing-against-the-source-corpus, faithfulness-and-hallucination-evaluation
- A bot that reviews pull requests and leaves comments on the diff.
  missed related execution-based-verification-of-ai-generated-code, suggestion-acceptance-rate
- A proactive assistant that pings me to prep for a meeting. I need the ping rate to be trustworthy.
  missed related outcome-metrics-over-engagement-proxies
- Our agent can read private customer records and send email. How do I eval the chance it leaks data?
  missed related guardrail-evals-runtime-blocking; extra strong adversarial-red-team-datasets-and-defense-testing
- I wrote an LLM judge for support-answer quality and need to know if it agrees with human raters.
  missed related judge-bias-audit-position-sycophancy-self-preference-verbosity
- We are A/B testing a new ranker for search over our docs and need to know if it actually helps.
  primary shown weak a-b-testing-ai-changes; missed related rag-retrieval-evaluation-recall-k
- An expense agent takes many steps from receipt to filed report. I need to see which step it breaks on.
  primary shown weak trajectory-level-agent-evaluation
- When a new model drops I want a private benchmark of our real tasks, not a public leaderboard.
  primary shown weak capability-backlog-re-testing-on-new-models; missed related cross-model-comparison
- Users can thumbs-down any AI answer. I want those complaints turned into eval cases.
  primary shown weak in-product-explicit-feedback-capture
- Prompt changes should fail CI if they regress bugs we already fixed.
  missed related ground-truth-reference-dataset-curation
- An IDE copilot suggests the next lines of code. I want to know if developers actually accept them.
  missed related execution-based-verification-of-ai-generated-code; extra strong implicit-user-signals-as-quality-metrics
- Our support bot is multi-turn. When it fails I can't tell a memory bug from a missing article.
  primary shown weak error-analysis-on-traces-open-and-axial-coding; missed related simulated-multi-turn-conversations-with-a-realistic-user-llm
- Clinicians should write the rubric we use to grade medical answers from the model.
  missed related expert-authored-failure-cases-with-ground-truth-and-step-level-reasoning
- Start the email agent on drafts, log every human edit, and only let it send once the edits get rare.
  missed related staged-release-via-trusted-testers-and-research-previews
- Every week we throw vague, wrong, and hostile questions at the bot and write down where it breaks.
  missed related synthetic-test-input-generation, known-answer-probing-against-the-source-corpus
- For a shopping assistant I want the eval set to be the product requirements, not a slide deck.
  missed related eval-type-selection-and-prioritization
- Sample live production traces, judge them, and turn the failures into new eval cases.
  primary shown weak converting-user-feedback-and-failures-into-eval-sets
- coding agent
  extra strong root-cause-postmortem-of-ai-failures, execution-based-verification-of-ai-generated-code; broad query returned strong root-cause-postmortem-of-ai-failures, execution-based-verification-of-ai-generated-code
- hallucination
  extra strong faithfulness-and-hallucination-evaluation; broad query returned strong faithfulness-and-hallucination-evaluation
- red team our bot
  extra strong adversarial-red-team-datasets-and-defense-testing; broad query returned strong adversarial-red-team-datasets-and-defense-testing
- ticket routing
  extra strong routing-accuracy; broad query returned strong routing-accuracy
- search ranking
  extra strong online-outcome-and-causal-evaluation-of-ranking-models; broad query returned strong online-outcome-and-causal-evaluation-of-ranking-models
- support bot
  extra strong autonomous-resolution-rate-as-agent-outcome-metric, multi-turn-conversation-evaluation-with-single-turn-reproduction; broad query returned strong autonomous-resolution-rate-as-agent-outcome-metric, multi-turn-conversation-evaluation-with-single-turn-reproduction
- agent traces
  extra strong error-analysis-on-traces-open-and-axial-coding, custom-trace-review-and-annotation-tooling; broad query returned strong error-analysis-on-traces-open-and-axial-coding, custom-trace-review-and-annotation-tooling

## Threshold sweep

Cached embeddings and judgments only. No extra model calls.

Rows that meet the hard gates: 8

| sim | junk | injectMiss | false | primary | meets |
| --- | --- | --- | --- | --- | --- |
| 0.48 | 0.960 | 0 | 0.000 | 0.980 | yes |
| 0.50 | 1.000 | 0 | 0.000 | 0.980 | yes |
| 0.52 | 1.000 | 0 | 0.000 | 0.980 | yes |
| 0.54 | 1.000 | 0 | 0.000 | 0.980 | yes |
| 0.56 | 1.000 | 0 | 0.000 | 0.980 | yes |
| 0.58 | 1.000 | 0 | 0.000 | 0.980 | yes current |
| 0.60 | 1.000 | 0 | 0.000 | 0.980 | yes |
| 0.62 | 1.000 | 0 | 0.029 | 0.980 | yes |

