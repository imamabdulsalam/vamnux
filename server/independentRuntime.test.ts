import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("independent Namecheap runtime boundaries", () => {
  it("does not register managed OAuth or remote storage routes in the production server", async () => {
    const [serverEntry, context, storage, storageRoute] = await Promise.all([
      readFile(new URL("./_core/index.ts", import.meta.url), "utf8"),
      readFile(new URL("./_core/context.ts", import.meta.url), "utf8"),
      readFile(new URL("./storage.ts", import.meta.url), "utf8"),
      readFile(new URL("./_core/storageProxy.ts", import.meta.url), "utf8"),
    ]);

    expect(serverEntry).toContain("registerLocalStorageRoutes(app)");
    expect(serverEntry).not.toContain("registerOAuthRoutes(app)");
    expect(serverEntry).not.toContain("registerStorageProxy(app)");
    expect(context).not.toContain("sdk.authenticateRequest");
    expect(storage).not.toContain("BUILT_IN_FORGE_API_KEY");
    expect(storage).not.toContain("v1/storage/presign");
    expect(storageRoute).not.toContain("forgeApiUrl");
    expect(storageRoute).toContain('app.get("/media/*"');
    expect(storageRoute).toContain('app.get("/manus-storage/*"');
  });
});
