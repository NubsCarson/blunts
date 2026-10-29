import { z } from "zod";
import { ReferenceGapError } from "../shared/reference-price.js";
import { amountUnits } from "../shared/robinhood.js";
import { market, quote } from "./robinhood.js";

// Shared by the Node server and edge transport. Financial reads and validation
// stay identical; only the HTTP adapter and admission control differ.
export async function onchainResponse(
  path: string,
  query: unknown,
  reader = { market, quote },
) {
  if (path === "/api/onchain/market") {
    try {
      return { status: 200, data: { ...(await reader.market()) } };
    } catch {
      return {
        status: 503,
        data: { error: "QQQ market data is unavailable or stale. Try again." },
      };
    }
  }
  if (path !== "/api/onchain/quote")
    return { status: 404, data: { error: "Not found" } };
  const input = z
    .object({ side: z.enum(["fill", "spark"]), amount: z.string().max(32) })
    .strict()
    .safeParse(query);
  if (!input.success)
    return {
      status: 400,
      data: { error: "Choose Fill or Spark and a valid amount." },
    };
  try {
    amountUnits(input.data.amount, input.data.side === "fill" ? 6 : 18);
  } catch {
    return {
      status: 400,
      data: { error: "Enter a positive amount with supported precision." },
    };
  }
  try {
    return {
      status: 200,
      data: { ...(await reader.quote(input.data.side, input.data.amount)) },
    };
  } catch (error) {
    console.warn(
      JSON.stringify({
        event: "quote_unavailable",
        error: error instanceof Error ? error.name : "UnknownError",
        reason:
          error instanceof Error &&
          "shortMessage" in error &&
          typeof error.shortMessage === "string"
            ? error.shortMessage.slice(0, 160)
            : "Quote unavailable",
      }),
    );
    if (error instanceof ReferenceGapError)
      return { status: 409, data: { error: error.message } };
    return {
      status: 503,
      data: {
        error:
          "No verified quote is available for that amount. Try again or reduce the amount.",
      },
    };
  }
}
