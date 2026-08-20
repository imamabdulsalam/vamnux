# GamesDrop Integration Verification

**Completed:** 20 August 2026

The initial GamesDrop catalog sync made read-only supplier catalog requests for **Telegram Stars**, **Steam**, **PUBG Mobile**, and **Free Fire**. It imported 93 supplier-scoped rows: 11 Telegram Stars denominations, 24 Steam offers, and 58 gaming top-up offers. No balance, order, player-validation, wallet, payment, or fulfilment endpoint was called.

Public VAMNUX policy keeps active Telegram Stars offers and **Global** Steam offers visible. The review confirmed an internal Telegram Stars detail page with a Telegram User ID requirement and a global Steam digital-code detail page with no supplier redirect. Both display the configured 25% VAMNUX customer-price rule.

## FoxReload cross-check

A separate bounded FoxReload read-only search for **Telegram Stars** and **Steam Wallet** returned 18 catalog rows with no failures. The mapper now places verified Telegram Stars and Steam Wallet offers in their dedicated VAMNUX categories. Account-delivered Steam products remain game keys, while Steam public visibility remains limited to supplier records marked **Global** or **WW** (worldwide); explicitly regional Steam stock remains stored but hidden from the primary catalog.
