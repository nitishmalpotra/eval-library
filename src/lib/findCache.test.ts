import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createFindCache } from "./findCache";

describe("createFindCache", () => {
  it("evicts the oldest entry and does not refresh a key on read", () => {
    const cache = createFindCache<string>(2);
    cache.set("a", "first");
    cache.set("b", "second");
    assert.equal(cache.get("a"), "first");
    cache.set("c", "third");

    assert.equal(cache.has("a"), false);
    assert.equal(cache.get("b"), "second");
    assert.equal(cache.get("c"), "third");
  });
});
