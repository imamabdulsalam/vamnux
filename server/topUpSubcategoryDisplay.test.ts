import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const shared = fs.readFileSync(path.join(root, "shared/topUpSubcategories.ts"), "utf8");
const catalog = fs.readFileSync(path.join(root, "client/src/pages/CatalogPage.tsx"), "utf8");
const dashboard = fs.readFileSync(path.join(root, "client/src/components/UserDashboardCategoryBrowser.tsx"), "utf8");
const admin = fs.readFileSync(path.join(root, "client/src/components/CategoryOperationsWorkspace.tsx"), "utf8");
const db = fs.readFileSync(path.join(root, "server/db.ts"), "utf8");

describe("shared Top-up subcategory display", () => {
  it("centralizes All, Direct Top Up, and Activation Codes", () => {
    expect(shared).toContain('label: "Direct Top Up"');
    expect(shared).toContain('label: "Activation Codes"');
  });

  it("uses the shared Top-up model on catalog and Admin Categories but not the User Dashboard", () => {
    expect(catalog).toContain("TOP_UP_SUBCATEGORIES");
    expect(catalog).toContain("topUpMode:");
    expect(dashboard).not.toContain("TOP_UP_SUBCATEGORIES");
    expect(admin).toContain("TOP_UP_SUBCATEGORIES");
    expect(db).toContain("publicTopUpModeCondition");
  });
});
