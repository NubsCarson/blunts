import { test } from "node:test";
import assert from "node:assert/strict";
import { createSolanaApp } from "../server/solana-app.js";
test("real Solana HTTP routes reject unapproved origins and malformed requests before execution", async () => {
  const app = await createSolanaApp();
  try {
    for (const origin of [undefined, "https://blunt.nubs.site"]) {
      const r = await app.inject({
        method: "POST",
        url: "/api/solana/prepare",
        headers: { ...(origin ? { origin } : {}), "x-blunts-request": "1" },
        payload: { owner: "bad", side: "fill", amount: "1" },
      });
      assert.equal(r.statusCode, 403);
    }
    const headers = {
      origin: "http://localhost:8753",
      "x-blunts-request": "1",
    };
    const invalid = await app.inject({
      method: "POST",
      url: "/api/solana/prepare",
      headers,
      payload: { owner: "bad", side: "fill", amount: "1" },
    });
    assert.equal(invalid.statusCode, 400);
    const unknown = await app.inject({
      method: "POST",
      url: "/api/solana/submit",
      headers,
      payload: {
        id: "11111111-1111-4111-8111-111111111111",
        transaction: "AA==",
      },
    });
    assert.equal(unknown.json().sent, false);
    assert.equal((await app.inject({ url: "/api/missing" })).statusCode, 404);
  } finally {
    await app.close();
  }
});
test("Solana API throttling leaves static assets and the local screen loadable", async () => {
  const app = await createSolanaApp();
  try {
    for (let n = 0; n < 90; n++)
      assert.equal((await app.inject({ url: "/api/health" })).statusCode, 200);
    assert.equal((await app.inject({ url: "/api/health" })).statusCode, 429);
    assert.equal((await app.inject({ url: "/sol" })).statusCode, 200);
  } finally {
    await app.close();
  }
});
