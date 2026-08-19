# VAMNUX Provider Research Notes

## G2A Export API v2

G2A Export API v2 is intended for programmatic product discovery, order creation, and product-key retrieval. It requires a verified G2A account, an automated payment method configured in the G2A account, and OAuth2 `client_id` / `client_secret` credentials. The server must obtain short-lived bearer tokens using the client-credentials flow and must never expose those credentials or tokens to the browser. [1] [2]

The catalog adapter should refresh product offers through `GET /export/v1/product-offers`, enrich selected products through `GET /export/v1/products`, and preserve supplier product ID, offer ID, EUR price, availability, region, platform, and last update time. Each G2A order must contain only one item, must use `currency: EUR`, and must send a unique UUID `Idempotency-Key`. G2A excludes in-game top-ups, balance top-ups, accounts, eSIMs, and G2A Plus subscriptions from API checkout; VAMNUX must not list those G2A items as wallet-purchasable. [2] [3]

After VAMNUX has settled its customer wallet debit, the server may create a G2A order. It should poll `GET /export/v1/orders/{orderId}/keys` server-side and securely present delivered keys only to the entitled purchaser. Keys may be unavailable while G2A payment is pending and are available through the endpoint only for 48 hours. [4]

## Korapay

Korapay’s public developer portal is available at its official documentation URL, but its browser-rendered collection did not expose endpoint details during this review. VAMNUX will therefore require the user’s Korapay dashboard/API documentation access before adding endpoint-specific funding code. The provider-neutral wallet-funding design will keep this future adapter isolated from Paystack and a later crypto processor. [5]

## Paystack

Paystack’s supported flow starts on the server: VAMNUX initializes a transaction server-side, returns only the resulting checkout access code to the browser, and does not expose the Paystack secret key in frontend code. A wallet funding attempt is settled only after the server confirms the expected amount and status through Paystack verification or a validated webhook event. [6]

Paystack webhook events include an `x-paystack-signature` header containing an HMAC SHA512 signature of the event payload made with the provider secret key. VAMNUX must validate this signature before crediting a wallet and must treat a duplicate provider event as idempotent. Paystack also publishes webhook-source IP addresses that may be used as an additional network control. [7]

## References

[1]: https://www.g2a.com/integration-api/documentation/export-v2/onboarding
[2]: https://www.g2a.com/integration-api/documentation/export-v2/getting-started
[3]: https://www.g2a.com/integration-api/documentation/export-v2/api/orders/create-order
[4]: https://www.g2a.com/integration-api/documentation/export-v2/api/orders/get-order-keys
[5]: https://docs.korapay.com/
[6]: https://paystack.com/docs/payments/accept-payments/
[7]: https://paystack.com/docs/payments/webhooks/
