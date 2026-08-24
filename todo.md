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
- [x] Enforce required Terms/Privacy acceptance and independently recorded optional marketing consent, then prepare editable clearly labelled draft Terms, Privacy, Refund, and Cookie policy pages.
- [x] Expand the real-data Phase 1 customer dashboard for profile, security, notifications, support tickets, orders/order details, transactions, favorites, and wallet-only quick actions, preserving truthful empty states.
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
- [x] Validate manual-product setup authorization, file and input handling, responsive operations UI, deterministic tests, production build, and visual review before publishing.

- [x] Rebuild Settings · Authentication as a complete owner account and Admin sign-in security workspace.
- [x] Add owner-authorized profile editing, security activity context, recovery and session readiness, verification preferences, and explicit authentication protection settings without exposing credentials or security secrets.
- [x] Present email, phone, and authenticator enrollment truthfully, activating no verification factor until its secure delivery or enrollment flow is configured and enforced.
- [x] Validate security-setting authorization, owner-data minimization, audit behavior, tests, build, and authenticated visual review before publishing.

- [x] Add enforceable native authenticator-app MFA for the VAMNUX Super Admin while retaining the current OAuth sign-in route.
- [x] Add Admin-only authenticator enrollment, confirmation, encrypted secret handling, single-use recovery codes, trusted challenge state, and audit events without exposing MFA secrets in client logs, databases, or Admin detail screens.
- [x] Require a verified authenticator challenge before granting an Admin session after OAuth login, while leaving email and phone verification unavailable until a real delivery provider is configured.
- [x] Validate MFA enrollment, login challenge, recovery, authorization, secret protection, tests, build, and authenticated Admin UI before publishing.

- [x] Perform a non-redesign verification of every VAMNUX Super Admin workspace, navigation control, button, form, status state, and protected server action.
- [x] Correct only confirmed Admin reliability or recognition issues found during verification, preserving all current layout, content, and business boundaries; no confirmed Admin UI correction was required.
- [x] Validate the Admin verification pass with deterministic tests, production build, runtime diagnostics, and authenticated owner review before publishing.

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

- [x] Redesign the lower storefront How It Works, trust, and marketplace invitation sections with a calm, credible, mobile-friendly visual hierarchy.
- [x] Replace the generic account-opening CTA with a functional Browse digital products action and ensure every lower-section action leads to a real VAMNUX destination.
- [x] Validate lower-section copy, trust boundaries, buttons, accessibility, desktop/mobile layout, deterministic tests, production build, and visual presentation before publishing.

- [x] Balance the complete lower storefront palette with accessible VAMNUX blue, violet, mint, and coral accents without using overly flashy colours.
- [x] Replace the abstract final-section block graphic with a clear, readable customer-oriented marketplace summary that supports real VAMNUX browsing actions.
- [x] Validate refined lower-section colour contrast, CTA behavior, desktop/mobile readability, tests, build, and visual presentation before publishing.

- [x] Repair the VAMNUX top search with immediate keyword results for real products, active-visible categories, Help/FAQ topics, and relevant internal pages.
- [x] Make every top-search result keyboard-accessible and route it directly to the correct product, category filter, Help/FAQ, or policy destination without exposing hidden categories or Admin data.
- [x] Validate search relevance, no-result behavior, active-category privacy, popup responsiveness, deterministic tests, production build, and visual presentation before publishing.

- [x] Add a mobile-only three-line VAMNUX category menu with active-visible categories and relevant browse options, leaving desktop navigation unchanged.
- [x] Validate mobile menu accessibility, hide/archive/show/restore propagation, internal category navigation, responsive isolation from desktop, deterministic tests, build, and visual presentation before publishing.

- [x] Repair the missing Mobile Legends and PUBG game-family card imagery using verified supplier-provided artwork where available and a clear neutral fallback otherwise.
- [x] Validate affected game-family artwork loading, no-empty-image fallback behavior, responsive presentation, deterministic tests, build, and visual review before publishing.

- [x] Redesign every VAMNUX supplier-backed product-family detail page into a compact selectable denomination grid with a focused selected-item summary.
- [x] Preserve active supplier product data, final customer prices, requirements, regions, delivery formats, active-category boundaries, and saved-cart-only behavior without exposing supplier cost or activating payment/supplier orders.
- [x] Validate representative Free Fire, PUBG, Telegram Stars, Steam, and other product-family selection pages across desktop/mobile, requirements, cart boundaries, tests, build, and visual presentation before publishing.

- [x] Reduce the oversized lower storefront heading and add a compact mobile-friendly VAMNUX email-interest panel with useful marketplace messaging.
- [x] Store consented public email-interest submissions securely without claiming newsletters or marketing email are delivered before a sending provider is configured.
- [x] Validate public email consent, submission feedback, typography balance, accessibility, desktop/mobile layout, tests, build, and visual presentation before publishing.

