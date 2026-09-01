import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactRoot = path.resolve(projectRoot, "..", "vamnux-cpanel-runtime");
const legacyMediaRoot = path.resolve(projectRoot, "..", "webdev-static-assets", "vamnux-namecheap-legacy");
const sourcePackage = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
const execFileAsync = promisify(execFile);

const runtimeDependencyNames = [
  "@trpc/server",
  "axios",
  "cookie",
  "dotenv",
  "drizzle-orm",
  "express",
  "jose",
  "mysql2",
  "nanoid",
  "otpauth",
  "qrcode",
  "superjson",
  "zod",
];

const runtimeDependencies = Object.fromEntries(
  runtimeDependencyNames.map(name => {
    const version = sourcePackage.dependencies?.[name];
    if (!version) throw new Error(`Missing declared runtime dependency: ${name}`);
    return [name, version];
  })
);

const runtimePackage = {
  name: `${sourcePackage.name}-cpanel-runtime`,
  version: sourcePackage.version,
  private: true,
  type: "module",
  engines: sourcePackage.engines,
  scripts: {
    start: "NODE_ENV=production node dist/index.js",
  },
  dependencies: runtimeDependencies,
};

const deploymentGuide = `# VAMNUX cPanel Runtime Artifact

This artifact is already built. Do not run Vite or \`npm run build\` on cPanel.

## Upload contents

Upload the entire artifact directory, including \`dist/\`, \`package.json\`, and \`package-lock.json\`, to the cPanel Node.js application root. Do not upload development source, \`node_modules\`, credentials, or local environment files.

## cPanel setup

1. Create or update the Node.js application with Node.js 22 and Production mode.
2. Set the startup file to \`dist/index.js\`.
3. Add the required server environment variables in cPanel. Do not create a publicly accessible \`.env\` file.
4. Use the cPanel **Run NPM Install** action. It installs runtime dependencies only; Vite is intentionally absent from this artifact.
5. Restart the application. cPanel/Passenger supplies \`PORT\`; do not set it manually.

## Required independent environment variables

- \`NODE_ENV=production\`
- \`DATABASE_URL\`
- \`JWT_SECRET\`
- \`VAMNUX_PUBLIC_APP_URL=https://vamnux.com\`
- \`VAMNUX_NATIVE_AUTH_ENABLED=true\`
- \`RESEND_API_KEY\`
- \`RESEND_FROM_EMAIL=VAMNUX <no-reply@send.vamnux.com>\`
- \`VAMNUX_ADMIN_EMAIL\`
- \`PRODUCT_TRACKING_CRON_SECRET\` (a unique private value of at least 32 characters)
- \`FLASHTOPUP_API_ID\`, \`FLASHTOPUP_API_SECRET\`, \`FOXRELOAD_API_KEY\`, and \`GAMESDROP_API_TOKEN\` when the respective supplier integration is enabled
- \`PAYSTACK_TEST_SECRET_KEY\` and \`PAYSTACK_TEST_CALLBACK_URL\` for Paystack TEST wallet funding

This artifact does not use \`VITE_APP_ID\`, \`OAUTH_SERVER_URL\`, \`OWNER_OPEN_ID\`, or managed Forge storage/authentication variables. Do not put any secret in the upload, Git, a browser bundle, or a public \`.env\` file.

## Local media and native accounts

The \`uploads/\` folder contains the six existing product artworks previously held in remote storage. Keep this folder with the runtime artifact. New administrator-uploaded product images are stored locally in \`uploads/\` unless \`VAMNUX_UPLOAD_DIR\` names another writable private path.

Use the reviewed \`docs/namecheap-native-auth-schema.sql\` script only after final database synchronization. Do not run generated migrations \`0044_slim_freak.sql\` or \`0045_mixed_dragon_man.sql\` directly.

## Product Tracking every five minutes

After the application and DNS are active, create one cPanel cron job that runs every five minutes and posts to \`https://vamnux.com/api/scheduled/product-tracking\` with the same private value stored in \`PRODUCT_TRACKING_CRON_SECRET\` as its \`X-VAMNUX-CRON-KEY\` header. The command should end with \`>/dev/null 2>&1\`. The callback checks only persisted due supplier schedules; it never creates orders, changes wallets, or charges payments.

## Final cutover safeguards

Keep Paystack in TEST mode. The webhook route remains \`/api/webhooks/paystack\`. Do not change Paystack LIVE configuration or supplier credentials during the runtime switch.
`;

await rm(artifactRoot, { recursive: true, force: true });
await mkdir(artifactRoot, { recursive: true });
await cp(path.join(projectRoot, "dist"), path.join(artifactRoot, "dist"), { recursive: true });
await cp(legacyMediaRoot, path.join(artifactRoot, "uploads"), { recursive: true });
await mkdir(path.join(artifactRoot, "database"), { recursive: true });
await cp(path.join(projectRoot, "docs", "namecheap-native-auth-schema.sql"), path.join(artifactRoot, "database", "namecheap-native-auth-schema.sql"));
await writeFile(path.join(artifactRoot, "package.json"), `${JSON.stringify(runtimePackage, null, 2)}\n`);
await writeFile(path.join(artifactRoot, "DEPLOYMENT.md"), deploymentGuide);
await execFileAsync("npm", ["install", "--package-lock-only", "--ignore-scripts", "--omit=dev", "--no-audit", "--no-fund"], {
  cwd: artifactRoot,
});

console.log(`Prepared cPanel runtime artifact at ${artifactRoot}`);
