# VAMNUX Super Admin Master Brief Reconciliation

**Reviewed:** 20 August 2026

## Operating principles

The VAMNUX Super Admin Panel is an **owner-only operational system**, not a cosmetic dashboard. The existing `adminProcedure` remains the required server-side boundary for every privileged read and mutation. The active owner account remains the only Super Admin; no additional admin account, password, email-reset, 2FA, or role is fabricated while Supabase and Resend stay deliberately disabled.

All Admin figures must be derived from persisted marketplace data. The current database has no settled payments, supplier fulfilments, refunds, completed orders, customer purchases, loyalty balances, referral conversions, or financial revenue. The expanded Admin UI must therefore use explicit zero and unavailable states rather than sample business results.

| Master-brief capability | Current foundation | Approved expansion approach | Safety boundary |
|---|---|---|---|
| Secure Admin access | Owner role, protected API procedures, HttpOnly OAuth session | Retain `/admin/login` and `/admin/dashboard`; extend server-side authorization and audit scope | Email/password, password reset, 2FA, device/IP monitoring await the staged Supabase/Resend identity activation |
| Dashboard & activity | Aggregated catalog, customer, supplier, order, wallet, and audit counts | Add real activity, operational filters, search, and status views | Never create fake revenue, failed orders, transactions, or uptime data |
| Products, pricing & variants | Supplier catalog, product status, default 25% markup, per-product overrides | Add structured Admin status/visibility/content controls, calculation previews, price history, and conservative bulk operations | Supplier base cost remains private; price writes require confirmation and audit logging |
| Categories & storefront content | Static storefront categories and editable draft policy pages | Add controlled Admin content/settings models and public consumption only for approved records | Do not silently change existing category policy or invent product inventory |
| Suppliers & synchronization | Isolated FlashTopUp (paused), FoxReload, and GamesDrop adapters | Extend health, catalog mapping, sync history, masked configuration status, and error visibility | No browser credentials, automatic sync, supplier balance call, supplier order, retry, or fulfilment without separate approval |
| Customers, wallets & support | Customer profile, ledger, funding requests, tickets, privacy requests, notifications | Extend owner-only lookup, account-status review, wallet-ledger visibility, support workflow, and safe internal metadata | No password/card display, no direct balance overwrite, no synthetic support content |
| Payments, refunds & order engine | Wallet-only order eligibility and manual funding-review safeguards | Readiness/status monitoring only until a provider is configured | No gateway checkout, provider verification, refund, wallet auto-credit, supplier order, or order retry |
| Finance, analytics & exports | Authentic zero-order data, public catalog prices, wallets, audit events | Real derived metrics and authorized CSV export when source facts exist | No estimated financial results without known payment fees, refunds, settled orders, and supplier cost data |
| Promotions, referral, loyalty, reseller | No existing business rules or balances | Build disabled/empty Admin configuration models only after explicit rules are recorded | Do not award customer credits, discounts, points, or reseller terms by assumption |
| Scheduled sync, job & webhook monitoring | Supplier webhook receipts and manual bounded sync procedures | Expose truthful manual state and existing webhook events | Scheduled automation requires separate approved scheduling design and cannot be implied by a dashboard toggle |

## Delivery sequence

The first expansion will concentrate on production-safe modules that can operate on the current data: Admin navigation, global search, product visibility and pricing history, category/content configuration, customer and wallet inspection, support workflow, real audit activity, supplier/webhook monitoring, and truthful finance/analytics zero states.

Payment collection, payment verification, refunds, wallet auto-credit, direct wallet debit, supplier ordering, supplier retry, fulfilment, automatic catalog synchronization, email delivery, SMS/WhatsApp, password authentication, Google sign-in, and MFA remain **explicitly inactive**. Each requires a separate approved integration and test plan before implementation can move from readiness to operation.

