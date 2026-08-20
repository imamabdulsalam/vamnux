# VAMNUX Credential-Independent Customer Account Expansion

**Completed:** 20 August 2026

## Delivered account capabilities

VAMNUX retains its existing Manus OAuth session and adds real-data account structures without replacing, weakening, or retiring the active authentication path. The additive migration introduces customer profile metadata, independently recorded consent decisions, customer security events, notification preferences, customer notifications, private support tickets and messages, privacy requests, and editable public policy pages. Existing user, wallet, order, supplier, and Admin records were preserved.

The User Dashboard now includes real Profile, Notifications, Support, Security, and Settings views alongside existing wallet, orders, and favorites. Each account operation is protected by the server and scoped to the authenticated user. An unauthenticated caller cannot query or mutate profile, notification, support, privacy, or private ticket data. There are no fabricated orders, wallet balances, tickets, notifications, rewards, referrals, delivery events, or account activity.

Successful Manus OAuth sign-ins now create a non-sensitive customer security event. The application does not retain precise device or location data in that customer-facing activity feed. Users can create their own support tickets, read their own ticket threads, reply to open tickets, manage eligible notification preferences, request privacy review, and update non-authentication profile fields.

The Super Admin Panel has an owner-only Support workspace. An administrator can inspect real tickets and send a private reply, with a customer account notification and append-only Admin audit event created by the protected server-side operation. A non-admin cannot list, inspect, or reply to support tickets.

Four public VAMNUX policy pages—Terms, Privacy, Refund, and Cookie—are initialized as clearly labelled, database-backed **editable legal drafts**. They state that owner/legal review is still required and never claim final approval.

## Deferred identity and funding capabilities

Supabase Auth, Supabase API, and Resend remain disabled at the owner’s direction. Therefore, VAMNUX has not exposed unavailable email/password registration, email verification, password reset, Google sign-in, TOTP/MFA, session management, or transactional-email features. Manus OAuth remains the active fallback. Future Paystack, Korapay, and crypto funding integrations remain provider-confirmation work; wallet credits still require the current protected Admin settlement process, and supplier orders remain deferred.

VAMNUX now also has a dedicated `/login` account-entry page. It presents the active secure sign-in handoff and describes the wallet/account benefits without claiming that deferred email/password, Google, reset, or MFA flows are active. Existing header account access routes unauthenticated customers to this entry point rather than directly starting a hidden handoff.

The marketplace now stores a separate, additive provider identity link. The existing production user was backfilled as a `manus_oauth` link, and each future successful Manus OAuth sign-in refreshes that real link. The future `supabase` link is reserved but has no records and does not influence current access, roles, wallets, orders, or sessions.

## Verification

The full deterministic suite passed: **58 tests passed** with **5 opt-in FlashTopUp tests skipped**. The production build passed. The pre-existing external FoxReload live-network test remains excluded after its earlier timeout. Desktop visual checks confirmed the marketplace home, the authenticated user dashboard with truthful zero-state account metrics, and the editable-draft policy page. The customer-facing catalog and cart now use text fallbacks rather than emitting an empty image source when a supplier artwork URL is absent.
