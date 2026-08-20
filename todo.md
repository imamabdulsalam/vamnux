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
- [x] When an authorised supplier synchronises Free Fire or PUBG Mobile, verify its service-level eligibility and mapped official artwork before it becomes purchasable.
- [x] Add deterministic mapping coverage for Free Fire and PUBG Mobile official supplier artwork ahead of future catalog synchronisation.
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
- [x] Restore full VAMNUX marketplace navigation and browsing for Gaming, Gift Cards, Subscriptions, Software, and AI tools while clearly marking unsupported categories as awaiting suppliers.
- [x] Diagnose and correct missing FlashTopUp game-search results for catalog services such as Free Fire and PUBG Mobile without fabricating purchasable inventory.
- [x] Add deterministic tests ensuring supplier-discovery search matches are clearly awaiting synchronisation rather than purchasable VAMNUX inventory.
- [x] Replace repeated-product card presentation with an accurate supplier-synchronised catalog view and an honest unavailable-category discovery state.
- [x] Group synchronised service denominations beneath one official game-family presentation instead of repeating identical artwork on every service card.
- [x] Add deterministic unit coverage for grouping synchronised supplier denominations under one game family.
- [x] Replace expanded family denomination grids with compact, clickable supplier-backed game-family listings.
- [x] Add a dedicated VAMNUX game-family detail route showing only the selected family’s real services, prices, requirements, and add-to-cart controls.
- [x] Add deterministic route coverage for encoded game-family detail paths and unsupported family handling.
- [x] Add a prominent keyword search control that filters compact live game-family listings by real family and service names.
- [x] Add a clear no-match state and deterministic coverage for compact catalog keyword search behavior.
- [x] Audit the synchronised FlashTopUp game families and their regional metadata for Nigeria-priority storefront visibility.
- [x] Curate the primary VAMNUX catalog toward Nigerian/global-usable supplier services without deleting authentic records or rebuilding the marketplace.
- [x] Preserve an explicit international catalog view for later expansion beyond Nigeria-priority products.
- [x] Add deterministic coverage for Nigeria-priority family selection and international-view fallback without asserting supplier eligibility.
- [x] Remove all customer-facing Nigeria-labelled catalog headings, helper text, and controls while retaining the curated default service selection.
- [x] Rename the broader supplier-catalog control with neutral premium marketplace language.
- [x] Review the official FoxReload API documentation and authentication requirements for a secure VAMNUX supplier adapter.
- [x] Add FoxReload as a configured multi-supplier integration with server-side credentials only.
- [x] Implement FoxReload mapper support for VAMNUX Gaming Top-Ups, Gift Cards, Subscriptions, Software, AI Tools, and game keys without inventing inventory.
- [x] Implement and validate bounded FoxReload catalog synchronization with payments, wallet debits, and supplier orders disabled.
- [x] Add deterministic FoxReload mapper tests for category assignment, stock eligibility, supplier price, and required customer fields.
- [x] Add an admin-only bounded FoxReload catalog sync control with clear read-only and no-order safeguards.
- [x] Exclude FoxReload test-order data and target supplier categories that report live stock even when the has-products flag is stale.
- [x] Diagnose the supplier-reported Gift Card and Subscription stock counts when their initial bounded product reads return no products.
- [x] Check the documented FoxReload product-search endpoint for account-exposed Gift Card, Subscription, and Software records before representing them as available inventory.
- [x] Import only a bounded, deduplicated set of account-exposed FoxReload search results for verified digital product families; do not represent empty category endpoints as inventory.
- [x] Present active FoxReload non-top-up listings through category-aware cards and individual product details rather than game-family pages.
- [x] Verify that FoxReload exposes real active Gaming Top-Ups but no active eligible Software or AI Tool records in the authenticated supplier searches; import only the returned top-ups and keep unavailable categories explicit.
- [x] Validate category-aware storefront and detail presentation against the actually active FoxReload Gaming Top-Up, Gift Card, Subscription, and game-key categories.
- [x] Decode common HTML entities from FoxReload supplier descriptions before displaying real product information.
- [x] Attempt the user-authorised read-only FlashTopUp catalog synchronisation after temporarily allowlisting `197.42.21.111`; no data was imported because egress shifted before the request.
- [x] Recover temporary catalog access after `197.63.115.110` was allowlisted and verify the authenticated read can return real supplier products.
- [x] Run the user-authorised final read-only bounded catalog synchronisation after allowlisting `197.63.115.110`, importing pages 2–4 successfully.
- [x] Continue bounded read-only FlashTopUp catalog synchronisation through pages 5–7 while temporary allowlisted access remained available.
- [ ] Resume remaining FlashTopUp catalog pages only after addressing the new dynamic egress block at `188.2.150.193`.
- [x] Run the user-authorised additional bounded catalog-page attempt after allowlisting `188.2.150.193`, expanding the active catalog to 31 real game families and 486 services.
- [x] Connect and approve an additional supplier before adding new Gift Card or Subscription sources or products.
- [x] Replace the oversized mixed catalog lists with a compact, search-first product browsing layout inspired by the supplied navigation-density reference without copying its branding or content.
- [x] Add a professional hover/click category mega-menu that surfaces only real synchronised VAMNUX product families and keeps unavailable categories explicit.
- [x] Present real supplier listings in dense, readable product cards with clear name, category, region, price, and guarded add-to-cart actions.
- [x] Preserve header and catalog keyword search, category filters, currency switching, and draft-only cart behaviour through the compact redesign.
- [x] Validate desktop and mobile search, category navigation, product details, and guarded add-to-cart actions for the compact catalog experience.
- [x] Verify compact catalog search with a positive synchronized-product match and an explicit no-match result, plus responsive mobile presentation.
- [x] Verify the new category mega-menu exposes real synchronised quick links through hover/focus/click behavior and retains an explicit unavailable state.
- [x] Re-verify product-detail navigation and guarded add-to-cart behavior from a compact catalog product; the cart confirms it is a saved selection only and no supplier order is sent.
- [x] Exclude generic unnamed and adult-oriented FoxReload records from the public compact catalog so visible listings remain professional and identifiable.
- [x] Correct FoxReload category classification for recognizable game-key records so compact category menus and cards reflect their real product type.
- [x] Validate the category mega-menu end to end: select a real quick link and confirm the catalog filters to synchronised listings, while confirming the explicit unavailable-category state.
- [x] Click a compact catalog card or Details action to reach a real product detail route, then re-verify its saved-selection-only add-to-cart behavior.
