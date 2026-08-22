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
- [x] Keep FlashTopUp live validation and remaining pages paused; use the connected FoxReload catalog route as the current low-friction supplier path.
- [x] Audit and verify that supplier credentials, sync operations, failure states, and catalog persistence are isolated by supplier key so one provider cannot affect another.
- [x] Add deterministic coverage for supplier-key scoped catalog behavior and verify the isolated multi-supplier catalog in the UI.
- [x] Mark FlashTopUp synchronization as paused and enforce a server-side pause guard without changing FoxReload availability or catalog data.
- [x] Reflect the paused FlashTopUp state in the admin supplier controls while retaining the independent FoxReload sync control.
- [x] Audit active supplier listings with generic subscription durations, unclear game/top-up names, unhelpful metadata, or repeated generic imagery.
- [x] Normalize customer-facing labels from verified supplier data so subscriptions identify their service and term, while top-ups identify their game, denomination, requirements, and price.
- [x] Replace repeated generic product imagery with meaningful game-specific artwork when verified or neutral category visuals when no verified artwork is available.
- [x] Refine compact cards and product detail pages to prioritise recognizable service/game identity, denomination or duration, required customer fields, region, delivery type, and price.
- [x] Validate representative Free Fire, PUBG Mobile, subscription, and game-key listings for clear recognition, correct details, and responsive presentation.
- [x] Align FoxReload delivery labels with verified supplier text when a product description explicitly states a digital code, without guessing delivery format for other records.
- [x] Balance the compact top-up catalog so its first visible page surfaces one representative service from each recognised verified game family before additional denominations.
- [x] Replace the mixed denomination card wall with a compact browse-by-game/service catalog that opens a focused product-selection page.
- [x] Present each focused product page with real supplier-backed denomination options, required account fields, selected-price summary, and a cart-icon action rather than repeated text buttons.
- [x] Audit current supplier base-price distributions before applying any VAMNUX display-price markup or override.
- [x] Add protected admin controls for a default supplier-price markup and a per-product percentage or fixed-price override, with clear supplier cost versus customer display-price context.
- [x] Apply a user-controlled initial default markup within the requested 20–30% range only to customer-facing display prices, preserving supplier base prices and keeping supplier ordering inactive.
- [x] Validate desktop and mobile browse-to-detail navigation, price calculations, admin-only authorization, and guarded cart behavior.
- [x] Remove public FlashTopUp catalogue recognition links and ensure every customer-visible product/gaming journey remains within VAMNUX.
- [x] Replace the supplier-recognition gallery with internal VAMNUX browse cards that link only to active synchronized product/family routes or an honest unavailable state.
- [x] Audit the curated supplier inventory for clearly region-specific or unsuitable public listings and hide them from the primary VAMNUX storefront without deleting supplier records.
- [x] Preserve marked-up VAMNUX customer prices and verify no customer-facing price control, product card, or detail page exposes supplier links or base cost.
- [x] Validate desktop and mobile internal catalog navigation, curated visibility, price presentation, search, and saved-cart actions after removing supplier exits.
- [x] Review the GamesDrop Partner API documentation, authentication model, catalog endpoints, and seller-order safeguards.
- [x] Obtain GamesDrop server-only credentials and verify which products, including Steam and Telegram Stars, are exposed to the VAMNUX account.
- [x] Add GamesDrop as an isolated multi-supplier integration whose sync, credentials, failures, and catalog rows cannot affect FoxReload or FlashTopUp.
- [x] Map only verified GamesDrop catalog records to VAMNUX gaming top-ups, Steam, Telegram Stars, gift cards, subscriptions, software, and AI tools without inventing inventory.
- [x] Add internal VAMNUX category browsing for verified Steam and Telegram Stars offers, retaining the curated regional-suitability policy and no external supplier redirects.
- [x] Add deterministic GamesDrop mapper and supplier-isolation tests, validate the catalog, and keep payments, wallet settlement, supplier orders, and fulfilment inactive.
- [x] Verify FoxReload Telegram Stars and Steam Wallet searches, map verified offers to their dedicated categories, and retain only global/worldwide Steam stock in the primary public catalog.
- [x] Review the complete owner-provided VAMNUX Super Admin Panel brief and reconcile its requested modules with the current marketplace architecture.
- [x] Confirm the Super Admin authentication approach, 2FA policy, security-monitoring retention, and Phase 1 module scope before implementing new privileged capabilities.
- [x] Design the protected Super Admin route, owner-only authorization boundary, audit model, and role-ready data structures without exposing supplier or payment secrets.
- [x] Build the approved Super Admin dashboard and operations workspace using the existing secured VAMNUX backend and database.
- [x] Retain the editable 25% global VAMNUX markup and add clear Super Admin controls for changing global and per-product customer-price rules at any time.
- [x] Review the existing authenticated account area and replace it with a dedicated user-facing VAMNUX dashboard before Super Admin implementation resumes.
- [x] Build protected user-dashboard navigation for account overview, real order history, wallet activity, saved products, and account preferences without exposing another user’s data.
- [x] Use only real customer records and explicitly inactive states for wallet funding, payments, refunds, and supplier fulfilment; do not create simulated balances, orders, or delivery events.
- [x] Validate user-dashboard access, account isolation, real-data empty states, and retained storefront navigation before publishing; mobile styling is included and should be spot-checked by the owner during acceptance testing.
- [x] Implement protected `/admin/login` and `/admin/dashboard` routes backed by the existing owner-only server-side authorization guard, without adding custom passwords or secrets.
- [x] Add append-only Super Admin audit events for catalog pricing, catalog-status, and supplier sync actions, with safe target identifiers and no supplier/payment secrets.
- [x] Build a real-data Super Admin overview for active catalog, suppliers, customers, orders, wallet activity, and system readiness, rendering truthful zero/empty states.
- [x] Move protected customer-price controls into the Super Admin Pricing Engine and retain editable 25% global markup plus per-product percentage/fixed-price overrides with confirmation.
- [x] Add protected Supplier, Customers, Orders, System Health, and Audit Log workspace views with read-only or currently-approved safe actions only.
- [x] Validate owner-only access, audit wiring, pricing controls, responsive Admin navigation, and the unchanged customer storefront before publishing, without creating synthetic production actions.
- [x] Review existing wallet funding-attempt and immutable-ledger structures for a customer top-up request flow with no automatic credit.
- [x] Design customer-owned top-up request states and Super Admin review/settlement controls, including confirmation, idempotency, account isolation, and append-only audit records.
- [x] Add a User Dashboard wallet top-up request form that creates a real pending request only and clearly states that no payment has been collected or balance credited.
- [x] Add a Super Admin wallet-funding review workspace that can review, reject, or manually settle an approved verified request, without enabling payment gateways or supplier orders.
- [x] Validate wallet-request privacy, authorization, settlement safeguards, audit wiring, and inactive supplier fulfilment before publishing without creating a synthetic payment or wallet credit.
- [x] Define and document the VAMNUX wallet-only purchase policy: product checkout must never offer direct payment methods.
- [x] Prepare provider-confirmed funding boundaries for future Paystack, Korapay, and crypto wallet integrations, crediting balances only after verified provider confirmation.
- [x] Change product purchase eligibility so an authenticated customer needs sufficient settled VAMNUX wallet balance before an order can be created, while supplier ordering remains deferred.
- [x] Update customer and Admin interfaces to show the wallet-only purchase state and truthful zero-balance/top-up guidance without enabling provider checkout.
- [x] Validate wallet-only order gating, account isolation, insufficient-balance behavior, and inactive supplier fulfilment before publishing.
- [x] Review the full owner-provided VAMNUX authentication and feature-rich User Dashboard brief against the existing OAuth, customer dashboard, wallet-only purchase, and supplier safeguards.
- [x] Confirm the chosen identity provider, email delivery service, email-verification/reset policy, optional customer MFA, mandatory Super Admin MFA, and legal-policy content before building password-based authentication; Supabase and Resend activation remains intentionally deferred.
- [x] Design privacy-minimized account registration, username, profile, consent, referral, rewards, support, subscriptions, transaction, and secure order-detail data boundaries using real records only.
- [x] Add highly visible customer authentication entry points and approved secure account journeys without exposing whether an account email or username exists.
- [x] Expand the User Dashboard with approved real-data modules, responsive mobile navigation, and truthful unavailable states for orders, rewards, referrals, subscriptions, support, and provider-dependent capabilities.
- [x] Validate customer authorization, email/password and MFA controls if configured, account isolation, real-data states, wallet-only checkout, and protected digital-code access before publishing; credential-independent authorization is validated, while Supabase/Resend identity tests remain deferred.
- [x] Audit the existing VAMNUX authentication, database users, OAuth sessions, dashboard data, and current owner account before adding any parallel identity provider.
- [ ] Configure Supabase Auth as the new staged identity provider and Resend as transactional email infrastructure through secure environment configuration, retaining Manus OAuth as the working fallback.
- [x] Build a parallel VAMNUX account profile, username, country, phone, registration-source, consent, account-status, notification, support, security-event, and identity-link data model without losing existing users.
- [ ] Build staged Supabase email/password registration, email verification, generic-error login/reset, Google OAuth, secure session, logout-all, and optional customer MFA/TOTP flows without removing Manus OAuth.
- [ ] Enforce required Terms/Privacy acceptance and independently recorded optional marketing consent, then prepare editable clearly labelled draft Terms, Privacy, Refund, and Cookie policy pages.
- [ ] Expand the real-data Phase 1 customer dashboard for profile, security, notifications, support tickets, orders/order details, transactions, favorites, and wallet-only quick actions, preserving truthful empty states.
- [x] Connect appropriate customer identity, activity, wallet, order, and support views to Super Admin with server-side authorization and audit logging, never exposing passwords, secrets, or card data.
- [ ] Test registration, verification, login, password reset, Google, MFA, session invalidation, user migration, account isolation, and existing storefront continuity before any Manus OAuth retirement is proposed.
- [x] Document the deferred Supabase and Resend activation gate, preserve the existing Manus OAuth fallback, and complete only customer-account improvements that do not require external authentication or email credentials.
- [x] Add non-destructive profile metadata, consent records, security events, notification preferences, support tickets/messages, and editable policy-content records linked to existing Manus-authenticated users.
- [x] Record actual Manus OAuth sign-ins as customer security events without altering the active OAuth session mechanism or exposing precise location/device data.
- [x] Build protected customer profile, notifications, support-ticket, security-activity, and privacy/policy views with server-side account scoping and truthful empty states.
- [x] Add Super Admin read-only support and customer-account operational visibility without exposing authentication secrets, passwords, payment data, or private support content outside authorized workflows.
- [x] Add draft Terms, Privacy, Refund, and Cookie policy pages with a clearly visible draft/review status and registration-ready links, not representations of legal approval.
- [x] Correct any customer-facing catalog image render path that can emit an empty `src` attribute, preserving readable text or icon fallbacks for products without supplier artwork.
- [x] Add a protected customer order-detail view for immutable product, price, status, and safe delivery information, scoped to the authenticated order owner and excluding supplier credentials or secret fulfilment fields.
- [x] Reconcile the full owner-provided Super Admin master brief with existing VAMNUX Super Admin modules, data, integrations, and explicit commerce safety gates.
- [x] Extend the Super Admin information architecture for products, categories, suppliers, pricing, exchange rates, customers, wallets, payments, refunds, finance, promotions, referrals, loyalty, resellers, analytics, notifications, content, system health, audit logs, and settings.
- [x] Build additive, real-data operational models for the approved Admin-only modules without fabricating business activity or exposing credentials, digital codes, payment data, or private environment variables.
- [x] Implement secure owner-only controls, confirmations, audit events, truthful zero states, and safe deferred states for every approved Super Admin action.
- [x] Validate all expanded Super Admin modules against owner-only server authorization, account isolation, wallet-only purchasing, inactive provider checkout, and inactive supplier fulfilment before publishing.
- [x] Add owner-only redacted webhook monitoring, truthful manual job/sync history, and non-accusatory risk/manual-review empty states without inventing operational events or enabling scheduled supplier automation.
- [x] Add safe, authorized Admin CSV export of existing non-secret records and real date-window analytics aggregates without exposing credentials, payment details, fulfilment payloads, or customer data beyond the owner-only workspace.
- [x] Add date-window paid-order revenue and units by product/category, explicitly reporting per-line profit as unavailable until supplier cost is persisted at item level.
- [x] Preserve Manus OAuth as the only active VAMNUX identity path and leave Supabase, email/password, password reset, Google OAuth, and MFA deferred until the user provides and approves an identity-provider configuration.
- [x] Refine the VAMNUX compact public header with separate secure Sign in and Create account actions plus accessible social navigation inspired by the supplied reference without copying it.
- [x] Add a protected post-sign-in profile-completion experience that collects only the approved customer details and persists them to the existing customer profile without replacing Manus OAuth identity data.
- [x] Validate Manus OAuth account entry, profile isolation, dashboard/security activity continuity, responsive header behavior, and unchanged inactive payment and supplier boundaries.
- [x] Audit and refine remaining storefront, catalog-detail, cart, account, support, and policy frontend components without Supabase, external redirects, payments, supplier orders, or simulated data.
- [x] Validate the completed frontend refinement across desktop and mobile views while preserving Manus OAuth account isolation and truthful inactive-commerce states.
- [x] Replace only the global storefront and User Dashboard typography with a clean rounded modern font system inspired by the supplied reference, preserving every non-typographic interface and behavior.
- [x] Validate the typography-only update at desktop and mobile sizes without changing layout, colors, content, data, routes, authentication, or commerce behavior.
- [x] Inspect and document the current Manus OAuth, user, customer-profile, identity-link, session, dashboard, and authorization architecture before any Supabase migration work.
- [x] Design a non-destructive Supabase Auth mapping that preserves existing VAMNUX records, retains Manus OAuth as a verified fallback, and specifies password-reset treatment for users with no transferable passwords.
- [ ] Configure required Supabase server and public client environment values securely, stopping for actual provider credentials and dashboard configuration rather than fabricating them.
- [ ] Implement staged Supabase email/password sign-up, verification, login, logout, password reset, secure sessions, logout-all-devices, security activity, and optional MFA/TOTP without enabling payments or supplier orders.
- [ ] Prepare disabled-by-default Google OAuth support that requires confirmed Google client credentials and approved redirect URLs before activation.
- [ ] Connect verified Supabase identities to existing customer profiles and apply owner-enforced customer isolation for profile, orders, wallet, favorites, notifications, support, and security data.
- [x] Refine VAMNUX sign-in/sign-up entry actions and add accessible social navigation in the supplied compact-header direction without copying third-party branding or layout.
- [ ] Validate staged identity flows, account isolation, migration preservation, dashboard access, and storefront continuity, then report remaining provider configuration and security boundaries.

