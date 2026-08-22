import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const homeSource = readFileSync(resolve(root, "client/src/pages/Home.tsx"), "utf8");
const menuCss = readFileSync(resolve(root, "client/src/pages/mobileCategoryMenu.css"), "utf8");

describe("mobile category menu", () => {
  it("derives menu items from active visible categories and supports real browse actions", () => {
    expect(homeSource).toContain('className="mobile-category-menu"');
    expect(homeSource).toContain("visibleCategories.map");
    expect(homeSource).toContain("chooseCategory(filter)");
    expect(homeSource).toContain("chooseQuickLink(filter, link)");
    expect(homeSource).toContain("All active products");
  });

  it("keeps the desktop strip hidden only at the mobile breakpoint", () => {
    expect(menuCss).toContain("@media(max-width:760px){.commerce-header .compact-category-nav{display:none!important}.mobile-category-menu{display:block}}");
    expect(menuCss).toContain("@media(min-width:761px){.mobile-category-menu{display:none!important}}");
  });
});
