import assert from "node:assert/strict";
import test from "node:test";
import { excerptMatches } from "./excerpts";

test("matches after whitespace, quote, and timestamp normalization", () => {
  const body = `[12:03] She said “the judge should fail the answer.”\n\nLater, [1:02:09] the trace is kept.`;

  assert.equal(
    excerptMatches(`She said "the judge should fail the answer." [...] the trace is kept.`, body),
    true,
  );
  assert.equal(excerptMatches("the judge should pass the answer", body), false);
  assert.equal(excerptMatches("   ", body), false);
});
