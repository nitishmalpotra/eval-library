import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clientIp, createFindQuota } from "./findQuota";

describe("createFindQuota", () => {
  it("allows the daily limit, then blocks until the window resets", () => {
    let now = 1_000;
    const quota = createFindQuota({ limit: 2, now: () => now, windowMs: 1_000 });

    assert.equal(quota.snapshot("10.0.0.1").remaining, 2);
    assert.deepEqual(quota.consume("10.0.0.1"), { limited: false, remaining: 1, resetAt: 2_000 });
    assert.equal(quota.consume("10.0.0.1").remaining, 0);
    assert.equal(quota.consume("10.0.0.1").limited, true);
    assert.equal(quota.snapshot("10.0.0.1").remaining, 0);
    assert.equal(quota.consume("10.0.0.2").remaining, 1);

    now = 2_000;
    assert.equal(quota.consume("10.0.0.1").remaining, 1);
  });
});

describe("clientIp", () => {
  it("uses the first forwarded address, then x-real-ip", () => {
    const forwarded = new Request("http://localhost/api/find", {
      headers: { "x-forwarded-for": "1.1.1.1, 2.2.2.2", "x-real-ip": "3.3.3.3" },
    });
    assert.equal(clientIp(forwarded), "1.1.1.1");

    const realIp = new Request("http://localhost/api/find", {
      headers: { "x-real-ip": "3.3.3.3" },
    });
    assert.equal(clientIp(realIp), "3.3.3.3");

    assert.equal(clientIp(new Request("http://localhost/api/find")), "unknown");
  });
});
