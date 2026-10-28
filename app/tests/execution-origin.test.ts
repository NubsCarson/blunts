import { test } from "node:test";
import assert from "node:assert/strict";
import { executionPolicyForOrigin } from "../shared/execution-policy.js";
test("owner-approved signing is scoped to HTTP loopback web origins and never enabled by a hosted/native URL", () => {
  for (const origin of ["http://localhost:8745", "http://127.0.0.1:8751"]) {
    const p = executionPolicyForOrigin(origin);
    assert.equal(p.enabled, true);
    assert.equal(p.chainId, 4663);
    assert.ok(Object.isFrozen(p));
  }
  for (const origin of [
    undefined,
    "https://blunts.example.com",
    "https://localhost",
    "capacitor://localhost",
    "http://192.168.1.1",
    "http://localhost.evil.com",
    "http://user:secret@localhost",
    "http://localhost/path",
    "http://localhost?enable=true",
    "http://localhost/#sign",
  ])
    assert.equal(executionPolicyForOrigin(origin).enabled, false);
});
