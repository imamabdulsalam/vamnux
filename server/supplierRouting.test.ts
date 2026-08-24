import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LIVE_ROUTING_DISABLED_MESSAGE, selectSimulatedSupplierOffer } from "../shared/supplierRouting";

const root = resolve(import.meta.dirname, "..");
const schemaSource = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const uiSource = readFileSync(resolve(root, "client/src/components/AdminSupplierRouting.tsx"), "utf8");

const offers = [
  { supplierOfferId: 11, supplierKey: "supplier_a", supplierName: "Supplier A", priority: 20, convertedCost: 0.8, supplierCost: 0.8, supplierCurrency: "USD" },
  { supplierOfferId: 12, supplierKey: "supplier_b", supplierName: "Supplier B", priority: 10, convertedCost: 0.74, supplierCost: 0.74, supplierCurrency: "USD" },
  { supplierOfferId: 13, supplierKey: "supplier_c", supplierName: "Supplier C", priority: 30, convertedCost: 0.79, supplierCost: 0.79, supplierCurrency: "USD" },
];

describe("Supplier Routing simulation", () => {
  it("deterministically selects only from pre-qualified offers according to each supported test strategy", () => {
    expect(selectSimulatedSupplierOffer("lowest_cost", offers)?.supplierOfferId).toBe(12);
    expect(selectSimulatedSupplierOffer("lowest_cost_available", offers)?.supplierOfferId).toBe(12);
    expect(selectSimulatedSupplierOffer("highest_priority", offers)?.supplierOfferId).toBe(12);
    expect(selectSimulatedSupplierOffer("availability_first", offers)?.supplierOfferId).toBe(12);
    expect(selectSimulatedSupplierOffer("manual_selection", offers, 13)?.supplierOfferId).toBe(13);
    expect(selectSimulatedSupplierOffer("manual_selection", offers, 999)).toBeNull();
  });

  it("stores policy and decisions additively with simulation-only and live-disabled defaults", () => {
    expect(schemaSource).toContain('export const supplierRoutingPolicies = mysqlTable("supplier_routing_policies"');
    expect(schemaSource).toContain('export const supplierRoutingDecisions = mysqlTable("supplier_routing_decisions"');
    expect(schemaSource).toContain('liveRoutingEnabled: boolean("liveRoutingEnabled").default(false).notNull()');
    expect(schemaSource).toContain('simulationMode: boolean("simulationMode").default(true).notNull()');
    expect(dbSource).toContain('liveRoutingEnabled: false');
    expect(dbSource).toContain('simulationMode: true');
    expect(dbSource).toContain("LIVE_ROUTING_DISABLED_MESSAGE");
  });

  it("requires exact approved Step 3 mapping and unchanged product, category, region, currency, delivery, and input identity before an offer is eligible", () => {
    const eligibilityBlock = dbSource.slice(dbSource.indexOf("export async function getSupplierRoutingEligibility"), dbSource.indexOf("export async function updateSupplierRoutingSupplier"));
    expect(eligibilityBlock).toContain('offer.mappingStatus !== "APPROVED"');
    expect(eligibilityBlock).toContain("legacy.category !== master.category");
    expect(eligibilityBlock).toContain("mappingAttributesMatch(master.category, masterAttributes, offerAttributes)");
    expect(eligibilityBlock).toContain("!profile.isActive");
    expect(eligibilityBlock).toContain("!offer.supplierAvailability || !legacy.supplierEligible");
    expect(eligibilityBlock).toContain("offer.supplierCurrency !== legacy.supplierCurrency");
    expect(eligibilityBlock).toContain("offer.regionLabel !== legacy.regionLabel");
    expect(eligibilityBlock).toContain("!sameJson(offer.inputRequirements, legacy.inputRequirements)");
  });

  it("does not submit supplier orders, reroute customer orders, change prices, touch wallets, or expose credentials", () => {
    const simulationBlock = dbSource.slice(dbSource.indexOf("export async function simulateSupplierRouting"), dbSource.indexOf("export async function listSupplierRoutingDecisions"));
    expect(simulationBlock).not.toContain("fetch(");
    expect(simulationBlock).not.toContain("orders");
    expect(simulationBlock).not.toContain("wallet");
    expect(simulationBlock).not.toContain("tx.update(products)");
    expect(simulationBlock).not.toContain("credential");
    expect(routerSource).toContain("simulateSupplierRouting: adminProcedure.input");
    expect(routerSource).toContain("saveSupplierRoutingPolicy: adminProcedure.input");
    expect(routerSource).toContain("updateSupplierRoutingSupplier: adminProcedure.input");
    expect(uiSource).toContain("LIVE AUTOMATIC ROUTING: DISABLED");
    expect(uiSource).toContain("Run test simulation");
  });
});
