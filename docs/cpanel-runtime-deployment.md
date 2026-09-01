# VAMNUX External cPanel Runtime Deployment

The VAMNUX production artifact is built before upload. **Namecheap cPanel must not run Vite or `npm run build`.** The artifact includes the bundled Express/tRPC server in `dist/index.js`, the compiled client files in `dist/public/`, a runtime-only `package.json`, and its generated `package-lock.json`.

Run `npm run package:cpanel` only in the build environment. It creates `/home/ubuntu/vamnux-cpanel-runtime/` with the deployable `dist/` directory, a runtime-only `package.json`, generated `package-lock.json`, and `DEPLOYMENT.md`; then archive and upload the resulting artifact. No secrets are copied into the artifact.

## cPanel Runtime Requirements

| Requirement | Required value or action |
|---|---|
| Node.js | Version 22.x |
| Application mode | Production |
| Startup file | `dist/index.js` |
| Install action | cPanel **Run NPM Install** after uploading the runtime artifact |
| Build action on cPanel | None; never run Vite or `npm run build` there |
| Port | Let cPanel/Passenger supply `PORT`; do not override it |
| Secrets | Configure server variables in cPanel, never in Git or a public `.env` file |

The runtime environment must provide `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `OWNER_OPEN_ID`, and any enabled supplier/Forge/Paystack TEST variables. `PAYSTACK_TEST_SECRET_KEY` remains server-only. Before cutover, confirm that the `DATABASE_URL` points to the Namecheap database endpoint reachable from the Node application—either the local cPanel database host or an explicitly authorized remote database—and that it exposes the required VAMNUX schema.

## Native Customer Accounts and Resend

The native Namecheap MySQL account flow is deliberately **disabled by default**. Do not enable it on the current Manus deployment. During the private cPanel staging step only, configure these server-side values in cPanel after the reviewed schema script has been applied to the copied Namecheap database:

| Variable | Required staging value | Purpose |
|---|---|---|
| `RESEND_API_KEY` | Owner-configured secret | Sends verification and password-reset email only. |
| `RESEND_FROM_EMAIL` | `VAMNUX <no-reply@send.vamnux.com>` | Uses the verified Resend sending domain. |
| `VAMNUX_PUBLIC_APP_URL` | The exact HTTPS cPanel staging URL | Validates mutation origin and creates one-time action links. |
| `VAMNUX_NATIVE_AUTH_ENABLED` | `false` until private tests are ready, then `true` only for the private test | Prevents accidental customer activation. |

Use `docs/namecheap-native-auth-schema.sql` as the reviewed canonical script for the copied Namecheap database. Do **not** apply generated migrations `0044_slim_freak.sql` or `0045_mixed_dragon_man.sql` directly: they reflect an earlier schema-drift path. No real email should be sent unless the owner explicitly approves one private owner-address test.

## Cutover Validation

Before switching production DNS, validate that cPanel can run `npm install`, that `dist/index.js` starts under the cPanel-managed port, that the database is reachable, and that the public domain has HTTPS. Validate one owner-approved native enrollment, sign-in, password reset, customer-account read, administrator-MFA rollback path, supplier read, and Paystack **TEST** wallet flow in the private cPanel environment. Then update the OAuth approved callback URL and Paystack TEST callback/webhook URLs to the new HTTPS domain. Keep Paystack in TEST mode.
