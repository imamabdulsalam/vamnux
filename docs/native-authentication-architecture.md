# VAMNUX Native Authentication Architecture

**Decision:** The owner approved a separate native VAMNUX email/password and transactional-email setup. Manus OAuth remains active during the rollout and continues to protect the owner account.

## Security model

Native authentication will use Node’s built-in **scrypt** memory-hard password hashing in this runtime, opaque single-use token hashes for future email verification and password reset, and server-side session records that can be revoked individually or in bulk. VAMNUX will never store, log, export, or return a plaintext password, verification token, reset token, or transactional-email API key. Argon2 was evaluated but its native worker binding was unstable in the current runtime, so it was not retained.

| Capability | Native-auth design | Safeguard |
|---|---|---|
| Registration | First name, last name, country, email, referral source, optional phone, required Terms/Privacy acceptance, optional marketing consent, password, and confirmation | Normalize email; validate all input server-side; no account is activated until email verification succeeds |
| Password policy | At least 12 characters including upper-case, lower-case, number, and symbol; no customer details or common passwords | Client guidance is advisory; the server is authoritative |
| Credential storage | `native_credentials` record linked to the existing internal user ID | Memory-hard scrypt password hash only; unique normalized email; no password field on `users` or `customer_profiles` |
| Verification/reset | Opaque random token, token hash only, limited lifetime, one-time use, purpose-bound | Generic response messages; expired/used tokens are rejected without disclosing account data |
| Sessions | `native_sessions` records carrying hashed opaque session IDs, expiry, revocation state, and minimal audit metadata | Secure HttpOnly cookie; logout and logout-all revoke session records server-side |
| Abuse protection | Persisted rolling registration, login, recovery, and verification rate limits keyed by a privacy-minimized hash | Generic errors; cooldowns; no email-address enumeration response |
| Existing Manus users | Existing internal user ID, profile, orders, wallet, saved products, support tickets, and Admin rights stay untouched | No automatic email merge. Linking requires active Manus OAuth authentication plus a verified native email challenge |
| Administration | The owner remains on the existing Manus OAuth authorization path until a separately approved migration | Native accounts start with `user` role only; no Admin role is created by registration |

## Additive data model

The rollout adds only native identity and session tables. Existing OAuth users, MySQL account data, wallet entries, order records, product access, supplier integrations, and audit histories are not altered.

1. `native_credentials` stores the internal `userId`, normalized email, Argon2id hash, verification status, password-change time, and credential state.
2. `native_auth_tokens` stores purpose-bound verification/reset token hashes, expiration, issued time, and single-use completion time.
3. `native_sessions` stores a hashed opaque browser session ID, internal user ID, creation/expiry/revocation times, and a privacy-minimized client fingerprint hash.
4. `native_auth_rate_limits` stores hashed rate-limit keys, action types, attempt count, and window expiration.

The existing identity-link model will receive an additive `native_email` provider option. A new native user receives a unique internal user `openId` with a server-generated `native:` prefix solely to satisfy the retained legacy user key. No provider secret, password hash, or email token is stored in that field.

## Transactional email configuration required

VAMNUX needs a transactional-email provider before email verification or recovery can be activated. The recommended delivery path is **Resend**, using server-only `RESEND_API_KEY` and an approved `AUTH_EMAIL_FROM` sender such as `VAMNUX <accounts@yourdomain.example>`. The sender domain must be verified by the owner in the chosen email provider. VAMNUX will send only verification and recovery links to a fixed in-app route built from the browser origin; it will not send marketing mail without optional consent.

The session connector configuration could not be inspected because the current connector service returned `403 Forbidden`. This does not establish that email delivery is unavailable; it only means an existing task connector cannot be assumed. Provider credentials must be supplied through the project’s secure environment mechanism.

## Rollout and acceptance criteria

Before a public native registration button is enabled, VAMNUX must successfully complete registration, email delivery, token verification, sign-in, failed-login rate limiting, password reset, session revocation, logout-all, existing-Manus account linking, account isolation, and mobile/desktop UI tests. Payments, wallet auto-credit, supplier ordering, retries, and fulfilment remain outside this rollout.
