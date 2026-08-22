import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../client/src/components/SelectedProductBrowser.tsx", import.meta.url), "utf8");

describe("selected product browser", () => {
  it("uses real products for the selectable list and selected preview", () => {
    expect(source).toContain("products.map((product)");
    expect(source).toContain("const selectedProduct = useMemo");
    expect(source).toContain("catalogProductPresentation(selectedProduct)");
  });

  it("shows final customer prices and retains internal detail and cart actions", () => {
    expect(source).toContain("Final price");
    expect(source).toContain("formatPrice(selectedProduct.price)");
    expect(source).toContain("onOpenProduct(selectedProduct)");
    expect(source).toContain("onAddToCart(selectedProduct)");
    expect(source).not.toContain("markup");
    expect(source).not.toContain("supplier cost");
  });
});
