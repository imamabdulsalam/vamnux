import { describe, expect, it } from "vitest";
import { mapFlashTopUpService, normalizeFlashTopUpInputRequirements, resolveFlashTopUpProductImageUrl } from "./flashtopupCatalog";

describe("FlashTopUp catalog mapper", () => {
  it("maps supplier-defined player and server fields to an active gaming top-up service", () => {
    const row = mapFlashTopUpService({
      product_id: 10,
      product_code: "TOPUP_MOBILE_LEGENDS",
      product_type: "topup",
      name: "Mobile Legends",
      validation_code: "mlbb",
      fields: [
        { name: "user_id", label: "Player ID", required: true, type: "text" },
        { name: "server_id", label: "Server ID", required: true, type: "text" },
      ],
    }, {
      service_id: 102,
      service_code: "TOPUP_MOBILE_LEGENDS_86_DIAMONDS",
      service_name: "86 Diamonds",
      product_id: 10,
      product_code: "TOPUP_MOBILE_LEGENDS",
      product_name: "Mobile Legends",
      product_type: "topup",
      price: "1.24",
      currency: "USD",
      in_stock: true,
      status: "active",
    });
    expect(row).toMatchObject({ category: "top_up", deliveryType: "instant", requiresPlayerId: true, requiresServerId: true, status: "active", supplierSku: "TOPUP_MOBILE_LEGENDS_86_DIAMONDS" });
  });

  it("preserves exact supplier field names and pauses out-of-stock gift-card services", () => {
    expect(normalizeFlashTopUpInputRequirements([{ name: "account_email", label: "Account email", required: "true", type: "email" }]))
      .toEqual([{ key: "account_email", label: "Account email", type: "email", required: true, helperText: undefined }]);
    const row = mapFlashTopUpService({ product_id: 12, product_code: "GIFT_STEAM", product_type: "gift_card", name: "Steam Gift Card" }, {
      service_id: 501, service_code: "GIFT_STEAM_US_10", service_name: "10 USD", product_id: 12, product_code: "GIFT_STEAM", product_name: "Steam Gift Card", product_type: "gift_card", price: "10.00", currency: "USD", in_stock: false, status: "active",
    });
    expect(row).toMatchObject({ category: "gift_card", deliveryType: "digital_code", status: "paused", supplierEligible: false });
  });

  it("keeps recognised supplier artwork on managed VAMNUX storage and normalises other public image URLs", () => {
    expect(resolveFlashTopUpProductImageUrl("https://api.flashtopup.com/assets/uploads/category/8575d7fd-7df1-4835-a9e1-c286f564c4a0.webp"))
      .toBe("/manus-storage/mobile-legends_da301a0e.webp");
    expect(resolveFlashTopUpProductImageUrl("https://api.flashtopup.com/assets/uploads/category/other-game.webp"))
      .toBe("https://flashtopup.com/api/media/assets/uploads/category/other-game.webp");
  });
});