- [x] Repair direct VAMNUX Super Admin tab URLs so every valid workspace, including Settings · Authentication, opens the requested protected workspace.

- [x] Repair the VAMNUX User Dashboard hook ordering so authenticated customer account screens render without a React runtime error.
- [x] Support direct VAMNUX User Dashboard tab URLs for account settings, consent, privacy, wallet, support, and other declared customer workspaces.

- [x] Add a working favorite control to every active VAMNUX product presentation while preserving existing cart actions and ensuring new or synchronized products inherit it automatically.
- [x] Record authenticated product-favorite and saved-cart addition activity with the customer account and product context needed for secure Super Admin notification review.
- [x] Expand the Super Admin Notifications workspace with a clickable product-activity inbox that identifies the relevant customer and product without exposing secrets or changing orders.
- [x] Validate favorites, cart persistence, activity-notification authorization, responsive customer/Admin UI, deterministic tests, production build, and visual presentation before publishing.

- [x] Analyze available VAMNUX account, wallet, payment, order, refund, IP, and supplier-operation records to define transparent review-only fraud-risk signals without fabricating unavailable data.
- [x] Add protected Admin risk analysis that flags review candidates for multiple-account, wallet, payment, order-velocity, spending, chargeback, IP, supplier-order, and refund signals, where records exist.
- [x] Rebuild the Super Admin Fraud & Risk workspace with transparent Low, Medium, and High risk levels, signal explanations, data-availability states, and working review links without automatic bans or suspensions.
- [x] Validate risk scoring transparency, Admin authorization, non-automatic enforcement, deterministic tests, production build, and responsive visual presentation before publishing.

- [x] Add a well-structured, customer-focused Why VAMNUX trust section after catalog discovery that explains payment readiness, digital order processing, pricing clarity, order visibility, and support without unsupported claims.
- [x] Validate trust-section copy against VAMNUX’s current payment, supplier fulfilment, wallet, order-tracking, and support capability boundaries, then confirm responsive storefront presentation before publishing.

- [x] Create concise, dedicated VAMNUX Terms, Privacy, Cookie, Refund, Payment, Delivery, and Acceptable Use policy pages from the owner-provided draft text, keeping policy language separate from storefront content.
- [x] Replace policy email-contact prompts with clear Submit a ticket actions that route internally to VAMNUX Support without inventing an email address.
- [x] Ensure the complete legal-policy list appears in the shared footer on every page and each link opens its own clean internal page.
- [x] Validate legal navigation, draft-policy notices, support-ticket actions, responsive presentation, deterministic tests, and production build before publishing.

- [x] Remove all public draft, legal-review, and owner-provided warning labels from the VAMNUX policy pages while preserving concise policy content and internal ticket actions.
- [x] Add a protected Admin-only Policy workspace as the final Super Admin feature, listing all seven policy documents and allowing the owner to edit and save each policy’s customer-facing content.
- [x] Validate public policy presentation, Admin-only policy authorization, edit/save persistence, direct-tab access, deterministic tests, responsive rendering, and production build before publishing.

- [x] Route every VAMNUX footer product link back to the marketplace catalog section with the matching active category filter, including Game Top-Up, Gift Cards, Subscriptions, AI Tools, Steam, Telegram Stars, and safe fallbacks for generic product links.
- [x] Validate footer catalog-return links, matching category filters, category visibility boundaries, responsive navigation, deterministic tests, and production build before publishing.

- [x] Fix duplicate React keys for VAMNUX footer product links that now share filtered-catalog destinations, preserving all category navigation behavior.
- [x] Validate the footer warning is resolved with deterministic tests, runtime diagnostics, production build, and catalog-return links before publishing.

- [x] Make VAMNUX footer product links activate the matching catalog filter in the current storefront view, scroll to the catalog, and focus the product search without opening a separate page or tab.
- [x] Validate immediate same-page footer catalog activation, category filtering, search focus, accessibility, deterministic tests, and production build before publishing.

- [x] Rebuild the VAMNUX Help Centre with the owner-provided Orders, Wallet, Gift Cards, Game Top-Up, Account, Subscriptions, Software, and escalation topics in a concise searchable format.
- [x] Ensure Help Center, FAQs, Contact Support, Track Order, and Submit a Ticket footer routes lead to relevant internal support views with clear working actions.
- [x] Extend universal VAMNUX search to match Help Centre keywords and questions such as refund, payment, gift card, PUBG UC, wallet, order status, and player ID alongside eligible products and categories.
- [x] Validate Help Centre content boundaries, search relevance, support navigation, responsive views, deterministic tests, and production build before publishing.

