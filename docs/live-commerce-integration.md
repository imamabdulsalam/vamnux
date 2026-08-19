# VAMNUX Live Commerce Integration Requirements

VAMNUX now has protected account sessions, a database schema for catalog products, orders, wallets, and a supplier/payment integration registry. The registry stores **configuration references and status only**. API keys, payment secret keys, and webhook signing secrets must be supplied through the project’s secure environment configuration and must never be stored in the browser, catalog records, or source repository.

## Supplier Connection

The authorised supplier must provide a documented API or authenticated dashboard export for the products VAMNUX is permitted to sell. Before activating a supplier, capture its provider name, API base URL, credential reference, product/price sync method, purchase endpoint, delivery-status endpoint or webhook, fulfilment time expectations, allowed territories, and retry/idempotency rules. Each product must state its redeemable region, delivery type, whether it requires a player ID, and the exact customer fields required for fulfilment.

| Required item | Why VAMNUX needs it |
|---|---|
| Supplier/provider name | Identifies the commercial source for catalog and fulfilment records. |
| API base URL and API documentation | Defines the supported product, order, and status operations. |
| Secure credential reference | Connects the server-side integration without exposing an API key. |
| Catalogue and pricing contract | Keeps product availability, region rules, denominations, and USD base price current. |
| Order/fulfilment contract | Establishes purchase submission, idempotency, delivery status, and error handling. |
| Webhook verification method | Lets VAMNUX verify supplier delivery events before marking an order delivered. |

## Payment Connection

VAMNUX should use one payment provider that is licensed and available for the markets it will serve. The provider must support the intended customer currencies and supply an authenticated server-side checkout API plus signed webhook events. The payment lifecycle must remain separate from the supplier lifecycle: a customer order remains a draft until a verified payment webhook confirms payment, and fulfilment starts only after that confirmation.

| Required item | Why VAMNUX needs it |
|---|---|
| Payment provider name | Determines the checkout and compliance flow. |
| Secret key and public key | Supports secure server checkout creation and client payment initiation, respectively. |
| Webhook signing secret | Verifies payment completion, refund, and dispute events. |
| Supported countries and currencies | Determines which customer currency and payment methods can be shown at checkout. |
| Checkout/session API documentation | Defines how a pending VAMNUX order becomes a provider payment session. |
| Refund and dispute policy | Defines how paid orders and wallet entries are reversed safely. |

## Operational Safeguards

All order creation must use database-backed, supplier-approved product records. The server—not the browser—must calculate final order amounts from the current active catalog, create an idempotent VAMNUX order code, validate payment webhooks, and submit supplier fulfilment. Wallet balances remain at zero and wallet funding/payment controls remain unavailable until the payment provider is connected and the ledger workflow is activated. No sample transactions, simulated wallet balances, fake reviews, or invented delivery statuses are used.
