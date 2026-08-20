import type { CustomerInputRequirement } from "../shared/flashtopup";
import { configureCommerceIntegration, upsertFoxReloadCatalogRows } from "./db";
import type { SupplierCatalogRow } from "./catalogTypes";
import { getFoxReloadClient, type FoxReloadCategory, type FoxReloadProduct } from "./integrations/foxreload";

function stableSlug(value: string) {
  return `fr-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 170)}`;
}

function normalizedSupplierSlug(value: string) {
  return value.toLowerCase().trim().replace(/\+/g, " plus ").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function titleFromSupplierSlug(value: string) {
  const specialNames: Record<string, string> = {
    "mobile-legends": "Mobile Legends",
    "mobile-legends-brazil": "Mobile Legends — Brazil",
    "pubg-mobile": "PUBG Mobile",
    "tom-and-jerry-chase": "Tom & Jerry: Chase",
    "tiles-survive": "Tiles Survive",
    "knives-out": "Knives Out",
    "topups-lineage2m-global": "Lineage2M — Global",
    netflix: "Netflix",
    spotify: "Spotify Premium",
  };
  const normalized = value.replace(/^(cw|fr)-/, "").replace(/-(france|brazil|austria|united-states|usa|official)$/i, "");
  if (specialNames[normalized]) return specialNames[normalized];
  return normalized.split("-").filter(Boolean).map((part) => specialNames[part] ?? (part.length <= 3 ? part.toUpperCase() : `${part[0].toUpperCase()}${part.slice(1)}`)).join(" ");
}

export function foxReloadDisplayName(category: FoxReloadCategory, product: FoxReloadProduct) {
  const rawName = product.name.trim();
  if (category.slug !== "foxreload-search") return `${category.name} — ${rawName}`.slice(0, 255);
  const genericOnly = /^(?:\d|\d+\s*(?:months?|years?|eur|usd|diamonds?)\b|usa\b|official\b|top-?up\b|weekly\b)/i.test(rawName);
  if (!genericOnly) return rawName.slice(0, 255);
  const productSlug = normalizedSupplierSlug(product.slug || "");
  const denominationSlug = normalizedSupplierSlug(rawName);
  const identitySlug = denominationSlug && productSlug.endsWith(`-${denominationSlug}`)
    ? productSlug.slice(0, -(denominationSlug.length + 1))
    : productSlug;
  const identity = titleFromSupplierSlug(identitySlug);
  return identity ? `${identity} — ${rawName}`.slice(0, 255) : rawName.slice(0, 255);
}

function readableFieldLabel(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function supplierText(value: string | null | undefined) {
  const entities: Record<string, string> = { nbsp: " ", ndash: "–", mdash: "—", amp: "&", quot: '"', apos: "'", "#39": "'" };
  return value?.replace(/<[^>]*>/g, " ").replace(/&(#39|nbsp|ndash|mdash|amp|quot|apos);/gi, (_, entity: string) => entities[entity.toLowerCase()] ?? " ").replace(/\s+/g, " ").trim().slice(0, 900) || undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function mapInputRequirements(product: FoxReloadProduct): CustomerInputRequirement[] {
  const required = new Set((product.requiredNoteFields ?? []).filter((field): field is string => typeof field === "string" && field.trim().length > 0));
  const types = asRecord(product.noteFieldTypes);
  const options = asRecord(product.noteFieldOptions);
  return Array.from(required).map((key) => {
    const type = String(types[key] ?? "").toLowerCase();
    const choices = options[key];
    return {
      key,
      label: readableFieldLabel(key),
      type: type === "email" ? "email" : Array.isArray(choices) ? "select" : "text",
      required: true,
      helperText: Array.isArray(choices) ? choices.filter((choice) => typeof choice === "string").join(", ").slice(0, 180) || undefined : undefined,
    } as CustomerInputRequirement;
  });
}

function classifyFoxReloadProduct(product: FoxReloadProduct, category: FoxReloadCategory): SupplierCatalogRow["category"] {
  const attributes = asRecord(product.attributes);
  const terms = [product.name, product.slug, product.description ?? "", category.name, category.slug, ...(category.tags ?? []), JSON.stringify(attributes)].join(" ").toLowerCase();
  if (/telegram\s+stars?/.test(terms)) return "telegram_stars";
  if (typeof attributes.game_key_digest === "string" || typeof attributes.game_key_digest_version === "number") return "game_key";
  if (/steam account|steam edition|\bdlc\b|expansion|game key|activation key|cd key|game code/.test(terms)) return "game_key";
  if (/steam/.test(terms)) return "steam";
  if (/gift[ -]?card|voucher|steam|playstation|xbox|apple|itunes|google play|amazon/.test(terms)) return "gift_card";
  if (/subscription|premium|membership|netflix|spotify|youtube|discord nitro|pass/.test(terms)) return "subscription";
  if (/chatgpt|claude|midjourney|ai tool|ai service|artificial intelligence/.test(terms)) return "ai_tool";
  if (/software|licen[cs]e|windows|office|antivirus|vpn/.test(terms)) return "software";
  if (/game key|activation key|cd key/.test(terms)) return "game_key";
  return "top_up";
}

function deliveryTypeFor(category: SupplierCatalogRow["category"], product: FoxReloadProduct): SupplierCatalogRow["deliveryType"] {
  if (category === "top_up") return "instant";
  if (category === "gift_card" || category === "game_key" || category === "steam") return "digital_code";
  if (/\bdigital\s+code\b/i.test(product.description ?? "")) return "digital_code";
  return "manual_processing";
}

function isSellableFoxReloadCategory(category: FoxReloadCategory) {
  const hasReportedStock = Number(category.inStockCount ?? 0) > 0;
  return (category.hasProducts || hasReportedStock) && !/\btest\b/i.test(`${category.name} ${category.slug}`);
}

function isProfessionalPublicListing(product: FoxReloadProduct) {
  const normalizedName = product.name.trim().toLowerCase().replace(/\s+/g, " ");
  const terms = `${product.name} ${product.slug} ${product.description ?? ""}`.toLowerCase();
  const genericNames = new Set(["digital code", "gift card", "voucher", "top up"]);
  return !genericNames.has(normalizedName) && !/\b(adult|erotic|futanari|hentai|nude|porn|sex|xxx)\b/.test(terms);
}

export function mapFoxReloadProduct(category: FoxReloadCategory, product: FoxReloadProduct): SupplierCatalogRow | null {
  const price = Number(product.price);
  if (!product.id || !product.name?.trim() || !isProfessionalPublicListing(product) || !Number.isFinite(price) || price <= 0) return null;
  const inputRequirements = mapInputRequirements(product);
  const mappedCategory = classifyFoxReloadProduct(product, category);
  const requiredLabels = inputRequirements.map((field) => field.label).join(" ").toLowerCase();
  const attributes = asRecord(product.attributes);
  const eligible = product.quantity === undefined || product.quantity === null || Number(product.quantity) > 0;
  const currency = String(product.currency || "USD").toUpperCase();
  return {
    slug: stableSlug(product.slug || product.id),
    supplierSku: product.slug || product.id,
    supplierCategory: category.slug,
    name: foxReloadDisplayName(category, product),
    category: mappedCategory,
    description: supplierText(product.description),
    regionLabel: typeof attributes.country_code === "string" ? attributes.country_code : typeof attributes.region === "string" ? attributes.region : undefined,
    basePrice: price.toFixed(2),
    baseCurrency: currency,
    supplierPrice: price.toFixed(2),
    supplierCurrency: currency,
    supplierOfferId: product.id,
    supplierEligible: eligible,
    deliveryType: deliveryTypeFor(mappedCategory, product),
    requiresPlayerId: /player|user\s?id|uid|game\s?id/.test(requiredLabels),
    requiresServerId: /server|zone/.test(requiredLabels),
    inputRequirements,
    status: eligible ? "active" : "paused",
    metadata: {
      supplier: "foxreload",
      categoryId: category.id,
      categorySlug: category.slug,
      categoryTags: category.tags ?? [],
      productId: product.id,
      productSlug: product.slug,
      attributes: product.attributes ?? {},
      orderMinQuantity: product.orderMinQuantity ?? null,
      orderMaxQuantity: product.orderMaxQuantity ?? null,
    },
  };
}

function searchFallbackCategory(product: FoxReloadProduct): FoxReloadCategory {
  return { id: product.categoryId || "foxreload-search", name: "FoxReload digital catalog", slug: "foxreload-search", hasProducts: true };
}

export async function syncFoxReloadCatalog(input: { cursor?: string; categoryLimit?: number; productLimit?: number; categorySlugs?: string[]; searchQueries?: string[]; searchLimit?: number } = {}) {
  const client = getFoxReloadClient();
  const categoryLimit = Math.min(10, Math.max(1, input.categoryLimit ?? 5));
  const productLimit = Math.min(200, Math.max(1, input.productLimit ?? 100));
  const searchLimit = Math.min(25, Math.max(1, input.searchLimit ?? 10));
  const categoryPage = await client.categories({ cursor: input.cursor, limit: input.categorySlugs?.length ? 200 : categoryLimit, withStockOnly: true });
  const requestedSlugs = new Set(input.categorySlugs ?? []);
  const selectedCategories = categoryPage.items
    .filter(isSellableFoxReloadCategory)
    .filter((category) => requestedSlugs.size === 0 || requestedSlugs.has(category.slug))
    .slice(0, categoryLimit);
  const rows: SupplierCatalogRow[] = [];
  const mappedSupplierIds = new Set<string>();
  const currencies = new Set<string>();
  const failures: Array<{ category: string; message: string }> = [];
  for (const category of selectedCategories) {
    try {
      const products = await client.products({ categoryIdOrSlug: category.slug, limit: productLimit, withStockOnly: true });
      for (const product of products.items) {
        const mapped = mapFoxReloadProduct(category, product);
        if (mapped && !mappedSupplierIds.has(mapped.supplierOfferId)) {
          rows.push(mapped);
          mappedSupplierIds.add(mapped.supplierOfferId);
          currencies.add(mapped.baseCurrency);
        }
      }
    } catch (error) {
      failures.push({ category: category.slug, message: error instanceof Error ? error.message.slice(0, 180) : "FoxReload product lookup failed" });
    }
  }
  const categoryById = new Map(categoryPage.items.map((category) => [category.id, category]));
  for (const query of Array.from(new Set(input.searchQueries ?? [])).slice(0, 10)) {
    try {
      const products = await client.searchProducts({ query, limit: searchLimit, withStockOnly: true });
      for (const product of products.items) {
        const mapped = mapFoxReloadProduct(categoryById.get(product.categoryId) ?? searchFallbackCategory(product), product);
        if (mapped && !mappedSupplierIds.has(mapped.supplierOfferId)) {
          rows.push(mapped);
          mappedSupplierIds.add(mapped.supplierOfferId);
          currencies.add(mapped.baseCurrency);
        }
      }
    } catch (error) {
      failures.push({ category: `search:${query}`, message: error instanceof Error ? error.message.slice(0, 180) : "FoxReload product search failed" });
    }
  }
  await upsertFoxReloadCatalogRows(rows);
  await configureCommerceIntegration({
    integrationType: "supplier",
    providerName: "FoxReload",
    apiBaseUrl: "https://public-api.foxreload.com",
    credentialReference: "FOXRELOAD_API_KEY",
    supportedCurrencies: Array.from(currencies).sort(),
    syncStatus: failures.length === 0 ? "ready" : "error",
  });
  return { cursor: input.cursor ?? null, nextCursor: categoryPage.nextCursor ?? null, categoryCount: selectedCategories.length, searchQueryCount: Array.from(new Set(input.searchQueries ?? [])).length, productCount: rows.length, currencies: Array.from(currencies).sort(), failures };
}
