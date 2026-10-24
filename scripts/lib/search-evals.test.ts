import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAllEvals } from "../../src/lib/evals";
import { loadSearchEvals } from "./search-evals";

const removedRelated: Array<[query: string, id: string]> = [
  [
    "Start the email agent on drafts, log every human edit, and only let it send once the edits get rare.",
    "autonomous-resolution-rate-as-agent-outcome-metric",
  ],
  [
    "For a shopping assistant I want the eval set to be the product requirements, not a slide deck.",
    "qualitative-user-testing-of-ai-products",
  ],
  [
    "An assistant that books meetings on my calendar by emailing the other person and writing the invite.",
    "code-based-evaluators",
  ],
  [
    "A proactive assistant that pings me to prep for a meeting. I need the ping rate to be trustworthy.",
    "implicit-user-signals-as-quality-metrics",
  ],
  [
    "An IDE copilot suggests the next lines of code. I want to know if developers actually accept them.",
    "repeated-sampling-for-stochastic-outputs-pass-k-and-consistency",
  ],
  [
    "A safety score that looks good because the agent refuses everything is not a real improvement.",
    "three-layer-model-safety-evaluation-interpretability-lab-evals-in-the-wild",
  ],
  [
    "Our agent can read private customer records and send email. How do I eval the chance it leaks data?",
    "three-layer-model-safety-evaluation-interpretability-lab-evals-in-the-wild",
  ],
];

describe("search eval set", () => {
  it("has the planned mix and only cites pattern ids that exist", async () => {
    const cases = await loadSearchEvals();
    const ids = new Set(getAllEvals().map((pattern) => pattern.id));
    const queries = new Set<string>();
    const counts = {
      specific: 0,
      short: 0,
      gibberish: 0,
      off_topic: 0,
      not_a_request: 0,
      too_vague: 0,
    };

    for (const item of cases) {
      assert.equal(queries.has(item.query), false, item.query);
      queries.add(item.query);

      const primary = item.primary_ids ?? [];
      const related = item.related_ids ?? [];

      if (item.expect === "accept" && primary.length > 0) {
        counts.specific += 1;
        assert.equal(item.reason, undefined);
        assert.ok(primary.length <= 2, item.query);
        for (const id of [...primary, ...related]) assert.equal(ids.has(id), true, id);
      } else if (item.expect === "accept") {
        counts.short += 1;
        assert.equal(item.reason, undefined);
        assert.equal(related.length, 0, item.query);
      } else {
        assert.ok(item.reason, item.query);
        counts[item.reason as keyof typeof counts] += 1;
      }
    }

    assert.equal(cases.length, 60);
    assert.equal(counts.specific, 25);
    assert.equal(counts.short, 10);
    assert.equal(counts.gibberish, 8);
    assert.equal(counts.off_topic, 8);
    assert.equal(counts.not_a_request, 5);
    assert.equal(counts.too_vague, 4);

    for (const [query, id] of removedRelated) {
      const item = cases.find((candidate) => candidate.query === query);
      assert.ok(item, query);
      assert.equal(item.related_ids?.includes(id) ?? false, false, `${id} on ${query}`);
      assert.equal(item.primary_ids?.includes(id) ?? false, false, `${id} on ${query}`);
    }
  });
});