## Admin Operations Expansion — Remaining Workspaces

- [x] Expand Analytics with Google-performance readiness, record-backed sales performance, and explicit order/revenue/profit goals without fabricating rankings or conversions.
- [x] Refine Exchange Rate with editable USD/NGN rate and buffer controls, derived cross-currency display calculations, and clear manual-rate boundaries for EUR, GBP, and other supported storefront currencies.
- [x] Expand Orders with compact VAMNUX `#` six-digit display IDs, stored customer/order/supplier identifiers, purchase and available delivery timestamps, plus safe review-only cancellation and delivery-delay readiness states.
- [x] Surface recorded supplier wallet balances and the red $5 threshold consistently in Wallet Funding, while keeping email delivery and live supplier balance retrieval inactive until configured.
- [x] Build an owner-only operational Notifications inbox for real new orders, low recorded supplier balances, support tickets, wallet-funding requests, and other stored events without inventing alerts.
- [x] Build Settings · Authentication account-security readiness for profile changes and verification/MFA/re-authentication options, retaining inactive states until an approved email, authenticator, and phone verification service is configured.
- [x] Expand Fraud & Risk with rule-based operational signals from stored records and non-accusatory resolution guidance, without creating unsupported risk scores or allegations.
- [x] Prepare Product Sync interval and newly synchronized product controls using managed scheduling design, without activating recurring supplier sync before a deployed, authenticated, idempotent callback is approved.
- [x] Expand Website Health with record-backed service checks, safe remediation guidance, and no fabricated runtime or provider-health claims.
- [x] Expand Refunds with failed/refunded-order analytics and safe inactive refund processing boundaries.
- [x] Validate the remaining Admin operational expansion for owner authorization, data minimization, safe workflow boundaries, deterministic tests, and production build before publishing.
- [x] Surface recorded low supplier-balance alerts in the operational Notifications inbox and expand Website Health with actionable record-backed component guidance.
- [x] Add an owner-only Product Sync bulk markup workflow for selected newly synchronized products, with bounded validation, confirmation, and audit events.
- [x] Add Notifications quick actions to open support tickets directly and safely cancel only eligible risky unfunded, unsent draft orders without leaving the Admin workspace.
- [x] Validate bulk selection, pricing isolation, notification actions, authorization, deterministic tests, and production build before publishing.
- [x] Add Analytics daily and weekly progress bars for stored order, revenue, and profit goals without fabricating performance data.
- [x] Add a red supplier-balance Fund Wallet shortcut that opens the recorded funding context without creating a payment, supplier wallet credit, or email notification.
- [x] Add a Customers suspended-account filter with protected appeal review and direct reinstatement controls, preserving existing suspension authorization and audit rules.
- [x] Validate analytics progress, supplier funding shortcut, suspended-account operations, authorization, deterministic tests, and production build before publishing.
- [x] Rebuild Products Publish & Discovery with a compact side-by-side synchronized product list that keeps all selectable listings visible while editing their storefront settings.
- [x] Add direct protected On/Off visibility controls for individual products, preserving the existing visible, hidden, and coming-soon storefront states and audit trail.
- [x] Improve the manual product form with distinct delivery minimum, delivery maximum, delivery-unit, and customer-requirement controls, plus guided validation and a recognizable save action.
- [x] Validate product visibility controls, manual-listing delivery fields, responsive Products workspace density, authorization, tests, and production build before publishing.
- [x] Add a catalog-list search field and individual Edit control for every VAMNUX Admin product listing.
- [x] Add product-row selection controls and protected bulk actions for storefront visibility, authorized listing archive/disable, and selected-product percentage markup.
- [x] Validate product search, selected-action boundaries, supplier-data isolation, authorization, deterministic tests, and production build before publishing.
- [x] Rebuild Categories with a compact side-by-side category list showing every configured marketplace category, real associated product counts, and expandable product drill-downs.
- [x] Add direct protected category controls for visibility, edit, hide, and safe archive without deleting supplier inventory or mapping records.
- [x] Validate category product mapping, visibility/archive boundaries, authorization, responsive density, deterministic tests, and production build before publishing.
- [x] Add owner-only drag-and-drop category display ordering with persisted sort order and audit history.
- [x] Add a category quick-view overlay showing the top available stored product signals without fabricating sales or performance metrics.
- [x] Add protected category multi-select controls and bulk hide/archive actions that preserve supplier products and mappings.
- [x] Validate category ordering, quick view, bulk actions, authorization, deterministic tests, and production build before publishing.
- [x] Add a prominent Products workspace action that opens the guided manual-product setup without losing the current catalog-management context.
- [x] Expand the manual product form with recognizable name, description, category, platform, fulfillment type, region, price, image, delivery, and customer-requirement inputs under approved-source safeguards.
- [x] Validate manual listing metadata, source authorization, draft-first behavior, deterministic tests, and production build before publishing.
- [x] Populate and prioritise the existing storefront category taxonomy in the Categories workspace: Game top-up, Gift cards, Subscriptions, Software, AI tools, Steam, and Telegram Stars.
- [x] Make category product drill-down, visibility, edit, hide, and safe archive actions the primary Categories controls, with no empty create-first experience.
- [x] Move optional new-category creation and manual-product entry to compact secondary controls after the existing category operations.
- [x] Validate existing category rendering, product drill-downs, operations, responsive layout, tests, and production build before publishing.
- [x] Redesign the VAMNUX Dashboard as a denser operational overview with recorded user, order, revenue, profit, wallet, and activity signals.
- [x] Rename the Traffic Sources workspace to Statistics in the Admin navigation and workspace heading.
- [x] Add recorded registration-source and country analytics for 1 day, 7 days, 14 days, 30 days, and 3 months, with clear limits where raw visitor telemetry is unavailable.
- [x] Validate Dashboard and Statistics data honesty, responsive presentation, deterministic tests, and production build before publishing.
- [x] Redesign Exchange Rate as a clear USD/NGN rate-management workspace with visible EUR, GBP, and cross-currency readiness.
- [x] Add a functional manual-rate refresh action and a transparent calculator that uses only saved active rates.
- [x] Preserve the rule that currencies without saved rates remain unavailable and are not auto-updated or fabricated.
- [x] Validate Exchange Rate controls, data boundaries, responsive presentation, deterministic tests, and production build before publishing.
- [x] Redesign Suppliers as a compact overview of configured supplier name, website, sync status, product count, and safe operating readiness.
- [x] Preserve Admin-only supplier product pricing and VAMNUX markup access without exposing supplier credentials or data to customers.
- [x] Clarify recorded supplier wallet balances, red at-or-below-$5 status, funding preparation controls, and the current transactional-email alert limitation.
- [x] Validate supplier-data isolation, balance readiness controls, responsive layout, deterministic tests, and production build before publishing.
- [x] Redesign Customers as a functional control center for safe account, email, country, wallet, spend, orders, sign-in, purchase, and transaction information.
- [x] Add clear protected customer detail controls while excluding passwords, tokens, and credential material from all Admin views.
- [x] Repair audited suspension, duration selection for days/months/years/permanent restrictions, appeal review, and reinstatement actions for non-Admin accounts.
- [x] Validate customer-data protection, customer-control actions, responsive layout, deterministic tests, and production build before publishing.
- [x] Add safe per-customer support-ticket status and account-activity context to the protected Admin customer detail view without exposing private message bodies.
- [x] Validate the completed Customer control-center data boundaries, authorization, tests, and production build before publishing.
- [x] Add a separate Admin Manual Delivery Operations workspace for products personally fulfilled by the VAMNUX owner, isolated from API supplier inventory.
- [x] Show customer-visible manual-delivery windows in hours on purchased manual products without making a delivery guarantee.
- [x] Track real manual orders by pending payment, pending review, in progress, completed, failed, and cancelled states with owner-only audited actions; refunds remain separately safeguarded in Refunds.
- [x] Validate manual-order state transitions, customer-data protection, responsive layout, deterministic tests, and production build before publishing.
- [x] Repair Categories selection, Select All, quick view, product drill-down, hide/show, archive, restore, and bulk-action controls.
- [x] Make hidden and archived marketplace categories unavailable to storefront navigation and category discovery while preserving their associated product records.
- [x] Add clear archived-category restore control with auditable state changes and no product deletion.
- [x] Validate category authorization, controls, marketplace filtering, deterministic tests, and production build before publishing.

