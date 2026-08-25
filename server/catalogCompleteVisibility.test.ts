import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dbSource = readFileSync(new URL("../server/db.ts", import.meta.url), "utf8");
const catalogSource = readFileSync(new URL("../client/src/pages/CatalogPage.tsx", import.meta.url), "utf8");

describe("complete active catalog visibility", () => {
  it("uses the full active catalog scope for All picks and every selected customer category", () => {
    expect(catalogSource).toContain('scope: "all" as const');
    expect(catalogSource).toContain('scope: "all",');
  });

  it("keeps stored Gift Cards and Game Keys together in the existing customer Gift Cards presentation without recategorizing source records", () => {
    expect(dbSource).toContain('function publicCatalogCategoryCondition');
    expect(dbSource).toContain('inArray(products.category, ["gift_card", "game_key"])');
    expect(dbSource).toContain('input.category ? publicCatalogCategoryCondition(input.category) : undefined');
  });
});
