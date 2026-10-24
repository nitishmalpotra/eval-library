import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isObviousGibberish, normalizeQuery } from "./queryQuality";

describe("normalizeQuery", () => {
  it("trims, collapses whitespace, and caps at 1000 characters", () => {
    assert.equal(normalizeQuery("  a   support   bot  "), "a support bot");
    assert.equal(normalizeQuery(`x${"y".repeat(2000)}`).length, 1000);
  });

  it("treats a trailing period as the same CRM query and keeps casing", () => {
    const crm = "a summarizer that turns call transcripts into CRM notes";
    assert.equal(normalizeQuery(`${crm}.`), normalizeQuery(crm));
    assert.equal(normalizeQuery(crm), crm);
    assert.equal(normalizeQuery(`A${crm.slice(1)}`), `A${crm.slice(1)}`);
  });
});

describe("isObviousGibberish", () => {
  it("lets real feature descriptions through", () => {
    assert.equal(
      isObviousGibberish("I'm building a customer support chatbot that pulls answers from a help center."),
      false,
    );
    assert.equal(isObviousGibberish("RAG evals"), false);
    assert.equal(isObviousGibberish("chatbot"), false);
    assert.equal(isObviousGibberish("LLM evals"), false);
    assert.equal(isObviousGibberish("help"), false);
    assert.equal(isObviousGibberish("evals?"), false);
    assert.equal(isObviousGibberish("how do I make pizza dough"), false);
    assert.equal(isObviousGibberish("the quick brown fox jumps"), false);
  });

  it("rejects smashes, repeated characters, and letter-poor strings", () => {
    assert.equal(isObviousGibberish("asdkjh qwe zxcv blorp"), true);
    assert.equal(isObviousGibberish("asdf qwer zxcv"), true);
    assert.equal(isObviousGibberish("qwertyuiop"), true);
    assert.equal(isObviousGibberish("aaaaaa"), true);
    assert.equal(isObviousGibberish("123456 !!!!"), true);
    assert.equal(isObviousGibberish("bcdfg hjklm npqrs"), true);
    assert.equal(isObviousGibberish("a"), true);
    assert.equal(isObviousGibberish("zzzzzz"), true);
  });
});