- [x] Repair VAMNUX footer category navigation so the matching filtered catalog becomes visible in the current viewport immediately, with no manual scrolling required.
- [x] Validate visible same-page catalog activation, category filtering, focused search, responsive behavior, deterministic tests, and production build before publishing.

- [x] Ensure every VAMNUX Company, Support, Legal, and non-catalog Product footer link opens its internal destination at the top of the page immediately instead of preserving the footer scroll position.
- [x] Preserve immediate in-page filtered-catalog behavior for Product links while applying reliable top-of-page positioning to every other internal footer destination.
- [x] Validate footer routes, destination top positioning, catalog activation, responsive navigation, deterministic tests, and production build before publishing.

- [x] Replace the VAMNUX About Us page with the owner-provided marketplace story, vision, digital-product overview, security framing, and capability-accurate Why VAMNUX content.
- [x] Add clear internal Explore Products and Create Account actions to the revised About Us page without claiming unconfigured payments or supplier fulfilment are active.
- [x] Validate About Us content accuracy, internal navigation, responsive presentation, deterministic tests, and production build before publishing.

- [x] Route every VAMNUX Browse products, Explore products, View all products, and equivalent public action to the visible on-site catalog with search ready for immediate use.
- [x] Update public-page headers and product-browsing calls to use the focused catalog destination instead of generic product information pages where appropriate.
- [x] Validate catalog visibility, search readiness, internal routing, responsive presentation, deterministic tests, and production build before publishing.

- [x] Replace Blog, Become a Reseller, and Affiliate Program in the VAMNUX Company footer with Why Us and Sign Up.
- [x] Make Why Us reveal the existing VAMNUX trust section immediately and make Sign Up open the normal new-account registration flow.
- [x] Validate the revised Company footer, trust-section visibility, registration routing, deterministic tests, responsive presentation, and production build before publishing.

- [x] Rebuild the VAMNUX account-access page with clear Sign In and Create Account destinations that preserve the current secure authentication provider.
- [x] Add a comprehensive registration-readiness form with first name, last name, email, optional phone, country, referral source, password confirmation, live password-strength guidance, consent, and truthful email-verification messaging.
- [x] Represent CAPTCHA and native email/password account creation truthfully as unavailable until a real verified identity and CAPTCHA provider is configured; do not fabricate verification or accept credentials locally.
- [x] Validate account-access routing, password guidance, accessibility, responsive layout, deterministic tests, and production build before publishing.

- [x] Make the VAMNUX registration details editable in the browser with local required-field checks, optional phone, country, referral source, and no persistence of incomplete registration data.
- [x] Add separate Password and Confirm password fields with live client-side match feedback and transparent weak, medium, strong, and excellent strength guidance before secure account-creation handoff.
- [x] Add a clearly labelled CAPTCHA readiness boundary and Create secure account action that validates the local form then transfers users to the configured secure identity provider without simulating verification or submitting credentials to VAMNUX.
- [x] Validate registration interaction, data-boundary messaging, password feedback, accessibility, responsive presentation, deterministic tests, and production build before publishing.

- [x] Replace the VAMNUX registration Country text input with a searchable list of countries that users can filter by typing and select directly.
- [x] Display the selected country’s calling prefix automatically beside the optional phone number so users enter only the remaining local number.
- [x] Replace the registration referral-source text input with structured discovery options including Google, social platforms, blog, referral, advertising, events, and other appropriate sources.
- [x] Validate selection behavior, country-code mapping, local draft-data boundaries, accessibility, responsive layout, deterministic tests, and production build before publishing.

- [x] Reorder the VAMNUX registration fields so Country appears before the dependent country-code Phone number field without changing registration behavior.

- [x] Audit every VAMNUX Sign Up, Create Account, Sign In, Log In, Back to Sign In, Forgot Password, and related account-action control across public pages, dashboards, and shared navigation.
- [x] Route all registration actions to the interactive registration page and all sign-in actions to the secure sign-in page; make password recovery use the configured provider path or a truthful unavailable state until transactional recovery is configured.
- [x] Validate all account-action destinations, recovery messaging, responsive interactions, deterministic coverage, and production build before publishing.

- [x] Repair the VAMNUX Back to Sign In registration control so it reliably returns to the secure sign-in page.
- [x] Exercise actual account-page clicks for Sign In, Create Account, Back to Sign In, and Forgot Password, correcting any confirmed navigation defects.
- [x] Validate interactive account navigation, regression coverage, runtime diagnostics, and production build before publishing.

- [x] Add editable VAMNUX sign-in email and password inputs with local required-field validation and no local credential persistence.
- [x] Clear local sign-in field values before handing customers to the configured secure identity provider, without pretending native password authentication is active.
- [x] Validate sign-in field interaction, safety messaging, provider handoff, responsive layout, deterministic tests, and production build before publishing.

