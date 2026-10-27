# Provider sandbox acceptance — October 27, 2026

Dinari and MoonPay remain the engineering candidates already named in Shaw's
repository. They are not enabled Blunts integrations. Keep Cloud/Steward for
identity and wallets. Do not reinterpret Cloud service credits as investment
funding or introduce another network to manufacture a passing financial cycle.

## A newly verified sandbox mismatch

[MoonPay's public sandbox guide](https://dev.moonpay.com/widget/sandbox-testing)
describes ERC-20 sandbox delivery as MoonPayToken on Sepolia, with a reduced
test delivery amount. It does not establish native-USDC delivery on Arbitrum.
Its currently documented widget host selects test mode through a test API key.
An old `buy-sandbox` host assumption alone is not sufficient environment proof.

The pinned Dinari SDK 0.15.0 exposes `accounts.mintSandboxTokens` and describes
its payment asset as mockUSD. `qualifyDinariSandbox` checks for a QQQ mapping on
Arbitrum Sepolia, but this does not make MoonPay's sandbox token compatible.

Therefore a successful MoonPay checkout and a successful Dinari sandbox order
would be two separate pieces of evidence. They must not be reported as one
end-to-end native-USDC/Arbitrum funding route. No provider has confirmed an
alternative private sandbox arrangement for this project.

## Evidence required before connecting the two legs

| Boundary | Required authoritative result | Current evidence |
|---|---|---|
| Partner access | Enabled Dinari sandbox organization, permitted instrument and customer program | SDK transport tests only; no project credentials supplied |
| Customer | Provider-enrolled customer/account and accepted disclosures, bound to the correct Cloud identity and wallet | Cloud/Steward identity works; no brokerage customer mapping |
| Funding | Partner-enabled asset, token address, chain, limits and settlement behavior | Public widget docs; exact target route unverified |
| Orders | Provider quote/confirmation, stable order identifier and authoritative fills | Not implemented against an enabled account |
| Payout | Provider-confirmed withdrawal destination, delivered amount and final state | Demo payout only |
| Reconciliation | Ledger agrees with the provider and chain after duplicates, returns and interrupted submissions | Local simulator checks only |

The existing `providers:check` command makes read-only Dinari sandbox calls
when configured. Its `sandbox_reads_verified` result intentionally does not
approve a customer, enable trading, establish the funding route or permit live
money. Without keys it makes no requests and exits 2.

## Implementation constraints from current provider docs

[MoonPay's URL signing contract](https://dev.moonpay.com/widget/on-ramp/customization/url-signing)
uses a server-side HMAC over the serialized query. Construct the query on the
server from the authenticated owner's confirmed wallet; do not sign arbitrary
client-supplied URLs or destinations. A signature protects parameters, not
settlement. Never credit funds from a widget-close event or callback URL alone.

[MoonPay's parameter reference](https://dev.moonpay.com/widget/on-ramp/customization/parameters)
distinguishes a fixed `currencyCode` from a changeable default selection. Use
the partner-enabled fixed currency/network and verify its asset identity. The
documented fiat amount parameter is an integer; establish supported precision
instead of silently rounding a customer's selected amount.

[Dinari's US requirements](https://docs.dinari.com/docs/us) require its partner
program, API v2, account onboarding, approved UI and customer confirmations.
Using a wallet signer is not evidence that those requirements are satisfied.

## Next external setup step

The owner must establish the relevant partner accounts at
[Dinari Partners](https://partners.dinari.com/) and
[MoonPay Dashboard](https://dashboard.moonpay.com/), or provide an already enabled
equivalent service. Do not create a financial account or accept partner terms
on the owner's behalf from this task. Provider eligibility and commercial terms
must be reviewed by their owner. Store issued credentials in the selected secret
manager, never in chat or Git. No keys, accounts, trades, checkout sessions or
provider agreements were created during this inspection.

After that access exists, qualify the sandbox and implement each actual account,
quote, funding, order, settlement and withdrawal transition using the provider's
enabled contract. The standalone simulator cannot safely be converted into a
remote provider by replacing its database observation with an HTTP call.
