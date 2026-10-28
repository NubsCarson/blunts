import { test } from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { evmRateLimit } from "../server/evm-rate-limit.js";
test("static app assets do not consume API budget and remain loadable after API exhaustion", async () => {
  const app = Fastify();
  await app.register(rateLimit, evmRateLimit);
  app.get("/assets/app.js", async () => "window.appLoaded=true;");
  app.get("/api/health", async () => ({ ok: true }));
  try {
    await app.ready();
    for (let i = 0; i < 95; i++)
      assert.equal((await app.inject("/assets/app.js")).statusCode, 200);
    for (let i = 0; i < 90; i++)
      assert.equal((await app.inject("/api/health")).statusCode, 200);
    const rejected = await app.inject("/api/health");
    assert.equal(rejected.statusCode, 429);
    assert.ok(rejected.headers["retry-after"]);
    assert.equal((await app.inject("/assets/app.js")).statusCode, 200);
    assert.equal((await app.inject("/api/health")).statusCode, 429);
  } finally {
    await app.close();
  }
});
