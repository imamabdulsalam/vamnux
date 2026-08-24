import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canTransitionFulfillmentOrder, FULFILLMENT_ORDER_STATUSES, LIVE_FULFILLMENT_DISABLED_MESSAGE } from "../shared/supplierFulfillment";

const root = resolve(import.meta.dirname, "..");
const schemaSource = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const uiSource = readFileSync(resolve(root, "client/src/components/AdminFulfillmentSimulation.tsx"), "utf8");

describe("Supplier fulfillment simulation", () => {
  it("defines every required lifecycle status and permits only explicit safe transitions", () => {
    expect(FULFILLMENT_ORDER_STATUSES).toEqual(["PENDING PAYMENT", "PAID", "PROCESSING", "SUPPLIER SUBMITTED", "SUPPLIER PROCESSING", "COMPLETED", "FAILED", "CANCELLED", "REFUND PENDING", "REFUNDED"]);
    expect(canTransitionFulfillmentOrder("PENDING PAYMENT", "PAID")).toBe(true);
    expect(canTransitionFulfillmentOrder("FAILED", "PROCESSING")).toBe(true);
    expect(canTransitionFulfillmentOrder("COMPLETED", "REFUND PENDING")).toBe(true);
    expect(canTransitionFulfillmentOrder("REFUND PENDING", "REFUNDED")).toBe(true);
    expect(canTransitionFulfillmentOrder("CANCELLED", "PROCESSING")).toBe(false);
    expect(canTransitionFulfillmentOrder("REFUNDED", "COMPLETED")).toBe(false);
  });

  it("stores only additive immutable simulation snapshots with strong duplicate guards and append-only events", () => {
    expect(schemaSource).toContain('export const supplierFulfillmentSimulationOrders = mysqlTable("supplier_fulfillment_simulation_orders"');
    expect(schemaSource).toContain('export const supplierFulfillmentSimulationEvents = mysqlTable("supplier_fulfillment_simulation_events"');
    expect(schemaSource).toContain('idempotencyKeyUnique: uniqueIndex("supplier_fulfillment_simulation_orders_idempotency_unique")');
    expect(schemaSource).toContain('simulationMode: boolean("simulationMode").default(true).notNull()');
    expect(schemaSource).toContain('liveFulfillmentEnabled: boolean("liveFulfillmentEnabled").default(false).notNull()');
    const createBlock = dbSource.slice(dbSource.indexOf("export async function createFulfillmentSimulationOrder"), dbSource.indexOf("export async function transitionFulfillmentSimulationOrder"));
    expect(createBlock).toContain("Duplicate simulation prevented");
    expect(createBlock).toContain("idempotencyKey");
    expect(createBlock).toContain("customerSellingPrice");
    expect(createBlock).toContain("supplierCost");
    expect(createBlock).toContain("exchangeRate");
    expect(createBlock).toContain("markupPercent");
    expect(createBlock).toContain("expectedProfit");
    expect(createBlock).toContain("supplierFulfillmentSimulationEvents");
  });

  it("keeps fulfillment permanently simulated and avoids real orders, supplier API submission, payment charges, wallets, repricing, and credential exposure", () => {
    const createBlock = dbSource.slice(dbSource.indexOf("export async function createFulfillmentSimulationOrder"), dbSource.indexOf("export async function transitionFulfillmentSimulationOrder"));
    const transitionBlock = dbSource.slice(dbSource.indexOf("export async function transitionFulfillmentSimulationOrder"), dbSource.indexOf("export async function getFulfillmentSimulationOrderDetail"));
    expect(createBlock).toContain("simulationMode: true");
    expect(createBlock).toContain("liveFulfillmentEnabled: false");
    expect(transitionBlock).toContain("liveFulfillmentEnabled: false");
    expect(createBlock).not.toContain("fetch(");
    expect(createBlock).not.toContain("tx.insert(orders)");
    expect(createBlock).not.toContain("walletEntries");
    expect(transitionBlock).not.toContain("tx.update(orders)");
    expect(transitionBlock).not.toContain("wallet");
    expect(transitionBlock).not.toContain("credential");
    expect(dbSource).toContain("LIVE_FULFILLMENT_DISABLED_MESSAGE");
  });

  it("exposes simulation management only through protected Admin procedures and visible live-disabled UI controls", () => {
    expect(routerSource).toContain("createFulfillmentSimulationOrder: adminProcedure.input");
    expect(routerSource).toContain("transitionFulfillmentSimulationOrder: adminProcedure.input");
    expect(routerSource).toContain("listFulfillmentSimulationOrders: adminProcedure.input");
    expect(routerSource).toContain("getFulfillmentSimulationOrderDetail: adminProcedure.input");
    expect(uiSource).toContain("LIVE SUPPLIER FULFILLMENT: DISABLED");
    expect(uiSource).toContain("Duplicate protection key");
    expect(uiSource).toContain("Create test-only order");
    expect(uiSource).toContain("ORDER DETAILS & EVENT HISTORY");
    expect(uiSource).toContain("LIVE_FULFILLMENT_DISABLED_MESSAGE");
  });
});
