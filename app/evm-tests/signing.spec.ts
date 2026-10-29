import { test, expect, type Page } from "@playwright/test";
import {
  decodeFunctionData,
  encodeAbiParameters,
  toFunctionSelector,
  type Hex,
} from "viem";
import { approvalAbi } from "../shared/swap-plan";
const owner = "0x1111111111111111111111111111111111111111",
  cash = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
  pool = "0xD60A5d14dB690B7Afad71F76B108071D7175597d";
async function setup(page: Page, decline = false, loseResponse = false) {
  const sends: any[] = [];
  const txs = new Map<string, any>();
  let allowance = 0n,
    failNonce = false;
  await page.addInitScript(
    ({ owner, decline, loseResponse }) => {
      (window as any).ethereum = {
        request: async ({ method, params }: any) => {
          if (method === "eth_chainId") return "0x1237";
          if (method === "eth_requestAccounts" || method === "eth_accounts")
            return [owner];
          if (method === "eth_sendTransaction") {
            if (decline)
              throw Object.assign(new Error("User declined"), { code: 4001 });
            const r = await fetch("/fixture/wallet-send", {
              method: "POST",
              body: JSON.stringify(params[0]),
            });
            const hash = (await r.json()).hash;
            if (loseResponse)
              throw Error(
                "Simulated wallet response lost after fixture broadcast",
              );
            return hash;
          }
          throw Error("Unexpected fixture wallet method " + method);
        },
        on: () => {},
        removeListener: () => {},
      };
    },
    { owner, decline, loseResponse },
  );
  await page.route("**/fixture/wallet-send", async (route) => {
    const input = route.request().postDataJSON();
    sends.push(input);
    const hash = "0x" + sends.length.toString(16).padStart(64, "0");
    txs.set(hash, input);
    await route.fulfill({ json: { hash } });
  });
  await page.route("**/api/onchain/market", (r) =>
    r.fulfill({
      json: {
        chainId: 4663,
        symbol: "QQQ",
        address: "0xD5f3879160bc7c32ebb4dC785F8a4F505888de68",
        cashAddress: cash,
        bid: "700",
        ask: "700",
        multiplier: "1",
        generatedAt: new Date().toISOString(),
        halted: false,
        status: "ASSET_STATUS_ACTIVE",
        transactionsEnabled: true,
      },
    }),
  );
  await page.route("**/api/onchain/quote?*", (r) =>
    r.fulfill({
      json: {
        side: "fill",
        amountIn: "25",
        amountOut: "0.035",
        minimumOut: "0.034825",
        fee: 500,
        pool,
        blockNumber: "256",
        expiresAt: Date.now() + 90000,
        transactionsEnabled: true,
      },
    }),
  );
  await page.route(
    "https://rpc.mainnet.chain.robinhood.com/",
    async (route) => {
      const body = route.request().postDataJSON();
      const word = (value: bigint) =>
        encodeAbiParameters([{ type: "uint256" }], [value]);
      const reply = (item: any) => {
        const method = item.method,
          p = item.params;
        let result: any;
        const selector = p?.[0]?.data?.slice(0, 10);
        if (method === "eth_getTransactionCount" && failNonce)
          return {
            jsonrpc: "2.0",
            id: item.id,
            error: { code: -32000, message: "Fixture read unavailable" },
          };
        if (method === "eth_chainId") result = "0x1237";
        else if (method === "eth_getBalance") result = "0xde0b6b3a7640000";
        else if (method === "eth_gasPrice") result = "0x989680";
        else if (method === "eth_estimateGas") result = "0x186a0";
        else if (method === "eth_getCode") result = "0x6000";
        else if (method === "eth_blockNumber") result = "0x200";
        else if (method === "eth_getTransactionCount")
          result = "0x" + sends.length.toString(16);
        else if (method === "eth_getTransactionByHash") {
          const tx = txs.get(p[0]);
          result = tx
            ? {
                ...tx,
                input: tx.data,
                hash: p[0],
                gas: "0x186a0",
                gasPrice: "0x989680",
                blockHash: "0x" + "b".repeat(64),
                blockNumber: "0x100",
                transactionIndex: "0x0",
                type: "0x0",
              }
            : null;
        } else if (method === "eth_getTransactionReceipt") {
          const tx = txs.get(p[0]);
          if (tx && tx.to.toLowerCase() === cash.toLowerCase())
            allowance = decodeFunctionData({
              abi: approvalAbi,
              data: tx.data as Hex,
            }).args![1] as bigint;
          result = tx
            ? {
                transactionHash: p[0],
                from: tx.from,
                to: tx.to,
                status: "0x1",
                blockHash: "0x" + "b".repeat(64),
                blockNumber: "0x100",
                transactionIndex: "0x0",
                gasUsed: "0x5208",
                cumulativeGasUsed: "0x5208",
                effectiveGasPrice: "0x989680",
                logs: [],
                logsBloom: "0x" + "0".repeat(512),
                contractAddress: null,
                type: "0x0",
              }
            : null;
        } else if (method === "eth_getBlockByNumber")
          result = {
            hash: "0x" + "b".repeat(64),
            number: "0x100",
            parentHash: "0x" + "a".repeat(64),
            timestamp: "0x6a000000",
            gasLimit: "0x1000000",
            gasUsed: "0x5208",
            transactions: [],
          };
        else if (selector === toFunctionSelector("decimals()"))
          result = word(6n);
        else if (selector === toFunctionSelector("allowance(address,address)"))
          result = word(allowance);
        else if (selector === toFunctionSelector("balanceOf(address)"))
          result = word(
            p[0].to.toLowerCase() === cash.toLowerCase()
              ? 100000000n
              : 1000000000000000000n,
          );
        else if (
          selector === toFunctionSelector("getPool(address,address,uint24)")
        )
          result = encodeAbiParameters([{ type: "address" }], [pool]);
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
        else if (method === "eth_call") result = word(1n);
        else throw Error("Unexpected fixture RPC " + method);
        return { jsonrpc: "2.0", id: item.id, result };
      };
      await route.fulfill({
        json: Array.isArray(body) ? body.map(reply) : reply(body),
      });
    },
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Browser wallet", exact: true })
    .click();
  await page.getByRole("button", { name: "Fill", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  return {
    sends,
    failBeforeWallet: () => {
      failNonce = true;
    },
    addCancellation: () => {
      const hash = "0x" + "f".repeat(64);
      txs.set(hash, {
        from: owner,
        to: owner,
        data: "0x",
        value: "0x0",
        nonce: sends[0].nonce,
        chainId: "0x1237",
      });
      return hash;
    },
  };
}
test("local signing requests finite approval and swap separately, with no automatic next transaction", async ({
  page,
}, info) => {
  const { sends } = await setup(page);
  const signing = page.getByRole("region", { name: "Wallet signing" });
  await expect(
    signing.getByRole("button", {
      name: "Approve spending",
      exact: true,
    }),
  ).toBeDisabled();
  await signing.getByRole("checkbox").check();
  await signing.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: info.outputPath("local-signing-review-fixture.png"),
  });
  await signing
    .getByRole("button", {
      name: "Approve spending",
      exact: true,
    })
    .click();
  await expect(
    signing.getByText("Sent. Waiting for network confirmation.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(sends).toHaveLength(1);
  expect(sends[0].chainId).toBe("0x1237");
  expect(sends[0].from).toBe(owner);
  expect(
    decodeFunctionData({ abi: approvalAbi, data: sends[0].data }).args![1],
  ).toBe(25000000n);
  await signing
    .getByRole("button", { name: "Check status", exact: true })
    .click();
  await expect(
    signing.getByRole("button", {
      name: "Fill in wallet",
      exact: true,
    }),
  ).toBeEnabled();
  expect(sends).toHaveLength(1);
  await signing.getByRole("checkbox").check();
  await signing
    .getByRole("button", { name: "Fill in wallet", exact: true })
    .click();
  await expect(
    signing.getByRole("button", { name: "Check status", exact: true }),
  ).toBeVisible();
  expect(sends).toHaveLength(2);
  await signing
    .getByRole("button", { name: "Check status", exact: true })
    .click();
  await expect(
    signing.getByText("Your swap was confirmed on Robinhood Chain.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(sends).toHaveLength(2);
});
test("declining a local signing prompt retains cancellation and never starts a second request", async ({
  page,
}) => {
  const { sends } = await setup(page, true);
  const signing = page.getByRole("region", { name: "Wallet signing" });
  await signing.getByRole("checkbox").check();
  await signing
    .getByRole("button", {
      name: "Approve spending",
      exact: true,
    })
    .click();
  await expect(signing.getByText(/You cancelled in your wallet/)).toBeVisible();
  expect(sends).toHaveLength(0);
  await expect(
    signing.getByRole("button", {
      name: "Fill in wallet",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    signing.getByRole("button", {
      name: "Update price",
      exact: true,
    }),
  ).toBeVisible();
});

test("unknown wallet outcome blocks another local signing request even after a new quote", async ({
  page,
}) => {
  const { sends } = await setup(page, false, true);
  let signing = page.getByRole("region", { name: "Wallet signing" });
  await signing.getByRole("checkbox").check();
  await signing
    .getByRole("button", {
      name: "Approve spending",
      exact: true,
    })
    .click();
  await expect(
    signing.getByText(/Check your wallet activity before continuing/),
  ).toBeVisible();
  expect(sends).toHaveLength(1);
  await page
    .getByRole("button", { name: "Change amount", exact: true })
    .click();
  await page.getByLabel("USDG to spend", { exact: true }).fill("25.0");
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  signing = page.getByRole("region", { name: "Wallet signing" });
  await expect(
    signing.getByText(/Check your wallet activity before continuing/),
  ).toBeVisible();
  await expect(
    signing.getByRole("button", {
      name: "Approve spending",
      exact: true,
    }),
  ).toHaveCount(0);
  expect(sends).toHaveLength(1);
});

test("tracking an included wallet cancellation preserves the original attempt and unlocks only a fresh review", async ({
  page,
}) => {
  const { sends, addCancellation } = await setup(page);
  const signing = page.getByRole("region", { name: "Wallet signing" });
  await signing.getByRole("checkbox").check();
  await signing
    .getByRole("button", {
      name: "Approve spending",
      exact: true,
    })
    .click();
  await expect(
    signing.getByText("Sent. Waiting for network confirmation.", {
      exact: true,
    }),
  ).toBeVisible();
  const originalHash = "0x" + "1".padStart(64, "0"),
    cancelHash = addCancellation();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.locator(".evm-connect button").click();
  await page.getByText("Activity on this browser", { exact: true }).click();
  await page.getByLabel("Transaction hash", { exact: true }).fill(cancelHash);
  await page
    .getByRole("button", { name: "Track transaction", exact: true })
    .click();
  await expect(
    page.getByText("Wallet cancellation included", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".evm-activity-list li")).toHaveCount(1);
  const records = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "[]"),
    `blunts:swap:4663:${owner}`,
  );
  expect(records[0].hash).toBe(originalHash);
  expect(records[0].replacement.hash).toBe(cancelHash);
  expect(records[0].state).toBe("replaced");
  expect(sends).toHaveLength(1);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Fill", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(
    page.getByRole("region", { name: "Wallet signing" }).getByRole("button", {
      name: "Approve spending",
      exact: true,
    }),
  ).toBeDisabled();
  expect(sends).toHaveLength(1);
});

test("time spent reading does not expire the review after twenty seconds", async ({
  page,
}) => {
  await page.clock.install();
  const { sends } = await setup(page);
  const signing = page.getByRole("region", { name: "Wallet signing" });
  await expect(signing).toBeVisible();
  await page.clock.fastForward(25000);
  await signing.getByRole("checkbox").check();
  await expect(
    signing.getByRole("button", { name: "Approve spending", exact: true }),
  ).toBeEnabled();
  expect(sends).toHaveLength(0);
});
test("a failed read before the wallet request says nothing was sent and permits refreshing", async ({
  page,
}) => {
  const { sends, failBeforeWallet } = await setup(page);
  failBeforeWallet();
  const signing = page.getByRole("region", { name: "Wallet signing" });
  await signing.getByRole("checkbox").check();
  await signing
    .getByRole("button", { name: "Approve spending", exact: true })
    .click();
  await expect(signing.getByRole("alert")).toContainText("Nothing was sent");
  await expect(
    signing.getByRole("button", { name: "Update price", exact: true }),
  ).toBeEnabled();
  expect(sends).toHaveLength(0);
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? "[]"),
      `blunts:swap:4663:${owner}`,
    ),
  ).toEqual([]);
});
