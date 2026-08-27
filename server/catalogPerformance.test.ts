import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dbSource = readFileSync("/home/ubuntu/naijaplay-store/server/db.ts", "utf8");
const routerSource = readFileSync("/home/ubuntu/naijaplay-store/server/routers.ts", "utf8");
const homeSource = readFileSync("/home/ubuntu/naijaplay-store/client/src/pages/Home.tsx", "utf8");
const adminSource = readFileSync("/home/ubuntu/naijaplay-store/client/src/pages/SuperAdmin.tsx", "utf8");
const adminProductStyles = readFileSync("/home/ubuntu/naijaplay-store/client/src/components/adminProductPresentationLayout.css", "utf8");
const catalogPageSource = readFileSync("/home/ubuntu/naijaplay-store/client/src/pages/CatalogPage.tsx", "utf8");

describe("catalog and admin loading performance", () => {
  it("supports one complete selected-result catalog response while retaining a customer-safe payload", () => {
    expect(dbSource).toContain("const pageSize = Math.min(50_000, Math.max(12");
    expect(dbSource).toContain(".limit(pageSize + 1).offset((page - 1) * pageSize)");
    expect(dbSource).toContain("customerPriceForProduct(product, settings)");
    expect(dbSource).toContain("input.scope === \"primary\"");
  });

  it("allows one complete selected-result catalog request through the public router", () => {
    expect(routerSource).toContain("pageSize: z.number().int().min(12).max(50_000)");
    expect(routerSource).toContain('scope: z.enum(["primary", "all"])');
    expect(routerSource).toContain("includeMetadata: z.boolean().default(false)");
    expect(routerSource).toContain('gamePlatform: z.enum(["steam", "xbox", "playstation", "nintendo", "battlenet", "ea", "ubisoft", "mobile", "quest"])');
    expect(routerSource).toContain("listCatalogPricing(input?.limit)");
    expect(routerSource).toContain("listAdminProductOperations(input?.limit, input?.offset, input?.search)");
  });

  it("uses debounced server-side search and a single complete selected-result response on the storefront", () => {
    expect(homeSource).toContain("setCatalogSearchTerm(query.trim()), 180");
    expect(homeSource).toContain("pageSize: 10_000");
    expect(homeSource).toContain('scope: "primary" as const');
    expect(homeSource).not.toContain("catalogLoadMoreRef");
    expect(homeSource).not.toContain("IntersectionObserver");
  });

  it("windows large complete catalog categories so a switch does not mount every product card", () => {
    expect(catalogPageSource).toContain("function VirtualCatalogGrid");
    expect(catalogPageSource).toContain("visibleProducts = products.slice");
    expect(catalogPageSource).toContain("full-catalog-grid-window");
  });

  it("shows the first customer-safe catalog results before expanding the virtualized complete result set", () => {
    expect(catalogPageSource).toContain("const QUICK_CATALOG_PAGE_SIZE = 100");
    expect(catalogPageSource).toContain("const BACKGROUND_CATALOG_PAGE_SIZE = 1_000");
    expect(catalogPageSource).toContain("const quickCatalog = trpc.marketplace.catalog.useQuery");
    expect(catalogPageSource).toContain("const requestId = ++backgroundRequestId.current");
    expect(catalogPageSource).toContain("if (cancelled || requestId !== backgroundRequestId.current) return");
    expect(catalogPageSource).toContain("pageSize: BACKGROUND_CATALOG_PAGE_SIZE");
    expect(catalogPageSource).toContain("const catalogTotal = quickCatalog.data?.total ?? products.length");
  });

  it("defers non-visible Admin workspace requests until their tab is selected", () => {
    expect(adminSource).toContain("const tabIs = (...tabs: AdminTab[])");
    expect(adminSource).toContain('enabled: tabIs("pricing", "products")');
    expect(adminSource).toContain('enabled: tabIs("categories")');
    expect(adminSource).toContain('enabled: tabIs("notifications")');
  });

  it("gives Admin Categories complete visibility while Admin Products load supplier-cost rows in responsive pages", () => {
    expect(dbSource).toContain("export async function listAdminProductOperations(limit = 10_000, offset = 0, search?: string)");
    expect(dbSource).toContain("supplierCostCurrency: product.baseCurrency");
    expect(dbSource).toContain("Supplier cost:");
    expect(routerSource).toContain("offset: z.number().int().min(0).default(0)");
    expect(adminSource).toContain("const PRODUCT_OPERATIONS_PAGE_SIZE = 100");
    expect(adminSource).toContain("offset: productOperationsOffset");
    expect(adminSource).toContain("container.addEventListener(\"scroll\", loadNextPage");
    expect(routerSource).toContain("search: z.string().trim().min(2).max(100).optional()");
    expect(dbSource).toContain("const searchCondition = normalizedSearch");
    expect(adminSource).toContain("useDeferredValue(productListSearch.trim())");
    expect(adminSource).toContain("Related catalog matches");
    expect(adminSource).toContain("data-admin-product-search-input");
    expect(adminSource).toContain("searchInput.oninput");
    expect(adminSource).not.toContain('panel.querySelector("[data-product-list-tools]")?.remove()');
    expect(adminSource).not.toContain("!panel || !list || !heading || !products.length");
    expect(adminProductStyles).toContain("color:#f8fbff!important");
    expect(adminProductStyles).toContain("caret-color:#b8ff43");
  });
});
