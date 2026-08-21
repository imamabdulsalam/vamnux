# VAMNUX Native Account Recovery Status

The `/forgot-password` and `/reset-password` views were visually checked at desktop size on 2026-08-21. Both render the VAMNUX account-security layout, clear form labels, password-strength requirements, reset-session safety text, and a visible return-to-sign-in path.

Transactional email delivery remains **fail-closed**. Without a verified sender and a server-only `RESEND_API_KEY`, VAMNUX does not issue a usable recovery link, claim that an email was sent, or expose a recovery token. The interface explains this state after a recovery request. When a verified Resend sender credential is configured later, the same server workflow will send expiring, single-use verification and reset links.