- [x] Expand Manual Delivery Operations beyond task analytics with a dedicated owner-managed manual-product setup workflow.
- [x] Add manual-product category, type, name, description, price, image URL, image upload/dropzone, delivery-hour range, customer requirements, fulfilment format, and active/draft controls.
- [x] Securely store owner-uploaded manual-product imagery through the VAMNUX storage workflow and validate external image links without exposing storage credentials.
- [x] Add a guided review step and keep personally fulfilled product management separate from supplier APIs, wallet funding, and supplier settlement.
- [ ] Validate manual-product setup authorization, file and input handling, responsive operations UI, deterministic tests, production build, and visual review before publishing.

- [x] Rebuild Settings · Authentication as a complete owner account and Admin sign-in security workspace.
- [x] Add owner-authorized profile editing, security activity context, recovery and session readiness, verification preferences, and explicit authentication protection settings without exposing credentials or security secrets.
- [x] Present email, phone, and authenticator enrollment truthfully, activating no verification factor until its secure delivery or enrollment flow is configured and enforced.
- [ ] Validate security-setting authorization, owner-data minimization, audit behavior, tests, build, and authenticated visual review before publishing.

- [x] Add enforceable native authenticator-app MFA for the VAMNUX Super Admin while retaining the current OAuth sign-in route.
- [x] Add Admin-only authenticator enrollment, confirmation, encrypted secret handling, single-use recovery codes, trusted challenge state, and audit events without exposing MFA secrets in client logs, databases, or Admin detail screens.
- [x] Require a verified authenticator challenge before granting an Admin session after OAuth login, while leaving email and phone verification unavailable until a real delivery provider is configured.
- [ ] Validate MFA enrollment, login challenge, recovery, authorization, secret protection, tests, build, and authenticated Admin UI before publishing.