- [x] Repair the rendered VAMNUX Create Secure Account and Back to Sign In controls with direct browser navigation after the prior internal-link implementation failed in the user-facing page.
- [x] Verify rendered sign-up, sign-in, and recovery destination behavior from the visible account controls, along with regression coverage and production build, before publishing.

- [x] Add a VAMNUX User Dashboard Subscribe feature with a clear consented email-interest form, accurate email-delivery boundary messaging, and a user-friendly subscription status.
- [x] Add a VAMNUX User Dashboard Request feature that lets authenticated customers submit requested products, services, game top-ups, or digital offerings for Admin review.
- [x] Store customer product requests securely with customer ownership and add protected request procedures without activating email broadcasts or fabricating catalogue availability.
- [x] Validate Subscribe and Request navigation, consent boundaries, customer authorization, responsive presentation, deterministic tests, and production build before publishing.

- [x] Improve the VAMNUX User Dashboard Subscribe panel’s spacing, contrast, button alignment, consent control clarity, and readable responsive presentation.
- [x] Replace the limited mobile dashboard navigation with a three-line trigger that opens all User Dashboard features, including Subscribe and Request.
- [x] Validate Subscribe readability, complete mobile feature access, menu interactions, deterministic tests, responsive presentation, and production build before publishing.

- [x] Add a green unread notification badge to the VAMNUX Admin Notifications navigation item that counts unread operational notifications and caps display appropriately.
- [x] Organize the Admin Notifications workspace into identifiable categories for orders, favorites/cart activity, support tickets, customer requests, subscribers, wallet/supplier readiness, refunds, and other available operational records without fabricating events.
- [x] Add protected selectable notification rows with working individual Mark as read, selected Mark as read, and Mark all as read actions that update the unread count.
- [x] Validate notification authorization, unread-count accuracy, bulk read behavior, organized presentation, responsive layout, deterministic tests, and production build before publishing.

- [x] Make each VAMNUX Admin Notifications Review action open full context-specific notification details inside the protected Notifications workspace, without changing the source business record.
- [x] Validate in-place notification review details, owner authorization, keyboard close behavior, responsive presentation, deterministic tests, and production build before publishing.

- [x] Restructure the VAMNUX Sign In and Create Secure Account views into a compact header-and-card account format inspired by the supplied reference, without changing VAMNUX colours or removing existing account actions.
- [x] Add accessible show/hide controls to VAMNUX Sign In, Password, and Confirm password fields while preserving local-only credential handling and secure-provider handoff.
- [x] Validate account routing, local-only password handling, visibility toggles, responsive desktop/mobile presentation, deterministic tests, and production build before publishing.

- [x] Move the VAMNUX Admin Notifications workspace to a high-priority position near the top of the Admin navigation.
- [x] Expand VAMNUX Admin notification Review to retrieve and show full authorised source-record details in place, including full support-ticket and customer-request messages up to the stored safe limit, without exposing secrets or digital fulfilment data.
- [x] Show complete owner-appropriate context for product favorite/cart activity, including stored customer, product, supplier-safe customer price, product category, activity time, and source reference.
- [x] Make the VAMNUX Admin top search field provide clickable keyword results for Admin workspaces and authorised stored customer, order, product, ticket, request, and notification records.
- [x] Validate owner authorization, data minimization, full-detail rendering, Admin search navigation, keyboard accessibility, deterministic tests, and production build before publishing.

- [x] Restore the original VAMNUX account-access introduction, descriptive copy, and account-benefit content above the Sign In and Create Secure Account form card without changing the current colours or account actions.
- [x] Increase VAMNUX account form labels, fields, supporting text, and moderate headings to improve reading comfort on mobile and desktop without making the layout oversized or overly bold.
- [x] Validate preserved account navigation, password controls, local-only credential handling, responsive readability, deterministic tests, and production build before publishing.

- [x] Make the VAMNUX Admin Notification Review dialog independently scrollable on desktop and mobile so all long source details and messages remain reachable.
- [x] Add an owner-only Reply to customer control in notification Review: append replies to real support-ticket conversations and create customer-visible in-app notifications for customer requests and product favorite/cart activity without changing the original source record.
- [x] Validate reply authorization, customer visibility, long-detail scrolling, keyboard accessibility, deterministic tests, and production build before publishing.

- [x] Repair the VAMNUX Admin Notification Review dialog so its full body, reply form, and footer actions use a visible, reliable independent scroll container on desktop and mobile.
- [x] Validate mouse-wheel, touch, keyboard, and scrollbar access to long review details and reply controls before publishing.

