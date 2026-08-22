import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const pageSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/SuperAdmin.tsx"), "utf8");
const styleSource = fs.readFileSync(path.join(projectRoot, "client/src/components/adminProductWorkspace.css"), "utf8");

describe("Admin Products workspace responsiveness", () => {
  it("retains the existing Product editor, catalog list, product selection, and visibility control", () => {
    expect(pageSource).toContain("admin-product-editor");
    expect(pageSource).toContain("admin-product-list");
    expect(pageSource).toContain("admin-product-list-scroll");
    expect(pageSource).toContain("admin-visibility-switch");
    expect(pageSource).toContain("Confirm storefront settings");
  });

  it("gives the editor and product list dedicated responsive scroll containers", () => {
    expect(styleSource).toContain(".admin-product-editor{overflow-y:auto");
    expect(styleSource).toContain(".admin-product-list-scroll{min-height:0;max-height:none;overflow-y:scroll");
    expect(styleSource).toContain("scrollbar-gutter:stable");
    expect(styleSource).toContain("@media(max-width:860px)");
  });
});
