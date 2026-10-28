# Blunts

Wallet-first local preview: normal EVM wallet + Robinhood Chain QQQ tokens, using
Shaw's original 3D tray and Fill/Spark design. No email signup or brokerage API keys
are required by the active preview. **Transactions are disabled; no funds move.**

```sh
npm ci
npm run build
npm start
# http://localhost:8745
```

Connect an injected EVM wallet to read its QQQ/USDG balances. Fill previews a
USDG → QQQ swap; Spark previews QQQ → USDG. Public issuer and chain data supply
quotes and valuations. No simulated $500 balance is added to a connected wallet.
No seed phrase, private key, wallet approval or signature is requested.

The quote path reads direct Uniswap pools. It does not submit swaps or withdraw
dollars to a bank. Robinhood Stock Tokens carry issuer/jurisdiction restrictions,
including exclusion of US persons; wallet connection is not eligibility approval.

See [implementation, verified contracts and remaining work](docs/evm-robinhood.md)
and [resume notes](docs/resume.md).

## Verification

```sh
npm run check
npm run test:e2e
npm run format:check
```

Browser tests use disposable wallet/RPC fixtures. Real issuer/public-chain quote
receipts are recorded separately. Fixture checks are not executed-trade proof.

## Preserved provider version

The Dinari/MoonPay/Cloud version remains at commit `e89c958` on local branch
`codex/local-review-20261027`. This branch is `codex/evm-robinhood-local`.
Existing databases, private keys and review evidence remain untouched under
Git-ignored `data/`. The new server does not load them.

For a source-level legacy review on this branch, `npm run start:legacy` runs the
old backend and redirects `/` to `/legacy`. Its configuration is documented in
the historical portion of the resume notes. It is a simulated-money system.
Stop running services before switching source branches or opening the same
embedded database from a second process. Never reset/clean data to switch versions.

Nothing is pushed, deployed, publicly published or authorized to move real money.
