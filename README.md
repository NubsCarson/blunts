# Blunts

Wallet-first local preview: normal EVM wallet + Robinhood Chain QQQ tokens, using
Shaw's original 3D tray and Fill/Spark design. No email signup or brokerage API keys
are required by the active preview. **The owner has approved local wallet signing.**
HTTP loopback web origins can request individual wallet approvals/swaps; no
transaction is sent automatically. Hosted and native origins remain disabled.
The wallet holder must be eligible for the issuer's tokens and personally approve
every real-funds request. Publishing/deployment remain unapproved.

```sh
npm ci
npm run build
npm start
# http://localhost:8745
```

Connect an injected EVM wallet to read its QQQ/USDG balances. Fill previews a
USDG → QQQ swap; Spark previews QQQ → USDG. Public issuer and chain data supply
quotes and valuations. No simulated $500 balance is added to a connected wallet.
Blunts never asks for a seed phrase or private key. Connection requests only the
public address. Wallet approval/signing requests occur only after a separate,
explicit step selection and eligibility acknowledgement.
**Review wallet steps** checks the live pool, balance and allowance before showing
finite approval and deadline-protected swap calldata. Opening the review is read-only.
On the approved local web origin, choose each wallet step separately. Declining
starts no next step; pending/unknown outcomes must be checked before another request.
Reviewed direction/amount are saved for that wallet in this browser. After reload,
reconnect, open Wallet and resume the review; a fresh quote is always required.
Quotes more than 5% below the adjusted reference output are rejected.
Wallet → Activity can track an existing compatible transaction, refresh its
receipt and export this browser's records. Inclusion is shown separately from
Ethereum finality. Wallet-step review also checks ETH fee readiness.

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

Nothing is pushed, deployed or publicly published. The owner approved local
signing controls; this agent has not used personal keys or executed a real trade.
Passing tests below use disposable fixtures and local forks.


## Mobile wallet entry

On a public HTTPS app, the no-wallet chooser offers MetaMask's mobile dapp-browser
handoff without a project/API key. Localhost instead explains why the phone cannot
reach this Mac. This does not establish installed-app connection or native pairing.
No public host was created. A future native build can explicitly set the public,
non-secret `VITE_PUBLIC_APP_ORIGIN`; `MOBILE_API_ORIGIN` still configures native
API transport during `mobile:sync`. Hosting, native builds and physical-device
wallet acceptance remain separate approval/verification steps.

Local wallet-first native development builds now pass for Android debug and
unsigned iOS Simulator. The [native build receipt and commands](docs/evm-robinhood.md#native-wallet-first-development-builds)
record exact source, endpoints and checksums. They use localhost, fail the release
check intentionally, and have not been installed or wallet-tested on a phone.
