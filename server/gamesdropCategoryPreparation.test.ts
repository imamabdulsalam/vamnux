import { describe, expect, it } from "vitest";
import { classifyExistingProductForGamesDropPreparation, GAMESDROP_PREPARED_SUBCATEGORIES } from "../shared/gamesdropCategoryPreparation";

describe("GamesDrop category preparation", () => {
  it("prepares only the reviewed Games and Top-up subcategories without public publication", () => {
    expect(GAMESDROP_PREPARED_SUBCATEGORIES.map((subcategory) => subcategory.slug)).toEqual(expect.arrayContaining([
      "games-steam", "games-xbox", "games-playstation", "games-nintendo", "games-other-platform", "games-ea", "games-ubisoft", "games-quest", "games-battlenet", "games-mobile", "games-pc-other", "games-unclassified", "top-up-direct-top-up", "top-up-activation-codes", "top-up-unclassified",
    ]));
    expect(GAMESDROP_PREPARED_SUBCATEGORIES.every((subcategory) => subcategory.assignmentPolicy === "admin_review_only" || subcategory.assignmentPolicy === "automatic_evidence_only")).toBe(true);
  });

  it("assigns GamesDrop Games to Steam only from structured supplier platform evidence", () => {
    expect(classifyExistingProductForGamesDropPreparation({
      id: 1,
      category: "steam",
      supplierKey: "gamesdrop",
      metadata: { platformCode: "steam" },
    })).toMatchObject({
      subcategorySlug: "games-steam",
      status: "SAFE",
      evidenceType: "supplier_platform",
    });
  });

  it("does not infer a Game subcategory from its title or another supplier's unstructured metadata", () => {
    expect(classifyExistingProductForGamesDropPreparation({
      id: 2,
      category: "steam",
      supplierKey: "foxreload",
      metadata: { title: "A Steam game key" },
    })).toMatchObject({
      subcategorySlug: "games-unclassified",
      status: "ADMIN_REVIEW",
      evidenceType: "missing_supplier_data",
    });
  });

  it("keeps Top-up products unclassified when no authoritative delivery-kind field is stored", () => {
    expect(classifyExistingProductForGamesDropPreparation({
      id: 3,
      category: "top_up",
      supplierKey: "gamesdrop",
      metadata: { productName: "Mobile Legends Global" },
    })).toMatchObject({
      subcategorySlug: "top-up-unclassified",
      status: "UNCLASSIFIED",
      evidenceType: "missing_supplier_data",
    });
  });
});
