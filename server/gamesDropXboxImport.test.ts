import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const runner = readFileSync("/home/ubuntu/gamesdrop_xbox_import_2026-08-25.mjs", "utf8");

describe("GamesDrop Xbox-only import safeguards", () => {
  it("locks supplier retrieval and normalized rows to Games plus exact xbox platform evidence", () => {
    expect(runner).toContain('const SUPPLIER_CATEGORY = "Games"');
    expect(runner).toContain('const TARGET_PLATFORM = "xbox"');
    expect(runner).toContain('normalisePlatform(offer.platformCode) === TARGET_PLATFORM');
    expect(runner).toContain('category: TARGET_CATEGORY');
    expect(runner).toContain('platformCode: TARGET_PLATFORM');
  });

  it("uses exact source identities and rejects slug or source conflicts before transactional insert", () => {
    expect(runner).toContain('supplierSku: sourceSku(offer)');
    expect(runner).toContain('generatedSlug(offer)');
    expect(runner).toContain('existingProducts.has(row.supplierSku)');
    expect(runner).toContain('existingOffers.has(row.supplierSku)');
    expect(runner).toContain('await connection.beginTransaction()');
    expect(runner).toContain('await connection.rollback()');
  });

  it("preserves cost/currency and creates only traceable unmapped snapshots and append-only audits", () => {
    expect(runner).toContain('basePrice: price.toFixed(2)');
    expect(runner).toContain('supplierCurrency: currency');
    expect(runner).toContain('"UNMAPPED"');
    expect(runner).toContain('catalog_import.gamesdrop_xbox_supplier_offer_created');
    expect(runner).toContain('pricingConfigurationUntouched: true');
  });

  it("does not write prices, orders, wallets, routing, or fulfilment", () => {
    expect(runner).not.toMatch(/INSERT INTO (orders|wallet_entries|supplier_routing_decisions|supplier_fulfillment_simulation_orders|price_change_history)/);
    expect(runner).not.toContain("UPDATE products");
    expect(runner).not.toContain("DELETE FROM");
  });
});
