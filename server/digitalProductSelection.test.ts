import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const digitalProductSource = () => readFileSync(resolve(process.cwd(), "client/src/pages/DigitalProductDetail.tsx"), "utf8");

describe("digital product selection layout", () => {
  it("keeps non-game catalog listings in the shared selected-item format with Add to Cart and Buy Now", () => {
    const source = digitalProductSource();
    expect(source).toContain("family-denomination-grid");
    expect(source).toContain("family-selection-summary");
    expect(source).toContain("setSelectedServiceId");
    expect(source).toContain("product-selection-add");
    expect(source).toContain("product-selection-buy-now");
    expect(source).toContain("Buy now opens this selected item in the protected wallet checkout.");
  });

  it("uses a catalog page size accepted by the public contract and renders the confirmed detail before related options finish loading", () => {
    const source = digitalProductSource();
    expect(source).toContain('page: 1, pageSize: 12, slug: slug || "", scope: "all"');
    expect(source).toContain('if (productLookup.isLoading) return <main className="family-page-loading">');
    expect(source).not.toContain("productLookup.isLoading || familyCatalog.isLoading");
    expect(source).toContain("retry: false");
  });
});
