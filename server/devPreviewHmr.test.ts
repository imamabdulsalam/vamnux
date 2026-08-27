import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("managed Preview HMR bridge", () => {
  it("keeps Vite upgrades on the Express server while directing the browser through secure proxy WebSockets", async () => {
    const source = await readFile(new URL("./_core/vite.ts", import.meta.url), "utf8");

    expect(source).toContain('middlewareMode: true');
    expect(source).toContain('hmr: { server, protocol: "wss" as const, clientPort: 443 }');
    expect(source).toContain("allowedHosts: true as const");
  });
});
