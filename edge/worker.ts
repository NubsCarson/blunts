import { createRobinhoodReader } from "../app/server/robinhood.js";
import { onchainResponse } from "../app/server/onchain-api.js";
import { executionPolicyForOrigin } from "../app/shared/execution-policy.js";
import { RELEASE_ORIGIN } from "../app/shared/release-target.js";

const securityHeaders = {
  "content-security-policy":
    "default-src 'self'; base-uri 'self'; script-src 'self'; script-src-attr 'none'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://rpc.mainnet.chain.robinhood.com; frame-ancestors 'none'; object-src 'none'; form-action 'self'",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
};
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.protocol === "http:" && url.hostname === "blunt.nubs.site") {
      url.protocol = "https:";
      return Response.redirect(url.href, 308);
    }
    const execution = executionPolicyForOrigin(url.origin);
    const transactionsEnabled = execution.enabled && env.READ_ONLY !== "true";
    const json = (
      data: unknown,
      status = 200,
      extra: Record<string, string> = {},
    ) =>
      Response.json(data, {
        status,
        headers: { ...securityHeaders, "cache-control": "no-store", ...extra },
      });
    try {
      if (request.method !== "GET" && request.method !== "HEAD")
        return json({ error: "Method not allowed" }, 405, {
          allow: "GET, HEAD",
        });
      if (url.pathname.startsWith("/api/")) {
        const ip = request.headers.get("CF-Connecting-IP") ?? "local";
        if (!(await env.API_LIMIT.limit({ key: `blunts:${ip}` })).success)
          return json({ error: "Too many requests. Try again shortly." }, 429, {
            "retry-after": "60",
          });
        if (url.pathname === "/api/health")
          return json({
            ok: true,
            mode: "evm-preview",
            origin: RELEASE_ORIGIN,
            transactionsEnabled,
          });
        const query: Record<string, string | string[]> = {};
        for (const key of new Set(url.searchParams.keys())) {
          const values = url.searchParams.getAll(key);
          query[key] = values.length === 1 ? values[0] : values;
        }
        // Per-request state prevents cross-request promise/I/O ownership in workerd.
        const result = await onchainResponse(
          url.pathname,
          query,
          createRobinhoodReader({ paceReads: true }),
        );
        return json({ ...result.data, transactionsEnabled }, result.status);
      }
      const asset = await env.ASSETS.fetch(request);
      const response = new Response(asset.body, asset);
      for (const [name, value] of Object.entries(securityHeaders))
        response.headers.set(name, value);
      return response;
    } catch {
      console.error(
        JSON.stringify({ event: "request_failed", path: url.pathname }),
      );
      return json(
        { error: "Service temporarily unavailable. Try again." },
        503,
      );
    }
  },
} satisfies ExportedHandler<CloudflareEnv>;
