# VAMNUX Super Admin Architecture Review

**Reviewed:** 20 August 2026

## Current operating baseline

VAMNUX already has an OAuth-backed user session, a server-side `adminProcedure` guard, an owner role, a MySQL marketplace database, supplier-scoped catalog storage, protected global and per-product customer-price rules, customer profiles, wallets with ledger entries, draft orders, and supplier webhook receipts. Supplier and payment credentials remain environment-managed and are not returned by the browser API.

The production database currently has **1 user**, **648 active products**, **3 supplier integrations**, and no recorded orders, wallet entries, or saved products. Accordingly, early admin metrics must render authentic zero and empty states rather than sample revenue, orders, or customers.

## Brief-to-roadmap reconciliation

| Brief area | Existing VAMNUX foundation | Phase-1 Super Admin implementation | Explicitly deferred |
|---|---|---|---|
| Owner security | OAuth session, owner admin role, server-side `adminProcedure` | `/admin/login` and `/admin/dashboard` route guard using the existing identity session; append-only admin audit events | Separate email/password login, password reset, device/IP monitoring, and external 2FA until an identity provider is chosen |
| Dashboard | Products, integrations, orders, wallet records available in the database | Real aggregate metrics, supplier status, catalog count, zero/empty-safe order and wallet states | Revenue/profit calculations that require settled payments and supplier costs on completed orders |
| Products & pricing | Active catalog, source metadata, global 25% markup, per-product percentage/fixed-price override | Product controls, price preview, global and per-product editing, confirmation and audit trail | Category-level, tiered, bulk fixed-price, and exchange-rate rules pending a dedicated pricing-rule model |
| Suppliers | FlashTopUp paused; FoxReload and GamesDrop supplier adapters isolated | Read-only integration health, sync status, last error, scoped manual sync controls | Credential editing in-browser, supplier ordering, auto-sync schedules, balance calls without a documented safe operation |
| Customers & orders | User, customer profile, wallet, order, order item tables | Read-only customer and order inspection scoped to real data; no fake data | Manual fulfillment, retries, refunds, restrictions, and payment recovery until payment/order engine approval |
| Auditing | Webhook event records; no generic admin audit model yet | Append-only audit events for price and catalog/status changes | Retention policies, export workflows, and full forensic monitoring policy |
| Content, promotions, support, loyalty, resellers | No operational data model currently | Design only | Implementation after core controls are stable and business rules are supplied |

## Required owner decisions before privileged implementation

The first release can safely use the current owner-only OAuth authentication and server-side authorization. Separate email/password login, password reset, and 2FA cannot be responsibly improvised; they need a selected identity provider and its configured credentials. Payments, wallet funding, refunds, supplier-order sending, automated synchronization, and order retries remain disabled pending explicit approval.

The recommended Phase-1 delivery is a protected dashboard, product and pricing workspace, supplier status and safe sync controls, read-only customers/orders, system health, and audit logs. This provides useful control over the real marketplace without activating financial or fulfillment risk.

