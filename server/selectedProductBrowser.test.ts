import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../client/src/components/SelectedProductBrowser.tsx", import.meta.url), "utf8");
const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

describe("selected product browser", () => {
  it("uses two real image-backed VAMNUX products for the rotating rows and selected preview", () => {
    expect(source).toContain("products.filter((product) => Boolean(product.image))");
    expect(source).toContain("picks.length < 2");
    expect(source).toContain("window.setInterval");
    expect(source).toContain("6_000");
    expect(source).toContain("selected-product-browser-dual");
    expect(source).toContain("rotatingProducts.map((product)");
    expect(source).not.toContain("Updates every");
    expect(source).not.toContain("selected-browser-scroll");
  });

  it("shows final customer prices and retains internal detail and cart actions", () => {
    expect(source).toContain("Final price");
    expect(source).toContain("formatPrice(product.price)");
    expect(source).toContain("onOpenProduct(product)");
    expect(source).toContain("onAddToCart(product)");
    expect(source).not.toContain("markup");
    expect(source).not.toContain("supplier cost");
  });

  it("keeps the Home preview search control while removing only its local category filter row", () => {
    expect(homeSource).toContain('className="catalog-keyword-search"');
    expect(homeSource).toContain("const submitCatalogSearch");
    expect(homeSource).toContain("/catalog?q=${encodeURIComponent(keyword)}");
    expect(homeSource).toContain("onSubmit={submitCatalogSearch}");
    expect(homeSource).not.toContain('aria-label="Filter product list"');
  });
});
