import { describe, expect, it } from "vitest";
import { getFlashTopUpClient } from "./integrations/flashtopup";

describe("FlashTopUp category availability", () => {
  it("reports the supplier product-type distribution without disclosing reseller data", async () => {
    const response = await getFlashTopUpClient().products({ page: 1, perPage: 500 });
    const products = response.data ?? [];
    const types = products.reduce<Record<string, number>>((counts, product) => {
      const key = product.product_type;
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});
    console.info("[FlashTopUp catalog] product-type distribution:", JSON.stringify(types));
    expect(products.length).toBeGreaterThan(0);
  }, 20_000);
});
