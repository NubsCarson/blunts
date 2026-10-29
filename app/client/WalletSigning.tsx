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
    [error, setError] = useState(""),
    [walletOpen, setWalletOpen] = useState(false);
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
    setWalletOpen(false);
    setError("");
    const version = epoch.current;
    try {
      const { requestWalletStep } = await import("./wallet-execution");
      await requestWalletStep(plan, next, {
        request: (args) => {
          if (
            args.method === "eth_sendTransaction" &&
            version === epoch.current
          )
            setWalletOpen(true);
          return wallet.request(args);
        },
      });
      if (version === epoch.current) {
        setRecords(
          new SwapJournal(window.localStorage, plan.owner, 4663).read(),
        );
      }
    } catch (failure) {
      if (version === epoch.current) {
        try {
          const saved = new SwapJournal(
            window.localStorage,
            plan.owner,
            4663,
          ).read();
          setRecords(saved);
          const attempt = saved.find(
            (r) => r.planId === plan.id && r.step === next,
          );
          if (attempt) {
            setError("Check this request in your wallet before trying again.");
          } else if (
            failure instanceof Error &&
            /expired|Price moved|reference/i.test(failure.message)
          ) {
            setError("The price needs updating. Nothing was sent.");
          } else if (
            failure instanceof Error &&
            /Wallet changed|wallet and reader/i.test(failure.message)
          ) {
            setError(
              "Your wallet changed. Reconnect and try again. Nothing was sent.",
            );
          } else {
            setError(
              "We couldn't prepare this request. Nothing was sent. Update the price to try again.",
            );
          }
        } catch {
          setError(
            "We couldn't read your activity. Check your wallet before trying again.",
          );
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
      <h3>
        {next >= 0 && plan.calls[next].kind !== "swap"
          ? "Allow this amount."
          : "Finish in your wallet."}
      </h3>
      {next >= 0 && plan.calls[next].kind !== "swap" && (
        <p>
          First, give permission to use only this amount. This doesn't buy
          anything yet.
        </p>
      )}
      {next < 0 ? (
        <p role="status">Your swap was confirmed on Robinhood Chain.</p>
      ) : (
        <>
          {pending ? (
            <div role="status">
              <p>
                {pending.state === "unknown" ||
                pending.state === "awaiting_wallet"
                  ? "Check your wallet activity before continuing."
                  : pending.state === "pending"
                    ? "Sent. Waiting for network confirmation."
                    : "Check this request in Activity before continuing."}
              </p>
              {pending.hash && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void check(pending)}
                >
                  Check status
                </button>
              )}
            </div>
          ) : existing ? (
            <p role="status">
              {existing.state === "cancelled"
                ? "You cancelled in your wallet. Nothing else was started."
                : existing.state === "replaced"
                  ? "This request was replaced in your wallet. Get a fresh price."
                  : "This step already has an attempt."}{" "}
              Check your wallet activity before continuing.
            </p>
          ) : (
            <>
              <label className="check">
                <input
                  type="checkbox"
                  checked={eligible}
                  onChange={(e) => setEligible(e.target.checked)}
                />
                I meet the token’s eligibility rules, including not being a U.S.
                person.
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
                  ? walletOpen
                    ? "Confirm in your wallet…"
                    : "Checking your wallet…"
                  : plan.calls[next].kind === "reset"
                    ? "Reset spending permission"
                    : plan.calls[next].kind === "approve"
                      ? "Approve spending"
                      : plan.quote.side === "fill"
                        ? "Fill in wallet"
                        : "Spark in wallet"}
              </button>
            </>
          )}
          {(expired ||
            existing?.state === "cancelled" ||
            existing?.state === "replaced" ||
            error) &&
            !pending && (
              <button type="button" disabled={busy} onClick={onRefresh}>
                Update price
              </button>
            )}
        </>
      )}
      {error && (
        <p role="alert" className="evm-error">
          {error}
        </p>
      )}
    </section>
  );
}
