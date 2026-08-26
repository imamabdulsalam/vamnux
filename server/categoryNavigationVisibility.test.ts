import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("category navigation visibility setting", () => {
  it("defaults to shown and gates only the public category-navigation strip", async () => {
    const [dbSource, routerSource, homeSource, workspaceSource] = await Promise.all([
      readFile(new URL("../server/db.ts", import.meta.url), "utf8"),
      readFile(new URL("../server/routers.ts", import.meta.url), "utf8"),
      readFile(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8"),
      readFile(new URL("../client/src/components/CategoryOperationsWorkspace.tsx", import.meta.url), "utf8"),
    ]);

    expect(dbSource).toContain('"storefront.category-navigation-strip"');
    expect(dbSource).toContain("value?.visible !== false");
    expect(routerSource).toContain("categoryNavigationVisibility: publicProcedure.query");
    expect(homeSource).toContain("const isCategoryNavigationVisible = categoryNavigationVisibility.data?.visible !== false");
    expect(homeSource).toContain("{isCategoryNavigationVisible && <nav className=\"commerce-categories compact-category-nav\"");
    expect(homeSource).toContain("{isCategoryNavigationVisible && <section className=\"mobile-category-menu\"");
    expect(workspaceSource).toContain('settingKey: "storefront.category-navigation-strip"');
    expect(workspaceSource).toContain("This controls only the website strip");
    expect(workspaceSource).toContain("It does not change any individual category, product, or catalog data.");
  });
});
