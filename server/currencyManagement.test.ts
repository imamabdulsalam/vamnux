import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CURRENCY_DEFINITIONS, MATERIAL_RATE_CHANGE_PERCENT, VAMNUX_SUPPORTED_CURRENCIES } from "../shared/currencyManagement";

const root = resolve(import.meta.dirname, "..");
const schemaSource = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const uiSource = readFileSync(resolve(root, "client/src/components/AdminCurrencyManagement.tsx"), "utf8");

describe("Currency and Exchange Rate Management", () => {
  it("limits this release to the four configured VAMNUX currencies and keeps their display metadata deterministic", () => {
    expect(VAMNUX_SUPPORTED_CURRENCIES).toEqual(["USD", "NGN", "EUR", "GBP"]);
    expect(CURRENCY_DEFINITIONS.NGN.symbol).toBe("₦");
    expect(MATERIAL_RATE_CHANGE_PERCENT).toBe(5);
    expect(dbSource).toContain("VAMNUX supports USD, NGN, EUR, and GBP in this release");
  });

  it("uses additive currency configuration, append-only rate versions, and immutable pricing/order rate snapshots", () => {
    expect(schemaSource).toContain('export const currencyConfigurations = mysqlTable("currency_configurations"');
    expect(schemaSource).toContain('export const currencyRateVersions = mysqlTable("currency_rate_versions"');
    expect(schemaSource).toContain('export const pricingRateSnapshots = mysqlTable("pricing_rate_snapshots"');
    expect(schemaSource).toContain('effectiveAt: timestamp("effectiveAt").notNull()');
    expect(schemaSource).toContain('context: mysqlEnum("context", ["price_application", "order"])');
    expect(dbSource).toContain("supersedesRateVersionId: previous?.id ?? null");
    expect(dbSource).toContain('context: "order" as const');
  });

  it("resolves VAMNUX effective rate versions for previews without live-provider requests or automatic catalog price changes", () => {
    expect(dbSource).toContain("resolveVamnuxExchangeRate");
    expect(dbSource).toContain("No active VAMNUX");
    expect(dbSource).toContain("This release does not connect to the provider automatically");
    const rateSaveBlock = dbSource.slice(dbSource.indexOf("export async function saveCurrencyRateVersion"), dbSource.indexOf("export async function listCurrencyRateHistory"));
    expect(rateSaveBlock).not.toContain("tx.update(products)");
    expect(rateSaveBlock).not.toContain("fetch(");
    expect(uiSource).toContain("No automatic repricing");
    expect(uiSource).toContain("No external provider is contacted by this release.");
  });

  it("keeps currency controls Admin-only and protects future price applications with the existing explicit Step 4 confirmation", () => {
    expect(routerSource).toContain("getCurrencyManagement: adminProcedure.query");
    expect(routerSource).toContain("saveCurrencyConfiguration: adminProcedure.input");
    expect(routerSource).toContain("saveCurrencyRateVersion: adminProcedure.input");
    expect(routerSource).toContain("previewCurrencyManagement: adminProcedure.input");
    expect(routerSource).toContain("listPricingRateSnapshots: adminProcedure.input");
    expect(dbSource).toContain('if (input.confirmation !== "APPLY")');
    expect(uiSource).toContain("explicit APPLY confirmation");
  });
});
