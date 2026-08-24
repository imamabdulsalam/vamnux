import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dbSource = readFileSync("/home/ubuntu/naijaplay-store/server/db.ts", "utf8");
const routerSource = readFileSync("/home/ubuntu/naijaplay-store/server/routers.ts", "utf8");
const homeSource = readFileSync("/home/ubuntu/naijaplay-store/client/src/pages/Home.tsx", "utf8");
const adminSource = readFileSync("/home/ubuntu/naijaplay-store/client/src/pages/SuperAdmin.tsx", "utf8");

describe("catalog and admin loading performance", () => {
  it("supports one complete selected-result catalog response while retaining a customer-safe payload", () => {
    expect(dbSource).toContain("const pageSize = Math.min(10_000, Math.max(12");
    expect(dbSource).toContain(".limit(pageSize + 1).offset((page - 1) * pageSize)");
    expect(dbSource).toContain("customerPriceForProduct(product, settings)");
    expect(dbSource).toContain("input.scope === \"primary\"");
  });

  it("allows one complete selected-result catalog request through the public router", () => {
    expect(routerSource).toContain("pageSize: z.number().int().min(12).max(10_000)");
    expect(routerSource).toContain('scope: z.enum(["primary", "all"])');
    expect(routerSource).toContain("includeMetadata: z.boolean().default(false)");
    expect(routerSource).toContain('gamePlatform: z.enum(["steam", "xbox", "playstation", "nintendo", "battlenet", "ea", "ubisoft", "mobile", "quest"])');
    expect(routerSource).toContain("listCatalogPricing(input?.limit)");
    expect(routerSource).toContain("listAdminProductOperations(input?.limit)");
  });

  it("uses debounced server-side search and a single complete selected-result response on the storefront", () => {
    expect(homeSource).toContain("setCatalogSearchTerm(query.trim()), 180");
    expect(homeSource).toContain("pageSize: 10_000");
    expect(homeSource).toContain('scope: "primary" as const');
    expect(homeSource).not.toContain("catalogLoadMoreRef");
    expect(homeSource).not.toContain("IntersectionObserver");
  });

  it("defers non-visible Admin workspace requests until their tab is selected", () => {
    expect(adminSource).toContain("const tabIs = (...tabs: AdminTab[])");
    expect(adminSource).toContain('enabled: tabIs("pricing", "products")');
    expect(adminSource).toContain('enabled: tabIs("products", "categories")');
    expect(adminSource).toContain('enabled: tabIs("notifications")');
  });
});
