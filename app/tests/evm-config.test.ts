import { test } from "node:test";
import assert from "node:assert/strict";
import { evmConfig } from "../server/evm-config.js";
import { RELEASE_ORIGIN } from "../shared/release-target.js";
import { executionPolicyForOrigin } from "../shared/execution-policy.js";

test("local defaults retain owner-approved signing and container defaults stay read-only", () => {
  assert.equal(evmConfig({}).execution.enabled, true);
  const container = evmConfig({ HOST: "0.0.0.0" });
  assert.equal(container.origin, RELEASE_ORIGIN);
  assert.equal(container.execution.enabled, false);
  assert.equal(container.host, "0.0.0.0");
  assert.equal(executionPolicyForOrigin(RELEASE_ORIGIN).enabled, false);
});
test("release configuration rejects invalid ports and unrecognized origins", () => {
  for (const PORT of ["0", "65536", "NaN", "3.5"])
    assert.throws(() => evmConfig({ PORT }));
  for (const APP_ORIGIN of [
    "https://blunts.nubs.site",
    "https://blunt.nubs.site.evil.com",
    "https://blunt.nubs.site/path",
    "https://blunt.nubs.site?sign=1",
  ])
    assert.throws(() => evmConfig({ APP_ORIGIN }));
  assert.throws(() => evmConfig({ HOST: "example.com" }));
});
