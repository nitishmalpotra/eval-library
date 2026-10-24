import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideFind, type FindAnalysis } from "./find";

const simFloor = 0.2;

function analysis(overrides: Partial<FindAnalysis>): FindAnalysis {
  return {
    prefilterRejected: false,
    top1: 0.4,
    scores: [
      { id: "alpha", score: 0.4 },
      { id: "beta", score: 0.36 },
      { id: "gamma", score: 0.22 },
    ],
    verdict: "ok",
    llmMatches: [
      { id: "alpha", fit: "strong", rationale: "Direct fit." },
      { id: "beta", fit: "weak", rationale: "Partial fit." },
      { id: "gamma", fit: "strong", rationale: "Related, but the score is low." },
    ],
    ...overrides,
  };
}

describe("decideFind", () => {
  it("rejects obvious junk before similarity matters", () => {
    assert.deepEqual(
      decideFind(analysis({ prefilterRejected: true, top1: 0.9 }), simFloor),
      { status: "rejected", reason: "gibberish" },
    );
  });

  it("returns no_match below the similarity floor without using the judge", () => {
    assert.deepEqual(
      decideFind(analysis({ top1: 0.19, verdict: "ok" }), simFloor),
      { status: "rejected", reason: "no_match" },
    );
  });

  it("keeps the judge's rejection reasons", () => {
    for (const reason of ["gibberish", "too_vague", "off_topic", "not_a_request"] as const) {
      assert.deepEqual(decideFind(analysis({ verdict: reason, llmMatches: [] }), simFloor), {
        status: "rejected",
        reason,
      });
    }
  });

  it("keeps the judge's strong label, drops unknown ids, and sorts strong first", () => {
    const result = decideFind(
      analysis({
        scores: [
          { id: "alpha", score: 0.3 },
          { id: "beta", score: 0.5 },
          { id: "gamma", score: 0.22 },
          { id: "delta", score: 0.18 },
          { id: "missing", score: 0.45 },
        ],
        llmMatches: [
          { id: "gamma", fit: "strong", rationale: "Direct, lower score." },
          { id: "delta", fit: "strong", rationale: "Third strong, so it is demoted." },
          { id: "not-a-candidate", fit: "strong", rationale: "Invented." },
          { id: "beta", fit: "weak", rationale: "Higher score, weaker fit." },
          { id: "alpha", fit: "strong", rationale: "Direct fit." },
        ],
      }),
      simFloor,
    );

    assert.equal(result.status, "ok");
    if (result.status !== "ok") return;

    assert.deepEqual(
      result.matches.map((match) => [match.id, match.fit]),
      [
        ["alpha", "strong"],
        ["gamma", "strong"],
        ["beta", "weak"],
        ["delta", "weak"],
      ],
    );
  });

  it("returns an empty ok result when the judge accepts the query and picks nothing", () => {
    assert.deepEqual(decideFind(analysis({ llmMatches: [] }), simFloor), { status: "ok", matches: [] });
  });

  it("keeps the five best matches", () => {
    const scores = Array.from({ length: 6 }, (_, index) => ({ id: `p${index}`, score: 0.5 - index * 0.01 }));
    const result = decideFind(
      analysis({
        top1: 0.5,
        scores,
        llmMatches: scores.map((candidate) => ({ id: candidate.id, fit: "strong" as const, rationale: "Fits." })),
      }),
      simFloor,
    );

    assert.equal(result.status, "ok");
    if (result.status !== "ok") return;
    assert.deepEqual(
      result.matches.map((match) => match.id),
      ["p0", "p1", "p2", "p3", "p4"],
    );
  });
});
