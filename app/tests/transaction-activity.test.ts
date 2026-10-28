import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeFunctionData, type Address, type Hex } from "viem";
import { swapPlan, approvalAbi, routerAbi } from "../shared/swap-plan.js";
import { cash, dex, type SwapQuote } from "../shared/robinhood.js";
import {
  SwapJournal,
  reconcileSwapAttempt,
  type ReceiptReader,
  type JournalStorage,
} from "../shared/swap-journal.js";
import {
  trackWalletTransaction,
  supportedWalletCall,
} from "../client/transaction-activity.js";
import {
  estimateFirstStepFee,
  type GasReader,
} from "../client/gas-readiness.js";
const owner = "0x1111111111111111111111111111111111111111" as Address,
  other = "0x2222222222222222222222222222222222222222" as Address;
const hash = `0x${"a".repeat(64)}` as Hex,
  blockHash = `0x${"b".repeat(64)}` as Hex;
const q = (): SwapQuote => ({
  side: "fill",
  amountIn: "25",
  amountOut: "0.035",
  minimumOut: "0.034825",
  fee: 500,
  pool: "0xD60A5d14dB690B7Afad71F76B108071D7175597d",
  blockNumber: "1",
  expiresAt: Date.now() + 20000,
  transactionsEnabled: false,
});
function store(): JournalStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
  };
}
function fixture() {
  const plan = swapPlan(q(), owner, 0n),
    disk = store(),
    journal = new SwapJournal(disk, owner, 4663);
  const reader: ReceiptReader = {
    getChainId: async () => 4663,
    getTransaction: async () => ({
      hash,
      from: owner,
      to: plan.calls[0].to,
      input: plan.calls[0].data,
      value: 0n,
      nonce: 7,
    }),
    getTransactionReceipt: async () => ({
      status: "success",
      transactionHash: hash,
      blockHash,
      blockNumber: 10n,
    }),
    getBlock: async () => ({ hash: blockHash }),
    getBlockNumber: async () => 20n,
  };
  return { plan, disk, journal, reader };
}
test("own transaction tracking persists one record, verifies receipt and reports inclusion without claiming finality", async () => {
  const f = fixture();
  const included = await trackWalletTransaction(
    hash,
    owner,
    f.journal,
    f.reader,
  );
  assert.equal(included.state, "included");
  assert.equal(included.tracked, true);
  assert.equal(included.observation, "verified");
  await trackWalletTransaction(hash, owner, f.journal, f.reader);
  assert.equal(f.journal.read().length, 1);
  assert.equal(new SwapJournal(f.disk, owner, 4663).read()[0].hash, hash);
  assert.equal(new SwapJournal(f.disk, other, 4663).read().length, 0);
  assert.equal(new SwapJournal(f.disk, owner, 31337).read().length, 0);
});
test("an uncertain request can attach only an exact same-sender/nonce/call hash, without replay", async () => {
  const f = fixture();
  f.journal.save({
    planId: f.plan.id,
    step: 0,
    owner,
    chainId: 4663,
    nonce: 7,
    call: f.plan.calls[0],
    state: "unknown",
  });
  const result = await trackWalletTransaction(hash, owner, f.journal, f.reader);
  assert.equal(result.planId, f.plan.id);
  assert.equal(result.state, "included");
  assert.equal(f.journal.read().length, 1);
  const bad = fixture();
  bad.journal.save({
    planId: bad.plan.id,
    step: 0,
    owner,
    chainId: 4663,
    nonce: 7,
    call: bad.plan.calls[1],
    state: "unknown",
  });
  await assert.rejects(
    trackWalletTransaction(hash, owner, bad.journal, bad.reader),
  );
  assert.equal(bad.journal.read()[0].state, "unknown");
  assert.equal(bad.journal.read()[0].hash, undefined);
});
test("foreign senders, wrong chain/receipt hash and arbitrary calldata never become accepted activity", async () => {
  const f = fixture();
  const original = f.reader.getTransaction;
  f.reader.getTransaction = async () => ({
    ...(await original({ hash })),
    from: other,
  });
  await assert.rejects(
    trackWalletTransaction(hash, owner, f.journal, f.reader),
  );
  assert.equal(f.journal.read().length, 0);
  f.reader.getTransaction = original;
  f.reader.getChainId = async () => 31337;
  await assert.rejects(
    trackWalletTransaction(hash, owner, f.journal, f.reader),
  );
  f.reader.getChainId = async () => 4663;
  f.reader.getTransactionReceipt = async () => ({
    status: "success",
    transactionHash: blockHash,
    blockHash,
    blockNumber: 10n,
  });
  assert.equal(
    (await trackWalletTransaction(hash, owner, f.journal, f.reader)).state,
    "mismatch",
  );
  assert.throws(() =>
    supportedWalletCall(owner, cash.address, f.plan.calls[0].data, 1n),
  );
  assert.throws(() =>
    supportedWalletCall(owner, other, f.plan.calls[0].data, 0n),
  );
  const foreign = swapPlan(q(), other, 0n);
  assert.throws(() =>
    supportedWalletCall(owner, dex.router, foreign.calls[1].data, 0n),
  );
  const batch = encodeFunctionData({
    abi: routerAbi,
    functionName: "multicall",
    args: [9999999999n, [f.plan.calls[1].data, f.plan.calls[1].data]],
  });
  assert.throws(() => supportedWalletCall(owner, dex.router, batch, 0n));
});
test("RPC failure retains last inclusion proof and records unavailable rather than fabricating a fresh confirmation", async () => {
  const f = fixture();
  const included = await trackWalletTransaction(
    hash,
    owner,
    f.journal,
    f.reader,
  );
  f.reader.getTransactionReceipt = async () => {
    throw Error("offline");
  };
  const unavailable = await reconcileSwapAttempt(included, f.reader, f.journal);
  assert.equal(unavailable.state, "included");
  assert.equal(unavailable.observedAt, included.observedAt);
  assert.equal(unavailable.observation, "unavailable");
});
test("fee readiness uses exact gas/wei with a 20% buffer and never estimates unsupported chains or expired reviews", async () => {
  const plan = swapPlan(q(), owner, 0n);
  let estimates = 0;
  const reader: GasReader = {
    getChainId: async () => 4663,
    estimateGas: async (args) => {
      estimates++;
      assert.equal(args.account, owner);
      assert.equal(args.to, cash.address);
      return 100000n;
    },
    getGasPrice: async () => 10000000n,
    getBalance: async () => 1200000000000n,
  };
  const fee = await estimateFirstStepFee(plan, reader);
  assert.ok(fee.status === "estimated");
  assert.equal(fee.gasLimit, 120000n);
  assert.equal(fee.estimatedFeeWei, 1200000000000n);
  assert.equal(fee.hasEnoughEth, true);
  reader.getBalance = async () => 1n;
  const insufficient = await estimateFirstStepFee(plan, reader);
  assert.ok(insufficient.status === "estimated");
  assert.equal(insufficient.hasEnoughEth, false);
  reader.getBalance = async () => 0n;
  const noEth = await estimateFirstStepFee(plan, reader);
  assert.equal(noEth.status, "needs_eth");
  assert.equal(estimates, 2);
  reader.getChainId = async () => 1;
  await assert.rejects(estimateFirstStepFee(plan, reader));
  assert.equal(estimates, 2);
  reader.getChainId = async () => 4663;
  plan.quote.expiresAt = Date.now() - 1;
  await assert.rejects(estimateFirstStepFee(plan, reader));
  assert.equal(estimates, 2);
});
