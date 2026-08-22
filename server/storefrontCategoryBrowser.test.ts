import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

describe("storefront category browser", () => {
  it("derives cards from active-visible categories and returns hidden active filters to All", () => {
    expect(homeSource).toContain("const visibleCategories = useMemo");
    expect(homeSource).toContain("if (!publicCategories.data) return []");
    expect(homeSource).toContain("!visibleCategories.some((category) => category.filter === activeCategory)");
    expect(homeSource).toContain('setActiveCategory("All")');
  });

  it("shows real available-product counts and routes every card through the category browser action", () => {
    expect(homeSource).toContain("publicProducts.filter((product) => product.category === filter).length");
    expect(homeSource).toContain("onClick={() => chooseCategory(filter)}");
    expect(homeSource).toContain("category-browser-card");
  });
});
