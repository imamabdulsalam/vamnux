# VAMNUX User Dashboard Verification

**Completed:** 20 August 2026

The protected `/account` route now provides a customer-facing VAMNUX dashboard. It shows only the signed-in customer’s own profile preferences, wallet balance and ledger records, recent orders, and saved active products. Unauthenticated access presents the existing secure sign-in entry point; the dashboard data procedures are protected server-side.

The dashboard does not manufacture commerce data. Wallet funding, payments, refunds, and supplier fulfilment remain visibly inactive until an approved integration is connected. The new `saved_products` table is customer-scoped with a unique user/product constraint, and only active VAMNUX products can be saved. Customers can update their own display-currency and optional country-code preference.

Validation passed for TypeScript, 52 deterministic tests (with the five opt-in FlashTopUp tests skipped and one external FoxReload live-network test excluded after a connection timeout), plus the production build. Desktop account rendering was visually reviewed under an authenticated session. A real Steam product-detail route was also reviewed: it displays the private **Save** action next to the existing guarded cart action and does not introduce a supplier redirect.
