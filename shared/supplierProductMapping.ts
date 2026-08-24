/**
 * The only attributes an owner may use to confirm a supplier offer against a
 * VAMNUX Master Product. Names are deliberately not part of this comparison.
 */
export const SUPPLIER_MAPPING_CATEGORIES = [
  "top_up",
  "gift_card",
  "game_key",
  "subscription",
  "software",
  "ai_tool",
  "steam",
  "steam_top_up",
  "telegram_stars",
] as const;

export type SupplierMappingCategory = (typeof SUPPLIER_MAPPING_CATEGORIES)[number];
export type MappingAttributes = Record<string, string>;

export const MAPPING_STATUS_VALUES = ["UNMAPPED", "PENDING REVIEW", "APPROVED", "REJECTED"] as const;
export type MappingStatus = (typeof MAPPING_STATUS_VALUES)[number];

export const MAPPING_ATTRIBUTE_REQUIREMENTS: Record<SupplierMappingCategory, readonly string[]> = {
  top_up: ["game", "currency", "denomination", "region_server", "delivery_requirement"],
  gift_card: ["brand", "denomination", "currency", "country_region", "redemption_restrictions"],
  game_key: ["title", "edition", "platform", "region"],
  subscription: ["service", "plan", "duration", "tier", "region"],
  software: ["software", "edition", "license_type", "duration", "devices", "operating_system", "region"],
  ai_tool: ["service", "plan", "duration", "license_account_type", "region"],
  steam: ["title", "edition", "platform", "region"],
  steam_top_up: ["brand", "currency", "denomination", "country_region", "redemption_restrictions"],
  telegram_stars: ["service", "currency", "denomination", "region", "delivery_requirement"],
};

export const MAPPING_ATTRIBUTE_LABELS: Record<string, string> = {
  game: "Game",
  currency: "Currency",
  denomination: "Denomination",
  region_server: "Region / server",
  delivery_requirement: "Delivery requirement",
  brand: "Brand",
  country_region: "Country / region",
  redemption_restrictions: "Redemption restrictions",
  title: "Title",
  edition: "Edition",
  platform: "Platform",
  region: "Region",
  service: "Service",
  plan: "Plan",
  duration: "Duration",
  tier: "Tier",
  software: "Software",
  license_type: "License type",
  devices: "Devices",
  operating_system: "Operating system",
  license_account_type: "License / account type",
};

export function isSupplierMappingCategory(value: string): value is SupplierMappingCategory {
  return SUPPLIER_MAPPING_CATEGORIES.includes(value as SupplierMappingCategory);
}

export function mappingAttributesForCategory(category: SupplierMappingCategory) {
  return MAPPING_ATTRIBUTE_REQUIREMENTS[category];
}

export function normalizeMappingAttributes(category: SupplierMappingCategory, attributes: Record<string, unknown>): MappingAttributes {
  const normalised: MappingAttributes = {};
  for (const key of mappingAttributesForCategory(category)) {
    const rawValue = attributes[key];
    const value = typeof rawValue === "string" ? rawValue.trim().replace(/\s+/g, " ") : "";
    if (!value) throw new Error(`Verified ${MAPPING_ATTRIBUTE_LABELS[key] || key} is required for ${category.replaceAll("_", " ")} mapping.`);
    normalised[key] = value.toLocaleLowerCase();
  }
  return normalised;
}

/** Exact category-specific attributes are required; product names are never compared here. */
export function mappingAttributesMatch(category: SupplierMappingCategory, master: MappingAttributes, supplier: MappingAttributes) {
  return mappingAttributesForCategory(category).every((key) => master[key] === supplier[key]);
}

export function mappingIdentityValue(category: SupplierMappingCategory, attributes: MappingAttributes) {
  const keys = mappingAttributesForCategory(category);
  return keys.map((key) => attributes[key]).join("|");
}
