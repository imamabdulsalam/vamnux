import { classifyFlashTopUpProduct, needsPlayerDetails, type CustomerInputRequirement } from "../shared/flashtopup";
import type { FlashTopUpInputField, FlashTopUpProduct, FlashTopUpService } from "./integrations/flashtopup";
import type { SupplierCatalogRow } from "./catalogTypes";
import { getFlashTopUpClient } from "./integrations/flashtopup";
import { configureCommerceIntegration, upsertFlashTopUpCatalogRows } from "./db";

export type FlashTopUpCatalogRow = SupplierCatalogRow;

function validDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function isRequired(value: FlashTopUpInputField["required"]) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function mapInputType(value: string | undefined): CustomerInputRequirement["type"] {
  if (value?.toLowerCase() === "email") return "email";
  if (value?.toLowerCase() === "select") return "select";
  return "text";
}

export function normalizeFlashTopUpInputRequirements(fields: FlashTopUpInputField[] | undefined): CustomerInputRequirement[] {
  return (fields ?? [])
    .filter((field) => typeof field.name === "string" && field.name.trim().length > 0)
    .map((field) => ({
      key: field.name,
      label: field.label?.trim() || field.name.replaceAll("_", " "),
      type: mapInputType(field.type),
      required: isRequired(field.required),
      helperText: field.placeholder || field.validation_regex,
    }));
}

function stableSlug(serviceCode: string) {
  return `ft-${serviceCode.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 170)}`;
}

/** Official public FlashTopUp category artwork uploaded to VAMNUX managed storage for resilient storefront display. */
const recognizedFlashTopUpArtwork: Array<{ sourceFragment: string; managedUrl: string }> = [
  { sourceFragment: "21a940a7-c33e-400e-adbb-150322c30b15", managedUrl: "/manus-storage/free-fire-latam_73a62a50.webp" },
  { sourceFragment: "23f79771-285a-4bbc-be28-f897a76d91c0", managedUrl: "/manus-storage/mobile-legends_da301a0e.webp" },
  { sourceFragment: "8575d7fd-7df1-4835-a9e1-c286f564c4a0", managedUrl: "/manus-storage/mobile-legends_da301a0e.webp" },
  { sourceFragment: "c0ad7ab4-5959-45d1-af8b-5d53f2b1b67b", managedUrl: "/manus-storage/pubg-mobile_66e3513a.webp" },
  { sourceFragment: "ce5fbf20-952f-48c2-b74d-0ae65487dcd4", managedUrl: "/manus-storage/free-fire-global_6fd7b283.webp" },
  { sourceFragment: "fd05fdc2-a41d-4585-b2fa-c54deb992e81", managedUrl: "/manus-storage/blood-strike_92f09d09.webp" },
  { sourceFragment: "8b86a829-6109-4686-b912-9fb3f0d1bb05", managedUrl: "/manus-storage/8-ball-pool_0a4fb2eb.webp" },
];

export function resolveFlashTopUpProductImageUrl(imageUrl: string | undefined) {
  if (!imageUrl) return undefined;
  const recognised = recognizedFlashTopUpArtwork.find((artwork) => imageUrl.includes(artwork.sourceFragment));
  if (recognised) return recognised.managedUrl;
  return imageUrl.replace("https://api.flashtopup.com/assets/", "https://flashtopup.com/api/media/assets/");
}

function isServiceAvailable(service: FlashTopUpService) {
  const stock = service.in_stock;
  const hasStock = stock === true || stock === 1 || stock === "1" || String(stock).toLowerCase() === "true";
  const status = String(service.status ?? "active").toLowerCase();
  return hasStock && !["inactive", "disabled", "paused", "out_of_stock"].includes(status);
}

function deliveryTypeFor(category: FlashTopUpCatalogRow["category"]): FlashTopUpCatalogRow["deliveryType"] {
  if (category === "top_up") return "instant";
  if (category === "gift_card") return "digital_code";
  return "manual_processing";
}

