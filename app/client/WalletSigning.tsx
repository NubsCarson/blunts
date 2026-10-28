import { useEffect, useRef, useState } from "react";
import {
  SwapJournal,
  reconcileSwapAttempt,
  type SwapAttempt,
  type WalletRpc,
} from "../shared/swap-journal";
import type { SwapPlan } from "../shared/swap-plan";
import type { StepFee } from "./gas-readiness";
import { executionPolicyForOrigin } from "../shared/execution-policy";
import { chainReader } from "./chain";
import { withActivityLock } from "./activity-lock";
const blocking = new Set([
  "awaiting_wallet",
  "unknown",
  "pending",
  "reorged",
  "mismatch",
]);
export function WalletSigning({
  plan,
  wallet,
  fee,
  expired,
  onRefresh,
  onObserved,
}: {
  plan: SwapPlan;
  wallet: WalletRpc;
  fee: StepFee | null;
  expired: boolean;
  onRefresh: () => void;
  onObserved: () => void;
}) {
  const [records, setRecords] = useState<SwapAttempt[]>([]),
    [eligible, setEligible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const flight = useRef(false),
    epoch = useRef(0);
  const enabled =
    executionPolicyForOrigin(window.location.origin).enabled &&
    plan.quote.transactionsEnabled;
  useEffect(() => {
    setEligible(false);
    setError("");
    try {
      setRecords(new SwapJournal(window.localStorage, plan.owner, 4663).read());
    } catch {
      setError(
        "Wallet activity cannot be read. Existing records were preserved.",
      );
    }
    return () => {
      epoch.current++;
    };
  }, [plan.id]);
  const steps = records.filter((r) => r.planId === plan.id),
    next = plan.calls.findIndex(
      (_, i) => !steps.some((r) => r.step === i && r.state === "included"),
    );
  const existing = steps.find((r) => r.step === next),
    pending = records.find((r) => blocking.has(r.state));
  async function check(record: SwapAttempt) {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    const version = epoch.current;
    try {
      const journal = new SwapJournal(window.localStorage, plan.owner, 4663);
      await withActivityLock(journal.key, () =>
        reconcileSwapAttempt(record, chainReader, journal),
      );
      if (version === epoch.current) {
        setRecords(journal.read());
        onObserved();
      }
    } catch {
      if (version === epoch.current)
        setError(
          "Receipt check unavailable. Do not repeat a request with an unknown outcome.",
        );
    } finally {
      flight.current = false;
      if (version === epoch.current) setBusy(false);
    }
  }
  async function sign() {
    if (
      flight.current ||
      !eligible ||
      !enabled ||
      expired ||
      pending ||
      existing ||
      next < 0 ||
      fee?.status !== "estimated" ||
      !fee.hasEnoughEth
    )
      return;
    flight.current = true;
    setBusy(true);
    setError("");
    const version = epoch.current;
    try {
      const { requestWalletStep } = await import("./wallet-execution");
      await requestWalletStep(plan, next, wallet);
      if (version === epoch.current) {
        setRecords(
          new SwapJournal(window.localStorage, plan.owner, 4663).read(),
        );
        setEligible(false);
      }
    } catch {
      if (version === epoch.current) {
        setError(
          "Wallet request did not finish. Check Activity before trying again; no automatic retry was made.",
        );
        try {
          setRecords(
            new SwapJournal(window.localStorage, plan.owner, 4663).read(),
          );
        } catch {
          /* Preserve unreadable records. */
        }
      }
    } finally {
      flight.current = false;
      if (version === epoch.current) setBusy(false);
    }
  }
  if (!enabled) return null;
  return (
    <section className="evm-signing" aria-label="Wallet signing">
      <h3>Confirm in your wallet</h3>
      <p>
        This uses real wallet funds on Robinhood Chain. Nothing is submitted
        until you choose a step and approve it in your wallet.
      </p>
      {next < 0 ? (
        <p role="status">
          All steps included on Robinhood Chain. Ethereum finality is not
          checked.
        </p>
      ) : (
        <>
          {pending ? (
            <div role="status">
              <p>
                {pending.state === "unknown" ||
                pending.state === "awaiting_wallet"
                  ? "Wallet outcome is unknown. Find the hash in your wallet and use Activity."
                  : pending.state === "pending"
                    ? "Request sent. Check its receipt before continuing."
                    : "This request needs reconciliation in Activity."}
              </p>
              {pending.hash && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void check(pending)}
                >
                  Check wallet receipt
                </button>
              )}
            </div>
          ) : existing ? (
            <p role="status">
              {existing.state === "cancelled"
                ? "Wallet request declined. No next step was started."
                : existing.state === "replaced"
                  ? "This request was replaced in your wallet. Review a fresh quote."
                  : "This step already has an attempt."}{" "}
              Preview again only after checking your wallet activity.
            </p>
          ) : (
            <>
              <label className="check">
                <input
                  type="checkbox"
                  checked={eligible}
                  onChange={(e) => setEligible(e.target.checked)}
                />
                I am eligible under the issuer’s restrictions, including that I
                am not a US person.
              </label>
              <a
                href="https://docs.robinhood.com/chain/stock-tokens/"
                target="_blank"
                rel="noreferrer"
              >
                Review token rights and eligibility
              </a>
              <button
                className="primary"
                disabled={
                  busy ||
                  expired ||
                  !eligible ||
                  fee?.status !== "estimated" ||
                  !fee.hasEnoughEth ||
                  !!error
                }
                onClick={() => void sign()}
              >
                {busy
                  ? "Waiting for wallet…"
                  : plan.calls[next].kind === "reset"
                    ? "Clear allowance in wallet"
                    : plan.calls[next].kind === "approve"
                      ? "Approve exact amount in wallet"
                      : "Confirm swap in wallet"}
              </button>
            </>
          )}
          {(expired ||
            existing?.state === "cancelled" ||
            existing?.state === "replaced") &&
            !pending && (
              <button type="button" disabled={busy} onClick={onRefresh}>
                Refresh quote and review
              </button>
            )}
        </>
      )}
      {error && (
        <p role="alert" className="evm-error">
          {error}
        </p>
      )}
      <p className="evm-fine">
        Each step is separate. Declining a prompt does not start the next step.
        Approval alone does not buy QQQ. A new quote may be needed after
        approval.
      </p>
    </section>
  );
}