- [x] Research the current documented owner funding options for each configured VAMNUX supplier and present only verified supplier-wallet funding guidance in the owner Admin workspace.
- [x] Refine VAMNUX customer wallet-funding language so customers are not asked to submit manual funding requests; make clear that automatic wallet credit occurs only after a configured payment gateway and verified payment webhook confirm the transaction.
- [x] Preserve the safety boundary that VAMNUX cannot initiate supplier payments or automatically credit customer wallets until the respective supplier funding path and payment gateway/webhook are securely configured.
- [x] Validate supplier funding guidance accuracy, customer funding wording, authorization boundaries, deterministic tests, and production build before publishing.

- [x] Restore the VAMNUX Suppliers workspace to its original compact Supplier Overview table with the existing Products & Prices and Fund Wallet actions, without removing lower supplier controls or sections.
- [x] Move optional supplier funding guidance behind the existing Fund Wallet action so the default Suppliers overview remains unchanged.
- [x] Validate original supplier overview density, existing actions, lower-section visibility, deterministic tests, and production build before publishing.

- [x] Rename the VAMNUX Admin Statistics navigation item and workspace to Traffic Analytics.
- [x] Add protected period controls for 1 day, 3 days, 7 days, 2 weeks, 1 month, 3 months, and 1 year.
- [x] Report real VAMNUX traffic-source, signup, purchase, and recorded revenue metrics by selected period, with honest zero or unavailable states where source data does not exist.
- [x] Build a readable responsive Traffic Analytics dashboard with traffic-source performance rows and proportional visual bars inspired by the supplied reference, without fabricating visitors, sources, conversions, or revenue.
- [x] Validate authorization, period filtering, real-data aggregation, responsive presentation, deterministic tests, and production build before publishing.

- [x] Add compact editable USD-to-NGN, USD-to-EUR, and USD-to-GBP rate cards at the bottom of the VAMNUX Admin Exchange Rate workspace without changing or removing existing controls.
- [x] Wire each new rate-card Save action to the existing protected exchange-rate update flow and display currently stored values without inventing exchange data.
- [x] Validate rate-card updates, existing Exchange Rate controls, responsive presentation, deterministic tests, and production build before publishing.

- [x] Rename the VAMNUX Admin Settings · Authentication navigation label and workspace heading to Settings without removing authentication or MFA controls.
- [x] Organize the Admin General Profile workspace into clear, comfortably spaced editable fields for owner profile details while preserving provider-owned email and current authorization boundaries.
- [x] Add a password-reset readiness section beneath Security alerts in the requested form style, including current, new, and confirm password fields with visibility controls, without storing or simulating native password changes when the secure identity provider remains the authentication source.
- [x] Validate Settings navigation, profile-field saving, password-reset secure-provider handoff, MFA controls, responsive layout, deterministic tests, and production build before publishing.

- [x] Correct only the VAMNUX Admin Products selected-product presentation area so its selected-listing details, storefront state, featured control, labels, and fields are aligned and fully visible without changing other Product workspace sections.
- [x] Validate the targeted selected-product presentation layout at desktop and mobile widths, preserving all existing Product functionality, deterministic tests, and production build before publishing.

- [x] Correct only the VAMNUX Admin Products Catalog List panel so its full-size heading, search field, bulk actions, selected count, and product rows are separated without overlaying one another.
- [x] Preserve Catalog List content, controls, product-row size, and independent scrolling while preventing its header/action region from sitting behind the rows.
- [x] Validate Catalog List layout boundaries, scrolling, responsive readability, preserved controls, deterministic tests, and production build before publishing.

- [x] Move the complete VAMNUX Admin Products Catalog List block—heading, total, search, bulk actions, selected count, and scrollable rows—to the top of the Products workspace directly below its heading.
- [x] Leave every other Products workspace section unchanged below the relocated Catalog List block, without removing or redesigning any controls.
- [x] Validate Catalog List placement, preserved controls and scrolling, Product workspace order, deterministic tests, and production build before publishing.

- [x] Add an owner-only VAMNUX Admin feature named API Access Control that lists verified supplier website, partner/API documentation, available public support channels, and integration readiness metadata.
- [x] Show safe server-side API credential status indicators and secure-configuration guidance without returning, rendering, copying, logging, or transmitting any live API key, API secret, token, signature secret, or other credential to the browser.
- [x] Validate owner authorization, supplier metadata accuracy, secret non-exposure, responsive presentation, deterministic tests, and production build before publishing.

- [x] Correct the verified GamesDrop Telegram contact in VAMNUX API Access Control to @igoryan34 and its official Telegram URL.
- [x] Clarify the safe credential references in API Access Control while continuing to prevent live API keys, secrets, tokens, and signatures from being displayed, copied, logged, or sent to the browser.
- [x] Validate contact accuracy, protected credential behavior, deterministic tests, and production build before publishing.

- [x] Diagnose and repair the deployed VAMNUX Admin Panel route that is returning a 404 while preserving Admin authorization and all existing functionality.
- [x] Validate both the development and deployed Admin entry routes, protected redirect behavior, deterministic tests, and production build before publishing.

