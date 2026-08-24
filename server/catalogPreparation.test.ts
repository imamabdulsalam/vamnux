import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const uiSource = readFileSync(resolve(root, "client/src/components/AdminCatalogPreparation.tsx"), "utf8");
const superAdminSource = readFileSync(resolve(root, "client/src/pages/SuperAdmin.tsx"), "utf8");

describe("Catalog Preparation and Controlled Matching", () => {
  it("limits every catalog preparation page to a small 25-product review batch", () => {
    const listBlock = dbSource.slice(dbSource.indexOf("export async function listCatalogPreparationProducts"), dbSource.indexOf("function catalogPreparationComparableAttributes"));
    expect(listBlock).toContain("Math.min(25, Math.max(1, input.limit ?? 25))");
    expect(listBlock).toContain("limit: Math.min(25, Math.max(1, input.limit ?? 25))");
    expect(uiSource).toContain("Existing supplier products — {batchQuery.data?.limit ?? 25} maximum per page");
    expect(uiSource).toContain("setOffset(offset + 25)");
  });

  it("keeps categories separated and blocks cross-category comparison before any mapping action", () => {
    const comparisonBlock = dbSource.slice(dbSource.indexOf("export async function getCatalogPreparationComparison"), dbSource.indexOf("export async function keepCatalogPreparationProductsSeparate"));
    expect(comparisonBlock).toContain("left.category !== right.category");
    expect(comparisonBlock).toContain("Cross-category comparison is blocked");
    expect(comparisonBlock).toContain("Names are never used as sufficient evidence for a match");
    expect(uiSource).toContain("Cross-category mapping is blocked");
    expect(dbSource).toContain("Game Top-Up");
    expect(dbSource).toContain("Gift Cards");
    expect(dbSource).toContain("Gaming Vouchers");
    expect(dbSource).toContain("Game Keys");
    expect(dbSource).toContain("Subscriptions");
    expect(dbSource).toContain("Software");
    expect(dbSource).toContain("AI Tools");
  });

  it("uses the requested preparation labels while reusing the existing explicit Step 3 review states", () => {
    expect(dbSource).toContain('type CatalogPreparationStatus = "UNMAPPED" | "REVIEW REQUIRED" | "APPROVED MATCH" | "REJECTED MATCH"');
    expect(dbSource).toContain('if (status === "PENDING REVIEW") return "REVIEW REQUIRED"');
    expect(dbSource).toContain('if (status === "APPROVED") return "APPROVED MATCH"');
    expect(dbSource).toContain('if (status === "REJECTED") return "REJECTED MATCH"');
    expect(uiSource).toContain("Create draft Master Product");
    expect(uiSource).toContain("Add Supplier Offer for review");
    expect(uiSource).toContain("Approve match");
    expect(uiSource).toContain("Reject match");
    expect(uiSource).toContain("Keep products separate");
  });

  it("allows explicit keep-separate acknowledgements without changing a legacy product or mapping record", () => {
    const separateBlock = dbSource.slice(dbSource.indexOf("export async function keepCatalogPreparationProductsSeparate"), dbSource.indexOf("/** Creates an empty VAMNUX-owned Master Product"));
    expect(separateBlock).toContain("appendAdminAuditEvent");
    expect(separateBlock).toContain("mappingChanged: false");
    expect(separateBlock).not.toContain("db.update(products)");
    expect(separateBlock).not.toContain("db.insert(supplierOffers)");
    expect(separateBlock).not.toContain("db.delete");
  });

  it("keeps catalog preparation owner-only and exposes no automatic migration or storefront mutation", () => {
    expect(routerSource).toContain("getCatalogPreparationSummary: adminProcedure");
    expect(routerSource).toContain("listCatalogPreparationProducts: adminProcedure.input");
    expect(routerSource).toContain("getCatalogPreparationComparison: adminProcedure.input");
    expect(routerSource).toContain("keepCatalogPreparationProductsSeparate: adminProcedure.input");
    expect(uiSource).toContain("NO BULK MIGRATION OR AUTOMATIC MATCHING");
    expect(uiSource).toContain("does not migrate the catalog");
    expect(superAdminSource).toContain('id: "catalog_preparation", label: "Catalog preparation"');
    expect(superAdminSource).toContain("<AdminCatalogPreparation />");
  });
});
