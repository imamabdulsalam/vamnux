import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dbSource = readFileSync("/home/ubuntu/naijaplay-store/server/db.ts", "utf8");
const routerSource = readFileSync("/home/ubuntu/naijaplay-store/server/routers.ts", "utf8");
const homeSource = readFileSync("/home/ubuntu/naijaplay-store/client/src/pages/Home.tsx", "utf8");
const productDetailSource = readFileSync("/home/ubuntu/naijaplay-store/client/src/pages/DigitalProductDetail.tsx", "utf8");
const familyDetailSource = readFileSync("/home/ubuntu/naijaplay-store/client/src/pages/GameFamilyDetail.tsx", "utf8");

describe("customer catalog pagination", () => {
  it("bounds catalog rows in the database and preserves customer-price computation", () => {
    expect(dbSource).toContain("pageSize = Math.min(96, Math.max(12");
    expect(dbSource).toContain(".limit(pageSize).offset((page - 1) * pageSize)");
    expect(dbSource).toContain("customerPriceForProduct(product, settings)");
    expect(dbSource).toContain('input.scope === "primary" ? publicPrimaryCatalogCondition()');
  });

  it("offers typed page, direct-product, and exact-family catalog procedures", () => {
    expect(routerSource).toContain("catalogProduct:");
    expect(routerSource).toContain("catalogGameFamily:");
    expect(routerSource).toContain('scope: z.enum(["primary", "all"])');
  });

  it("uses a small deferred primary-market page on the storefront and provides progressive loading", () => {
    expect(homeSource).toContain("useDeferredValue(query.trim())");
    expect(homeSource).toContain("pageSize: 48");
    expect(homeSource).toContain('scope: "primary" as const');
    expect(homeSource).toContain("supplierCatalog.data?.hasMore");
    expect(homeSource).toContain("Show more products");
  });

  it("uses bounded direct lookups instead of loading the full catalog for detail routes", () => {
    expect(productDetailSource).toContain("marketplace.catalogProduct.useQuery");
    expect(familyDetailSource).toContain("marketplace.catalogGameFamily.useQuery");
  });
});
