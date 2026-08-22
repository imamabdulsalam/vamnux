import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const component = readFileSync(resolve(process.cwd(), "client/src/components/UniversalMarketplaceSearch.tsx"), "utf8");
const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

describe("VAMNUX universal top search", () => {
  it("groups active product, category, Help/FAQ, and internal-page results", () => {
    expect(component).toContain('group: "Products"');
    expect(component).toContain('group: "Categories"');
    expect(component).toContain('group: "Help & pages"');
    expect(component).toContain('href: "/help"');
    expect(component).toContain('href: "/faq"');
    expect(component).toContain('href: "/support"');
  });

  it("uses public active products and visible categories from the marketplace header", () => {
    expect(home).toContain("products={publicProducts}");
    expect(home).toContain("categories={visibleCategories.map");
    expect(home).toContain("onChooseCategory={(category) => chooseCategory");
    expect(home).toContain("onNavigate={setLocation}");
  });
});
