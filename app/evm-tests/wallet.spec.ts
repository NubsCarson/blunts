import { test, expect } from "@playwright/test";
const wallet = "0x1111111111111111111111111111111111111111";
test("wallet-first preview connects without signup, reads balances and never sends money", async ({
  page,
}, info) => {
  await page.addInitScript(
    ({ wallet }) => {
      const listeners: Record<string, Function> = {};
      (window as any).ethereum = {
        request: async ({ method }: any) => {
          if (method === "eth_requestAccounts") return [wallet];
          if (method === "eth_chainId") return "0x1237";
          throw Error("Unexpected wallet request: " + method);
        },
        on: (name: string, fn: Function) => (listeners[name] = fn),
        removeListener: (name: string) => delete listeners[name],
      };
      (window as any).fixtureAccountsChanged = (accounts: string[]) =>
        listeners.accountsChanged?.(accounts);
    },
    { wallet },
  );
  await page.route(
    "https://rpc.mainnet.chain.robinhood.com/",
    async (route) => {
      const body = route.request().postDataJSON();
      const reply = (item: any) => ({
        jsonrpc: "2.0",
        id: item.id,
        result:
          item.method === "eth_getBalance"
            ? "0xde0b6b3a7640000"
            : "0x" +
              (item.params?.[0]?.to?.toLowerCase() ===
              "0x5fc5360d0400a0fd4f2af552add042d716f1d168"
                ? 100000000n.toString(16)
                : 1000000000000000000n.toString(16)
              ).padStart(64, "0"),
      });
      await route.fulfill({
        json: Array.isArray(body) ? body.map(reply) : reply(body),
      });
    },
  );
  await page.route("**/api/onchain/market", (route) =>
    route.fulfill({
      json: {
        chainId: 4663,
        symbol: "QQQ",
        address: "0xD5f3879160bc7c32ebb4dC785F8a4F505888de68",
        cashAddress: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
        bid: "700",
        ask: "701",
        multiplier: "1.1",
        generatedAt: new Date().toISOString(),
        halted: false,
        status: "ASSET_STATUS_ACTIVE",
        transactionsEnabled: false,
      },
    }),
  );
  await page.route("**/api/onchain/quote?*", (route) =>
    route.fulfill({
      json: {
        side: new URL(route.request().url()).searchParams.get("side"),
        amountIn: "25",
        amountOut: "0.035",
        minimumOut: "0.034825",
        fee: 500,
        pool: wallet,
        blockNumber: "1",
        expiresAt: Date.now() + 20000,
        transactionsEnabled: false,
      },
    }),
  );
  await page.goto("/");
  await expect(page.getByText("Local preview · swaps off")).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Browser wallet", exact: true })
    .click();
  await expect(
    page.getByText("100 USDG available", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".scene-value")).toHaveText("$770.00");
  await page.getByRole("button", { name: "Fill", exact: true }).click();
  await page.getByRole("button", { name: "Preview swap", exact: true }).click();
  await expect(page.getByText("0.035 QQQ", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      "Local preview: wallet approvals and swaps are disabled. No funds will move.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.screenshot({ path: info.outputPath("evm-wallet-tray.png") });
  await page.evaluate(() => {
    (window as any).fixtureAccountsChanged([]);
  });
  await expect(
    page.getByRole("button", { name: "Connect wallet", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".scene-value")).toHaveText("—");
});
