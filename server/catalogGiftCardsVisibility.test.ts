import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const dbSource = readFileSync("/home/ubuntu/naijaplay-store/server/db.ts", "utf8");

describe("selected customer catalog categories", () => {
  it("does not combine the primary-curation condition with an explicit category filter", () => {
    expect(dbSource).toContain('input.scope === "primary" && !input.category ? publicPrimaryCatalogCondition() : undefined');
  });

  it("keeps customer catalog projections free of supplier cost and markup fields", () => {
    const catalogSection = dbSource.slice(dbSource.indexOf("export async function listActiveCatalogProducts"), dbSource.indexOf("export async function getMarketplacePricingSettings"));
    expect(catalogSection).not.toContain("supplierPrice:");
    expect(catalogSection).not.toContain("supplierCurrency:");
    expect(catalogSection).toContain("items: rows.map(({ basePrice, markupPercentOverride, displayPriceOverride, ...product }) => ({ ...product, ...customerPriceForProduct");
  });
});
