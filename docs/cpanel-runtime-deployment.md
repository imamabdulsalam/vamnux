# VAMNUX External cPanel Runtime Deployment

The VAMNUX production artifact is built before upload. **Namecheap cPanel must not run Vite or `npm run build`.** The artifact includes the bundled Express/tRPC server in `dist/index.js`, compiled client files in `dist/public/`, local product artwork in `uploads/`, a runtime-only `package.json`, and its generated `package-lock.json`.

Run `npm run package:cpanel` only in the build environment. It creates `/home/ubuntu/vamnux-cpanel-runtime/` with deployable `dist/` and `uploads/` directories, a runtime-only `package.json`, generated `package-lock.json`, and `DEPLOYMENT.md`; then archive and upload the resulting artifact. No secrets are copied into the artifact.

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

The independent runtime environment must provide `DATABASE_URL`, `JWT_SECRET`, `VAMNUX_PUBLIC_APP_URL`, `VAMNUX_NATIVE_AUTH_ENABLED`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `VAMNUX_ADMIN_EMAIL`, and `PRODUCT_TRACKING_CRON_SECRET`, plus the enabled supplier and Paystack **TEST** variables. `PAYSTACK_TEST_SECRET_KEY` remains server-only. It does not use `VITE_APP_ID`, `OAUTH_SERVER_URL`, `OWNER_OPEN_ID`, or the managed Forge variables. Before cutover, confirm that `DATABASE_URL` points to the Namecheap database reachable from the Node application and exposes the required VAMNUX schema.

## Native Customer Accounts, Resend, and Local Media

The Namecheap MySQL account flow is the independent VAMNUX sign-in method. Configure these server-side values in cPanel after the reviewed schema script has been applied to the final copied Namecheap database:

| Variable | Required staging value | Purpose |
|---|---|---|
| `RESEND_API_KEY` | Owner-configured secret | Sends verification and password-reset email only. |
| `RESEND_FROM_EMAIL` | `VAMNUX <no-reply@send.vamnux.com>` | Uses the verified Resend sending domain. |
| `VAMNUX_ADMIN_EMAIL` | Owner-configured administrator email | Receives owner alerts; never expose it in the browser. |
| `VAMNUX_PUBLIC_APP_URL` | `https://vamnux.com` | Validates account mutations and creates one-time action links. |
| `VAMNUX_NATIVE_AUTH_ENABLED` | `true` | Enables the VAMNUX email-and-password account flow. |
| `PRODUCT_TRACKING_CRON_SECRET` | A unique private value of at least 32 characters | Authenticates the cPanel five-minute Product Tracking callback. |
| `VAMNUX_UPLOAD_DIR` | Optional; leave unset to use the artifact’s `uploads/` directory | Stores new administrator-uploaded product images locally. |

Use `docs/namecheap-native-auth-schema.sql` as the reviewed canonical script for the final copied Namecheap database. Do **not** apply generated migrations `0044_slim_freak.sql` or `0045_mixed_dragon_man.sql` directly: they reflect an earlier schema-drift path. The included `uploads/` directory contains the six existing product images that previously used remote storage; old database paths continue to resolve locally through a compatibility route. No real customer email should be sent before the owner confirms the account transition is ready.

## Product Tracking Every Five Minutes

Create **one** cPanel Cron Job after the Node application, environment variables, and final DNS have been made active. Set it to run every five minutes and call the private VAMNUX route below, replacing the bracketed text only inside cPanel with the same secret saved in `PRODUCT_TRACKING_CRON_SECRET`:

```sh
*/5 * * * * curl --fail --silent --show-error --request POST --header 'X-VAMNUX-CRON-KEY: [your private scheduling value]' https://vamnux.com/api/scheduled/product-tracking >/dev/null 2>&1
```

The request runs every five minutes, but VAMNUX checks each supplier only when its stored two-, ten-, or twenty-four-hour due time has arrived. It never creates supplier orders, charges wallets, or changes payment records.

## Cutover Validation

Before switching production DNS, validate that cPanel can run `npm install`, that `dist/index.js` starts under the cPanel-managed port, and that the final Namecheap database is reachable. Apply the reviewed native-auth schema script only after the final database snapshot/import has completed. The two existing Super Admins must create native passwords through their verified email links and enrol an authenticator app before Admin access opens. Confirm supplier read access and Paystack **TEST** wallet funding configuration; keep Paystack in TEST mode. The Paystack webhook route remains `/api/webhooks/paystack`. Create the five-minute cPanel cron only after the new domain points to this application.
