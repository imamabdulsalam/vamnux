import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dbSource = readFileSync("/home/ubuntu/naijaplay-store/server/db.ts", "utf8");
const routerSource = readFileSync("/home/ubuntu/naijaplay-store/server/routers.ts", "utf8");
const homeSource = readFileSync("/home/ubuntu/naijaplay-store/client/src/pages/Home.tsx", "utf8");
const adminSource = readFileSync("/home/ubuntu/naijaplay-store/client/src/pages/SuperAdmin.tsx", "utf8");

describe("catalog and admin loading performance", () => {
  it("bounds the public catalog query and calculates prices only for the requested page", () => {
    expect(dbSource).toContain("const pageSize = Math.min(96, Math.max(12");
    expect(dbSource).toContain(".limit(pageSize).offset((page - 1) * pageSize)");
    expect(dbSource).toContain("customerPriceForProduct(product, settings)");
    expect(dbSource).toContain("input.scope === \"primary\"");
  });

  it("exposes bounded catalog controls through the public router", () => {
    expect(routerSource).toContain("pageSize: z.number().int().min(12).max(96)");
    expect(routerSource).toContain('scope: z.enum(["primary", "all"])');
    expect(routerSource).toContain('gamePlatform: z.enum(["steam", "xbox", "playstation", "nintendo", "battlenet", "ea", "ubisoft", "mobile", "quest"])');
    expect(routerSource).toContain("listCatalogPricing(input?.limit)");
    expect(routerSource).toContain("listAdminProductOperations(input?.limit)");
  });

  it("uses deferred server-side search and progressive loading on the storefront", () => {
    expect(homeSource).toContain("useDeferredValue(query.trim())");
    expect(homeSource).toContain("pageSize: 48");
    expect(homeSource).toContain('scope: "primary" as const');
    expect(homeSource).toContain("Show more products");
  });

  it("defers non-visible Admin workspace requests until their tab is selected", () => {
    expect(adminSource).toContain("const tabIs = (...tabs: AdminTab[])");
    expect(adminSource).toContain('enabled: tabIs("pricing", "products")');
    expect(adminSource).toContain('enabled: tabIs("products", "categories")');
    expect(adminSource).toContain('enabled: tabIs("notifications")');
  });
});
