import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sharedModel = readFileSync(new URL("../shared/gamesPlatformCategories.ts", import.meta.url), "utf8");
const catalogPage = readFileSync(new URL("../client/src/pages/CatalogPage.tsx", import.meta.url), "utf8");
const userDashboard = readFileSync(new URL("../client/src/pages/UserDashboard.tsx", import.meta.url), "utf8");
const adminCategories = readFileSync(new URL("../client/src/components/CategoryOperationsWorkspace.tsx", import.meta.url), "utf8");

describe("shared Games platform subcategory displays", () => {
  it("defines the owner-requested Games platform subcategories once", () => {
    expect(sharedModel).toContain('GAMES_PLATFORM_SUBCATEGORIES');
    for (const label of ["Steam", "Xbox", "PlayStation", "Nintendo", "Battle.net", "EA App", "Ubisoft", "Mobile", "Meta Quest"]) {
      expect(sharedModel).toContain(`label: "${label}"`);
    }
  });

  it("uses the shared model in all customer and Admin category views", () => {
    expect(catalogPage).toContain("GAMES_PLATFORM_SUBCATEGORIES");
    expect(catalogPage).toContain("gamePlatform:");
    expect(userDashboard).toContain("UserDashboardCategoryBrowser");
    expect(adminCategories).toContain("GAMES_PLATFORM_SUBCATEGORIES");
    expect(adminCategories).toContain("platformCode");
  });
});
