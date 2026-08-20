import { describe, expect, it } from "vitest";
import { mapFoxReloadProduct } from "./foxreloadCatalog";

describe("FoxReload catalog mapper", () => {
  const category = { id: "category-1", name: "Gaming Top Ups", slug: "gaming-topups", hasProducts: true, tags: ["games"] };

  it("preserves supplier price and required Player ID fields for an in-stock top-up", () => {
    const mapped = mapFoxReloadProduct(category, {
      id: "fox-1", name: "PUBG Mobile 60 UC", slug: "pubg-mobile-60-uc", categoryId: "category-1", price: "0.99", currency: "usd", quantity: 12, description: "<p>Digital &ndash; code</p>", requiredNoteFields: ["player_id"], noteFieldTypes: { player_id: "text" },
    });
    expect(mapped).toMatchObject({ category: "top_up", basePrice: "0.99", baseCurrency: "USD", supplierEligible: true, requiresPlayerId: true, status: "active" });
    expect(mapped?.inputRequirements).toEqual([{ key: "player_id", label: "Player Id", type: "text", required: true, helperText: undefined }]);
    expect(mapped?.description).toBe("Digital – code");
  });

  it("maps real supplier naming cues into VAMNUX categories and pauses an out-of-stock item", () => {
    const mapped = mapFoxReloadProduct({ ...category, name: "Software" }, {
      id: "fox-2", name: "Windows 11 License", slug: "windows-11-license", categoryId: "category-1", price: 15, currency: "usd", quantity: 0,
    });
    expect(mapped).toMatchObject({ category: "software", deliveryType: "manual_processing", supplierEligible: false, status: "paused" });
  });

  it("maps gift-card and AI supplier naming cues to the intended VAMNUX browse categories", () => {
    const giftCard = mapFoxReloadProduct({ ...category, name: "Gift Cards", slug: "gift-cards" }, {
      id: "fox-3", name: "Steam Wallet Code", slug: "steam-wallet-code", categoryId: "category-1", price: 10, currency: "usd", quantity: 1,
    });
    const ai = mapFoxReloadProduct({ ...category, name: "AI Services", slug: "ai-services" }, {
      id: "fox-4", name: "AI Assistant Plan", slug: "ai-assistant-plan", categoryId: "category-1", price: 20, currency: "usd", quantity: 1,
    });
    expect(giftCard).toMatchObject({ category: "gift_card", deliveryType: "digital_code" });
    expect(ai).toMatchObject({ category: "ai_tool", deliveryType: "manual_processing" });
  });

  it("recognises supplier game-key metadata when a product arrives through the search endpoint", () => {
    const mapped = mapFoxReloadProduct({ id: "search", name: "FoxReload digital catalog", slug: "foxreload-search", hasProducts: true }, {
      id: "fox-5", name: "Minecraft Windows Edition", slug: "minecraft-windows", categoryId: "game-category", price: 20, currency: "usd", quantity: 1, attributes: { game_key_digest: "opaque" },
    });
    expect(mapped).toMatchObject({ category: "game_key", deliveryType: "digital_code", status: "active" });
  });

  it("classifies an account-delivered Steam game as a game key even when a broad supplier category says gift cards", () => {
    const mapped = mapFoxReloadProduct({ ...category, name: "Gift Cards", slug: "gift-cards" }, {
      id: "fox-8", name: "SteamWorld Dig 2 (Steam Account)", slug: "steamworld-dig-2-steam-account", categoryId: "category-1", price: 6, currency: "usd", quantity: 1,
    });
    expect(mapped).toMatchObject({ category: "game_key", deliveryType: "digital_code", status: "active" });
  });

  it("excludes generic unnamed codes and adult-oriented supplier records from the public marketplace", () => {
    const genericCode = mapFoxReloadProduct(category, { id: "fox-6", name: "Digital Code", slug: "digital-code", categoryId: "category-1", price: 10, currency: "usd", quantity: 1 });
    const adultProduct = mapFoxReloadProduct(category, { id: "fox-7", name: "Adult Game Pass", slug: "adult-game-pass", categoryId: "category-1", price: 10, currency: "usd", quantity: 1 });
    expect(genericCode).toBeNull();
    expect(adultProduct).toBeNull();
  });
});
