import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { calculateFinancialSnapshot, financialAlertsForSnapshot } from "../shared/financialControls";

const root = resolve(import.meta.dirname, "..");
const schemaSource = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const uiSource = readFileSync(resolve(root, "client/src/components/AdminFinancialControls.tsx"), "utf8");

describe("Financial and profit controls", () => {
  it("calculates revenue, supplier cost, fees, refunds, net profit, and margin deterministically", () => {
    const result = calculateFinancialSnapshot({ customerSellingPrice: 1860, supplierCost: 1, exchangeRate: 1550, supplierCostInCustomerCurrency: 1550, paymentProcessingFee: 40, otherApplicableFees: 10, refundAmount: 0 });
    expect(result).toEqual({ grossRevenue: 1860, supplierCost: 1550, grossProfit: 310, paymentProcessingFee: 40, otherApplicableFees: 10, refundAmount: 0, netRevenue: 1860, netProfit: 260, profitMarginPercent: expect.closeTo(13.9784946) });
    const refunded = calculateFinancialSnapshot({ customerSellingPrice: 100, supplierCost: 60, exchangeRate: 1, supplierCostInCustomerCurrency: 60, paymentProcessingFee: 4, otherApplicableFees: 1, refundAmount: 100 });
    expect(refunded.netRevenue).toBe(0);
    expect(refunded.netProfit).toBe(-65);
  });

  it("detects requested diagnostic conditions without changing a price, cost, order, wallet, or refund", () => {
    const alerts = financialAlertsForSnapshot({ customerSellingPrice: 100, supplierCost: null, exchangeRate: null, supplierCostInCustomerCurrency: 125, paymentProcessingFee: 0, otherApplicableFees: 0, paymentFeeConfigured: false, profitMarginPercent: -25, unusualPriceChange: true });
    const missingRateAlerts = financialAlertsForSnapshot({ customerSellingPrice: 100, supplierCost: 125, exchangeRate: null, supplierCostInCustomerCurrency: 125, paymentProcessingFee: 0, otherApplicableFees: 0, paymentFeeConfigured: false, profitMarginPercent: -25, unusualPriceChange: false });
    expect(alerts).toContain("missing_supplier_cost");
    expect(missingRateAlerts).toContain("missing_exchange_rate");
    expect(alerts).toContain("missing_payment_fee");
    expect(alerts).toContain("supplier_cost_exceeds_selling_price");
    expect(alerts).toContain("negative_margin");
    expect(alerts).toContain("unusual_price_change");
  });

  it("uses additive immutable snapshots and append-only financial events for future simulations and future order lines", () => {
    expect(schemaSource).toContain('export const financialOrderSnapshots = mysqlTable("financial_order_snapshots"');
    expect(schemaSource).toContain('export const financialOrderEvents = mysqlTable("financial_order_events"');
    expect(schemaSource).toContain('orderProductUnique: uniqueIndex("financial_order_snapshots_order_product_unique")');
    expect(schemaSource).toContain('simulationOrderUnique: uniqueIndex("financial_order_snapshots_simulation_order_unique")');
    const simulationBlock = dbSource.slice(dbSource.indexOf("export async function createFulfillmentSimulationOrder"), dbSource.indexOf("export async function transitionFulfillmentSimulationOrder"));
    const marketplaceBlock = dbSource.slice(dbSource.indexOf("export async function createMarketplaceOrder"), dbSource.indexOf("function numeric"));
    expect(simulationBlock).toContain("financialOrderSnapshots");
    expect(simulationBlock).toContain("financialOrderEvents");
    expect(marketplaceBlock).toContain("financialOrderSnapshots");
    expect(marketplaceBlock).toContain("financialOrderEvents");
    expect(marketplaceBlock).not.toContain("db.update(products)");
  });

  it("keeps financial calculations server-only and protected from customer manipulation", () => {
    const dashboardBlock = dbSource.slice(dbSource.indexOf("export async function getFinancialControlsDashboard"), dbSource.indexOf("export function previewFinancialControls"));
    expect(dashboardBlock).toContain("financialAlertsForSnapshot");
    expect(dashboardBlock).toContain("filterFinancialRows");
    expect(dashboardBlock).not.toContain("db.update(");
    expect(dashboardBlock).not.toContain("fetch(");
    expect(dashboardBlock).not.toContain("walletEntries");
    expect(dashboardBlock).not.toContain("credential");
    expect(routerSource).toContain("getFinancialControlsDashboard: adminProcedure.input");
    expect(routerSource).toContain("previewFinancialControls: adminProcedure.input");
    expect(uiSource).toContain("ANALYSIS ONLY — NO COMMERCIAL ACTION");
    expect(uiSource).toContain("SERVER-BACKED PREVIEW");
    expect(uiSource).toContain("FINANCIAL ALERTS");
    expect(uiSource).toContain("IMMUTABLE FINANCIAL SNAPSHOTS");
  });
});
