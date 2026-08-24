export type ProductCategory = "Top-up" | "Gift cards" | "Subscription" | "Software" | "AI tools" | "Games" | "Steam Top-Up" | "Telegram Stars";

export type LiveCatalogProduct = {
  id: number;
  slug: string;
  category: ProductCategory;
  name: string;
  product: string;
  description: string;
  price: number;
  priceNote: string;
  region: string;
  delivery: string;
  image: string;
  tone: string;
  badge: string;
  inputRequirements: Array<{ key: string; label: string; type: "text" | "email" | "select"; required: boolean; helperText?: string }>;
};

type CatalogSourceRow = {
  id: number;
  slug: string;
  category: string;
  name: string;
  description: string | null;
  customerPrice: string | number;
  priceRule: string;
  supplierEligible: boolean;
  regionLabel: string | null;
  deliveryType: string;
  requiresPlayerId: boolean;
  requiresServerId: boolean;
  imageUrl: string | null;
  inputRequirements: unknown;
};

const supplierCategoryLabels: Record<string, ProductCategory> = {
  top_up: "Top-up",
  gift_card: "Gift cards",
  subscription: "Subscription",
  software: "Software",
  game_key: "Gift cards",
  ai_tool: "AI tools",
  steam: "Games",
  steam_top_up: "Steam Top-Up",
  telegram_stars: "Telegram Stars",
};

const productTones = ["ember", "ice", "lime", "coral", "cobalt"];

/**
 * These images are already stored on active authorized FlashTopUp catalog
 * records. GamesDrop currently returns no artwork for some equivalent
 * Mobile Legends and PUBG services, so retain the supplier-verified family
 * identity rather than rendering a letter placeholder on the public card.
 */
const verifiedFamilyArtworkFallbacks = [
  { keyword: "mobile legends", image: "/manus-storage/mobile-legends_da301a0e.webp" },
  { keyword: "pubg", image: "/manus-storage/pubg-mobile_66e3513a.webp" },
] as const;

function customerSafeImage(item: Pick<CatalogSourceRow, "name" | "imageUrl">) {
  if (item.imageUrl?.trim()) return item.imageUrl;
  const normalizedName = item.name.toLowerCase();
  return verifiedFamilyArtworkFallbacks.find(({ keyword }) => normalizedName.includes(keyword))?.image ?? "";
}

function supplierDeliveryLabel(item: Pick<CatalogSourceRow, "requiresPlayerId" | "requiresServerId" | "deliveryType">) {
  if (item.requiresPlayerId && item.requiresServerId) return "Player ID + Server required";
  if (item.requiresPlayerId) return "Player ID required";
  return item.deliveryType.replaceAll("_", " ");
}

function customerPriceLabel(item: Pick<CatalogSourceRow, "priceRule" | "supplierEligible">) {
  if (!item.supplierEligible) return "Availability paused";
  return "Final price";
}

export function toLiveCatalogProduct(item: CatalogSourceRow, index: number): LiveCatalogProduct {
  const nameParts = item.name.split(" — ");
  const fields = Array.isArray(item.inputRequirements) ? item.inputRequirements as Array<{ key?: string; label?: string; type?: "text" | "email" | "select"; required?: boolean; helperText?: string }> : [];
  const category = supplierCategoryLabels[item.category] ?? "Top-up";
  return {
    id: item.id,
    slug: item.slug,
    category,
    name: nameParts[0] || item.name,
    product: nameParts.slice(1).join(" — ") || item.name,
    description: item.description?.trim() || (fields.length > 0
      ? `Enter ${fields.filter((field) => field.required).map((field) => field.label || "supplier-required details").join(" and ") || "the supplier-required account details"} before fulfilment.`
      : "Verified supplier service. Availability and delivery format are shown before purchase."),
    price: Number(item.customerPrice),
    priceNote: customerPriceLabel(item),
    region: item.regionLabel || "Supplier region rules",
    delivery: supplierDeliveryLabel(item),
    image: customerSafeImage(item),
    tone: productTones[index % productTones.length],
    badge: item.category === "game_key" ? "Game key" : category === "Gift cards" ? "Gift card" : category,
    inputRequirements: fields.filter((field): field is { key: string; label: string; type: "text" | "email" | "select"; required: boolean; helperText?: string } => typeof field.key === "string" && typeof field.label === "string" && (field.type === "text" || field.type === "email" || field.type === "select")),
  };
}

export function productMatchesKeyword(product: Pick<LiveCatalogProduct, "name" | "product" | "category" | "region" | "delivery">, keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return true;
  return [product.name, product.product, product.category, product.region, product.delivery]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

export function catalogProductPresentation(product: Pick<LiveCatalogProduct, "name" | "product" | "delivery" | "inputRequirements">) {
  const requiredFields = product.inputRequirements.filter((field) => field.required).map((field) => field.label);
  return {
    serviceName: product.name,
    offerName: product.product,
    requirementLabel: requiredFields.length > 0 ? `${requiredFields.join(" + ")} required` : product.delivery,
  };
}
