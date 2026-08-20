import { describe, expect, it } from "vitest";
import { getFoxReloadClient } from "./integrations/foxreload";

describe("FoxReload live catalog reads", () => {
  it("returns a bounded category page and a bounded in-stock product page", async () => {
    const client = getFoxReloadClient();
    const categories = await client.categories({ limit: 5, withStockOnly: true });
    expect(Array.isArray(categories.items)).toBe(true);
    expect(categories.items.length).toBeLessThanOrEqual(5);
    const category = categories.items.find((item) => item.hasProducts);
    expect(category, "Expected at least one FoxReload category with products").toBeTruthy();
    const products = await client.products({ categoryIdOrSlug: category!.slug, limit: 1, withStockOnly: true });
    expect(Array.isArray(products.items)).toBe(true);
    expect(products.items.length).toBeLessThanOrEqual(1);
  }, 30_000);

  it("normalizes the documented product-search response for account-exposed digital products", async () => {
    const client = getFoxReloadClient();
    const results = await client.searchProducts({ query: "netflix", limit: 5, withStockOnly: true });
    expect(Array.isArray(results.items)).toBe(true);
    expect(results.items.length).toBeLessThanOrEqual(5);
  }, 30_000);
});