- [x] Perform a non-redesign verification of every VAMNUX Super Admin workspace, navigation control, button, form, status state, and protected server action.
- [x] Correct only confirmed Admin reliability or recognition issues found during verification, preserving all current layout, content, and business boundaries; no confirmed Admin UI correction was required.
- [ ] Validate the Admin verification pass with deterministic tests, production build, runtime diagnostics, and authenticated owner review before publishing.

- [x] Replace the compact storefront footer with the requested structured VAMNUX Company, Products, Support, Legal, social, and payment-method footer.
- [x] Connect footer links to available VAMNUX routes, catalog filters, and legal pages while providing clear truthful states for unavailable external payment and social destinations.
- [x] Validate footer accessibility, routing, desktop/mobile layout, deterministic tests, production build, and visual presentation before publishing.

- [x] Turn the detailed approved footer specification into useful VAMNUX public-information destinations instead of unavailable-action notices.
- [x] Build shared VAMNUX public-information page foundations with header, footer, breadcrumbs, responsive sections, authentic content, and back-to-top affordances.
- [x] Implement functional Company, Support, catalog-category, Legal, Blog, Reseller, Affiliate, and payment-readiness destinations using real current VAMNUX capabilities and explicit unavailable boundaries where external providers or Admin configuration are still required.
- [x] Rewire every footer item to a real information page, catalog view, protected customer flow, or an appropriate configured social URL when supplied.
- [x] Validate every footer route, page content boundary, form/action, accessibility state, responsive layout, tests, build, and visual presentation before publishing.

