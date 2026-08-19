import { describe, expect, it } from "vitest";
import { classifyFlashTopUpProduct, needsPlayerDetails } from "../shared/flashtopup";

describe("FlashTopUp category rules", () => {
  it("keeps supplier-defined player and server fields in the gaming top-up category", () => {
    const product = {
      externalId: "mlbb-global-100",
      name: "Mobile Legends 100 Diamonds",
      deliveryType: "instant" as const,
      inputRequirements: [
        { key: "playerId", label: "Player ID", type: "text" as const, required: true },
        { key: "serverId", label: "Server ID", type: "text" as const, required: true },
      ],
    };

    expect(classifyFlashTopUpProduct(product)).toBe("top_up");
    expect(needsPlayerDetails(product)).toEqual({ requiresPlayerId: true, requiresServerId: true });
  });

  it("classifies a standard Steam code as a gift card without player details", () => {
    const product = { externalId: "steam-20", name: "Steam Gift Card 20 USD", deliveryType: "digital_code" as const };
    expect(classifyFlashTopUpProduct(product)).toBe("gift_card");
    expect(needsPlayerDetails(product)).toEqual({ requiresPlayerId: false, requiresServerId: false });
  });
});

