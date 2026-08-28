import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactRoot = path.resolve(projectRoot, "..", "vamnux-cpanel-runtime");
const sourcePackage = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
const execFileAsync = promisify(execFile);

const runtimeDependencyNames = [
  "@aws-sdk/client-s3",
  "@aws-sdk/s3-request-presigner",
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

## Required environment variables

- \`NODE_ENV=production\`
- \`DATABASE_URL\`
- \`JWT_SECRET\`
- \`VITE_APP_ID\`
- \`OAUTH_SERVER_URL\`
- \`OWNER_OPEN_ID\`
- \`BUILT_IN_FORGE_API_URL\` and \`BUILT_IN_FORGE_API_KEY\` when using the corresponding platform services
- \`FLASHTOPUP_API_ID\`, \`FLASHTOPUP_API_SECRET\`, \`FOXRELOAD_API_KEY\`, and \`GAMESDROP_API_TOKEN\` when the respective supplier integration is enabled
- \`PAYSTACK_TEST_SECRET_KEY\` and \`PAYSTACK_TEST_CALLBACK_URL\` for Paystack TEST wallet funding

## External-service cutover

Update OAuth allowed redirect URLs and Paystack TEST callback/webhook URLs to the new HTTPS domain before accepting live customer traffic. The webhook route remains \`/api/webhooks/paystack\`.
`;

await rm(artifactRoot, { recursive: true, force: true });
await mkdir(artifactRoot, { recursive: true });
await cp(path.join(projectRoot, "dist"), path.join(artifactRoot, "dist"), { recursive: true });
await writeFile(path.join(artifactRoot, "package.json"), `${JSON.stringify(runtimePackage, null, 2)}\n`);
await writeFile(path.join(artifactRoot, "DEPLOYMENT.md"), deploymentGuide);
await execFileAsync("npm", ["install", "--package-lock-only", "--ignore-scripts", "--omit=dev", "--no-audit", "--no-fund"], {
  cwd: artifactRoot,
});

console.log(`Prepared cPanel runtime artifact at ${artifactRoot}`);
