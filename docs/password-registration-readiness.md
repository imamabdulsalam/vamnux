# VAMNUX Password Registration Readiness

**Assessment date:** 20 August 2026

## Current identity boundary

VAMNUX currently uses the active **Manus OAuth** provider. A new visitor is provisioned on their first successful provider sign-in, and protected marketplace access is resolved from the provider-backed session. This flow safely supports account-scoped profile data, orders, wallet entries, saved products, support, notifications, and security activity. It does **not** create a VAMNUX password.

The current database can safely store the requested marketplace profile attributes after trusted authentication: first and last name, username, country, optional phone, registration source, and separately recorded Terms/Privacy and optional marketing consent. It deliberately has no password hash, reset-token, email-verification-token, MFA-secret, or password session model. The current environment also has no configured transactional-email or password-authentication provider.

## What cannot be activated safely today

VAMNUX must not show a functional password field or a “Create account” submission that merely stores or discards a password. A password registration system also requires verified email delivery, password hashing and breach-resistant policy enforcement, reset tokens, rate limiting, generic anti-enumeration errors, verified session issuance, logout/revocation behavior, and account-linking conflict controls. Implementing only the visual form would be deceptive and unsafe.

## Recommended secure create-account design

Once an approved identity provider and transactional-email setup are available, VAMNUX can provide the requested registration experience with the following fields and controls.

| Field or control | Requirement | Data handling |
|---|---|---|
| First and last name | Required | Stored in the existing customer profile after verified registration |
| Country | Required | Stored as a two-letter country code in the existing customer profile |
| Email | Required and verified | Managed by the identity provider; generic errors prevent account enumeration |
| Where did you hear about VAMNUX? | Optional | Stored in existing registration-source metadata |
| Phone | Optional | Collected only if the user chooses to provide it; no SMS is enabled by default |
| Password and confirmation | Required only after a password-capable provider is active | Never sent to VAMNUX database columns or logs; handled by the approved provider |
| Password requirements | At least 12 characters with upper-case, lower-case, number, and symbol; reject common/breached passwords when provider supports it | Real-time guidance only; the server/provider remains authoritative |
| Terms and Privacy acceptance | Required, separately timestamped | Recorded independently from optional marketing consent |
| Marketing consent | Optional and off by default | Stored separately and never bundled with required terms acceptance |
| Email verification | Required before normal account activation | Provider sends and verifies the email challenge |

## Provider decision required

To activate this securely, VAMNUX needs either: **(1)** an approved managed identity provider with its server-side and public configuration values plus email verification setup, or **(2)** an explicitly approved native-authentication and transactional-email architecture, including a tested email sender, secure password hashing/recovery design, abuse controls, and an account-migration plan. Manus OAuth should remain as an active fallback until those flows have passed end-to-end acceptance tests.

No payment provider, wallet auto-credit, supplier ordering, supplier retry, or fulfilment behavior is part of this identity requirement.

