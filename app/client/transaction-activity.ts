import {
  decodeFunctionData,
  keccak256,
  toBytes,
  type Address,
  type Hex,
} from "viem";
import { cash, stock, dex } from "../shared/robinhood";
import { approvalAbi, routerAbi, type SwapCall } from "../shared/swap-plan";
import {
  SwapJournal,
  reconcileSwapAttempt,
  type SwapAttempt,
  type ReceiptReader,
} from "../shared/swap-journal";
import { chainReader } from "./chain";
export function supportedWalletCall(
  owner: Address,
  to: string | null,
  input: Hex,
  value: bigint,
): SwapCall {
  if (value !== 0n || !to || input.length > 8192)
    throw Error("Unsupported wallet transaction.");
  if (
    [cash.address.toLowerCase(), stock.address.toLowerCase()].includes(
      to.toLowerCase(),
    )
  ) {
    const decoded = decodeFunctionData({ abi: approvalAbi, data: input });
    if (
      decoded.functionName !== "approve" ||
      decoded.args[0].toLowerCase() !== dex.router.toLowerCase()
    )
      throw Error("Unsupported token approval.");
    return {
      kind: decoded.args[1] === 0n ? "reset" : "approve",
      to: to as Address,
      data: input,
      value: "0x0",
    };
  }
  if (to.toLowerCase() !== dex.router.toLowerCase())
    throw Error("Unsupported router.");
  const outer = decodeFunctionData({ abi: routerAbi, data: input });
  if (outer.functionName !== "multicall" || outer.args[1].length !== 1)
    throw Error("Unsupported swap batch.");
  const inner = decodeFunctionData({ abi: routerAbi, data: outer.args[1][0] });
  if (inner.functionName !== "exactInputSingle")
    throw Error("Unsupported swap call.");
  const p = inner.args[0];
  if (
    p.recipient.toLowerCase() !== owner.toLowerCase() ||
    p.sqrtPriceLimitX96 !== 0n ||
    p.amountIn <= 0n ||
    p.amountOutMinimum <= 0n ||
    ![500, 3000].includes(p.fee)
  )
    throw Error("Swap limits or recipient did not match.");
  const pair = [p.tokenIn.toLowerCase(), p.tokenOut.toLowerCase()]
    .sort()
    .join(":");
  if (
    pair !==
    [cash.address.toLowerCase(), stock.address.toLowerCase()].sort().join(":")
  )
    throw Error("Unsupported token pair.");
  return { kind: "swap", to: dex.router, data: input, value: "0x0" };
}
type ActivityReader = ReceiptReader;
/** Observes an already-existing own-wallet transaction. Never signs, resubmits,
 * creates a quote or infers app origin. A saved hash is not settlement proof. */
export async function trackWalletTransaction(
  hash: string,
  owner: Address,
  journal: SwapJournal,
  reader: ActivityReader = chainReader,
): Promise<SwapAttempt> {
  if (
    !/^0x[0-9a-fA-F]{64}$/.test(hash) ||
    journal.chainId !== 4663 ||
    journal.owner.toLowerCase() !== owner.toLowerCase() ||
    (await reader.getChainId()) !== 4663
  )
    throw Error("Wallet or chain did not match.");
  const tx = await reader.getTransaction({ hash: hash as Hex });
  if (
    tx.hash.toLowerCase() !== hash.toLowerCase() ||
    tx.from.toLowerCase() !== owner.toLowerCase()
  )
    throw Error("Transaction belongs to another wallet.");
  const call = supportedWalletCall(owner, tx.to, tx.input, tx.value);
  const id = keccak256(
    toBytes(`tracked:4663:${owner.toLowerCase()}:${hash.toLowerCase()}`),
  );
  const records = journal.read();
  let record = records.find(
    (r) => r.hash?.toLowerCase() === hash.toLowerCase(),
  );
  if (!record) {
    const uncertain = records.filter(
      (r) =>
        !r.hash &&
        ["awaiting_wallet", "unknown"].includes(r.state) &&
        r.nonce === tx.nonce,
    );
    const matching = uncertain.filter(
      (r) =>
        r.call.to.toLowerCase() === call.to.toLowerCase() &&
        r.call.data === call.data &&
        r.call.value === call.value,
    );
    if (uncertain.length && matching.length !== 1)
      throw Error("Hash does not uniquely match the earlier wallet attempt.");
    record =
      matching.length === 1
        ? { ...matching[0], hash, state: "pending" }
        : {
            planId: id,
            step: 0,
            chainId: 4663,
            owner,
            call,
            nonce: tx.nonce,
            state: "pending",
            hash,
            tracked: true,
          };
    journal.save(record);
  }
  return reconcileSwapAttempt(record, reader, journal);
}
