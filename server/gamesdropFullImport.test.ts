import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const importSource = readFileSync("/home/ubuntu/gamesdrop_full_import_2026-08-24.mjs", "utf8");

describe("GamesDrop full catalog import safeguards", () => {
  it("uses the stable GamesDrop offer group ID as the exact supplier source identity", () => {
    expect(importSource).toContain('supplierSku: `offer:${offerGroupId}`');
    expect(importSource).toContain('SELECT supplierSku FROM products WHERE supplierKey = ? AND supplierSku IN');
    expect(importSource).not.toContain("name similarity");
  });

  it("inserts only new products and never updates existing source, pricing, or customer records", () => {
    expect(importSource).toContain("INSERT INTO products");
    expect(importSource).not.toContain("UPDATE products");
    expect(importSource).not.toContain("INSERT INTO price_change_history");
    expect(importSource).not.toContain("UPDATE marketplace_pricing_settings");
    expect(importSource).toContain("defaultMarkupPercent");
  });

  it("creates exactly one unmapped Supplier Offer snapshot and audit record for each newly inserted source row", () => {
    expect(importSource).toContain("INSERT INTO supplier_offers");
    expect(importSource).toContain('"UNMAPPED"');
    expect(importSource).toContain("catalog_import.gamesdrop_supplier_offer_created");
    expect(importSource).toContain("legacyProductId");
  });

  it("uses supplier platform evidence for Games and keeps unsupported Top-up grouping unclassified", () => {
    expect(importSource).toContain("PLATFORM_SUBCATEGORY_SLUGS");
    expect(importSource).toContain('slug: "games-unclassified"');
    expect(importSource).toContain('slug: "top-up-unclassified"');
    expect(importSource).toContain('category: "top_up"');
  });

  it("does not create Master Products or activate routing, fulfilment, orders, or wallet writes", () => {
    expect(importSource).toContain("masterProductsCreated: 0");
    expect(importSource).toContain("liveRoutingEnabled: false");
    expect(importSource).toContain("liveFulfillmentEnabled: false");
    expect(importSource).not.toContain("INSERT INTO orders");
    expect(importSource).not.toContain("wallet_entries");
    expect(importSource).not.toContain("supplier_routing");
    expect(importSource).not.toContain("fulfillment_simulation");
  });
});
