import { test } from "node:test";
import assert from "node:assert/strict";
import { onchainResponse } from "../server/onchain-api.js";

test("invalid and duplicate quote parameters are rejected before upstream reads", async () => {
  let reads = 0;
  const reader = {
    market: async () => {
      reads++;
      throw Error("should not read");
    },
    quote: async () => {
      reads++;
      throw Error("should not read");
    },
  };
  for (const query of [
    { side: "fill", amount: ["1", "2"] },
    { side: "fill", amount: "-1" },
    { side: "spark", amount: "0" },
    { side: "other", amount: "1" },
    { side: "fill", amount: "1", token: "untrusted" },
  ])
    assert.equal(
      (await onchainResponse("/api/onchain/quote", query, reader)).status,
      400,
    );
  assert.equal(
    (await onchainResponse("/api/auth/config", {}, reader)).status,
    404,
  );
  assert.equal(reads, 0);
});
test("market and quote upstream failures expose only safe retry messages", async () => {
  const reader = {
    market: async () => {
      throw Error("PRIVATE UPSTREAM DETAILS");
    },
    quote: async () => {
      throw Error("PRIVATE UPSTREAM DETAILS");
    },
  };
  for (const [path, query] of [
    ["/api/onchain/market", {}],
    ["/api/onchain/quote", { side: "fill", amount: "1" }],
  ] as const) {
    const response = await onchainResponse(path, query, reader);
    assert.equal(response.status, 503);
    assert.ok(!JSON.stringify(response).includes("PRIVATE"));
  }
});
