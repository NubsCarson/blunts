import type { Address } from "viem";
import {
  submitSwapStep,
  SwapJournal,
  type WalletRpc,
} from "../shared/swap-journal";
import type { SwapPlan } from "../shared/swap-plan";
import type { Market } from "../shared/robinhood";
import { request } from "./platform";
import { prepareSwap } from "./prepare-swap";
import { estimateFirstStepFee } from "./gas-readiness";
import { chainReader } from "./chain";
import { withActivityLock } from "./activity-lock";
// Requires a reviewed source change after owner approval. No env, URL or storage
// flag enables real-money requests in the current local preview.
export const localExecutionPolicy = Object.freeze({
  chainId: 4663 as const,
  enabled: false,
});
export async function requestWalletStep(
  plan: SwapPlan,
  step: number,
  wallet: WalletRpc,
) {
  if (!localExecutionPolicy.enabled)
    throw Error("Real-wallet signing is disabled in this local preview.");
  const owner = plan.owner as Address;
  const journal = new SwapJournal(window.localStorage, owner, 4663);
  return submitSwapStep(
    plan,
    step,
    wallet,
    chainReader,
    journal,
    (operation) => withActivityLock(journal.key, operation),
    {
      ...localExecutionPolicy,
      preflight: async (plan, index) => {
        const response = await request("/onchain/market", undefined, {});
        if (!response.ok) throw Error("Fresh market reference unavailable.");
        const reference = response.data as Market;
        const fresh = await prepareSwap(
          plan.quote,
          owner,
          chainReader,
          4663,
          reference,
        );
        const call = plan.calls[index];
        if (
          !call ||
          !fresh.calls.some(
            (candidate) =>
              candidate.to.toLowerCase() === call.to.toLowerCase() &&
              candidate.data === call.data &&
              candidate.value === call.value,
          )
        )
          throw Error("Approval state changed. Review fresh wallet steps.");
        const fee = await estimateFirstStepFee({ ...fresh, calls: [call] });
        if (fee.status !== "estimated" || !fee.hasEnoughEth)
          throw Error("ETH fee readiness is unavailable or insufficient.");
      },
    },
  );
}
