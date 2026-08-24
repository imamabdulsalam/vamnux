import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const importSource = readFileSync("/home/ubuntu/flash_topup_topup_import_2026-08-24.mjs", "utf8");
const reconcileSource = readFileSync("/home/ubuntu/flash_topup_topup_reconcile_2026-08-24.mjs", "utf8");

describe("FlashTopUp Top-up catalog import safeguards", () => {
  it("reconciles supplier services by source SKU and never treats product names as the duplicate key", () => {
    expect(reconcileSource).toContain("existingBySku.has(row.supplierSku)");
    expect(reconcileSource).toContain("slugConflicts");
    expect(reconcileSource).toContain('mapped?.category === "top_up"');
  });

  it("inserts only new source rows and never updates existing product pricing or supplier fields", () => {
    expect(importSource).toContain("INSERT IGNORE INTO products");
    expect(importSource).not.toContain("UPDATE products");
    expect(importSource).toContain("supplierKey");
    expect(importSource).toContain("supplierSku");
    expect(importSource).toContain("supplierPrice");
    expect(importSource).toContain("supplierCurrency");
  });

  it("creates one traceable unmapped Supplier Offer snapshot per imported legacy source product", () => {
    expect(importSource).toContain("INSERT INTO supplier_offers");
    expect(importSource).toContain('"UNMAPPED"');
    expect(importSource).toContain("legacyProductId");
    expect(importSource).toContain("catalog_import.flash_topup_supplier_offer_created");
  });

  it("does not alter pricing rules, routing, fulfilment, wallets, orders, or supplier order submission", () => {
    expect(importSource).not.toContain("pricing_rules");
    expect(importSource).not.toContain("supplier_routing");
    expect(importSource).not.toContain("fulfillment");
    expect(importSource).not.toContain("wallet_entries");
    expect(importSource).not.toContain("INSERT INTO orders");
    expect(importSource).not.toContain("createOrder(");
  });
});
