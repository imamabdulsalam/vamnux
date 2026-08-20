# VAMNUX Staged Supabase Identity Migration Assessment

**Assessment date:** 20 August 2026

## Current identity architecture

VAMNUX currently uses **Manus OAuth** as its active identity provider. The `/api/oauth/callback` route exchanges the provider code, upserts an existing `users` row keyed by its immutable Manus `openId`, sets the secure signed session cookie, refreshes a parallel `manus_oauth` identity link, and records a limited security event. Request context resolves this current cookie before every tRPC procedure, while customer procedures scope reads and writes through `ctx.user.id`; owner-only administration is gated server-side by `adminProcedure`.

The current managed database contains **one** `users` row, **one** `customer_profiles` row, **one** identity link, **one** Manus OAuth identity link, and **zero** Supabase identity links. No customer record, wallet, order, support ticket, notification, or saved product will be deleted or overwritten by the proposed staged migration.

| Data model | Existing ownership key | Supabase migration treatment |
|---|---|---|
| `users` | Internal numeric `users.id`; Manus `openId` is currently mandatory and unique | Keep the row and internal ID stable. Add a separate Supabase identity mapping; do not replace the active Manus key during staging. |
| `customer_profiles` | `userId` one-to-one relationship | Preserve without re-keying. New sign-ups receive a new internal user/profile record only after Supabase verification succeeds. |
| `customer_identity_links` | `userId`, provider, provider subject | Use the existing `supabase` provider row to link a verified Supabase subject to exactly one internal VAMNUX user. |
| Dashboard, wallet, orders, favorites, notifications, support, security | `userId` in the VAMNUX MySQL database | Keep customer isolation server-side by resolving every Supabase session to its mapped internal user before any protected VAMNUX operation. |

## Password and account-mapping implications

No VAMNUX password hashes exist: Manus OAuth credentials and session tokens are external to the VAMNUX database. **Existing users’ passwords cannot be migrated** to Supabase and must never be guessed, copied, or fabricated. An existing Manus OAuth user who wants a Supabase password must complete the Supabase email-verification and set-password/reset-password process.

Automatic linking by email alone is unsafe. The staged design must link the current Manus-backed account only after the user has authenticated to both providers in a controlled account-linking flow and the Supabase email is verified. If an email is absent, unverified, already mapped to a different internal user, or conflicts with the owner account, the flow must stop with a generic support-safe message and leave all records unchanged.

## Staged implementation design

The first release will run both providers in parallel. Manus OAuth remains the working fallback and the existing Super Admin route continues to use its established owner-only policy until an explicit cutover approval. Supabase sessions will be verified server-side using the Supabase project URL and **server-only** service configuration; a public browser client may receive only the Supabase URL and anon/publishable key. The service-role key must never be bundled, returned through tRPC, logged, exported, or exposed in Admin screens.

| Capability | Staged behavior | Activation condition |
|---|---|---|
| Email/password sign-up and verification | Create a Supabase account and a pending internal profile only after verified callback processing | Supabase project URL, anon key, service-role key, and redirect URLs are configured |
| Password sign-in/recovery | Supabase-managed sign-in and reset routes with generic responses that do not reveal account existence | Supabase SMTP/email settings are verified |
| Existing Manus OAuth user linking | Explicit verified link to existing internal user; no automatic overwrite | User proves control of both sessions and email conflict checks pass |
| Google OAuth | Code path and UI may be prepared, but it remains disabled | Google OAuth client ID/secret and Supabase redirect URLs are configured and approved |
| MFA/TOTP | Offer only after the primary Supabase session is verified; recovery-code policy must be agreed before production activation | Supabase MFA capability and secure recovery policy are configured |
| Logout all devices | Revoke Supabase sessions using a server-side authenticated flow; leave Manus fallback session behavior intact until separate cutover | Supabase credentials and session lifecycle are validated |
| Row-level access | VAMNUX customer data remains in MySQL and is guarded by server-side internal-user resolution. Supabase RLS applies only to Supabase-managed resources if used later. | No direct browser connection to VAMNUX MySQL data |

## Required configuration before implementation can continue

VAMNUX needs a real Supabase project. Required secure variables are `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. The service-role value is server-only. Supabase Auth must also be configured with the VAMNUX production and development redirect URLs, an email sender/SMTP setup that can send verification and password-reset email, and appropriate password/session policies.

For Google OAuth, VAMNUX additionally needs a real `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` configured in the Supabase provider dashboard, along with exact callback URLs. Google login must remain disabled until those settings are confirmed. No payment provider, wallet auto-credit, supplier order, supplier retry, automatic fulfilment, or live payment processing is included in this migration.

## Owner decision and current delivery status

The owner subsequently confirmed that **Supabase will not be configured at this time**. No Supabase credential was provided or stored, and no Supabase client, service-role process, email/password flow, password reset, Google OAuth, MFA/TOTP, or session-revocation flow was added. VAMNUX therefore continues to use only its existing Manus OAuth account session, with the account-entry experience, protected profile completion, account-scoped dashboard, real sign-in activity, and customer isolation retained and improved.

The remaining action required for a future real email/password identity migration is a user-approved identity provider project and its secure credentials. Until then, the current system must not imply that it supports email registration, email verification, password recovery, Google sign-in, or MFA.

## Risks and controls

The principal risks are accidental account merging, replacing the owner account, accepting an unverified email, exposing a service-role credential, and leaving a customer with no recovery path. The proposed controls are internal-ID preservation, explicit verified linking, unique provider-subject constraints, server-side session resolution, generic authentication errors, append-only security events, retained Manus OAuth fallback, and a cutover only after end-to-end acceptance tests pass.
