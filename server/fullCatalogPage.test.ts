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

  it("starts with fast customer-safe results and expands to the complete selected result set", () => {
    expect(catalogSource).toContain("const COMPLETE_CATALOG_PAGE_SIZE = 50_000");
    expect(catalogSource).toContain("pageSize: COMPLETE_CATALOG_PAGE_SIZE");
    expect(catalogSource).toContain("pageSize: QUICK_CATALOG_PAGE_SIZE");
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
