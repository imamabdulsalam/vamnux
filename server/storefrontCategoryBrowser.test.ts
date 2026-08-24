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
    expect(homeSource).toContain("catalogSummary.data?.categoryCounts[catalogCategory]");
    expect(homeSource).toContain("onClick={() => chooseCategory(filter)}");
    expect(homeSource).toContain("category-browser-card");
  });

  it("provides the requested Games platform tabs while keeping an All Games view", () => {
    expect(homeSource).toContain('const gamesPlatformFilters = [');
    expect(homeSource).toContain('{ code: "all", label: "All" }');
    expect(homeSource).toContain('{ code: "battlenet", label: "Battle.net" }');
    expect(homeSource).toContain('{ code: "quest", label: "Meta Quest" }');
    expect(homeSource).toContain('activeCategory === "Games" && activeGamesPlatform !== "all"');
    expect(homeSource).toContain("All existing Games products remain visible here.");
  });
});
