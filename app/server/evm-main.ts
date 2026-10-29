import { evmConfig } from "./evm-config.js";
import { evmRateLimit } from "./evm-rate-limit.js";
import Fastify from "fastify";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import serveStatic from "@fastify/static";
import { resolve } from "node:path";
import { onchainResponse } from "./onchain-api.js";
const { port, host, origin, execution, trustProxy } = evmConfig(process.env);
const app = Fastify({
  trustProxy,
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
await app.register(rateLimit, evmRateLimit);
app.addHook("onSend", async (req, reply) => {
  if (req.url.startsWith("/api/")) reply.header("cache-control", "no-store");
});
app.get("/api/health", async () => ({
  ok: true,
  mode: "evm-preview",
  transactionsEnabled: execution.enabled,
  origin,
}));
app.get("/api/onchain/*", async (req, reply) => {
  const result = await onchainResponse(req.url.split("?")[0], req.query);
  return reply
    .code(result.status)
    .send({ ...result.data, transactionsEnabled: execution.enabled });
});
await app.register(serveStatic, { root: resolve("dist") });
app.setNotFoundHandler((req, reply) =>
  req.url.startsWith("/api/")
    ? reply.code(404).send({ error: "Not found" })
    : reply.sendFile("index.html"),
);
await app.listen({ host, port });
process.once("SIGTERM", () => void app.close());
process.once("SIGINT", () => void app.close());
