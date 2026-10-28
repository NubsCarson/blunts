import { formatUnits } from "viem";
import { verifiedSwapPlan, type SwapPlan } from "../shared/swap-plan";
import { cash, stock, dex, robinhood } from "../shared/robinhood";
export function WalletStepDetails({
  plan,
  expired,
}: {
  plan: SwapPlan;
  expired: boolean;
}) {
  if (expired)
    return (
      <p className="evm-fine">
        Transaction details expired. Preview again to rebuild them.
      </p>
    );
  let verified: SwapPlan;
  try {
    verified = verifiedSwapPlan(plan);
  } catch {
    return (
      <p role="alert" className="evm-error">
        Transaction details no longer match. Preview again.
      </p>
    );
  }
  const input = verified.quote.side === "fill" ? cash : stock,
    output = verified.quote.side === "fill" ? stock : cash;
  const addressLink = (address: string) => (
    <a
      href={`${robinhood.blockExplorers!.default.url}/address/${address}`}
      target="_blank"
      rel="noreferrer"
    >
      <code>{address}</code>
    </a>
  );
  return (
    <details className="evm-step-details">
      <summary>Review exact transaction details</summary>
      <p>
        These are prepared requests only. No wallet request is opened by this
        review.
      </p>
      <dl>
        <dt>Network</dt>
        <dd>Robinhood Chain · 4663</dd>
        <dt>Connected wallet</dt>
        <dd>{addressLink(verified.owner)}</dd>
        <dt>ETH sent with each call</dt>
        <dd>0 ETH · network fees are separate</dd>
      </dl>
      {verified.calls.map((call, index) => (
        <section key={index} aria-label={`Transaction step ${index + 1}`}>
          <h3>
            Step {index + 1} ·{" "}
            {call.kind === "reset"
              ? "Clear allowance"
              : call.kind === "approve"
                ? "Approve exact amount"
                : "Swap"}
          </h3>
          {call.kind === "swap" ? (
            <dl>
              <dt>You spend</dt>
              <dd>
                {formatUnits(verified.amountIn, input.decimals)} {input.symbol}
              </dd>
              <dt>You receive at least</dt>
              <dd>
                {formatUnits(verified.minimumOut, output.decimals)}{" "}
                {output.symbol}
              </dd>
              <dt>Output recipient</dt>
              <dd>{addressLink(verified.owner)}</dd>
              <dt>Expires</dt>
              <dd>
                {new Date(
                  Math.floor(verified.quote.expiresAt / 1000) * 1000,
                ).toLocaleString()}
              </dd>
              <dt>Pool fee</dt>
              <dd>{verified.quote.fee / 10000}%</dd>
              <dt>Router contract</dt>
              <dd>{addressLink(dex.router)}</dd>
            </dl>
          ) : (
            <dl>
              <dt>Token contract</dt>
              <dd>{addressLink(call.to)}</dd>
              <dt>Allowance granted</dt>
              <dd>
                {call.kind === "reset"
                  ? "0"
                  : formatUnits(verified.amountIn, input.decimals)}{" "}
                {input.symbol}
              </dd>
              <dt>Approved spender</dt>
              <dd>{addressLink(dex.router)}</dd>
            </dl>
          )}
        </section>
      ))}
      <p className="evm-fine">
        If a wallet prompt differs from this review, reject it. Reviewing these
        details never opens a wallet prompt.
      </p>
    </details>
  );
}
