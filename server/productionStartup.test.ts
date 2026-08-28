import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.resolve(process.cwd(), "server/_core/index.ts"), "utf8");

describe("VAMNUX production startup", () => {
  it("binds the exact valid port assigned by cPanel in production", () => {
    expect(source).toContain('process.env.NODE_ENV === "production" && process.env.PORT');
    expect(source).toContain('throw new Error("A valid PORT is required for the production server")');
    expect(source).toContain("server.listen(configuredPort");
    expect(source).toContain("return;");
  });

  it("keeps the availability fallback outside assigned production ports", () => {
    expect(source).toContain("const port = await findAvailablePort(preferredPort);");
    expect(source).toContain("function findAvailablePort");
  });
});