- [x] Replace the VAMNUX storefront technical supplier note with concise customer-friendly trust copy that highlights clear product details, transparent pricing, and support without unsupported payment or fulfilment claims.
- [x] Validate the revised storefront trust copy, responsive presentation, deterministic tests, and production build before publishing.

- [x] Add only a mobile three-line VAMNUX Admin menu that opens the complete existing feature list on phone-sized screens.
- [x] Preserve every Admin view, feature, control, active tab, unread badge, and desktop layout without redesigning or hiding any content.
- [x] Validate the mobile feature-list menu, desktop preservation, deterministic tests, and production build before publishing.

- [x] Improve only the VAMNUX Admin mobile top bar so the brand, three-line menu, full search field, Owner Access, and Sign Out remain clear and usable on phone-sized screens.
- [x] Preserve every existing top-bar control, Admin view, feature list, and desktop layout without removing or reconstructing any content.
- [x] Validate mobile top-bar visibility, search usability, desktop preservation, deterministic tests, and production build before publishing.

- [x] Rename the existing VAMNUX Steam category to Games across the storefront, User Dashboard, Admin Panel, and shared navigation/category labels.
- [x] Add a distinct Steam Top-Up category across the storefront, User Dashboard, Admin Panel, and shared category/navigation surfaces.
- [x] Remove Voucher from VAMNUX storefront catalog/category navigation while preserving all other requested category surfaces and product behavior.
- [x] Validate category consistency across storefront, mobile navigation, User Dashboard, Admin Panel, deterministic tests, and production build before publishing.

- [x] Remove customer-facing VAMNUX wording that refers to verified supplier inventory, verified suppliers, supplier verification, or supplier inventory from the storefront and User Dashboard.
- [x] Preserve supplier records and supplier-specific information in protected Admin-only workspaces.
- [x] Validate customer-facing wording cleanup, Admin supplier data preservation, deterministic tests, and production build before publishing.

- [x] Perform a strictly read-only audit of the existing VAMNUX catalog, suppliers, product IDs, categories, subcategories, prices, currencies, regions, availability, and API relationships without modifying any product, category, supplier, or website behavior.
- [x] Report total products, products by supplier, products by category, current schema and connection structure, category-safe duplicate or structural observations, and a non-destructive multi-supplier catalog recommendation.
- [x] Stop after delivering the audit report and wait for owner approval before proposing or performing any catalog migration, merge, rename, or product modification.
- [x] Use only separate lightweight read-only catalog queries; skip any individual query that times out and identify unavailable checks explicitly in the final audit report.

- [x] Perform a strictly read-only, category-first multi-supplier candidate-match analysis without merging, deleting, renaming, moving, or modifying any VAMNUX product.
- [x] Compare only logically compatible product types and attributes, keeping Game Top-Up, Gift Cards, Game Keys, Subscriptions, Software, AI Tools, Steam/Games, Telegram Stars, and other categories separate.
- [x] Classify possible matches as High Confidence, Medium Confidence, Low Confidence, or Needs Admin Review; retain all uncertain products as separate offers and report unique-product counts.
- [x] Deliver a non-destructive candidate-match report with product, supplier, supplier ID, price, currency, region, rationale, and confidence counts, then wait for owner approval before any migration.

- [x] Create additive VAMNUX Master Product and Supplier Offer tables that retain the original product rows, supplier IDs, supplier offer IDs, costs, currencies, availability, and all customer/order/payment relationships unchanged.
- [x] Include Master Product fields for stable ID, name, category, subcategory, product type, region, currency, denomination, image, and customer-facing status; include Supplier Offer fields for supplier relationship, source IDs, cost, currency, availability, delivery/input context, and optional future Master Product mapping.
- [x] Do not map, migrate, merge, reprice, route, hide, or otherwise alter the existing 3,423 products, the five Telegram Stars review groups, orders, payment records, or storefront behavior.
- [x] Add protected read-only Admin inspection procedures and deterministic coverage proving the new structure is additive and existing catalog, order, and payment rows remain unchanged.
- [x] Validate schema migration, preservation counts, untouched customer-facing behavior, deterministic tests, and production build; stop after reporting the Step 1 foundation for approval.

- [x] Create additive owner-only minimal Supplier Management data and Admin controls for supplier name/ID, API status, supported categories, active status, priority, and server-only credential readiness, while deferring advanced metrics, balances, and performance reporting.
- [x] Keep supplier credentials server-only, never render or log live API keys/secrets, and expose only credential references or safe configuration status in Admin workflows.
- [x] Support adding/editing minimal supplier metadata, activation/deactivation, priority updates, and a safe configuration-test control without changing supplier products, routing, prices, orders, payments, or credentials.
- [x] Do not disconnect, map, merge, rename, reprice, route, hide, or modify existing products, supplier offers, API relationships, orders, payment records, or customer-facing catalog behavior.
- [x] Validate supplier data preservation, Admin authorization, credential non-exposure, safe minimal controls, deterministic tests, and production build; stop for owner approval before Step 3.

