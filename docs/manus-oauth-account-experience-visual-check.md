# Manus OAuth Account Experience Visual Check

**Reviewed:** 20 August 2026

The authenticated desktop storefront header preserves catalog search, currency selection, account access, favorites, cart, and category navigation. The compact social icons render between search and account actions at desktop width; they are intentionally informational until VAMNUX supplies official social-channel URLs. The authenticated account dashboard remains reachable and displays the existing account-scoped profile, wallet, order, favorites, notification, support, security, and settings navigation without an unauthenticated redirect loop.

Because the persisted browser session is authenticated, the header correctly renders its **Account** action rather than the unauthenticated **Sign in** and **Create account** pair. Those distinct controls remain available for unauthenticated visitors through the same protected `/login` account-entry route.

