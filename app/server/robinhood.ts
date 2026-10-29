import { referenceShortfall } from "../shared/reference-price.js";
import {
  createPublicClient,
  http,
  parseAbi,
  zeroAddress,
  formatUnits,
} from "viem";
import {
  robinhood,
  stock,
  cash,
  dex,
  quoteAbi,
  amountUnits,
  type Market,
  type SwapQuote,
} from "../shared/robinhood.js";
export function createRobinhoodReader(options: { paceReads?: boolean } = {}) {
  let rpcQueue = Promise.resolve();
  let lastRpcAt = 0;
  const pacedFetch: typeof fetch = async (input, init) => {
    let release!: () => void;
    const before = rpcQueue;
    rpcQueue = new Promise<void>((done) => {
      release = done;
    });
    await before;
    try {
      const delay = Math.max(0, 1100 - (Date.now() - lastRpcAt));
      if (delay) await new Promise((done) => setTimeout(done, delay));
      lastRpcAt = Date.now();
      let response = await fetch(input, init);
      if (response.status === 429) {
        const seconds = Number(response.headers.get("retry-after") ?? "1");
        if (Number.isFinite(seconds) && seconds >= 0 && seconds <= 3) {
          await response.body?.cancel();
          await new Promise((done) =>
            setTimeout(done, Math.max(1100, seconds * 1000)),
          );
          lastRpcAt = Date.now();
          response = await fetch(input, init);
        }
      }
      return response;
    } finally {
      release();
    }
  };
  const client = createPublicClient({
    chain: robinhood,
    transport: http(robinhood.rpcUrls.default.http[0], {
      retryCount: 0,
      timeout: 10000,
      ...(options.paceReads
        ? { batch: { batchSize: 20, wait: 25 }, fetchFn: pacedFetch }
        : {}),
    }),
  });
  async function json(path: string) {
    const response = await fetch(`https://api.robinhood.com/rhj/${path}`, {
      signal: AbortSignal.timeout(10000),
      redirect: "manual",
    });
    if (!response.ok) throw Error("Market data unavailable. Try again.");
    const reader = response.body!.getReader();
    let size = 0;
    const chunks: Uint8Array[] = [];
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 2_000_000) throw Error("Market response too large.");
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
      reader.releaseLock();
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  }
  let cached: { until: number; value: Market } | undefined;
  let pending: Promise<Market> | undefined;
  async function market(): Promise<Market> {
    if (cached && cached.until > Date.now()) return cached.value;
    if (pending) return pending;
    pending = (async () => {
      const [assets, prices, chainId] = await Promise.all([
        json("assets"),
        json("prices/QQQ"),
        client.getChainId(),
      ]);
      const a = assets.assets?.filter((x: any) => x.tokenSymbol === "QQQ");
      const p = prices.quotes?.filter((x: any) => x.tokenSymbol === "QQQ");
      if (chainId !== 4663 || a?.length !== 1 || p?.length !== 1)
        throw Error("Unable to verify QQQ.");
      const asset = a[0],
        price = p[0];
      if (
        !asset.deployments?.some(
          (d: any) =>
            d.chainId === 4663 &&
            d.contractAddress.toLowerCase() === stock.address.toLowerCase(),
        ) ||
        price.currency !== "USD" ||
        !price.deployments?.some(
          (d: any) =>
            d.chainId === 4663 &&
            d.contractAddress.toLowerCase() === stock.address.toLowerCase(),
        )
      )
        throw Error("Token identity did not match the issuer registry.");
      for (const n of [price.bid, price.ask, asset.currentMultiplier])
        amountUnits(n, 18);
      const time = Date.parse(price.generatedAt);
      if (
        !Number.isFinite(time) ||
        time > Date.now() + 30000 ||
        Date.now() - time > 120000
      )
        throw Error("Market price is stale. Try again later.");
      const value: Market = {
        chainId: 4663,
        symbol: "QQQ",
        address: stock.address,
        cashAddress: cash.address,
        bid: price.bid,
        ask: price.ask,
        multiplier: asset.currentMultiplier,
        generatedAt: new Date(time).toISOString(),
        halted: price.isTradingHalt !== false,
        status: asset.status,
        transactionsEnabled: false,
      };
      cached = { until: Date.now() + 15000, value };
      return value;
    })().finally(() => {
      pending = undefined;
    });
    return pending;
  }
  async function quote(
    side: "fill" | "spark",
    amount: string,
  ): Promise<SwapQuote> {
    const m = await market();
    if (m.halted || m.status !== "ASSET_STATUS_ACTIVE")
      throw Error("QQQ trading is unavailable.");
    const input = side === "fill" ? cash : stock,
      output = side === "fill" ? stock : cash;
    const amountIn = amountUnits(amount, input.decimals);
    if (amountIn > 10n ** BigInt(input.decimals) * 100000n)
      throw Error("Preview limit is 100,000 units.");
    const blockNumber = await client.getBlockNumber();
    const routes = await Promise.all(
      [500, 3000].map(async (fee) => {
        try {
          const pool = await client.readContract({
            address: dex.factory,
            abi: parseAbi([
              "function getPool(address,address,uint24) view returns(address)",
            ]),
            functionName: "getPool",
            args: [input.address, output.address, fee],
            blockNumber,
          });
          if (pool === zeroAddress) return;
          const result = await client.simulateContract({
            address: dex.quoter,
            abi: quoteAbi,
            functionName: "quoteExactInputSingle",
            args: [
              {
                tokenIn: input.address,
                tokenOut: output.address,
                amountIn,
                fee,
                sqrtPriceLimitX96: 0n,
              },
            ],
            blockNumber,
          });
          const amountOut = result.result[0];
          if (amountOut <= 0n) return;
          return { fee, pool, amountOut };
        } catch (error) {
          console.warn(
            JSON.stringify({
              event: "quote_route_unavailable",
              fee,
              error: error instanceof Error ? error.name : "UnknownError",
              causes: (() => {
                const causes = [];
                let cause: unknown = error;
                for (let i = 0; i < 6 && cause instanceof Error; i++) {
                  causes.push({
                    name: cause.name,
                    code:
                      "code" in cause && typeof cause.code === "number"
                        ? cause.code
                        : undefined,
                    status:
                      "status" in cause && typeof cause.status === "number"
                        ? cause.status
                        : undefined,
                    details:
                      "details" in cause && typeof cause.details === "string"
                        ? cause.details
                            .replace(/0x[a-fA-F0-9]+/g, "[hex]")
                            .replace(/\b\d+\b/g, "[number]")
                            .slice(0, 160)
                        : undefined,
                  });
                  cause = cause.cause;
                }
                return causes;
              })(),
              reason:
                error instanceof Error &&
                "shortMessage" in error &&
                typeof error.shortMessage === "string"
                  ? error.shortMessage.slice(0, 160)
                  : "RPC route unavailable",
            }),
          );
          return;
        }
      }),
    );
    const best = routes
      .filter((r): r is NonNullable<typeof r> => !!r)
      .sort((a, b) => (a.amountOut > b.amountOut ? -1 : 1))[0];
    if (!best)
      throw Error(
        "No executable QQQ/USDG quote is available. Try a smaller amount.",
      );
    const shortfall = referenceShortfall(
      side,
      formatUnits(amountIn, input.decimals),
      formatUnits(best.amountOut, output.decimals),
      m,
    );
    return {
      referenceShortfallBps: shortfall,
      side,
      amountIn: formatUnits(amountIn, input.decimals),
      amountOut: formatUnits(best.amountOut, output.decimals),
      minimumOut: formatUnits((best.amountOut * 995n) / 1000n, output.decimals),
      fee: best.fee,
      pool: best.pool,
      blockNumber: String(blockNumber),
      expiresAt: Date.now() + 20000,
      transactionsEnabled: false,
    };
  }

  return { market, quote };
}

export const { market, quote } = createRobinhoodReader();
