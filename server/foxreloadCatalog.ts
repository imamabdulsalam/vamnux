import type { CustomerInputRequirement } from "../shared/flashtopup";
import { configureCommerceIntegration, upsertSupplierCatalogRows } from "./db";
import type { SupplierCatalogRow } from "./catalogTypes";
import { getFoxReloadClient, type FoxReloadCategory, type FoxReloadProduct } from "./integrations/foxreload";

function stableSlug(value: string) {
  return `fr-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 170)}`;
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
  if (typeof attributes.game_key_digest === "string" || typeof attributes.game_key_digest_version === "number") return "game_key";
  const terms = [product.name, product.slug, product.description ?? "", category.name, category.slug, ...(category.tags ?? []), JSON.stringify(attributes)].join(" ").toLowerCase();
  if (/gift[ -]?card|voucher|steam|playstation|xbox|apple|itunes|google play|amazon/.test(terms)) return "gift_card";
  if (/subscription|premium|membership|netflix|spotify|youtube|discord nitro|pass/.test(terms)) return "subscription";
  if (/chatgpt|claude|midjourney|ai tool|ai service|artificial intelligence/.test(terms)) return "ai_tool";
  if (/software|licen[cs]e|windows|office|antivirus|vpn/.test(terms)) return "software";
  if (/game key|activation key|cd key/.test(terms)) return "game_key";
  return "top_up";
}

function deliveryTypeFor(category: SupplierCatalogRow["category"]): SupplierCatalogRow["deliveryType"] {
  if (category === "top_up") return "instant";
  if (category === "gift_card" || category === "game_key") return "digital_code";
  return "manual_processing";
}

function isSellableFoxReloadCategory(category: FoxReloadCategory) {
  const hasReportedStock = Number(category.inStockCount ?? 0) > 0;
  return (category.hasProducts || hasReportedStock) && !/\btest\b/i.test(`${category.name} ${category.slug}`);
}

export function mapFoxReloadProduct(category: FoxReloadCategory, product: FoxReloadProduct): SupplierCatalogRow | null {
  const price = Number(product.price);
  if (!product.id || !product.name?.trim() || !Number.isFinite(price) || price <= 0) return null;
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
    name: (category.slug === "foxreload-search" ? product.name : `${category.name} — ${product.name}`).slice(0, 255),
    category: mappedCategory,
    description: supplierText(product.description),
    regionLabel: typeof attributes.country_code === "string" ? attributes.country_code : typeof attributes.region === "string" ? attributes.region : undefined,
    basePrice: price.toFixed(2),
    baseCurrency: currency,
    supplierPrice: price.toFixed(2),
    supplierCurrency: currency,
    supplierOfferId: product.id,
    supplierEligible: eligible,
    deliveryType: deliveryTypeFor(mappedCategory),
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
  await upsertSupplierCatalogRows({ supplierKey: "foxreload", rows });
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
