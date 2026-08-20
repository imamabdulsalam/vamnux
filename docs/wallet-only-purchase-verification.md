# VAMNUX Wallet-Only Purchase Preparation

**Completed:** 20 August 2026

VAMNUX now has a wallet-only product-order boundary. Product carts do not display a direct card, bank-transfer, Paystack, Korapay, or crypto payment method. An authenticated customer must have an active, matching-currency wallet with enough **settled** balance before the protected server can create a product-order draft. The server independently checks wallet status, currency, and balance; the browser display is informative only.

Current product orders remain drafts. The eligibility check does not debit the wallet, initiate a provider payment, send a supplier order, or trigger fulfilment. This preserves the user-approved deferred supplier-order policy until the end-to-end wallet settlement and supplier workflow is explicitly activated.

Customer carts now show wallet-only guidance, their actual current wallet balance after sign-in, and a **Check wallet eligibility** action. The User Dashboard exposes pending top-up requests; the Super Admin dashboard shows pending requests and manual-review status. System health accurately reports manual review for wallet top-ups and no payment-provider checkout.

Future Paystack, Korapay, and crypto funding integrations must credit the wallet only after their server-side verified confirmation or webhook processing. Until a provider is configured, customers can submit an Admin-reviewed top-up request but are not shown a provider checkout.

TypeScript, 56 deterministic tests, and the production build passed. The wallet-only eligibility tests cover sufficient exact balance, insufficient balance, locked wallet, and mismatched-currency cases. Authenticated User Dashboard and Super Admin shells were visually reviewed with their real zero-balance and no-request states. No payment, wallet debit, supplier order, or fulfilment action was performed.

