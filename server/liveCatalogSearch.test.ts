import { describe, expect, it } from "vitest";
import { catalogProductPresentation, productMatchesKeyword, type LiveCatalogProduct } from "../client/src/lib/liveCatalog";

const pubgService: LiveCatalogProduct = {
  id: 1,
  slug: "ft-pubg-60-uc",
  category: "Top-up",
  name: "PUBG Mobile",
  product: "60 UC",
  description: "Enter User ID before fulfilment.",
  price: 0.93,
  priceNote: "FlashTopUp service price",
  region: "Global",
  delivery: "Player ID required",
  image: "/pubg.webp",
  tone: "cobalt",
  badge: "Top-up",
  inputRequirements: [],
};

describe("live catalog keyword matching", () => {
  it("matches real game families, denomination keywords, and supplier requirements", () => {
    expect(productMatchesKeyword(pubgService, "pubg")).toBe(true);
    expect(productMatchesKeyword(pubgService, "60 uc")).toBe(true);
    expect(productMatchesKeyword(pubgService, "player id")).toBe(true);
  });

  it("returns no match for an unrelated product keyword", () => {
    expect(productMatchesKeyword(pubgService, "netflix")).toBe(false);
  });

  it("keeps the game identity, denomination, and required player field distinct for compact cards", () => {
    expect(catalogProductPresentation({ ...pubgService, inputRequirements: [{ key: "player_id", label: "Player ID", type: "text", required: true }] })).toEqual({
      serviceName: "PUBG Mobile",
      offerName: "60 UC",
      requirementLabel: "Player ID required",
    });
  });
});
