# VAMNUX Rebrand Tasks

- [x] Replace NaijaPlay branding, page metadata, and visible wordmark text with VAMNUX.
- [x] Update the homepage positioning to “Digital Products. Instantly Delivered.” and use the expanded marketplace language.
- [x] Refine navigation and category labels to reflect the VAMNUX product marketplace without overstating unavailable features.
- [x] Preserve the current five-product catalog, search, filters, and local cart preview while improving product-delivery wording.
- [x] Rebuild, visually verify desktop/mobile presentation, and checkpoint the VAMNUX revision.

# Global Marketplace Redesign Tasks

- [x] Replace the image-led hero with a simple marketplace header and a rotating technology-led colour banner.
- [x] Create a wide search control, global utility controls, and category navigation inspired by the supplied reference structure without copying its branding or content.
- [x] Add a USD-first currency selector with manually selectable USD, EUR, GBP, and NGN display formats.
- [x] Update catalog price labels and trust messaging for an international customer base.
- [x] Rebuild, validate desktop and mobile layouts, and checkpoint the global marketplace revision.

# Hero Copy Revision

- [x] Replace only the three rotating hero slide messages with the approved Gaming, Gift Cards, and Digital Services copy.
- [x] Verify the revised slide copy and checkpoint the update.

# Marketplace Enhancement Review

- [x] Confirm the first approved enhancement set from the recommended homepage, product, and account features.
- [x] Identify whether the project should remain a storefront prototype or be upgraded for live accounts, order tracking, wallet balances, and supplier-backed data.

# Live Marketplace Foundation

- [x] Upgrade VAMNUX for account management, database-backed marketplace data, and protected server logic.
- [x] Define the product, order, wallet, and supplier-integration data boundaries.
- [ ] Complete the remaining end-to-end supplier order and wallet-settlement workflow only after payment setup and a deliberately selected test order are approved.
- [x] Provide authenticated customer account summaries with protected order history and zero-balance wallet readiness.
- [x] Provide a supplier-backed catalog with loading, empty, and error states.
- [x] Provide authenticated draft-order creation from database-backed products with server-side supplier-field validation.
- [x] Document supplier and payment-provider requirements before connecting live commerce services.
- [x] Add a supplier settings/configuration model and protected admin procedures that store connection references and sync status without exposing provider secrets.
- [x] Replace the hardcoded storefront catalog with `trpc.marketplace.catalog` data plus loading, empty, and error states.
- [x] Connect authenticated cart checkout to the protected draft-order procedure using only database-backed product records.
- [x] Keep wallet funding and wallet payment actions disabled until an approved payment provider is connected; expose real zero-balance and activity states only.

# G2A Supplier & Wallet-First Commerce

- [x] Review G2A Export API v2 documentation and capture only the endpoints, authentication method, and fulfilment rules needed for VAMNUX.
- [x] Extend marketplace records for multiple supplier adapters, wallet funding attempts, payment webhook references, and wallet-paid order settlement.
- [x] Park the G2A supplier adapter pending any future decision to reactivate it.
- [x] Keep Korapay, Paystack, crypto funding, wallet settlement, and wallet purchases inactive until payment setup resumes.

# FlashTopUp Supplier Pivot

