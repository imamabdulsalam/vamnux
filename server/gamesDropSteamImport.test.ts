import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const importSource = readFileSync("/home/ubuntu/gamesdrop_steam_import_2026-08-25.mjs", "utf8");

describe("GamesDrop Games Steam-only import safeguards", () => {
  it("locks supplier retrieval to Games and accepts only authoritative Steam platform rows", () => {
    expect(importSource).toContain('SUPPLIER_CATEGORY = "Games"');
    expect(importSource).toContain('TARGET_CATEGORY = "steam"');
    expect(importSource).toContain('normalisePlatform(offer.platformCode) === "steam"');
  });

  it("uses exact supplier source identities, validates generated slugs, and never treats titles as duplicate keys", () => {
    expect(importSource).toContain('supplierSku: sourceSku(offer)');
    expect(importSource).toContain('Duplicate GamesDrop Steam source identity');
    expect(importSource).toContain('generated Steam slug already exists');
    expect(importSource).toContain('WHERE supplierKey = ? AND supplierSku IN');
  });

  it("uses batched transactions to insert only new source records and never updates retained products", () => {
    expect(importSource).toContain('IMPORT_BATCH_SIZE = 100');
    expect(importSource).toContain('await connection.beginTransaction()');
    expect(importSource).toContain('await connection.rollback()');
    expect(importSource).toContain('INSERT INTO products');
    expect(importSource).not.toContain('UPDATE products');
  });

  it("preserves supplier cost and currency while adding unmapped Supplier Offer snapshots and audits", () => {
    expect(importSource).toContain('supplierPrice');
    expect(importSource).toContain('supplierCurrency');
    expect(importSource).toContain('INSERT INTO supplier_offers');
    expect(importSource).toContain('"UNMAPPED"');
    expect(importSource).toContain('catalog_import.gamesdrop_steam_supplier_offer_created');
  });

  it("does not modify pricing, orders, wallets, routing, fulfilment, or submit supplier orders", () => {
    expect(importSource).not.toContain('UPDATE marketplace_pricing_settings');
    expect(importSource).not.toContain('INSERT INTO orders');
    expect(importSource).not.toContain('wallet_entries');
    expect(importSource).not.toContain('supplier_routing_decisions');
    expect(importSource).not.toContain('supplier_fulfillment_simulation_orders');
    expect(importSource).not.toContain('/orders');
  });
});
