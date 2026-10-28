import { useEffect, useRef, useState } from "react";
import { formatUnits, type Address } from "viem";
import {
  BanknoteArrowDown,
  Flame,
  Wallet,
  Menu,
  X,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { HowItWorks } from "./HowItWorks";
import { Tray } from "./Tray";
import {
  robinhood,
  stock,
  cash,
  tokenAbi,
  amountUnits,
  type Market,
  type SwapQuote,
} from "../shared/robinhood";
import "./evm.css";
import { chainReader as reader } from "./chain";
import { prepareSwap } from "./prepare-swap";
import {
  ReviewStore,
  ReviewStorageError,
  type SavedReview,
} from "./review-store";
import { ReferenceGapError } from "../shared/reference-price";
import { TransactionActivity } from "./TransactionActivity";
import { estimateFirstStepFee, type StepFee } from "./gas-readiness";
import type { SwapPlan } from "../shared/swap-plan";
type Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<any>;
  on?: (name: string, fn: (value: any) => void) => void;
  removeListener?: (name: string, fn: (value: any) => void) => void;
};
type WalletChoice = { id: string; name: string; provider: Provider };
const usd = (value: bigint) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(value) / 100,
  );
export function EvmApp() {
  const [wallets, setWallets] = useState<WalletChoice[]>([]),
    [provider, setProvider] = useState<Provider | null>(null),
    [account, setAccount] = useState<Address | null>(null),
    [chain, setChain] = useState<number | null>(null),
    [market, setMarket] = useState<Market | null>(null),
    [balances, setBalances] = useState<{
      cash: bigint;
      stock: bigint;
      eth: bigint;
    } | null>(null),
    [panel, setPanel] = useState<
      "wallet" | "menu" | "how" | "fill" | "spark" | null
    >(null),
    [amount, setAmount] = useState("25"),
    [quote, setQuote] = useState<SwapQuote | null>(null),
    [prepared, setPrepared] = useState<SwapPlan | null>(null),
    [stepFee, setStepFee] = useState<StepFee | null>(null),
    [feeUnavailable, setFeeUnavailable] = useState(false),
    [savedReview, setSavedReview] = useState<SavedReview | null>(null),
    [reviewStorageError, setReviewStorageError] = useState(""),
    [restoredReview, setRestoredReview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [marketError, setMarketError] = useState(""),
    [clock, setClock] = useState(Date.now());
  const quoteEpoch = useRef(0);
  const preparedSection = useRef<HTMLElement>(null);
  const epoch = useRef(0),
    dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const announce = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail?.provider || typeof detail.info?.uuid !== "string") return;
      setWallets((items) =>
        items.some((w) => w.provider === detail.provider)
          ? items
          : [
              ...items,
              {
                id: detail.info.uuid,
                name: String(detail.info.name).slice(0, 60),
                provider: detail.provider,
              },
            ],
      );
    };
    window.addEventListener("eip6963:announceProvider", announce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    const fallback = (window as unknown as { ethereum?: Provider }).ethereum;
    if (fallback)
      setWallets((items) =>
        items.some((w) => w.provider === fallback)
          ? items
          : [
              ...items,
              { id: "injected", name: "Browser wallet", provider: fallback },
            ],
      );
    return () =>
      window.removeEventListener("eip6963:announceProvider", announce);
  }, []);
  useEffect(() => {
    let stopped = false;
    async function update() {
      try {
        const r = await fetch("/api/onchain/market");
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        if (!stopped) {
          setMarket(d);
          setMarketError("");
        }
      } catch {
        if (!stopped) {
          setMarket(null);
          setMarketError("Market data unavailable. Refresh to try again.");
        }
      }
    }
    void update();
    const timer = setInterval(() => {
      if (!document.hidden) void update();
    }, 30000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    quoteEpoch.current++;
    if (panel) dialog.current?.showModal();
    else dialog.current?.close();
    setError("");
    setQuote(null);
  }, [panel]);
  useEffect(() => {
    if (!quote) return;
    setClock(Date.now());
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [quote]);
  useEffect(() => {
    if (!provider) return;
    const accountsChanged = (accounts: string[]) => {
      epoch.current++;
      setAccount(
        /^0x[0-9a-fA-F]{40}$/.test(accounts[0] ?? "")
          ? (accounts[0] as Address)
          : null,
      );
      setBalances(null);
      setQuote(null);
    };
    const chainChanged = (value: string) => {
      epoch.current++;
      setChain(Number(value));
      setBalances(null);
      setQuote(null);
    };
    provider.on?.("accountsChanged", accountsChanged);
    provider.on?.("chainChanged", chainChanged);
    return () => {
      provider.removeListener?.("accountsChanged", accountsChanged);
      provider.removeListener?.("chainChanged", chainChanged);
    };
  }, [provider]);
  async function refreshBalances() {
    if (!account || chain !== 4663) return;
    const version = epoch.current;
    try {
      const [c, s, e] = await Promise.all([
        reader.readContract({
          address: cash.address,
          abi: tokenAbi,
          functionName: "balanceOf",
          args: [account],
        }),
        reader.readContract({
          address: stock.address,
          abi: tokenAbi,
          functionName: "balanceOf",
          args: [account],
        }),
        reader.getBalance({ address: account }),
      ]);
      if (version === epoch.current) setBalances({ cash: c, stock: s, eth: e });
    } catch {
      if (version === epoch.current) {
        setBalances(null);
        setError("Could not read wallet balances. Try refreshing.");
      }
    }
  }
  useEffect(() => {
    void refreshBalances();
  }, [account, chain]);
  async function connect(choice: WalletChoice) {
    setBusy(true);
    setError("");
    try {
      const accounts = await choice.provider.request({
        method: "eth_requestAccounts",
      });
      const selected = accounts?.[0];
      if (!/^0x[0-9a-fA-F]{40}$/.test(selected ?? "")) throw Error();
      const id = Number(
        await choice.provider.request({ method: "eth_chainId" }),
      );
      epoch.current++;
      setProvider(choice.provider);
      setAccount(selected);
      setChain(id);
      setBalances(null);
      setPanel(null);
    } catch {
      setError("Wallet connection was cancelled or unavailable. Try again.");
    } finally {
      setBusy(false);
    }
  }
  async function switchChain() {
    if (!provider) return;
    setBusy(true);
    setError("");
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x1237" }],
      });
      const id = Number(await provider.request({ method: "eth_chainId" }));
      setChain(id);
      epoch.current++;
      setBalances(null);
    } catch {
      setError("Select Robinhood Chain (4663) in your wallet, then reconnect.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    setPrepared(null);
    setStepFee(null);
    setFeeUnavailable(false);
  }, [quote, account, chain]);
  useEffect(() => {
    if (prepared)
      preparedSection.current?.scrollIntoView({
        block: "nearest",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
  }, [prepared]);
  useEffect(() => {
    setSavedReview(null);
    setReviewStorageError("");
    setRestoredReview(false);
    if (!account || chain !== 4663) return;
    try {
      setSavedReview(new ReviewStore(window.localStorage).load(account));
    } catch {
      setReviewStorageError(
        "Saved review is unavailable. Existing browser data was preserved.",
      );
    }
  }, [account, chain]);
  function resumeReview() {
    if (
      !account ||
      chain !== 4663 ||
      savedReview?.owner.toLowerCase() !== account.toLowerCase()
    )
      return;
    setAmount(savedReview.amount);
    setPanel(savedReview.side);
    setRestoredReview(true);
  }
  async function reviewSteps() {
    if (!quote || quote.side !== panel || !account || chain !== 4663 || !market)
      return;
    const version = quoteEpoch.current,
      identity = epoch.current;
    setBusy(true);
    setError("");
    setPrepared(null);
    try {
      const plan = await prepareSwap(quote, account, reader, 4663, market);
      const fee = await estimateFirstStepFee(plan).catch(() => null);
      if (version === quoteEpoch.current && identity === epoch.current) {
        const saved = new ReviewStore(window.localStorage).save(
          account,
          quote.side,
          quote.amountIn,
        );
        setSavedReview(saved);
        setReviewStorageError("");
        setStepFee(fee);
        setFeeUnavailable(fee === null);
        setPrepared(plan);
      }
    } catch (failure) {
      if (version === quoteEpoch.current && identity === epoch.current)
        setError(
          failure instanceof ReferenceGapError ||
            failure instanceof ReviewStorageError
            ? failure.message
            : "Wallet steps could not be verified or saved. Check your balance and preview again.",
        );
    } finally {
      setBusy(false);
    }
  }
  async function preview() {
    if (panel !== "fill" && panel !== "spark") return;
    const version = ++quoteEpoch.current;
    setRestoredReview(false);
    setBusy(true);
    setError("");
    setQuote(null);
    try {
      amountUnits(amount, panel === "fill" ? 6 : 18);
      const response = await fetch(
        `/api/onchain/quote?side=${panel}&amount=${encodeURIComponent(amount)}`,
        { signal: AbortSignal.timeout(15000) },
      );
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      if (version === quoteEpoch.current) setQuote(data);
    } catch (e) {
      if (version === quoteEpoch.current)
        setError(
          e instanceof Error ? e.message : "Quote unavailable. Try again.",
        );
    } finally {
      setBusy(false);
    }
  }
  let value: bigint | null = null;
  try {
    if (market && balances)
      value =
        (balances.stock *
          amountUnits(market.bid, 18) *
          amountUnits(market.multiplier, 18)) /
        10n ** 52n;
  } catch {
    /* Unverified values stay unavailable. */
  }
  const rolled = (value ?? 0n) / 10000n;
  const short = account
    ? `${account.slice(0, 6)}…${account.slice(-4)}`
    : "Connect wallet";
  return (
    <>
      <header className="scene-header">
        <div className="scene-counts">
          <span className="scene-count">{rolled.toString()} rolled</span>
          <span className="scene-count">{(rolled / 10n).toString()} bands</span>
        </div>
        <button
          className="menu-button"
          aria-label="Menu"
          onClick={() => setPanel("menu")}
        >
          <Menu size={20} />
        </button>
      </header>
      <main className="scene-main">
        <Tray value={String(value ?? 0n)} paused={panel !== null} />
        <div className="evm-network">
          <span>Robinhood Chain</span>
          <span>Local preview · swaps off</span>
        </div>
        <div className="scene-hud">
          <strong className="scene-value">
            {value === null ? "—" : usd(value)}
          </strong>
          <div className="scene-cash">
            {account
              ? balances
                ? `${formatUnits(balances.cash, 6)} USDG available`
                : "Wallet balance unavailable"
              : "Your wallet. Your stash."}
          </div>
        </div>
        <div className="evm-connect">
          <button onClick={() => setPanel("wallet")}>
            <Wallet size={16} />
            {short}
          </button>
        </div>
        {marketError && (
          <p className="evm-market-error" role="status">
            {marketError}
          </p>
        )}
        <div className="scene-dock">
          <button
            className="scene-act fill"
            aria-label="Fill"
            onClick={() => {
              setAmount("25");
              setPanel("fill");
            }}
          >
            <span className="orb">
              <BanknoteArrowDown size={42} strokeWidth={2.2} />
            </span>
            <span className="lbl">FILL</span>
          </button>
          <button
            className="scene-act spark"
            aria-label="Spark"
            onClick={() => {
              setAmount("0.1");
              setPanel("spark");
            }}
          >
            <span className="orb">
              <Flame size={42} strokeWidth={2.2} />
            </span>
            <span className="lbl">SPARK</span>
          </button>
        </div>
      </main>
      <dialog
        ref={dialog}
        className="evm-sheet"
        onCancel={() => setPanel(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setPanel(null);
        }}
      >
        <div className="evm-sheet-body">
          <button
            className="evm-close"
            aria-label="Close"
            onClick={() => setPanel(null)}
          >
            <X size={20} />
          </button>
          {panel === "wallet" ? (
            <>
              <h1>{account ? "Your wallet" : "Bring your wallet."}</h1>
              <p>
                No email signup. Connect an EVM wallet to see your QQQ and USDG
                on Robinhood Chain.
              </p>
              {account ? (
                <>
                  <p className="evm-address">{account}</p>
                  <p>
                    {chain === 4663
                      ? "Connected to Robinhood Chain."
                      : `Your wallet is on chain ${chain}.`}
                  </p>
                  {chain !== 4663 ? (
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={switchChain}
                    >
                      Switch to Robinhood Chain
                    </button>
                  ) : (
                    <button
                      disabled={busy}
                      onClick={() => void refreshBalances()}
                    >
                      <RefreshCw size={16} /> Refresh balances
                    </button>
                  )}
                  <a
                    href={`${robinhood.blockExplorers!.default.url}/address/${account}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View wallet <ArrowUpRight size={14} />
                  </a>
                  {savedReview &&
                    chain === 4663 &&
                    savedReview.owner.toLowerCase() ===
                      account.toLowerCase() && (
                      <section className="evm-saved" aria-label="Saved review">
                        <h2>Pick up your review.</h2>
                        <p>
                          {savedReview.side === "fill" ? "Fill" : "Spark"} ·{" "}
                          {savedReview.amount}{" "}
                          {savedReview.side === "fill" ? "USDG" : "QQQ"} · never
                          submitted
                        </p>
                        <button onClick={resumeReview}>
                          Resume{" "}
                          {savedReview.side === "fill" ? "Fill" : "Spark"}{" "}
                          review
                        </button>
                      </section>
                    )}
                  {chain === 4663 && (
                    <TransactionActivity
                      key={account.toLowerCase()}
                      owner={account}
                    />
                  )}
                  {reviewStorageError && (
                    <p className="evm-error" role="status">
                      {reviewStorageError}
                    </p>
                  )}
                  <button
                    onClick={() => {
                      epoch.current++;
                      setProvider(null);
                      setAccount(null);
                      setBalances(null);
                      setChain(null);
                      setPanel(null);
                    }}
                  >
                    Disconnect from Blunts
                  </button>
                </>
              ) : wallets.length ? (
                wallets.map((w) => (
                  <button
                    className="evm-wallet-choice"
                    key={w.id}
                    disabled={busy}
                    onClick={() => void connect(w)}
                  >
                    <Wallet size={20} />
                    {w.name}
                  </button>
                ))
              ) : (
                <p className="evm-note">
                  No browser wallet detected. Open Blunts in your wallet’s
                  browser or enable an EVM wallet extension, then reload.
                </p>
              )}
              <p className="evm-fine">
                Connecting only requests your public address. Blunts never asks
                for a seed phrase or private key.
              </p>
            </>
          ) : panel === "menu" ? (
            <>
              <button onClick={() => setPanel("how")}>How it works</button>
              <h1>
                Same ritual.
                <br />
                Your own wallet.
              </h1>
              <p>
                Fill swaps USDG into Robinhood’s QQQ token. Spark swaps it back
                into USDG in your wallet.
              </p>
              <p>
                This local version reads real market data and previews swaps. It
                does not submit transactions, charge a Blunts fee, move money or
                withdraw to a bank.
              </p>
              <p>
                QQQ tokens provide economic exposure; they are not direct
                ownership of QQQ shares. Available only in eligible regions,
                excluding US persons.
              </p>
              <a
                href="https://docs.robinhood.com/chain/stock-tokens/"
                target="_blank"
                rel="noreferrer"
              >
                Token details & eligibility <ArrowUpRight size={14} />
              </a>
            </>
          ) : panel === "how" ? (
            <HowItWorks mode="wallet" onDone={() => setPanel("menu")} />
          ) : (
            <>
              <h1>
                {panel === "fill" ? "Fill your stash." : "Spark it back."}
              </h1>
              <p>
                {panel === "fill" ? "USDG → QQQ token" : "QQQ token → USDG"}
              </p>
              {restoredReview && (
                <p className="evm-note" role="status">
                  Saved amount restored. Preview again for a fresh price and
                  wallet review.
                </p>
              )}
              <label className="evm-amount">
                {panel === "fill" ? "USDG to spend" : "QQQ tokens to sell"}
                <input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    quoteEpoch.current++;
                    setRestoredReview(false);
                    setAmount(e.target.value);
                    setQuote(null);
                  }}
                />
              </label>
              <button
                className="primary"
                disabled={busy || !market}
                onClick={() => void preview()}
              >
                {busy ? "Checking pools…" : "Preview swap"}
              </button>
              {quote && quote.side === panel && (
                <div className="evm-quote" role="status">
                  <div>
                    <span>You receive approximately</span>
                    <strong>
                      {quote.amountOut} {panel === "fill" ? "QQQ" : "USDG"}
                    </strong>
                  </div>
                  <p>
                    Minimum {quote.minimumOut}{" "}
                    {panel === "fill" ? "QQQ" : "USDG"} · 0.5% slippage
                  </p>
                  <p>
                    Uniswap pool fee {quote.fee / 10000}% · No Blunts fee in
                    this preview
                  </p>
                  {quote.referenceShortfallBps !== undefined && (
                    <p>
                      {quote.referenceShortfallBps === 0
                        ? "At or above the reference output"
                        : `${(quote.referenceShortfallBps / 100).toFixed(2)}% below reference output`}{" "}
                      · includes pool costs
                    </p>
                  )}
                  <p>
                    {clock >= quote.expiresAt
                      ? "Quote expired. Preview again."
                      : `Quote valid for ${Math.max(0, Math.ceil((quote.expiresAt - clock) / 1000))}s`}
                  </p>
                  <button
                    disabled={
                      busy ||
                      !account ||
                      chain !== 4663 ||
                      clock >= quote.expiresAt
                    }
                    onClick={() => void reviewSteps()}
                  >
                    {busy ? "Verifying wallet steps…" : "Review wallet steps"}
                  </button>
                  {prepared && (
                    <section
                      className="evm-plan"
                      aria-label="Prepared wallet steps"
                      ref={preparedSection}
                    >
                      <h2>Your wallet would confirm</h2>
                      <ol>
                        {prepared.calls.map((call, index) => (
                          <li key={index}>
                            {call.kind === "reset"
                              ? "Clear the previous token allowance"
                              : call.kind === "approve"
                                ? `Approve only ${quote.amountIn} ${panel === "fill" ? "USDG" : "QQQ"}`
                                : "Swap with the displayed minimum output"}
                          </li>
                        ))}
                      </ol>
                      {stepFee?.status === "needs_eth" && (
                        <p>
                          Add ETH on Robinhood Chain for network fees. Your
                          current ETH balance is zero.
                        </p>
                      )}
                      {stepFee?.status === "estimated" && (
                        <p>
                          First step fee estimate:{" "}
                          {formatUnits(stepFee.estimatedFeeWei, 18)} ETH (20%
                          gas buffer).{" "}
                          {stepFee.hasEnoughEth
                            ? "Your ETH balance covers this estimate."
                            : "Not enough ETH for this estimate."}{" "}
                          Your wallet confirms the final fee.
                        </p>
                      )}
                      {feeUnavailable && (
                        <p>
                          Network fee could not be estimated. Refresh the quote
                          before signing.
                        </p>
                      )}
                      <p>
                        Saved for this wallet. Reloading requires a fresh quote.
                      </p>
                      <p>
                        Tokens return to your connected wallet. Network fees are
                        paid in ETH.
                      </p>
                      <p>
                        {clock >= quote.expiresAt
                          ? "This plan expired. Preview again."
                          : "Review only. Signing stays disabled in this local build."}
                      </p>
                    </section>
                  )}
                </div>
              )}
              <p className="evm-note">
                Local preview: wallet approvals and swaps are disabled. No funds
                will move.
              </p>
              <p className="evm-fine">
                For eligible users only. Robinhood Stock Tokens are unavailable
                to US persons and other restricted regions.
              </p>
              {!account && (
                <button onClick={() => setPanel("wallet")}>
                  Connect wallet to view your balances
                </button>
              )}
            </>
          )}
          {error && (
            <p className="evm-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}
