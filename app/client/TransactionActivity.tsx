import { useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import {
  SwapJournal,
  reconcileSwapAttempt,
  type SwapAttempt,
} from "../shared/swap-journal";
import { trackWalletTransaction } from "./transaction-activity";
import { chainReader } from "./chain";
import { robinhood } from "../shared/robinhood";
const labels: Record<SwapAttempt["state"], string> = {
  awaiting_wallet: "Wallet response missing",
  unknown: "Outcome unknown",
  cancelled: "Wallet request declined",
  pending: "Waiting for a receipt",
  included: "Included on Robinhood Chain",
  confirmed: "Confirmed on local fork",
  reverted: "Transaction reverted",
  reorged: "Chain inclusion changed",
  mismatch: "Transaction did not match",
};
export function TransactionActivity({ owner }: { owner: Address }) {
  const [records, setRecords] = useState<SwapAttempt[]>([]),
    [hash, setHash] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const epoch = useRef(0);
  const disclosure = useRef<HTMLDetailsElement>(null);
  const latestRow = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (disclosure.current?.open && records.length)
      latestRow.current?.scrollIntoView({
        block: "nearest",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
  }, [records]);
  useEffect(() => {
    try {
      setRecords(new SwapJournal(window.localStorage, owner, 4663).read());
    } catch {
      setError(
        "Activity could not be read. Existing browser records were preserved.",
      );
    }
    return () => {
      epoch.current++;
    };
  }, [owner]);
  async function track() {
    const version = epoch.current;
    setBusy(true);
    setError("");
    try {
      const journal = new SwapJournal(window.localStorage, owner, 4663);
      await trackWalletTransaction(hash.trim(), owner, journal);
      if (version === epoch.current) {
        setRecords(journal.read());
        setHash("");
      }
    } catch {
      if (version === epoch.current)
        setError(
          "This hash could not be verified for your wallet or saved in this browser. Check the hash and try again. No new transaction was sent.",
        );
    } finally {
      if (version === epoch.current) setBusy(false);
    }
  }
  async function refresh(record: SwapAttempt) {
    const version = epoch.current;
    setBusy(true);
    setError("");
    try {
      const journal = new SwapJournal(window.localStorage, owner, 4663);
      await reconcileSwapAttempt(record, chainReader, journal);
      if (version === epoch.current) setRecords(journal.read());
    } catch {
      if (version === epoch.current)
        setError(
          "Receipt check unavailable. Existing transaction records were preserved.",
        );
    } finally {
      if (version === epoch.current) setBusy(false);
    }
  }
  function downloadActivity() {
    try {
      const journal = new SwapJournal(window.localStorage, owner, 4663);
      const text = JSON.stringify(
        {
          version: 1,
          chainId: 4663,
          wallet: owner,
          exportedAt: new Date().toISOString(),
          records: journal.read(),
        },
        null,
        2,
      );
      const url = URL.createObjectURL(
        new Blob([text], { type: "application/json" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `blunts-activity-4663-${Date.now()}.json`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError(
        "Activity export is unavailable. Existing browser records were preserved.",
      );
    }
  }
  return (
    <section className="evm-activity" aria-label="Transaction activity">
      <details ref={disclosure}>
        <summary>Activity on this browser</summary>
        <div>
          <p>
            Track an existing approval or QQQ/USDG swap from this wallet.
            Checking a hash never sends a transaction.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void track();
            }}
          >
            <label>
              Transaction hash
              <input
                value={hash}
                onChange={(e) => setHash(e.target.value.trim())}
                placeholder="0x…"
                spellCheck={false}
                autoComplete="off"
                required
                pattern="0x[0-9a-fA-F]{64}"
              />
            </label>
            <button disabled={busy || !/^0x[0-9a-fA-F]{64}$/.test(hash.trim())}>
              {busy ? "Checking…" : "Track transaction"}
            </button>
          </form>
          {records.length > 0 && (
            <button type="button" onClick={downloadActivity}>
              Download activity
            </button>
          )}
          {records.length === 0 ? (
            <p className="evm-fine">No transactions tracked here yet.</p>
          ) : (
            <ul className="evm-activity-list">
              {records
                .slice()
                .reverse()
                .map((record, index) => (
                  <li
                    key={`${record.planId}:${record.step}`}
                    ref={index === 0 ? latestRow : undefined}
                  >
                    <strong>
                      {record.call.kind === "swap"
                        ? "QQQ / USDG swap"
                        : record.call.kind === "reset"
                          ? "Clear token allowance"
                          : "Token approval"}
                    </strong>
                    <p>{labels[record.state]}</p>
                    {record.observation === "unavailable" && (
                      <p>
                        Latest receipt check unavailable; showing the last
                        verified state.
                      </p>
                    )}
                    {record.state === "included" && (
                      <p>
                        Ethereum finality has not been checked. Bank or bridge
                        withdrawals are separate.
                      </p>
                    )}
                    {!record.hash ? (
                      <p>
                        Find the hash in your wallet’s activity before trying
                        again. Blunts will not repeat this attempt.
                      </p>
                    ) : (
                      <>
                        <a
                          href={`${robinhood.blockExplorers!.default.url}/tx/${record.hash}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View {record.hash.slice(0, 10)}…
                          {record.hash.slice(-6)}
                        </a>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void refresh(record)}
                        >
                          Check receipt
                        </button>
                      </>
                    )}
                    {record.observedAt && (
                      <small>
                        Last verified{" "}
                        {new Date(record.observedAt).toLocaleString()}
                      </small>
                    )}
                  </li>
                ))}
            </ul>
          )}
          {error && (
            <p className="evm-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </details>
    </section>
  );
}
