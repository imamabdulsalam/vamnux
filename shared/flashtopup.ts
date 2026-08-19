export type VamnuxCatalogCategory = "gift_card" | "subscription" | "top_up";

export type CustomerInputRequirement = {
  key: string;
  label: string;
  type: "text" | "email" | "select";
  required: boolean;
  options?: Array<{ label: string; value: string }>;
  helperText?: string;
};

export type FlashTopUpCatalogRecord = {
  externalId: string;
  name: string;
  supplierCategory?: string | null;
  regionLabel?: string | null;
  deliveryType: "digital_code" | "activation_link" | "manual_processing" | "instant" | "account_access";
  inputRequirements?: CustomerInputRequirement[];
};

export const VAMNUX_CATEGORY_PRESENTATION: Array<{
  id: VamnuxCatalogCategory;
  label: string;
  description: string;
}> = [
  {
    id: "gift_card",
    label: "Gift Cards",
    description: "Digital codes for gaming, entertainment, shopping, and everyday online services.",
  },
  {
    id: "subscription",
    label: "Subscriptions",
    description: "Digital access and premium memberships for entertainment and communication services.",
  },
  {
    id: "top_up",
    label: "Gaming Top-Ups",
    description: "Direct in-game currency deliveries that require the player details specified by the supplier.",
  },
];

const CATEGORY_MATCHERS: Array<{ category: VamnuxCatalogCategory; terms: string[] }> = [
  { category: "subscription", terms: ["subscription", "premium", "membership", "nitro", "netflix", "spotify", "youtube"] },
  { category: "gift_card", terms: ["gift card", "voucher", "steam", "razer", "google play", "playstation", "apple", "itunes", "xbox", "amazon"] },
  { category: "top_up", terms: ["top up", "top-up", "diamond", "uc", "crystal", "token", "point", "credit"] },
];

/**
 * Provides a conservative display category when an authenticated FlashTopUp product payload
 * has not yet supplied an explicit category. Supplier-provided input fields still take precedence.
 */
export function classifyFlashTopUpProduct(record: FlashTopUpCatalogRecord): VamnuxCatalogCategory {
  if (record.inputRequirements?.some((field) => /player|game.?id|user.?id|server|zone/i.test(field.key))) {
    return "top_up";
  }

  const source = `${record.supplierCategory ?? ""} ${record.name}`.toLowerCase();
  const match = CATEGORY_MATCHERS.find((matcher) => matcher.terms.some((term) => source.includes(term)));
  return match?.category ?? "top_up";
}

export function needsPlayerDetails(record: FlashTopUpCatalogRecord) {
  const fields = record.inputRequirements ?? [];
  return {
    requiresPlayerId: fields.some((field) => /player|game.?id|user.?id/i.test(field.key)),
    requiresServerId: fields.some((field) => /server|zone|region/i.test(field.key)),
  };
}
