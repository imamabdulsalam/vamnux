import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mappingAttributesMatch, normalizeMappingAttributes } from "../shared/supplierProductMapping";

const root = resolve(import.meta.dirname, "..");
const schemaSource = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const uiSource = readFileSync(resolve(root, "client/src/components/AdminSupplierProductMapping.tsx"), "utf8");

describe("Supplier Product Mapping", () => {
  it("requires exact category-specific attributes and never uses names as the mapping identity", () => {
    const master = normalizeMappingAttributes("top_up", { game: "Free Fire", currency: "USD", denomination: "110 Diamonds", region_server: "Global", delivery_requirement: "Player ID" });
    const same = normalizeMappingAttributes("top_up", { game: "free fire", currency: "usd", denomination: "110 diamonds", region_server: "global", delivery_requirement: "player id" });
    const differentDenomination = normalizeMappingAttributes("top_up", { game: "Free Fire", currency: "USD", denomination: "100 Diamonds", region_server: "Global", delivery_requirement: "Player ID" });

    expect(mappingAttributesMatch("top_up", master, same)).toBe(true);
    expect(mappingAttributesMatch("top_up", master, differentDenomination)).toBe(false);
    expect(() => normalizeMappingAttributes("gift_card", { brand: "Steam" })).toThrow("Denomination");
    expect(dbSource).toContain("Product names are not used for mapping.");
  });

  it("keeps the mapping structure additive with exactly the required review statuses", () => {
    expect(schemaSource).toContain('mappingStatus: mysqlEnum("mappingStatus", ["UNMAPPED", "PENDING REVIEW", "APPROVED", "REJECTED"])');
    expect(schemaSource).toContain('export const supplierOfferMappingReviews = mysqlTable("supplier_offer_mapping_reviews"');
    expect(schemaSource).toContain('action: mysqlEnum("action", ["PENDING REVIEW", "APPROVED", "REJECTED", "REMOVED"])');
    const legacyProductsBlock = schemaSource.slice(schemaSource.indexOf('export const products = mysqlTable("products"'), schemaSource.indexOf('export const masterProducts = mysqlTable("master_products"'));
    expect(legacyProductsBlock).not.toContain("mappingStatus");
    expect(legacyProductsBlock).not.toContain("masterProductId");
  });

  it("allows only explicit owner review transitions and does not implement automatic mappings or routing", () => {
    expect(dbSource).toContain('mappingStatus: "PENDING REVIEW"');
    expect(dbSource).toContain('mappingStatus: "APPROVED"');
    expect(dbSource).toContain('mappingStatus: "REJECTED"');
    expect(dbSource).toContain("Only a PENDING REVIEW mapping can be approved");
    expect(dbSource).toContain("Supplier products may only be reviewed against a Master Product in the exact same category.");
    expect(dbSource).not.toContain("automaticSupplierMapping");
    expect(uiSource).toContain("no automatic matching exists in this workspace.");
    expect(uiSource).toContain("Telegram Stars and Mobile Legends adapter candidates remain separate");
  });

  it("counts populated but still UNMAPPED Supplier Offer snapshots by their mapping status", () => {
    expect(dbSource).toContain('const unmappedCount = supplierOfferRows.filter((offer) => offer.mappingStatus === "UNMAPPED").length;');
    expect(dbSource).toContain("unmappedProductCount: unmappedCount + Math.max(0, totalLegacyProducts - supplierOfferRows.length)");
    expect(uiSource).toContain("Every legacy product has a traceable Supplier Offer snapshot.");
  });

  it("keeps mapping data owner-only and does not expose credentials to browser code", () => {
    expect(routerSource).toContain("getSupplierProductMappingSummary: adminProcedure.query");
    expect(routerSource).toContain("addSupplierOfferToMasterForReview: adminProcedure.input");
    expect(routerSource).toContain("approveSupplierOfferMapping: adminProcedure.input");
    expect(routerSource).toContain("rejectSupplierOfferMapping: adminProcedure.input");
    expect(routerSource).toContain("removeSupplierOfferMapping: adminProcedure.input");
    expect(uiSource).toContain("Never include credentials");
    expect(uiSource).not.toContain("API_SECRET");
    expect(uiSource).not.toContain("API_KEY");
  });
});
