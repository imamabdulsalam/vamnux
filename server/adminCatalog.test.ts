import { describe, expect, it } from "vitest";
import { adminManagedCatalogProductInputSchema, adminManagedCatalogProductUpdateInputSchema, authorizedCatalogSourceInputSchema, createAdminManagedCatalogSlug, createRecipientEmailRequirement } from "../shared/adminCatalog";

describe("admin-managed VAMNUX catalog safeguards", () => {
  const validProduct = {
    name: "Steam Wallet 50 USD",
    category: "gift_card" as const,
    description: "A verified USD Steam Wallet digital code for the stated supported region.",
    catalogSourceId: 10,
    basePrice: 52.5,
    deliveryEstimate: "Usually delivered within 24 hours after recipient details are verified.",
    deliveryType: "digital_code" as const,
  };

  it("defaults manually entered products to draft rather than publishing them automatically", () => {
    expect(adminManagedCatalogProductInputSchema.parse(validProduct).status).toBe("draft");
  });

  it("requires a structured source reference and a meaningful customer description", () => {
    expect(() => adminManagedCatalogProductInputSchema.parse({ ...validProduct, catalogSourceId: 0 })).toThrow();
    expect(() => adminManagedCatalogProductInputSchema.parse({ ...validProduct, description: "Too short" })).toThrow();
    expect(() => adminManagedCatalogProductInputSchema.parse({ ...validProduct, deliveryEstimate: "" })).toThrow();
  });

  it("permits safe archive only through the existing manual-product update contract", () => {
    expect(() => adminManagedCatalogProductInputSchema.parse({ ...validProduct, status: "archived" })).toThrow();
    expect(adminManagedCatalogProductUpdateInputSchema.parse({ ...validProduct, productId: 42, status: "archived" })).toMatchObject({ productId: 42, status: "archived" });
  });

  it("requires every authorised source record to retain its commercial agreement reference", () => {
    expect(() => authorizedCatalogSourceInputSchema.parse({ displayName: "Approved partner", sourceType: "supplier", agreementReference: "" })).toThrow();
    expect(() => authorizedCatalogSourceInputSchema.parse({ displayName: "Approved partner", sourceType: "supplier", agreementReference: "AGR-2026-001" })).toThrow();
    expect(authorizedCatalogSourceInputSchema.parse({ displayName: "Approved partner", sourceType: "supplier", commerceIntegrationId: 9, agreementReference: "AGR-2026-001" })).toMatchObject({ sourceType: "supplier", commerceIntegrationId: 9 });
    expect(authorizedCatalogSourceInputSchema.parse({ displayName: "Direct agreement", sourceType: "direct_agreement", agreementReference: "AGR-2026-002" })).toMatchObject({ sourceType: "direct_agreement" });
  });

  it("uses a deterministic category-scoped slug and only adds fulfilment fields when explicitly requested", () => {
    expect(createAdminManagedCatalogSlug("gift_card", validProduct.name)).toBe("admin-gift-card-steam-wallet-50-usd");
    expect(createRecipientEmailRequirement(false)).toEqual([]);
    expect(createRecipientEmailRequirement(true)).toMatchObject([{ key: "recipient_email", type: "email", required: true }]);
  });
});