- [x] Redesign the authenticated VAMNUX User Dashboard as a compact, mobile-friendly account control center inspired by the supplied dashboard organization without copying its branding or layout.
- [x] Add a personalized welcome, real wallet balance, total orders, completed orders, support-ticket count, recent activity, and contextual quick actions without fabricating customer balances, orders, rewards, or referrals.
- [x] Reorganize the dashboard navigation for Dashboard, Categories, Wallet, Favorites, Order History, Referral, Account Settings, and Support with real Profile, Notifications, Security, Settings, and Privacy destinations.
- [x] Preserve customer account isolation, current Manus OAuth, wallet-only purchasing, truthful inactive payment/referral/rewards states, and existing protected support/security flows.
- [x] Validate redesigned dashboard controls, real-data empty states, desktop/mobile layout, deterministic tests, production build, and authenticated visual review before publishing.

- [x] Change only the User Dashboard colours to the supplied blue-to-violet grid-gradient palette, preserving all dashboard layout, copy, navigation, records, and interactions.
- [x] Validate the revised User Dashboard palette for contrast, responsive rendering, unchanged controls, deterministic tests, and production build before publishing.

- [x] Add a VAMNUX wallet funding calculator with a $3 USD minimum and Admin-configured USD/NGN, USD/EUR, and USD/GBP conversion estimates.
- [x] Make funding readiness clear in the User Dashboard without creating a wallet credit, payment confirmation, or provider checkout before a verified gateway integration exists.
- [x] Prepare a verified payment-provider automatic-credit contract that can credit a wallet only after a signed, idempotent provider confirmation; do not simulate successful payment or payment-gateway activation.
- [x] Validate customer authorization, $3 minimum enforcement, saved-rate calculation, readiness copy, deterministic tests, production build, and responsive funding presentation before publishing.

