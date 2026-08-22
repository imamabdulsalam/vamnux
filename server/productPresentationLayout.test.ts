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
});
