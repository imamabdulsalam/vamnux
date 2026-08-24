import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { calculatePricingPreview } from "../shared/pricingEngine";

const root = resolve(import.meta.dirname, "..");
const schemaSource = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const uiSource = readFileSync(resolve(root, "client/src/components/AdminPricingEngine.tsx"), "utf8");

describe("Pricing and Markup Engine", () => {
  it("calculates the documented cost conversion, percentage markup, selling price, and expected profit deterministically", () => {
    const preview = calculatePricingPreview({ supplierCost: 0.75, exchangeRate: 1550, percentageMarkup: 20, fixedMarkup: 0, fixedFee: 0, roundingRule: "nearest_0_01" });
    expect(preview.convertedCost).toBe(1162.5);
    expect(preview.percentageMarkupAmount).toBe(232.5);
    expect(preview.finalSellingPrice).toBe(1395);
    expect(preview.expectedProfit).toBe(232.5);
    expect(preview.expectedProfitPercent).toBe(20);
  });

  it("enforces pricing floors, maximum-discount protection, and configured rounding before a preview can be used", () => {
    expect(calculatePricingPreview({ supplierCost: 1, exchangeRate: 1550, percentageMarkup: 20, fixedMarkup: 0, fixedFee: 0, minimumSellingPrice: 1800, roundingRule: "nearest_10" }).finalSellingPrice).toBe(1860);
    expect(() => calculatePricingPreview({ supplierCost: 1, exchangeRate: 100, percentageMarkup: 20, fixedMarkup: 0, fixedFee: 0, maximumDiscountPercent: 10, manualPriceOverride: 50, roundingRule: "none" })).toThrow("manual price is below");
  });

  it("keeps pricing configuration and audit records additive while requiring explicit confirmation before applying a current product price", () => {
    expect(schemaSource).toContain('export const pricingRules = mysqlTable("pricing_rules"');
    expect(schemaSource).toContain('export const pricingRuleAuditEvents = mysqlTable("pricing_rule_audit_events"');
    expect(schemaSource).toContain('previousPrice: decimal("previousPrice"');
    expect(schemaSource).toContain('newMarkup: decimal("newMarkup"');
    expect(dbSource).toContain('if (input.confirmation !== "APPLY")');
    expect(dbSource).toContain('Select between 1 and 100 products for an explicit price application');
    expect(dbSource).toContain('action: "price_applied"');
    const applyBlock = dbSource.slice(dbSource.indexOf("export async function applyPricingEngineRule"), dbSource.indexOf("export async function listPricingEngineAudit"));
    expect(applyBlock).not.toContain("supplierPrice:");
    expect(applyBlock).not.toContain("orders");
    expect(applyBlock).not.toContain("walletEntries");
  });

  it("keeps supplier cost and pricing detail restricted to Admin procedures and UI", () => {
    expect(routerSource).toContain("listPricingEngineRules: adminProcedure.query");
    expect(routerSource).toContain("previewPricingEngine: adminProcedure.input");
    expect(routerSource).toContain("savePricingEngineRule: adminProcedure.input");
    expect(routerSource).toContain("applyPricingEngineRule: adminProcedure.input");
    expect(uiSource).toContain("No automatic price changes");
    expect(uiSource).toContain("Supplier cost");
    expect(uiSource).toContain("Type APPLY to confirm");
  });
});
