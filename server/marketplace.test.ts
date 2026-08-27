import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { calculateOrderTotal, createFulfillmentFieldKey, createOrderCode } from "../shared/marketplace";

const homeSource = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/Home.tsx"), "utf8");
const digitalDetailSource = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/DigitalProductDetail.tsx"), "utf8");
const gameDetailSource = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/GameFamilyDetail.tsx"), "utf8");
const dbSource = fs.readFileSync(path.resolve(import.meta.dirname, "db.ts"), "utf8");
const schemaSource = fs.readFileSync(path.resolve(import.meta.dirname, "../drizzle/schema.ts"), "utf8");
const routerSource = fs.readFileSync(path.resolve(import.meta.dirname, "routers.ts"), "utf8");

describe("VAMNUX marketplace helpers", () => {
  it("calculates a server-side order total from quantity and unit price", () => {
    expect(calculateOrderTotal([
      { productId: 1, quantity: 2, unitPrice: 3.5 },
      { productId: 2, quantity: 1, unitPrice: 20 },
    ])).toBe(27);
  });

  it("creates a compact VAMNUX order code", () => {
    expect(createOrderCode(1_700_000_000_000, 0.5)).toMatch(/^VN-[A-Z0-9]{6}-[A-Z0-9]{4}$/);
  });

  it("namespaces supplier field values by product ID for multi-item draft orders", () => {
    expect(createFulfillmentFieldKey(42, "player_id")).toBe("42.player_id");
  });

  it("uses customer-friendly storefront trust copy without exposing technical supplier operations", () => {
    expect(homeSource).toContain("SHOP WITH CONFIDENCE:");
    expect(homeSource).toContain("clear product details, requirements and transparent pricing");
    expect(homeSource).not.toContain("VAMNUX SUPPLIER NOTE:");
  });

  it("keeps supplier verification and supplier inventory language out of customer-facing catalog views", () => {
    const customerViews = [homeSource, digitalDetailSource, gameDetailSource].join("\n").toLowerCase();
    for (const phrase of ["verified supplier", "supplier inventory", "supplier verification", "supplier-backed", "active supplier", "supplier product", "supplier service"]) {
      expect(customerViews).not.toContain(phrase);
    }
    expect(homeSource).toContain("Product availability updates");
    expect(digitalDetailSource).toContain("Digital product listing");
    expect(gameDetailSource).toContain("Product availability");
  });

  it("enforces Admin coupon limits and records each coupon application immutably", () => {
    expect(schemaSource).toContain('offerKind: mysqlEnum("offerKind", ["coupon", "catalog_discount"])');
    expect(schemaSource).toContain('usageCount: int("usageCount").default(0).notNull()');
    expect(schemaSource).toContain("export const promotionRedemptions");
    expect(schemaSource).toContain('promotionOrderUnique: uniqueIndex("promotion_redemptions_promotion_order_unique")');
    expect(dbSource).toContain("This coupon has reached its usage limit");
    expect(dbSource).toContain("promotions.usageCount} + 1");
    expect(dbSource).toContain("promotionRedemptions).values");
    expect(routerSource).toContain("couponCode: z.string().trim().min(3).max(64).optional()");
  });

  it("derives product discounts on the server without overwriting source product prices", () => {
    expect(dbSource).toContain("getActiveCatalogDiscounts(db)");
    expect(dbSource).toContain("catalogDiscountPercentForProduct(product.id, activeCatalogDiscounts)");
    expect(dbSource).toContain("offerDiscountPercent");
    const orderBlock = dbSource.slice(dbSource.indexOf("export async function createMarketplaceOrder"), dbSource.indexOf("const FOXRELOAD_USD_STEAM_TOP_UP_PRODUCT_ID"));
    expect(orderBlock).not.toContain("db.update(products)");
  });

  it("provides optional coupon entry in every existing customer purchase flow", () => {
    for (const source of [homeSource, digitalDetailSource, gameDetailSource]) {
      expect(source).toContain("Coupon code (optional)");
      expect(source).toContain("couponCode: couponCode.trim() || undefined");
    }
  });
});
