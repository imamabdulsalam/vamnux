# VAMNUX Wallet Top-Up Request Workflow

**Completed:** 20 August 2026

VAMNUX now supports a customer-initiated **wallet top-up request** through the authenticated User Dashboard. A submission creates a customer-scoped `pending` funding request only. It does not collect payment details, open a payment checkout, receive funds, credit the wallet, create a supplier order, or initiate fulfilment.

The Super Admin Panel now includes a **Wallet Funding** review workspace. A request can only be settled after an owner enters an independently verified payment reference and confirms the credit action. Settlement creates one immutable `wallet_entries` credit with a unique `wallet-funding:<fundingCode>` reference, updates the wallet balance, marks the request settled, and inserts an append-only audit event in one database transaction. A rejected request is marked failed and produces no ledger credit.

There are currently no configured payment integrations, no funding requests, and no wallet entries. No request, settlement, payment, balance credit, supplier order, or fulfilment action was created for testing. Validation covered TypeScript, 55 deterministic tests, authorization checks preventing unauthenticated request submission and non-admin settlement, and the production build. Five opt-in FlashTopUp tests remain skipped; the earlier external FoxReload live-network timeout test remains excluded from deterministic validation.

