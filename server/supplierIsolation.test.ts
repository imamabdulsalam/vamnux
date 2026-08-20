import { describe, expect, it } from "vitest";
import { assertSupplierCatalogRowScope, canRunSupplierCatalogSync, FLASHTOPUP_SUPPLIER_KEY, FOXRELOAD_SUPPLIER_KEY } from "./db";
import type { SupplierCatalogRow } from "./catalogTypes";

const row = (slug: string): SupplierCatalogRow => ({
  slug,
  supplierSku: "same-upstream-sku",
  supplierCategory: "digital",
  name: "Verified product",
  category: "gift_card",
  basePrice: "10.00",
  baseCurrency: "USD",
  supplierPrice: "10.00",
  supplierCurrency: "USD",
  supplierOfferId: "offer-1",
  supplierEligible: true,
  deliveryType: "digital_code",
  requiresPlayerId: false,
  requiresServerId: false,
  inputRequirements: [],
  status: "active",
  metadata: {},
});

describe("supplier catalog isolation", () => {
  it("uses distinct immutable keys for FlashTopUp and FoxReload", () => {
    expect(FLASHTOPUP_SUPPLIER_KEY).not.toBe(FOXRELOAD_SUPPLIER_KEY);
  });

  it("permits only supplier-prefixed rows for each known supplier scope", () => {
    expect(() => assertSupplierCatalogRowScope(FOXRELOAD_SUPPLIER_KEY, [row("fr-same-upstream-sku")])).not.toThrow();
    expect(() => assertSupplierCatalogRowScope(FLASHTOPUP_SUPPLIER_KEY, [row("ft-same-upstream-sku")])).not.toThrow();
    expect(() => assertSupplierCatalogRowScope(FOXRELOAD_SUPPLIER_KEY, [row("ft-same-upstream-sku")])).toThrow("foxreload");
    expect(() => assertSupplierCatalogRowScope(FLASHTOPUP_SUPPLIER_KEY, [row("fr-same-upstream-sku")])).toThrow("flashtopup");
  });

  it("blocks only a supplier explicitly marked paused while other independent supplier states remain runnable", () => {
    expect(canRunSupplierCatalogSync("paused")).toBe(false);
    expect(canRunSupplierCatalogSync("ready")).toBe(true);
    expect(canRunSupplierCatalogSync("error")).toBe(true);
    expect(canRunSupplierCatalogSync(null)).toBe(true);
  });
});
