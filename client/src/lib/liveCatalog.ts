export type ProductCategory = "Top-up" | "Voucher" | "Subscription" | "Software" | "AI tools";

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
  basePrice: string | number;
  customerPrice: string | number;
  priceRule: string;
  supplierKey: string | null;
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
  gift_card: "Voucher",
  subscription: "Subscription",
  software: "Software",
  game_key: "Voucher",
  ai_tool: "AI tools",
};

const productTones = ["ember", "ice", "lime", "coral", "cobalt"];

function supplierDeliveryLabel(item: Pick<CatalogSourceRow, "requiresPlayerId" | "requiresServerId" | "deliveryType">) {
  if (item.requiresPlayerId && item.requiresServerId) return "Player ID + Server required";
  if (item.requiresPlayerId) return "Player ID required";
  return item.deliveryType.replaceAll("_", " ");
}

function customerPriceLabel(item: Pick<CatalogSourceRow, "priceRule" | "supplierEligible">) {
  if (!item.supplierEligible) return "Availability paused";
  return `VAMNUX price · ${item.priceRule}`;
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
    image: item.imageUrl || "",
    tone: productTones[index % productTones.length],
    badge: item.category === "game_key" ? "Game key" : category === "Voucher" ? "Gift card" : category,
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
