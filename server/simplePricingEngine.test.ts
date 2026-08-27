import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const pricingSource = readFileSync(path.join(root, "client/src/components/AdminPricingEngine.tsx"), "utf8");
const dbSource = readFileSync(path.join(root, "server/db.ts"), "utf8");
const routerSource = readFileSync(path.join(root, "server/routers.ts"), "utf8");

describe("simplified Admin Pricing Engine", () => {
  it("offers only clear global, category, product, and supplier scopes", () => {
    expect(pricingSource).toContain('value="global">All products');
    expect(pricingSource).toContain('value="category">A category');
    expect(pricingSource).toContain('value="product">A specific product');
    expect(pricingSource).toContain('value="supplier">A supplier');
    expect(pricingSource).toContain("CURRENT MARKUP");
  });

  it("uses a protected server-side scoped markup procedure", () => {
    expect(routerSource).toContain("listSimplePricingTargets: adminProcedure");
    expect(routerSource).toContain("updateScopedMarketplaceMarkup: adminProcedure");
    expect(dbSource).toContain("export async function updateScopedMarketplaceMarkup");
    expect(dbSource).toContain("markupPercentOverride: input.markupPercent.toFixed(2)");
    expect(dbSource).toContain("action: \"pricing.scoped_markup_updated\"");
  });
});
