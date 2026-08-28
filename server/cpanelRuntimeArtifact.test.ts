import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const indexSource = fs.readFileSync(path.resolve(process.cwd(), "server/_core/index.ts"), "utf8");
const artifactSource = fs.readFileSync(path.resolve(process.cwd(), "scripts/package-cpanel-artifact.mjs"), "utf8");

describe("VAMNUX cPanel runtime artifact", () => {
  it("keeps Vite development-only and loads it dynamically", () => {
    expect(indexSource).toContain('const { setupVite } = await import("./vite");');
    expect(indexSource).not.toContain('from "./vite"');
  });

  it("packages the built server and static client with only runtime dependencies", () => {
    expect(artifactSource).toContain('cp(path.join(projectRoot, "dist")');
    expect(artifactSource).toContain('"npm", ["install", "--package-lock-only", "--ignore-scripts", "--omit=dev"');
    expect(artifactSource).toContain('start: "NODE_ENV=production node dist/index.js"');
    expect(artifactSource).not.toContain('"vite"');
  });
});
