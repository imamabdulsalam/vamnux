import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const adminSource = fs.readFileSync(path.join(root, "client/src/pages/SuperAdmin.tsx"), "utf8");
const layoutSource = fs.readFileSync(path.join(root, "client/src/components/adminProductPresentationLayout.css"), "utf8");

describe("VAMNUX selected-product presentation layout", () => {
  it("scopes the correction to the selected-product editor without changing other Product areas", () => {
    expect(adminSource).toContain('import "@/components/adminProductPresentationLayout.css"');
    expect(layoutSource).toContain(".admin-product-operations>.admin-product-editor");
    expect(layoutSource).toContain("Selected-product presentation editor only");
  });

  it("renders presentation flags as aligned compact checkboxes instead of oversized default inputs", () => {
    expect(layoutSource).toContain('input[type="checkbox"]');
    expect(layoutSource).toContain("width:17px");
    expect(layoutSource).toContain("grid-template-columns:repeat(auto-fit,minmax(132px,1fr))");
  });

  it("keeps the Catalog List full header and bulk controls above an isolated independent row scroll surface", () => {
    expect(layoutSource).toContain("Catalog List only");
    expect(layoutSource).toContain("grid-template-rows:auto auto minmax(0,1fr)");
    expect(layoutSource).toContain("isolation:isolate");
    expect(layoutSource).toContain("overscroll-behavior:contain");
  });

  it("places the complete Catalog List at the top without changing the Product sections that follow", () => {
    expect(layoutSource).toContain("Place the complete Catalog List at the top of Products");
    expect(layoutSource).toContain("order:-1;grid-column:1/-1");
    expect(layoutSource).toContain(".admin-product-operations>.admin-product-editor{grid-column:1/-1}");
  });
});
