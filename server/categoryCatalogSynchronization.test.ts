import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Admin category state and customer catalog synchronization", () => {
  it("uses the public active-and-visible category state for homepage and dedicated catalog discovery", async () => {
    const [dbSource, homeSource, catalogSource, adminSource] = await Promise.all([
      readFile(new URL("../server/db.ts", import.meta.url), "utf8"),
      readFile(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8"),
      readFile(new URL("../client/src/pages/CatalogPage.tsx", import.meta.url), "utf8"),
      readFile(new URL("../client/src/pages/SuperAdmin.tsx", import.meta.url), "utf8"),
    ]);

    expect(dbSource).toContain('eq(marketplaceCategories.status, "active")');
    expect(dbSource).toContain("eq(marketplaceCategories.visible, true)");
    expect(homeSource).toContain("trpc.marketplace.categories.useQuery(undefined, { refetchInterval: 15_000");
    expect(homeSource).toContain("vamnux:marketplace-category-revision");
    expect(homeSource).toContain("return publicProducts.filter((product) => visibleFilters.has(product.category));");
    expect(catalogSource).toContain("const visibleCategoryOptions = useMemo");
    expect(catalogSource).toContain("visibleCategoryOptions.map((option)");
    expect(catalogSource).toContain("setLocation(\"/catalog\", { replace: true })");
    expect(catalogSource).toContain("vamnux:marketplace-category-state");
    expect(adminSource).toContain('window.localStorage.setItem("vamnux:marketplace-category-revision", revision)');
    expect(adminSource).toContain('window.dispatchEvent(new CustomEvent("vamnux:marketplace-category-state"');
    expect(adminSource).toContain("announceCategoryStateChange();");
  });
});
