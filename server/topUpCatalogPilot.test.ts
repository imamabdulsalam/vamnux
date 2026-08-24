import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const uiSource = readFileSync(resolve(root, "client/src/components/AdminTopUpCatalogPilot.tsx"), "utf8");
const superAdminSource = readFileSync(resolve(root, "client/src/pages/SuperAdmin.tsx"), "utf8");

describe("Game Top-Up controlled catalog pilot", () => {
  it("uses a fixed existing top_up cohort no larger than 25 and does not auto-create a mapping", () => {
    const cohortBlock = dbSource.slice(dbSource.indexOf("async function getTopUpPilotCandidateRows"), dbSource.indexOf("async function assertTopUpPilotCandidate"));
    expect(dbSource).toContain("const TOP_UP_PILOT_LIMIT = 25");
    expect(cohortBlock).toContain('eq(products.category, "top_up")');
    expect(cohortBlock).toContain("limit(TOP_UP_PILOT_LIMIT)");
    expect(cohortBlock).not.toContain("insert(supplierOffers)");
    expect(cohortBlock).not.toContain("insert(masterProducts)");
    expect(uiSource).toContain("Game Top-Up only. Maximum 25 existing products.");
    expect(uiSource).toContain("ALL AUTOMATIC ACTIONS ARE DISABLED");
  });

  it("requires explicit owner actions and exact mapping attributes for each potential pilot mapping", () => {
    expect(routerSource).toContain("getTopUpCatalogPilot: adminProcedure");
    expect(routerSource).toContain("markTopUpPilotProductReviewed: adminProcedure.input");
    expect(routerSource).toContain("createTopUpPilotMaster: adminProcedure.input");
    expect(routerSource).toContain("addTopUpPilotOfferForReview: adminProcedure.input");
    expect(routerSource).toContain("approveTopUpPilotOffer: adminProcedure.input");
    expect(routerSource).toContain("rejectTopUpPilotOffer: adminProcedure.input");
    expect(routerSource).toContain("keepTopUpPilotProductsSeparate: adminProcedure.input");
    expect(routerSource).toContain("supplierMappingAttributesSchema");
    expect(uiSource).toContain("Exact attributes JSON");
    expect(uiSource).toContain("Add Supplier Offer for review");
    expect(uiSource).toContain("Approve mapping");
    expect(uiSource).toContain("Reject mapping");
    expect(uiSource).toContain("Keep separate");
  });

  it("protects every pilot action from records outside the fixed Game Top-Up cohort", () => {
    const assertBlock = dbSource.slice(dbSource.indexOf("async function assertTopUpPilotCandidate"), dbSource.indexOf("async function getTopUpPilotOffer"));
    expect(assertBlock).toContain("outside the fixed 25-product Game Top-Up pilot cohort");
    const wrappers = dbSource.slice(dbSource.indexOf("export async function createTopUpPilotMaster"), dbSource.indexOf("/** Creates an empty VAMNUX-owned Master Product"));
    expect(wrappers).toContain("assertTopUpPilotCandidate");
    expect(wrappers).toContain("getTopUpPilotOffer");
    expect(wrappers).toContain("catalog_pilot.offer_approved");
    expect(wrappers).toContain("catalog_pilot.offer_rejected");
    expect(wrappers).toContain("catalog_pilot.kept_separate");
  });

  it("records audit-derived outcome counts and leaves prices, orders, wallets, routing, and fulfillment unchanged", () => {
    const pilotBlock = dbSource.slice(dbSource.indexOf("export async function getTopUpCatalogPilot"), dbSource.indexOf("/** Records only an Admin acknowledgement"));
    expect(pilotBlock).toContain("productsReviewed");
    expect(pilotBlock).toContain("masterProductsCreated");
    expect(pilotBlock).toContain("supplierOffersCreated");
    expect(pilotBlock).toContain("requiringFurtherAdminReview");
    expect(pilotBlock).toContain("liveRoutingDisabled: true");
    expect(pilotBlock).toContain("liveFulfillmentDisabled: true");
    expect(pilotBlock).not.toContain("db.update(products)");
    expect(pilotBlock).not.toContain("walletEntries");
    expect(pilotBlock).not.toContain("orders");
    expect(uiSource).toContain("PILOT OUTCOME REPORT");
    expect(uiSource).toContain("UNRESOLVED PILOT ITEMS");
    expect(superAdminSource).toContain('id: "top_up_pilot", label: "Game Top-Up pilot"');
    expect(superAdminSource).toContain("<AdminTopUpCatalogPilot />");
  });
});