- [x] Do not retry the unavailable database repeatedly; resume Step 2 only when database access is available, first verify the additive tables, then verify protected Supplier Management controls and all legacy catalog/order/payment/API preservation before publishing.

- [x] Before publishing Step 2, verify the Supplier Management tables, Admin Supplier Management controls, all 3,423 products, supplier-product relationships, orders, payments, prices, API relationships, and server-only credential boundary remain intact.

- [x] Issue the requested Step 2 completion report only after those checks are actually verified and the Supplier Management release is successfully published.

- [x] Do not publish or synchronize Step 2 to GitHub until database connectivity is restored and every required minimal Supplier Management and preservation check passes.

- [x] Resume Step 2 from a single lightweight read-only database connectivity check, then continue only if database access is confirmed and all minimal Supplier Management and preservation checks can be verified.

- [x] Diagnose database connection configuration, reachability, timeout behavior, and connection-pool state without modifying VAMNUX product, pricing, order, payment, credential, routing, or customer-facing data.
- [x] Confirm no safe application-side database configuration correction was needed after database reachability recovered.
- [x] After connectivity recovery, run a lightweight read-only check before verifying the Step 2 Supplier Management migration, Admin controls, and all preservation requirements.

- [x] Limit Step 2 implementation and verification to supplier ID, name, active status, API status, supported categories, priority, and a server-only credential reference; defer health analytics, balance tracking, performance statistics, routing, mapping, pricing, and fulfilment.

- [x] Provide a diagnosis-only report of the VAMNUX database connectivity blocker, including service type, configuration evidence, reachability result, responsible party, and any required secure configuration action, without changing data or application functionality.

- [x] Create additive owner-only Supplier Product Mapping records and controls with UNMAPPED, PENDING REVIEW, APPROVED, and REJECTED statuses, without deleting or changing any existing supplier product, product ID, price, order, API relationship, routing, or storefront behavior.
- [x] Require category-safe, attribute-aware Admin review for mapping; never match across categories and keep all five Telegram Stars candidate groups separate until explicitly approved by an Admin.
- [x] Provide Admin mapping actions to view Master Products and Supplier Offers, search supplier products, create a Master Product, add/remove an offer, and approve/reject a mapping with supplier name, source ID, product name, cost, currency, region, and status visible.
- [x] Preserve every existing catalog row and create no automatic product mapping, supplier routing, price/markup change, fulfilment action, or customer-facing catalog change.
- [x] Verify mapping counts by status, data preservation, Admin authorization, deterministic tests, and production build; stop after Step 3 for owner approval before Step 4.

- [x] Create additive owner-only pricing rule, preview, confirmation, and audit support for percentage markup, fixed markup, category/product rules, supplier cost tracking, currency conversion, minimum selling price, maximum discount, rounding, and manual price overrides.
- [x] Keep supplier cost, exchange rate, VAMNUX markup, fixed fee, rounding, final selling price, expected profit, and expected profit percentage separate in Admin-only pricing records and previews; never expose supplier costs to customers.
- [x] Require explicit Admin confirmation before any bulk price application; record previous/new price, previous/new markup, Admin, date/time, and optional reason without changing supplier API costs or historical transaction prices.
- [x] Preserve current customer prices until an Admin explicitly applies a confirmed rule; do not modify existing products, supplier APIs, orders, payments, historical prices, wallet balances, routing, supplier selection, fulfilment, or storefront behavior.
- [x] Verify pricing isolation, audit history, Admin authorization, deterministic tests, production build, and preservation counts; stop after Step 4 for owner approval before Step 5.

- [x] Create additive owner-only currency configuration, exchange-rate version history, rate source, update-frequency, effective-time, activation, and audit support for USD, NGN, EUR, and GBP without modifying existing exchange-rate records or customer prices automatically.
- [x] Provide Admin controls to view currencies, set/edit/manual activate/deactivate VAMNUX rates, designate manual or approved external source metadata, preview a Step 4 compatible currency conversion, and view previous rates; do not contact any external rate provider unless separately configured and approved.
- [x] Preserve supplier currency and original supplier cost, record selected rate snapshots for future pricing/order reconstruction, and require explicit Admin confirmation before any future pricing update caused by a material rate change.
- [x] Do not modify current product prices, supplier APIs, orders, historical transaction prices, payments, wallets, routing, supplier selection, fulfilment, or storefront behavior during Step 5.
- [x] Verify currency isolation, rate history, Admin authorization, deterministic tests, production build, visual Admin review, and preservation counts; stop after Step 5 for owner approval before Step 6.

