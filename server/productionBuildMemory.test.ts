import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const packageJson = fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8");
const viteConfig = fs.readFileSync(path.resolve(process.cwd(), "vite.config.ts"), "utf8");
const stylesheet = fs.readFileSync(path.resolve(process.cwd(), "client/src/index.css"), "utf8");

describe("VAMNUX shared-hosting production build", () => {
  it("keeps the Vite build within a bounded Node heap while retaining the production start command", () => {
    expect(packageJson).toContain('"build": "NODE_OPTIONS=--max-old-space-size=512 vite build');
    expect(packageJson).toContain("--splitting --outdir=dist");
    expect(packageJson).toContain('"start": "NODE_ENV=production node dist/index.js"');
  });

  it("limits Tailwind scanning and skips CSS minification work that is unnecessary for functional output", () => {
    expect(stylesheet).toContain('@import "tailwindcss" source(none);');
    expect(stylesheet).toContain('@source "./**/*.{ts,tsx}";');
    expect(viteConfig).toContain("cssMinify: false,");
    expect(viteConfig).toContain("reportCompressedSize: false,");
  });
});
