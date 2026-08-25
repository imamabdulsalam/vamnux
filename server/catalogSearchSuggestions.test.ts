import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const catalogPage = fs.readFileSync(path.join(root, "client/src/pages/CatalogPage.tsx"), "utf8");
const catalogDb = fs.readFileSync(path.join(root, "server/db.ts"), "utf8");
const routers = fs.readFileSync(path.join(root, "server/routers.ts"), "utf8");

describe("customer catalog search suggestions", () => {
  it("uses a customer-safe existing-catalog suggestion helper and public procedure", () => {
    expect(catalogDb).toContain("export async function listActiveCatalogSearchSuggestions");
    expect(catalogDb).toContain("Customer-safe type-ahead suggestions only expose existing public product names and regions");
    expect(catalogDb).toContain("slice(0, 8)");
    expect(routers).toContain("catalogSuggestions: publicProcedure");
    expect(routers).toContain("listActiveCatalogSearchSuggestions(input)");
  });

  it("keeps selected Games platform context while typed search updates immediately", () => {
    expect(catalogPage).toContain('if (category === "Games" && gamesPlatform !== "all") params.set("platform", gamesPlatform);');
    expect(catalogPage).toContain("const suggestionsQuery = trpc.marketplace.catalogSuggestions.useQuery");
    expect(catalogPage).toContain("const selectSearchSuggestion");
    expect(catalogPage).toContain('aria-autocomplete="list"');
    expect(catalogPage).toContain('id="catalog-search-suggestions"');
  });
});
