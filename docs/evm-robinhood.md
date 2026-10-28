# Wallet-first Blunts — local implementation

The owner's October 28 direction replaces the provider-first app with a normal
EVM wallet and Robinhood Chain stock tokens. The previous implementation is
preserved at `e89c958` on `codex/local-review-20261027`. Existing data and secrets
are untouched. New work stays local on `codex/evm-robinhood-local`.

## Current experience

The same original tray, brown/gold palette, fonts and Fill/Spark controls now
open a wallet-first preview. There is no email signup, Cloud session or brokerage
API key on this path. EIP-6963 wallet discovery and the injected EIP-1193 fallback
request only the public address on explicit Connect. Account/chain changes clear
old balances. Wrong-chain wallets can request switching to chain 4663. No wallet
signature, approval or transaction submission is requested.

Fill previews USDG → the canonical Robinhood QQQ token; Spark previews the reverse.
This returns stablecoin to a wallet, not dollars to a bank. USDG is selected because
its actual direct QQQ pools were verified; an arbitrary USDC pair is not assumed.
Amounts preserve USDG's six decimals and the stock token's 18 decimals.

The server provides bounded, cached public issuer metadata and QQQ bid/ask reads.
It pins chain and canonical token addresses, verifies the registry/deployment,
rejects stale price data and uses the published corporate-action multiplier when
valuing holdings. A missing balance remains unavailable, not a made-up demo value.
The same multiplier must not be applied again if switching to adjusted on-chain
Chainlink prices in future.

Quote reads compare Uniswap v3 fee tiers 500 and 3000 at one block, using official
factory/quoter addresses. Quotes show output, 0.5% slippage floor, pool fee, expiry
and block. This is a limited direct-pool route, not a general multihop aggregator.
No Blunts fee is charged by this read-only preview; the old proposed 1% conversion
business model has not been implemented on-chain or represented as accepted.

## Actual public-chain proof

On October 28, public RPC returned chain 4663 and the issuer API returned active
QQQ at `0xD5f3879160bc7c32ebb4dC785F8a4F505888de68`. USDG at
`0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` returned six decimals.

Factory reads found QQQ/USDG pools at fees 100, 500 and 3000. The 100 pool had
zero liquidity; 500 and 3000 had nonzero liquidity. At block 99969079, a read-only
quoter simulation returned 0.034482909486826954 QQQ for 25 USDG, and
24.974799 USDG for selling that quoted QQQ amount. Those are timestamped
simulation results, not executed trades, balances, profit or future guaranteed
quotes. No account was funded and no approval/signature/transaction was sent.
The actual UI also displayed a fresh live Fill quote.

Wallet lifecycle/browser checks use a disposable injected fixture and mocked RPC;
these prove UI behavior only. They passed desktop Chromium, mobile Chromium and
WebKit. They never touch the owner's wallet. Real RPC/issuer checks above are
separate evidence. Ignored receipts live under `data/review-20261028/evm/`.

## Run and test

```sh
npm run build
npm start
# http://localhost:8745
npm run test:e2e
npm test
npm run format:check
```

`npm run start:legacy` and `npm run test:e2e:legacy` retain the old simulation
backend/UI. Do not run the old provider API/CLI concurrently on its PGlite journal.
`npm run test:local-services` still uses isolated local Steward and synthetic keys.

## Remaining work

Transaction construction, exact finite approvals, user wallet signing, preflight,
receipt/reorg recovery, slippage/price-impact protection, chain balance refresh,
and an approved test execution cycle are unfinished. WalletConnect/mobile external
wallet continuation is also unfinished; this preview supports injected wallets.
No actual native builds were rebuilt for this pivot. No bank/card funding,
withdrawal, bridge, custom token, fee contract or pooled wallet was introduced.

Transactions are disabled in code and UI. Publishing and real-money actions need
owner approval. Do not label the preview a complete trading app.

Robinhood's token eligibility restrictions still apply, including exclusion of US
persons. Tokens are issuer debt securities providing economic exposure rather
than direct legal/beneficial ownership in underlying QQQ shares. A permissionless
chain and an injected wallet do not erase the issuer's restrictions.

## Primary sources

- https://docs.robinhood.com/chain/stock-tokens/
- https://docs.robinhood.com/chain/building-with-stock-tokens/
- https://docs.robinhood.com/chain/stock-token-apis/
- https://docs.robinhood.com/chain/contracts/
- https://raw.githubusercontent.com/Uniswap/contracts/main/deployments/4663.md

Rialto RFQ currently documents partner API keys. The verified direct Uniswap path
avoids depending on that keyed API; no claim is made that every on-chain venue is
keyless. This preview's small read-only server is a cache/proxy, not a custodian.

Final checkpoint validation: build passed; full backend suite 43 passed and one
optional PostgreSQL test skipped, including actual isolated Steward transport.
The new three-engine wallet preview checks passed again after the final frontend
change. One actual local Steward browser cycle also passed on the retained legacy
route. Formatter, TypeScript and Git whitespace checks passed. The new read-only
HTTP endpoints returned 200 for both directions. The preview remains on port 8745.
