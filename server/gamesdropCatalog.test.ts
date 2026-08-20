import { describe, expect, it } from "vitest";
import { mapGamesDropOffer } from "./gamesdropCatalog";

describe("GamesDrop catalog mapper", () => {
  it("maps Telegram Stars with a numeric Telegram User ID requirement", () => {
    const mapped = mapGamesDropOffer({ offerGroupId: 426, productName: "Telegram Stars", offerGroupName: "100 Telegram Stars", price: 1.56, currency: "USD", inStock: true, isRequiredGameUserId: true });
    expect(mapped).toMatchObject({ category: "telegram_stars", deliveryType: "instant", requiresPlayerId: true, status: "active" });
    expect(mapped?.inputRequirements).toEqual([{ key: "telegram_user_id", label: "Telegram User ID", type: "text", required: true, helperText: "Enter your numeric Telegram User ID, not an @username." }]);
  });

  it("maps a Steam platform offer into the dedicated Steam category and a digital-code delivery format", () => {
    const mapped = mapGamesDropOffer({ offerGroupId: 3872, productName: "7 Days to Die Steam CD Key", offerGroupName: "7 Days to Die Steam CD Key", platformCode: "steam", platformName: "Steam", regionCode: "GLB", regionName: "Global", price: 21.63, currency: "USD", inStock: true });
    expect(mapped).toMatchObject({ category: "steam", deliveryType: "digital_code", regionLabel: "Global" });
  });

  it("keeps a named PUBG UC offer in Gaming Top-Ups even when the supplier calls it a gift card", () => {
    const mapped = mapGamesDropOffer({ offerGroupId: 40, productName: "PUBG Mobile Gift Card", offerGroupName: "PUBG Mobile 60 UC", price: 0.91, currency: "USD", inStock: true });
    expect(mapped).toMatchObject({ category: "top_up", deliveryType: "instant" });
  });
});
