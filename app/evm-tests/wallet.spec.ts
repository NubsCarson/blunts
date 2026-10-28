import { test, expect } from "@playwright/test";
import { encodeAbiParameters, toFunctionSelector } from "viem";
const wallet = "0x1111111111111111111111111111111111111111";
test("wallet-first preview connects without signup, reads balances and never sends money", async ({
  page,
}, info) => {
  await page.addInitScript(
    ({ wallet }) => {
      const listeners: Record<string, Function> = {};
      (window as any).fixtureWalletRequests = [];
      (window as any).ethereum = {
        request: async ({ method }: any) => {
          (window as any).fixtureWalletRequests.push(method);
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
      const reply = (item: any) => {
        let result: string;
        const selector = item.params?.[0]?.data?.slice(0, 10);
        if (item.method === "eth_chainId") result = "0x1237";
        else if (item.method === "eth_getBalance") result = "0xde0b6b3a7640000";
        else if (item.method === "eth_getCode") result = "0x6000";
        else if (selector === toFunctionSelector("decimals()"))
          result = encodeAbiParameters([{ type: "uint8" }], [6]);
        else if (selector === toFunctionSelector("allowance(address,address)"))
          result = encodeAbiParameters([{ type: "uint256" }], [0n]);
        else if (
          selector === toFunctionSelector("getPool(address,address,uint24)")
        )
          result = encodeAbiParameters(
            [{ type: "address" }],
            ["0xD60A5d14dB690B7Afad71F76B108071D7175597d"],
          );
        else if (
          selector ===
          toFunctionSelector(
            "quoteExactInputSingle((address,address,uint256,uint24,uint160))",
          )
        )
          result = encodeAbiParameters(
            [
              { type: "uint256" },
              { type: "uint160" },
              { type: "uint32" },
              { type: "uint256" },
            ],
            [35000000000000000n, 1n, 0, 150000n],
          );
        else
          result = encodeAbiParameters(
            [{ type: "uint256" }],
            [
              item.params?.[0]?.to?.toLowerCase() ===
              "0x5fc5360d0400a0fd4f2af552add042d716f1d168"
                ? 100000000n
                : 1000000000000000000n,
            ],
          );
        return { jsonrpc: "2.0", id: item.id, result };
      };
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
        pool: "0xD60A5d14dB690B7Afad71F76B108071D7175597d",
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
  await page
    .getByRole("button", { name: "Review wallet steps", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Prepared wallet steps" }),
  ).toBeVisible();
  await expect(
    page.getByText("Approve only 25 USDG", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Review only. Signing stays disabled in this local build.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => (window as any).fixtureWalletRequests),
  ).toEqual(["eth_requestAccounts", "eth_chainId"]);
  await page.screenshot({ path: info.outputPath("prepared-wallet-steps.png") });
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.screenshot({ path: info.outputPath("evm-wallet-tray.png") });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Connect wallet", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Browser wallet", exact: true })
    .click();
  await page.locator(".evm-connect button").click();
  await expect(
    page.getByRole("region", { name: "Saved review" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Resume Fill review", exact: true })
    .click();
  await expect(page.getByLabel("USDG to spend", { exact: true })).toHaveValue(
    "25",
  );
  await expect(
    page.getByText(
      "Saved amount restored. Preview again for a fresh price and wallet review.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator(".evm-quote")).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as any).fixtureWalletRequests),
  ).toEqual(["eth_requestAccounts", "eth_chainId"]);
  await page.screenshot({ path: info.outputPath("resumed-review.png") });
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.evaluate(() => {
    (window as any).fixtureAccountsChanged([
      "0x2222222222222222222222222222222222222222",
    ]);
  });
  await page.locator(".evm-connect button").click();
  await expect(page.getByRole("region", { name: "Saved review" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.evaluate(() => {
    (window as any).fixtureAccountsChanged([]);
  });
  await expect(
    page.getByRole("button", { name: "Connect wallet", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".scene-value")).toHaveText("—");
});
