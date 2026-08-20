# VAMNUX Customer Account Audit

**Reviewed:** 20 August 2026

## Existing production baseline

VAMNUX currently uses a server-managed Manus OAuth session. A successfully authenticated request resolves to the marketplace `users` table through a required unique `openId`; the owner’s existing open ID is assigned the `admin` role server-side. The current user-dashboard procedures then scope profiles, wallets, wallet ledger entries, pending top-up requests, orders, and saved products to that authenticated database user. The current production data contains one owner-admin user, one customer profile, one wallet, and no orders.

The current wallet model is server-side and ledger-backed. Product-order drafts require an active wallet with a matching currency and sufficient settled balance. Product carts do not offer direct payment, supplier ordering remains deferred, and no browser value can create a wallet credit or mark an order paid.

## Approved future identity architecture

The owner selected Supabase Auth for email/password authentication, verification, password reset, Google sign-in, MFA, and session management; Resend was selected for transactional email. The owner also explicitly directed that existing Manus OAuth remain active until the parallel identity flow, user migration, and account recovery paths have been tested and approved for cutover.

Supabase, Supabase API, and Resend integrations are currently **not enabled**. Consequently, VAMNUX must not present unavailable password, Google, reset, verification, or MFA features as active. Credential-independent account improvements can proceed; external identity and email features remain gated until the owner elects to enable the approved integrations and supplies credentials through secure configuration.

## Non-destructive implementation rules

Future identity links must attach a Supabase subject to an existing marketplace user rather than replace the existing `openId` or mutate historic wallet/order ownership. The current owner-admin role must remain intact. All sensitive customer capabilities must remain server-authorized, and no authentication secret, password, payment credential, supplier credential, or digital code can be exposed to the client.

## Visual verification

The authenticated account dashboard was reviewed with its genuine zero wallet balance, zero order count, zero notification count, and expanded navigation for Favorites, Profile, Notifications, Support, Security, and Settings. The database-backed Terms draft page was also reviewed; it visibly identifies itself as an editable draft for owner/legal review and does not claim to be an approved policy.

The marketplace homepage was rechecked after correcting image fallbacks. The active catalog header and hero render normally; catalog and cart components now use a text fallback rather than sending an empty image source when a supplier does not provide artwork. The expanded authenticated dashboard continues to show the real zero-state account metrics and account navigation without exposing Admin controls.