- [x] Review FlashTopUp reseller API documentation and product taxonomy for authorised catalog, top-up, and fulfilment behavior.
- [x] Map FlashTopUp products into Gift Cards, Subscriptions, and Gaming Top-Ups, including player-ID and server requirements.
- [x] Update the supplier adapter contract to support FlashTopUp now and additional providers later without exposing credentials.
- [x] Configure and validate the confirmed FlashTopUp reseller base URL: `https://api.flashtopup.com/api/reseller/v2`.
- [x] Resolve the current HTTP 403 on authenticated `GET /profile` by confirming the outbound request canonicalisation and FlashTopUp reseller IP-access policy.
- [ ] Confirm the fixed outbound IP used by the deployed VAMNUX supplier service and allowlist that address in FlashTopUp; do not assume the reseller portal’s displayed client IP is the application egress IP.
- [x] Store the verified FlashTopUp API ID and HMAC-SHA256 signing secret using server-only project secrets.
- [x] Sign FlashTopUp requests with method, path, timestamp, nonce, and SHA-256 body hash as specified by the reseller portal.
- [x] Use the full `/api/reseller/v2/...` canonical endpoint path rather than a relative path in FlashTopUp HMAC signatures.
- [x] Use a newline-delimited `METHOD`, `PATH`, `TIMESTAMP`, `NONCE`, and SHA-256 body-hash canonical string for outgoing FlashTopUp HMAC-SHA256 signatures.
- [x] Confirm the website host returns an HTML 404 while the `api.flashtopup.com` subdomain serves API JSON for the reseller v2 base.
- [x] Keep the FlashTopUp client on `https://api.flashtopup.com/api/reseller/v2` and verify access after supplier-side allowlisting/signature confirmation.
- [x] Implement server-side FlashTopUp profile, balance, products, services, order, order-status, and check-ID operations using the documented v2 paths.
- [x] Live-validate the safe read operations (profile, balance, products, and services); defer check-ID, sandbox order, and order-status until a deliberately selected supplier test case is available.
- [x] Verify and deduplicate FlashTopUp order-update webhooks using their raw-body HMAC signature, five-minute timestamp window, and event ID.
- [x] Connect the VAMNUX catalog to verified FlashTopUp product records while checkout and wallet funding stay disabled.
- [x] Allow an authenticated VAMNUX admin to run a read-only FlashTopUp catalog sync; do not sync automatically or create any supplier order.
- [ ] Sync and verify at least one real Gaming Top-Up, Gift Card, and Subscription service, then validate all three public category filters.

# FlashTopUp Integration Stabilization

- [x] Clear the stale development module-cache error observed after FlashTopUp integration edits and verify a fresh server start completes without a current error.
- [x] Verify the FlashTopUp catalog sync runner and database upsert path complete without server errors.
- [ ] Validate supplier order-status processing only after a deliberately selected sandbox or production supplier order is available; do not create an order for testing without explicit approval.
- [x] Remove unsafe or incomplete integration paths and retain only validated server-side supplier operations.
- [x] Validate the bounded FlashTopUp synchronization with page inputs, per-product error isolation, and resumable next-page state.
- [x] Remove the obsolete unbounded `scripts/sync-flashtopup.mjs` runner.

# Sandbox Order & Inventory Expansion

- [x] Replace generic or placeholder storefront product presentation with supplier-recognised FlashTopUp names and authorised product image URLs, without inventing catalog records.
- [x] Audit and correct every visible synchronised product card so its official supplier-recognised artwork and full product name display clearly across desktop and mobile.
- [ ] Implement and live-validate the documented FlashTopUp sandbox order request with `X-FT-Sandbox: true`, a unique reference, and no VAMNUX wallet or payment action.
- [x] Add the supplier-reported sandbox egress address `37.238.4.82` to the FlashTopUp allowlist before retrying the isolated test order.
- [ ] Resolve the temporary FlashTopUp sandbox egress instability: the latest authorised retry was blocked at `37.236.120.151` after the prior address changed.
- [x] Defer further sandbox-order retries in the current dynamic-egress environment: the final authorised retry was blocked at `40.67.160.176`.
- [x] Make all FlashTopUp network-validation tests explicitly opt-in so the default unit suite stays deterministic and never depends on a temporary IP allowlist.
- [x] Defer the fixed-IP production supplier adapter; use temporary supplier allowlisting only for the current sandbox validation.
- [ ] Validate sandbox order creation and safe order-status retrieval without creating a live supplier fulfilment request.
- [ ] Revisit live FlashTopUp sandbox and order-status validation only when a stable, supplier-allowlist-capable egress route is approved.
- [x] Add admin-managed catalog records without fabricating inventory, prices, or delivery claims.
- [x] Implement structured authorised-source management for manual catalog items and link each item to a configured supplier or direct-agreement record.
- [x] Link supplier-type authorised sources to an actual configured supplier integration instead of accepting a free-text supplier label.
- [x] Add an explicit load failure and retry experience for the admin-managed catalog instead of treating errors as an empty catalog.
- [x] Complete the admin-only catalog-management interface for authorised Gift Card and Subscription products from approved suppliers or direct commercial agreements.
- [x] Defer Gift Card and Subscription source registration; keep the marketplace limited to currently synchronised Gaming Top-Up services.
- [x] Align public VAMNUX navigation, category shortcuts, and catalog filters with the active Gaming Top-Up-only inventory scope.
- [ ] Connect and approve an additional supplier before adding new Gift Card or Subscription sources or products.