- [x] Verify the owner-connected GitHub export and synchronize the latest published VAMNUX project version when direct repository access is available.

- [x] Remove every customer-facing VAMNUX markup, profit, supplier-cost, percentage, buffer, and Admin exchange-rate disclosure while retaining final payable amounts.
- [x] Ensure hidden or archived categories disappear immediately from all public storefront and User Dashboard category discovery, and restored active-visible categories return to every relevant customer view.
- [x] Validate public pricing privacy, category hide/archive/restore propagation, responsive category navigation, deterministic tests, production build, and visual presentation before publishing.

- [x] Remove the confirmed public “VAMNUX PRICE · xx% MARKUP” watermark from every catalog card and product-detail view while retaining Admin-only markup controls.
- [x] Verify public customer price labels show only the payable product price and no percentage, supplier cost, buffer, or profit information before publishing.

- [x] Replace the fixed public storefront category-pill list with the active-visible category source so Admin hide, archive, show, and restore actions update every customer-facing category view.
- [x] Verify active-visible category propagation across storefront pill navigation, menus, catalog sections, search/filter affordances, and User Dashboard categories before publishing.

- [x] Redesign the storefront category browser as a compact mobile-first card grid with moderate typography, category icons, real available-product counts, and direct browse actions.
- [x] Keep category cards driven by active-visible Admin category state and make every card lead customers to the exact available products in that category.
- [x] Validate category-card counts, hide/archive/show/restore propagation, desktop/mobile layout, navigation, tests, build, and visual presentation before publishing.

- [x] Redesign the marketplace hero into a compact 5–7 slide VAMNUX trust and discovery carousel with calm visual treatment and mobile-friendly typography.
- [x] Use only truthful platform messages and a clearly review-ready state; do not fabricate customer testimonials, names, countries, profile identities, or review content.
- [x] Validate hero content, slide navigation, Admin-visible content controls, responsive layout, accessibility, tests, build, and visual presentation before publishing.

- [x] Redesign the storefront product browser into a compact category-and-search workspace with selectable real product rows and a responsive selected-product preview.
- [x] Preserve active-visible category controls, real supplier product images or neutral fallbacks, final customer display prices, product requirements, and direct internal product-detail routes without exposing Admin markup or supplier cost.
- [x] Review the GamesDrop sync path and, if safely available, perform only a bounded read-only catalog synchronization without creating a supplier order, checkout, payment, wallet credit, or fabricated inventory.
- [x] Validate product browsing, filtering, preview selection, safe image fallbacks, responsive layout, deterministic tests, production build, and visual presentation before publishing.
