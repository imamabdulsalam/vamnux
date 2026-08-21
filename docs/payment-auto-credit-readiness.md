# VAMNUX Verified Wallet Auto-Credit Readiness

Automatic wallet credit is **not active** in the current release. A customer statement that payment was sent is never enough to credit a wallet. Before activation, VAMNUX must receive a provider event at a public HTTPS endpoint, validate the provider signature, verify the transaction server-side, match amount and currency to the intended funding attempt, and create the immutable wallet ledger credit only once.

## Official provider evidence

| Provider | Verified event mechanism | Required VAMNUX safeguards |
|---|---|---|
| Paystack | `charge.success` webhook with `x-paystack-signature` HMAC-SHA512; Paystack also provides a server-side transaction verification endpoint. | Validate the HMAC over the event payload, verify the transaction by reference, compare the paid amount/currency/reference to the funding attempt, and reject duplicate references or event IDs before ledger credit. |
| Korapay | `charge.success` webhook with `x-korapay-signature` HMAC-SHA256 over the documented `data` object; the transaction reference can be queried. | Validate the signature using the live secret only on the server, query/verify the transaction, compare amount/currency/reference, and rely on the unique provider event/reference and wallet-ledger safeguards before credit. |

> Both providers document webhook retry behavior, so an idempotent funding record and a unique ledger reference are mandatory. VAMNUX already preserves those records and must not change a wallet balance before provider verification succeeds.

## Current requirements before activation

1. Select **one** provider for the first live release: Paystack or Korapay.
2. Configure the verified sender account, live secret key, and webhook signature secret through secure project settings; never expose these values to browser code, logs, CSV exports, or Admin forms.
3. Register the final public VAMNUX HTTPS webhook URL in the selected provider dashboard.
4. Complete test-mode and live-mode verification using real provider event payloads, including duplicate event/retry tests.
5. Activate checkout initialization and automatic settlement together only after all tests pass.

## Sources

- [Paystack Webhooks](https://paystack.com/docs/payments/webhooks/)
- [Paystack Verify Payments](https://paystack.com/docs/payments/verify-payments/)
- [Korapay Webhooks](https://developers.korapay.com/docs/webhooks)
- [Korapay API Documentation](https://docs.korapay.com/)
