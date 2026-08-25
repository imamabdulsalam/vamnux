import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const importSource = readFileSync("/home/ubuntu/gamesdrop_gift_cards_import_2026-08-25.mjs", "utf8");
const reconcileSource = readFileSync("/home/ubuntu/gamesdrop_gift_cards_cached_reconcile_2026-08-25.mjs", "utf8");

describe("GamesDrop Gift Cards-only import safeguards", () => {
  it("locks supplier retrieval evidence and inserted records to Gift Cards only", () => {
    expect(importSource).toContain('const SUPPLIER_CATEGORY = "Gift Cards"');
    expect(importSource).toContain('const VAMNUX_CATEGORY = "gift_card"');
    expect(importSource).toContain("row.supplierCategory, row.name, VAMNUX_CATEGORY");
    expect(importSource).not.toContain('category: "steam"');
    expect(importSource).not.toContain('category: "top_up"');
  });

  it("uses exact source identity and slug checks, with no product update path", () => {
    expect(reconcileSource).toContain("exactExistingProduct");
    expect(importSource).toContain("existingSourceSkus");
    expect(importSource).toContain("existingNowSet");
    expect(importSource).toContain("slugConflicts");
    expect(importSource).toContain("INSERT INTO products");
    expect(importSource).not.toContain("UPDATE products");
    expect(importSource).not.toContain("onDuplicateKeyUpdate");
  });

  it("uses 100-row transactions and creates traceable UNMAPPED snapshots and audits", () => {
    expect(importSource).toContain("const IMPORT_BATCH_SIZE = 100");
    expect(importSource).toContain("await connection.beginTransaction()");
    expect(importSource).toContain("await connection.rollback()");
    expect(importSource).toContain("INSERT INTO supplier_offers");
    expect(importSource).toContain('"UNMAPPED"');
    expect(importSource).toContain("catalog_import.gamesdrop_gift_cards_supplier_offer_created");
  });

  it("keeps supplier cost separate and excludes pricing, orders, wallets, routing, and fulfilment changes", () => {
    expect(importSource).toContain("supplierPrice");
    expect(importSource).toContain("supplierCurrency");
    expect(importSource).toContain("pricingConfigurationReadOnly");
    expect(importSource).not.toContain("UPDATE marketplace_pricing_settings");
    expect(importSource).not.toContain("INSERT INTO price_change_history");
    expect(importSource).not.toContain("INSERT INTO orders");
    expect(importSource).not.toContain("wallet_entries");
    expect(importSource).not.toContain("supplier_routing");
    expect(importSource).not.toContain("INSERT INTO supplier_fulfillment");
    expect(importSource).toContain("liveFulfillmentEnabled: false");
  });
});
