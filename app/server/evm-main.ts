import Fastify from "fastify";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import serveStatic from "@fastify/static";
import { resolve } from "node:path";
import { z } from "zod";
import { market, quote } from "./robinhood.js";
const app = Fastify({
  logger: {
    redact: ["req.headers.cookie", "req.headers.authorization", "req.body"],
    serializers: {
      req: (req) => ({ method: req.method, url: req.url?.split("?")[0] }),
    },
  },
});
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "https://rpc.mainnet.chain.robinhood.com"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: null,
    },
  },
});
await app.register(rateLimit, { max: 90, timeWindow: "1 minute" });
app.get("/api/health", async () => ({
  ok: true,
  mode: "evm-preview",
  transactionsEnabled: false,
}));
app.get("/api/onchain/market", async (_, reply) => {
  try {
    return await market();
  } catch {
    return reply
      .code(503)
      .send({ error: "QQQ market data is unavailable or stale. Try again." });
  }
});
app.get("/api/onchain/quote", async (req, reply) => {
  const input = z
    .object({ side: z.enum(["fill", "spark"]), amount: z.string().max(32) })
    .strict()
    .safeParse(req.query);
  if (!input.success)
    return reply
      .code(400)
      .send({ error: "Choose Fill or Spark and a valid amount." });
  try {
    return await quote(input.data.side, input.data.amount);
  } catch {
    return reply.code(503).send({
      error:
        "No verified quote is available for that amount. Try again or reduce the amount.",
    });
  }
});
await app.register(serveStatic, { root: resolve("dist") });
app.setNotFoundHandler((req, reply) =>
  req.url.startsWith("/api/")
    ? reply.code(404).send({ error: "Not found" })
    : reply.sendFile("index.html"),
);
await app.listen({ host: "127.0.0.1", port: Number(process.env.PORT ?? 8745) });
process.once("SIGTERM", () => void app.close());
process.once("SIGINT", () => void app.close());
