import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAllEvals } from "../../src/lib/evals";
import { normalizeQuery } from "../../src/lib/queryQuality";
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
    const labeled = cases.filter((item) => !item.base_query);
    const variants = cases.filter((item) => item.base_query);
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
    }

    for (const item of labeled) {
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

    assert.equal(labeled.length, 60);
    assert.equal(variants.length, 40);
    assert.equal(counts.specific, 25);
    assert.equal(counts.short, 10);
    assert.equal(counts.gibberish, 8);
    assert.equal(counts.off_topic, 8);
    assert.equal(counts.not_a_request, 5);
    assert.equal(counts.too_vague, 4);

    const byBase = new Map<string, typeof variants>();
    for (const variant of variants) {
      const base = labeled.find((item) => item.query === variant.base_query);
      assert.ok(base, variant.base_query);
      assert.equal(variant.expect, "accept");
      assert.equal(base.expect, "accept");
      assert.deepEqual(variant.primary_ids, base.primary_ids);
      assert.ok((variant.primary_ids?.length ?? 0) > 0, variant.query);
      const group = byBase.get(base.query) ?? [];
      group.push(variant);
      byBase.set(base.query, group);
    }

    assert.equal(byBase.size, 10);
    for (const [baseQuery, group] of byBase) {
      assert.equal(group.length, 4, baseQuery);
      const period = group.find((item) => item.note === "Robustness: trailing period.");
      const question = group.find((item) => item.note === "Robustness: trailing question mark.");
      const spaced = group.find((item) => item.note === "Robustness: doubled spaces.");
      const cased = group.find((item) => item.note === "Robustness: capitalized first letter.");
      assert.ok(period && question && spaced && cased, baseQuery);
      const caseVariant =
        baseQuery[0] === baseQuery[0].toLowerCase()
          ? `${baseQuery[0].toUpperCase()}${baseQuery.slice(1)}`
          : `${baseQuery[0].toLowerCase()}${baseQuery.slice(1)}`;
      assert.equal(period.query, `${baseQuery}.`);
      assert.equal(question.query, `${baseQuery}?`);
      assert.equal(spaced.query, baseQuery.replaceAll(" ", "  "));
      assert.equal(cased.query, caseVariant);
      assert.equal(normalizeQuery(period.query), normalizeQuery(baseQuery));
      assert.equal(normalizeQuery(question.query), normalizeQuery(baseQuery));
      assert.equal(normalizeQuery(spaced.query), normalizeQuery(baseQuery));
      assert.equal(normalizeQuery(cased.query).toLowerCase(), normalizeQuery(baseQuery).toLowerCase());
    }

    for (const [query, id] of removedRelated) {
      const item = cases.find((candidate) => candidate.query === query);
      assert.ok(item, query);
      assert.equal(item.related_ids?.includes(id) ?? false, false, `${id} on ${query}`);
      assert.equal(item.primary_ids?.includes(id) ?? false, false, `${id} on ${query}`);
    }
  });
});
