import { describe, expect, it } from "vitest";
import { toLiveCatalogProduct } from "../client/src/lib/liveCatalog";

const baseCatalogRow = {
  id: 1,
  slug: "sample",
  category: "top_up",
  description: null,
  basePrice: "1.00",
  customerPrice: "1.25",
  priceRule: "final",
  supplierKey: "gamesdrop",
  supplierEligible: true,
  regionLabel: null,
  deliveryType: "instant",
  requiresPlayerId: true,
  requiresServerId: false,
  inputRequirements: [],
};

describe("live catalog artwork fallbacks", () => {
  it("uses an existing authorized supplier family image when a Mobile Legends or PUBG supplier row has no artwork", () => {
    expect(toLiveCatalogProduct({ ...baseCatalogRow, name: "Mobile Legends Global — 86 Diamonds", imageUrl: null }, 0).image).toBe("/manus-storage/mobile-legends_da301a0e.webp");
    expect(toLiveCatalogProduct({ ...baseCatalogRow, name: "PUBG Mobile — 60 UC", imageUrl: null }, 1).image).toBe("/manus-storage/pubg-mobile_66e3513a.webp");
  });

  it("preserves a usable supplier-provided image and uses an official supplier-origin fallback when the API provides no artwork", () => {
    expect(toLiveCatalogProduct({ ...baseCatalogRow, name: "PUBG Mobile — 60 UC", imageUrl: "https://supplier.example/pubg.webp" }, 0).image).toBe("https://supplier.example/pubg.webp");
    expect(toLiveCatalogProduct({ ...baseCatalogRow, name: "Unmapped service", imageUrl: null }, 0).image).toBe("");
  });
});
