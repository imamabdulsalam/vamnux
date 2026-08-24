import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const homeSource = fs.readFileSync(path.join(root, "client/src/pages/Home.tsx"), "utf8");
const adminSource = fs.readFileSync(path.join(root, "client/src/pages/SuperAdmin.tsx"), "utf8");
const dbSource = fs.readFileSync(path.join(root, "server/db.ts"), "utf8");

describe("global loading performance safeguards", () => {
  it("keeps continuous catalog browsing automatic and does not restore a manual show-more interruption", () => {
    expect(homeSource).toContain("IntersectionObserver");
    expect(homeSource).toContain("catalogLoadMoreRef");
    expect(homeSource).not.toContain("Show more products (");
  });

  it("keeps visible cards mounted while a new catalog query is in flight", () => {
    expect(homeSource).not.toContain("setLoadedCatalogItems([])");
    expect(homeSource).toContain("supplierCatalog.isSuccess && compactProducts.length === 0");
    expect(homeSource).not.toContain("Updating products…");
    expect(homeSource).not.toContain("Updating matching VAMNUX products…");
    expect(homeSource).toContain("refetchOnReconnect: false");
  });

  it("returns a compact page-plus-one catalog payload without supplier cost or source fields", () => {
    expect(dbSource).toContain(".limit(pageSize + 1).offset((page - 1) * pageSize)");
    expect(dbSource).toContain("const hasMore = pageRows.length > pageSize");
    expect(dbSource).toContain("items: rows.map(({ basePrice, markupPercentOverride, displayPriceOverride, ...product })");
    expect(dbSource).not.toContain("items: rows.map((product) => ({ ...product, ...customerPriceForProduct(product, settings)");
  });

  it("does not fetch unrelated Admin workspaces on the initial dashboard tab", () => {
    expect(adminSource).toContain('enabled: tabIs("pricing", "products")');
    expect(adminSource).toContain('enabled: tabIs("categories")');
    expect(adminSource).toContain('enabled: tabIs("rates")');
    expect(adminSource).toContain('enabled: tabIs("risk", "health")');
    expect(adminSource).toContain("await Promise.all([");
  });
});
