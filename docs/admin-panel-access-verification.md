# VAMNUX Admin Panel Access Verification

The protected Super Admin route is `/admin/dashboard`; `/admin` is not a registered application route and correctly resolves to the standard not-found view.

The configured server-only `VAMNUX_ADMIN_EMAIL` allowlist is paired with the server-side `admin` role for every Admin procedure. Automated tests confirm that the configured owner email can call the lightweight System Health Admin endpoint, while a different Admin-role email is rejected before protected records are returned. The client access gate now uses the same server-authorized result before loading the Super Admin workspace.