- [x] Create additive owner-only Supplier Routing policies, simulation records, decision history, and failed-attempt records supporting Lowest Cost, Highest Priority, Manual Selection, Availability First, and Lowest Cost Among Available Suppliers, with live automatic routing disabled.
- [x] Evaluate only approved Step 3 Supplier Offers using supplier state, offer state, approved mapping, category, product identity, denomination, currency, region, platform, and delivery/input compatibility; never auto-map an offer or compare across categories.
- [x] Provide Admin routing controls to select a strategy, set supplier priority/enablement, simulate a Master Product decision, view eligible offers and fallback candidates, manually select a supplier for test simulation, and review safe decision/failure history without submitting supplier orders.
- [x] Preserve VAMNUX customer prices, markup, existing products, supplier costs/credentials, orders, wallets, transactions, mappings, API relationships, routing of live orders, fulfilment, and storefront behavior; record only Admin simulation metadata.
- [x] Verify live routing remains disabled, pricing remains isolated, eligibility rules are enforced, Admin authorization is protected, deterministic tests/build/visual review pass, and preservation counts remain intact; stop after Step 6 for owner approval before Step 7.

- [x] Create additive owner-only order lifecycle, immutable commercial snapshot, duplicate-request guard, simulation records, and append-only event-history support for PENDING PAYMENT, PAID, PROCESSING, SUPPLIER SUBMITTED, SUPPLIER PROCESSING, COMPLETED, FAILED, CANCELLED, REFUND PENDING, and REFUNDED statuses.
- [x] Record VAMNUX order identity, customer, Master Product, selected supplier/offer when applicable, customer selling price, supplier cost, currency, exchange rate, markup, expected profit, payment/supplier/order status, supplier reference, delivery input, timestamps, and safe API-reference metadata separately without ever repricing historical records.
- [x] Provide Admin order management to search/filter/view simulated lifecycle records, inspect safe supplier/payment/fulfilment details and event history, and run only eligible simulated retry/cancel/refund transitions with duplicate-order protection; never submit to suppliers, charge customers, deduct wallets, or create real refunds.
- [x] Preserve existing products, prices, orders, wallets, transactions, routing, supplier selection, mappings, API relationships, credentials, payments, fulfilment, and storefront behavior. Keep live supplier submission, automatic routing, automatic fulfilment, and automatic mapping disabled.
- [x] Verify lifecycle safeguards, immutable snapshots, duplicate protections, Admin authorization, deterministic tests/build/visual review, and preservation counts; stop after Step 7 for owner approval before Step 8.

- [x] Create additive owner-only immutable financial snapshots, financial event history, and server-side calculation support for customer selling price, supplier cost, payment/other fees, gross revenue, gross profit, refunds, net revenue, net profit, and profit margin without changing existing records.
- [x] Provide an Admin-only Financial Dashboard with aggregate, product/category/supplier profitability, date/product/category/supplier/currency/status filters, and protected financial alerts for negative margin, supplier cost above selling price, low margin, missing supplier cost/rate/payment fee, and unusual price changes.
- [x] Preserve original order financial snapshots across future supplier-price, exchange-rate, markup, payment-fee, or catalog changes; never expose supplier costs or Admin financial analysis to customers.
- [x] Do not modify products, customer prices, supplier costs, existing orders, wallets, transactions, payment providers, payment records, refunds, routing, fulfilment, mappings, credentials, or storefront behavior during Step 8.
- [x] Verify financial isolation, immutable snapshot behavior, alert logic, Admin authorization, deterministic tests/build/visual review, and preservation counts; stop after Step 8 for owner approval before Step 9.

- [x] Create an additive owner-only Catalog Preparation workspace that presents existing supplier-normalized products in bounded review batches, grouped by their existing categories, without deleting, renaming, recategorizing, repricing, migrating, or changing supplier IDs, costs, links, routing, fulfilment, or storefront behavior.
- [x] Expose safe Admin-only product comparison fields for product name, category, supplier, supplier product ID, supplier cost/currency, region, platform, denomination, availability, existing customer price, and mapped state, with category/supplier/currency/region/platform/mapping-status filters.
- [x] Reuse the approved Step 3 review workflow with catalog-preparation statuses UNMAPPED, REVIEW REQUIRED, APPROVED MATCH, and REJECTED MATCH; enforce category-specific exact-attribute comparison and never auto-map or compare across categories.
- [x] Provide controlled Admin actions to create a Master Product, add/remove a supplier offer, approve/reject a match, and explicitly keep products separate, limited to individual records in a small review batch; do not run a bulk migration or storefront change.
- [x] Verify batch limits, category separation, Admin authorization, no automatic mappings, deterministic tests/build/visual review, catalog preservation, and per-category/unmapped preparation counts; stop after Step 9 for owner approval before any catalog migration.
