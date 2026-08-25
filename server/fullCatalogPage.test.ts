import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
const catalogSource = readFileSync(new URL("../client/src/pages/CatalogPage.tsx", import.meta.url), "utf8");
const footerSource = readFileSync(new URL("../client/src/components/FooterNavigation.tsx", import.meta.url), "utf8");

describe("dedicated full catalog page", () => {
  it("registers a standalone catalog route instead of returning customers to the home section", () => {
    expect(appSource).toContain('path="/catalog" component={CatalogPage}');
    expect(appSource).toContain('setLocation("/catalog", { replace: true })');
  });

  it("loads the complete selected customer-safe result set once and renders normal product cards", () => {
    expect(catalogSource).toContain("pageSize: 10_000");
    expect(catalogSource).toContain('scope: "all" as const');
    expect(catalogSource).toContain('scope: "all",');
    expect(catalogSource).toContain("full-catalog-grid");
    expect(catalogSource).toContain("full-catalog-search");
    expect(catalogSource).not.toContain("Show more products");
  });

  it("prefetches category selections and makes the Home breadcrumb navigable", () => {
    expect(catalogSource).toContain("utils.marketplace.catalog.prefetch");
    expect(catalogSource).toContain('onPointerEnter={() => prefetchCatalog(option.value)}');
    expect(catalogSource).toContain('<Link href="/">Home</Link>');
  });

  it("routes footer product destinations to the standalone catalogue", () => {
    expect(footerSource).toContain('"/catalog?category=Top-up"');
    expect(footerSource).toContain('"/catalog?category=Games"');
    expect(footerSource).not.toContain('window.location.hash = "products"');
  });
});
