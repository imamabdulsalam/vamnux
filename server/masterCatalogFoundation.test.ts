import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const schemaSource = fs.readFileSync(path.join(root, "drizzle/schema.ts"), "utf8");
const dbSource = fs.readFileSync(path.join(root, "server/db.ts"), "utf8");
const routerSource = fs.readFileSync(path.join(root, "server/routers.ts"), "utf8");

describe("Master Catalog foundation", () => {
  it("adds separate master product and supplier offer tables without adding a mapping field to the legacy products table", () => {
    expect(schemaSource).toContain('export const masterProducts = mysqlTable("master_products"');
    expect(schemaSource).toContain('export const supplierOffers = mysqlTable("supplier_offers"');
    expect(schemaSource).toContain('legacyProductId: int("legacyProductId").notNull()');
    expect(schemaSource).toContain('masterProductId: int("masterProductId")');

    const legacyProductsBlock = schemaSource.slice(schemaSource.indexOf('export const products = mysqlTable("products"'), schemaSource.indexOf('export const masterProducts = mysqlTable("master_products"'));
    expect(legacyProductsBlock).not.toContain("masterProductId");
  });

  it("keeps the foundation protected and requires the separate explicit Step 3 mapping workflow", () => {
    expect(dbSource).toContain('mappingMode: "unmapped_foundation" as const');
    expect(dbSource).toContain("createSupplierProductMappingMaster");
    expect(dbSource).toContain("addSupplierOfferToMasterForReview");
    expect(dbSource).toContain('mappingStatus: "PENDING REVIEW"');
    expect(dbSource).not.toContain("automaticSupplierMapping");
    expect(routerSource).toContain("getMasterCatalogFoundation: adminProcedure.query");
  });
});
