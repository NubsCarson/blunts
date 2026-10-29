# Web release preparation — October 28, 2026

The owner selected **https://blunt.nubs.site** (singular) as the temporary
canonical origin. This is configuration preparation only. No DNS, public
hosting, deployment, purchase or public wallet-signing activation is approved.
The existing local wallet preview remains http://localhost:8745.

## Prepared package

`app/shared/release-target.ts` pins the chosen HTTPS origin. The EVM server now
honors HOST and validates PORT/APP_ORIGIN. Normal development still binds
127.0.0.1. An all-interface container defaults to the chosen release origin and
reports transactionsEnabled=false. Hosted execution remains denied by the shared
origin policy; no environment switch enables hosted wallet signatures.

The active Docker/Compose package serves the wallet app without PostgreSQL,
provider credentials, account registration or a simulated ledger. Compose maps
127.0.0.1:8746 to container port 8745 so it remains a local review package. The
older account-based Compose file and smoke script are preserved as
`compose.legacy.yaml` and `scripts/smoke-legacy-container.mjs`.

```sh
docker compose up --build -d
node scripts/smoke-local-container.mjs http://localhost:8746
docker compose down
```

The smoke script checks the chosen origin, disabled hosted signing, built client
asset, HTML, CSP, SPA fallback, removed account/provider endpoints and malformed
quote rejection. It performs no wallet calls or economic actions. CI uses an
actual loopback published port instead of host networking, so a loopback-only
container listener cannot falsely pass.

## Local verification

`npm run check` passed: build plus 80 tests, with two optional service skips.
All 36 Chromium/mobile-Chromium/WebKit browser cases passed. Formatting,
`git diff --check` and `docker compose config --quiet` passed. Actual Docker
image `blunts-local:domain-20261028` built and served through a loopback-only
published port; the updated smoke script passed against that container.
Private logs are under `data/review-20261028/evm/release-target-*`.
The qualification container was removed after checking; image and logs remain.

## Release still pending

After separate shipping approval, prepare and review the exact-origin hosted
execution policy change, the HTTPS reverse proxy and DNS destination, then prove
the served revision, headers, public read paths and rollback on the actual host.
Changing APP_ORIGIN alone never activates signing. Preserve the previous image
and configuration for rollback; disable hosted execution in source and restore
the previous image if identity, quote, fee or recovery behavior differs from the
qualified version. Personal mainnet financial acceptance remains a holder action;
the local fork receipt does not establish eligibility or a personal live trade.

## Domain shortlist checked in Cloudflare

Actual signed-in Registrar search on October 28 showed:

| Domain | Available | Displayed first year | Displayed renewal | Recommendation |
|---|---|---:|---:|---|
| getblunts.com | Yes | $10.46 | $10.46/year | Best match for the existing brand |
| rollmybag.com | Yes | $10.46 | $10.46/year | Stronger joke; short and memorable |
| puffpuffprofit.com | Yes | $10.46 | $10.46/year | Playful, but less suitable than the first two |
| puffolio.com | No | — | — | Nice pun, unavailable |

Cloudflare's Registrations notice separately announces that standard .com
registration, renewal and transfer pricing increases to **$11.17 on November 1,
2026**. Budget at least that amount for subsequent renewal; the search UI still
showed the old renewal figure. Final checkout/tax/availability can change. No
checkout, purchase, contact edit or auto-renew setting was submitted. The owner
plans to buy later; use the existing subdomain in the meantime.
