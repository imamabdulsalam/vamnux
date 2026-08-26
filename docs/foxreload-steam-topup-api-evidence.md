# FoxReload USD Steam Top-Up API Evidence

Source: https://foxreload.com/en/docs/api

Source contract verified on 2026-08-26:

- The public API uses `X-API-Key` authentication and accepts `X-Currency: usd` when creating a supplier order.
- `POST /api/orders/` creates an order with a supplier product `itemId`, quantity, optional `totalPrice`, optional fulfillment `note`, and an `idempotencyKey`.
- The official Steam Top-Up example requires the target Steam account in `note.login`; quantity is the top-up amount.
- The order creation response is not treated as fulfillment. Status must be checked at `GET /api/orders/{order_id}` before any retry, to avoid a duplicate purchase.
- FoxReload documents supplier payment separately at `POST /api/orders/{order_id}/pay`; VAMNUX will not call it for the wallet-funded design unless the owner separately approves a specific real supplier payment.

Verified current source record, obtained through a read-only authorized API request:

- FoxReload product ID: `product_01kjp6vtmjf8rbbxw88719wz3b`
- Source name: `$1 Steam top up`
- Source currency: USD
- Current source price: 0.9549 USD
- Required note field: `login`
- Quantity range: 1 through 300
- Region attribute: WW

No supplier order, supplier payment, wallet debit, or customer charge was submitted during verification.