export function mapFlashTopUpService(product: FlashTopUpProduct, service: FlashTopUpService): FlashTopUpCatalogRow | null {
  const price = Number(service.price);
  if (!Number.isFinite(price) || price <= 0 || !service.service_code || !service.currency) return null;
  const inputRequirements = normalizeFlashTopUpInputRequirements(product.fields);
  const category = product.product_type === "gift_card"
    ? "gift_card"
    : product.product_type === "subscription"
      ? "subscription"
      : classifyFlashTopUpProduct({
        externalId: String(product.product_id),
        name: product.name,
        supplierCategory: product.product_type,
        deliveryType: "instant",
        inputRequirements,
      });
  const playerDetails = needsPlayerDetails({
    externalId: String(product.product_id),
    name: product.name,
    supplierCategory: product.product_type,
    deliveryType: "instant",
    inputRequirements,
  });
  const supplierEligible = isServiceAvailable(service);
  const currency = service.currency.toUpperCase();
  return {
    slug: stableSlug(service.service_code),
    supplierSku: service.service_code,
    supplierCategory: product.product_type,
    name: `${product.name} — ${service.service_name}`.slice(0, 255),
    category,
    imageUrl: resolveFlashTopUpProductImageUrl(product.image_url),
    basePrice: price.toFixed(2),
    baseCurrency: currency,
    supplierPrice: price.toFixed(2),
    supplierCurrency: currency,
    supplierOfferId: String(service.service_id),
    supplierUpdatedAt: validDate(service.price_updated_at ?? service.updated_at ?? product.updated_at),
    supplierEligible,
    deliveryType: deliveryTypeFor(category),
    requiresPlayerId: playerDetails.requiresPlayerId,
    requiresServerId: playerDetails.requiresServerId,
    inputRequirements,
    status: supplierEligible ? "active" : "paused",
    metadata: {
      supplier: "flashtopup",
      productCode: product.product_code,
      productId: String(product.product_id),
      productType: product.product_type,
      validationCode: product.validation_code,
      checkIdStatus: product.check_id_status,
      maxQuantity: service.max_quantity,
    },
  };
}

export async function syncFlashTopUpCatalog(input: { page?: number; perPage?: number } = {}) {
  const client = getFlashTopUpClient();
  const page = Math.max(1, input.page ?? 1);
  const perPage = Math.min(10, Math.max(1, input.perPage ?? 5));
  const productResponse = await client.products({ page, perPage });
  const productRows = productResponse.data ?? [];
  const rows: FlashTopUpCatalogRow[] = [];
  const currencies = new Set<string>();
  const failures: Array<{ productCode: string; message: string }> = [];

  for (const product of productRows) {
    try {
      const servicesResponse = await client.services({ productCode: product.product_code, productType: product.product_type, page: 1, perPage: 500 });
      for (const service of servicesResponse.data?.service ?? []) {
        const mapped = mapFlashTopUpService(product, service);
        if (mapped) {
          rows.push(mapped);
          currencies.add(mapped.baseCurrency);
        }
      }
    } catch (error) {
      failures.push({
        productCode: product.product_code,
        message: error instanceof Error ? error.message.slice(0, 180) : "Supplier service lookup failed",
      });
    }
  }

  await upsertFlashTopUpCatalogRows(rows);
  await configureCommerceIntegration({
    integrationType: "supplier",
    providerName: "FlashTopUp",
    apiBaseUrl: "https://api.flashtopup.com/api/reseller/v2",
    credentialReference: "FLASHTOPUP_API_ID + FLASHTOPUP_API_SECRET",
    webhookSecretReference: "FLASHTOPUP_API_SECRET",
    supportedCurrencies: Array.from(currencies).sort(),
    syncStatus: failures.length === 0 ? "ready" : "error",
  });
  return {
    page,
    nextPage: productRows.length === perPage ? page + 1 : null,
    productCount: productRows.length,
    serviceCount: rows.length,
    currencies: Array.from(currencies).sort(),
    failures,
  };
}
