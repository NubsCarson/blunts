import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";

test("real local Steward signs in, provisions a wallet and completes the demo cycle without owner input", async ({
  page,
}, testInfo) => {
  const issuer = new URL(
    process.env.TEST_STEWARD_URL ?? "http://127.0.0.1:8743",
  ).origin;
  const email = `blunts-browser-${randomUUID()}@example.test`;
  const inboxUrl = `${issuer}/auth/test/inbox/${encodeURIComponent(email)}`;
  // Prove the test-only mock inbox is enabled BEFORE requesting any email.
  // A disabled route also returns 404, but its body is "Not found".
  const probe = await page.request.get(inboxUrl);
  expect(probe.status()).toBe(404);
  expect(await probe.json()).toEqual({ ok: false, error: "No message" });
  await page.clock.install();
  await page.goto("/");
  expect(
    (await (await page.request.get("/api/auth/config")).json()).provider,
  ).toBe("steward");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByRole("button", { name: "Continue with Steward", exact: true })
    .click();
  const codeField = page.getByLabel("Email code", { exact: true });
  await expect(codeField).toBeFocused();
  await page.clock.fastForward(60_001);
  await page
    .getByRole("button", { name: "Resend email code", exact: true })
    .click();
  await expect(codeField).toBeFocused();
  async function enterLocalCode() {
    const response = await page.request.get(inboxUrl);
    expect(response.status()).toBe(200);
    const message = await response.json();
    expect(message.to).toBe(email);
    const code = message.text.match(/\b(\d{6})\b/)?.[1];
    expect(code).toBeTruthy();
    await page.getByLabel("Email code", { exact: true }).fill(code);
    await page
      .getByRole("button", { name: "Open wallet", exact: true })
      .click();
  }
  await enterLocalCode();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Open wallet", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Fill", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.getByRole("button", { name: "WALLET", exact: true }).click();
  const signedIn = await (await page.request.get("/api/me")).json();
  expect(signedIn.steward.userId).toBeTruthy();
  if (!signedIn.steward.wallet)
    await page
      .getByRole("button", { name: "Create Steward wallet", exact: true })
      .click();
  await expect(page.locator("code.recovery")).toHaveText(/^0x[0-9a-fA-F]{40}$/);
  const wallet = await page.locator("code.recovery").innerText();
  await page.screenshot({
    path: testInfo.outputPath("first-party-wallet.png"),
  });
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Fill", exact: true }),
  ).toBeEnabled();
  async function action(kind: "Fill" | "Spark", amount: string) {
    await page.getByRole("button", { name: kind, exact: true }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByRole("button", { name: "Dollars", exact: true }).click();
    await sheet.getByLabel("Amount in dollars").fill(amount);
    await sheet
      .getByRole("button", { name: kind.toUpperCase(), exact: true })
      .click();
    await expect(sheet).not.toBeVisible();
  }
  await action("Fill", "100");
  await expect(page.locator(".scene-value")).toHaveText("$99.00");
  await expect(
    page.getByRole("button", { name: "Spark", exact: true }),
  ).toBeEnabled();
  await action("Spark", "99");
  await expect(page.locator(".scene-cash strong")).toHaveText("$98.01");
  await page.getByRole("button", { name: "Spark", exact: true }).click();
  await page
    .getByRole("button", { name: "Add test destination", exact: true })
    .click();
  await page
    .getByLabel("Destination label")
    .fill("Autonomous local acceptance");
  await expect(
    page.getByLabel("Confirm password", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Save test destination", exact: true })
    .click();
  await expect(
    page.getByText("Simulated destination added.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Wallet", exact: true }).click();
  await page.getByRole("button", { name: "Spark", exact: true }).click();
  const payout = page.getByRole("dialog", { name: "Cash out", exact: true });
  await expect(payout.getByLabel("Confirm password")).toHaveCount(0);
  await payout
    .getByRole("button", { name: "Cash out demo funds", exact: true })
    .click();
  await expect(payout).not.toBeVisible();
  await expect(page.locator(".scene-cash strong")).toHaveText("$0.00");
  // The tray shows AVAILABLE cash: a pending payout can display zero while
  // funds are still reserved. Require authoritative settlement, not animation.
  await expect
    .poll(async () => {
      const state = await (await page.request.get("/api/me")).json();
      return {
        cash: state.balances.cash,
        units: state.balances.units,
        completed: state.intents.filter(
          (intent: { state: string }) => intent.state === "completed",
        ).length,
      };
    })
    .toEqual({ cash: "0", units: "0", completed: 4 });
  const me = await (await page.request.get("/api/me")).json();
  expect(me.simulation).toBe(true);
  expect(me.balances.cash).toBe("0");
  expect(me.balances.units).toBe("0");
  expect(me.intents).toHaveLength(4);
  expect(
    me.intents.every(
      (intent: { state: string }) => intent.state === "completed",
    ),
  ).toBe(true);
  expect(me.steward.wallet.address).toBe(wallet);
  await page.screenshot({
    path: testInfo.outputPath("first-party-zero-balance.png"),
  });
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.getByRole("button", { name: "WALLET", exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByRole("button", { name: "Continue with Steward", exact: true })
    .click();
  await expect(codeField).toBeVisible();
  await enterLocalCode();
  await expect(
    page.getByRole("button", { name: "Fill", exact: true }),
  ).toBeEnabled();
  const restored = await (await page.request.get("/api/me")).json();
  expect(restored.steward.wallet.address).toBe(wallet);
  expect(me.steward.userId).toBeTruthy();
  expect(restored.steward.userId).toBe(me.steward.userId);
  expect(restored.handle).toBe(me.handle);
  expect(restored.intents).toHaveLength(4);
});
