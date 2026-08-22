import type { CustomerInputRequirement } from "../shared/flashtopup";
import { configureCommerceIntegration, upsertGamesDropCatalogRows } from "./db";
import type { SupplierCatalogRow } from "./catalogTypes";
import { getGamesDropClient, type GamesDropOffer } from "./integrations/gamesdrop";

function stableSlug(value: string) {
  return `gd-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 170)}`;
}

function categoryFor(offer: GamesDropOffer): SupplierCatalogRow["category"] | null {
  const terms = `${offer.productName} ${offer.offerGroupName} ${offer.platformCode ?? ""} ${offer.platformName ?? ""}`.toLowerCase();
  if (/telegram\s+stars?/.test(terms)) return "telegram_stars";
  if (offer.platformCode?.toLowerCase() === "steam" || /\bsteam\b/.test(terms)) return "steam";
  if (/\b(diamonds?|uc|cp|crystals?|coins?|points?)\b/.test(terms) && /pubg|free\s*fire|mobile legends|call of duty|genshin|valorant/.test(terms)) return "top_up";
  if (/chatgpt|claude|midjourney|artificial intelligence|ai course|ai tool/.test(terms)) return "ai_tool";
  if (/windows|office|antivirus|vpn|software|licen[cs]e/.test(terms)) return "software";
  if (/subscription|premium|membership|netflix|spotify|youtube|discord nitro/.test(terms)) return "subscription";
  if (/gift\s*card|voucher|wallet/.test(terms)) return "gift_card";
  if (/cd key|game key|activation key|steam key/.test(terms)) return "game_key";
  return null;
}

function isPublicGamesDropOffer(offer: GamesDropOffer, category: SupplierCatalogRow["category"]) {
  if (!offer.inStock) return false;
  if (offer.countryCompatibility?.toLowerCase() === "blocked") return false;
  if (offer.excludedCountryCodes?.some((code) => code.toUpperCase() === "NG")) return false;
  if (category === "steam") return offer.regionCode?.toUpperCase() === "GLB";
  return true;
}

function inputRequirementsFor(offer: GamesDropOffer, category: SupplierCatalogRow["category"]): CustomerInputRequirement[] {
  const inputs: CustomerInputRequirement[] = [];
  if (category === "telegram_stars") inputs.push({ key: "telegram_user_id", label: "Telegram User ID", type: "text", required: true, helperText: "Enter your numeric Telegram User ID, not an @username." });
  else if (offer.isRequiredGameUserId) inputs.push({ key: "player_id", label: "Player ID", type: "text", required: true, helperText: "Enter the game account ID required by the supplier." });
  if (offer.isRequiredGameServerId) inputs.push({ key: "server_id", label: "Server ID", type: "text", required: true, helperText: "Enter the required game server ID." });
  return inputs;
}

export function mapGamesDropOffer(offer: GamesDropOffer): SupplierCatalogRow | null {
  const price = Number(offer.price);
  if (!Number.isInteger(offer.offerGroupId) || !offer.productName?.trim() || !offer.offerGroupName?.trim() || !Number.isFinite(price) || price <= 0) return null;
  const category = categoryFor(offer);
  if (!category) return null;
  const inputRequirements = inputRequirementsFor(offer, category);
  const offerName = offer.offerGroupName.trim();
  const productName = offer.productName.trim();
  const displayName = offerName.toLowerCase() === productName.toLowerCase() ? productName : `${productName} — ${offerName}`;
  const deliveryType = category === "steam" || category === "game_key" || category === "gift_card" ? "digital_code" : "instant";
  return {
    slug: stableSlug(`${offer.offerGroupId}-${productName}-${offerName}`),
    supplierSku: `offer:${offer.offerGroupId}`,
    supplierCategory: offer.platformCode?.trim() || category,
    name: displayName.slice(0, 255),
    category,
    regionLabel: offer.regionName?.trim() || offer.regionCode?.trim() || undefined,
    basePrice: price.toFixed(2),
    baseCurrency: String(offer.currency || "USD").toUpperCase(),
    supplierPrice: price.toFixed(2),
    supplierCurrency: String(offer.currency || "USD").toUpperCase(),
    supplierOfferId: String(offer.offerGroupId),
    supplierEligible: offer.inStock === true,
    deliveryType,
    requiresPlayerId: inputRequirements.some((field) => field.key === "player_id" || field.key === "telegram_user_id"),
    requiresServerId: inputRequirements.some((field) => field.key === "server_id"),
    inputRequirements,
    status: offer.inStock ? "active" : "paused",
    metadata: {
      supplier: "gamesdrop",
      offerGroupId: offer.offerGroupId,
      productName,
      offerGroupName: offerName,
      platformCode: offer.platformCode ?? null,
      platformName: offer.platformName ?? null,
      regionCode: offer.regionCode ?? null,
      regionName: offer.regionName ?? null,
      regionalLimitations: offer.regionalLimitations ?? null,
      excludedCountryCodes: offer.excludedCountryCodes ?? [],
      countryCompatibility: offer.countryCompatibility ?? null,
    },
  };
}

export async function syncGamesDropCatalog(input: { searches?: string[]; page?: number; limit?: number; countryCode?: string; fullCatalog?: boolean; maxPages?: number } = {}) {
  const client = getGamesDropClient();
  const searches = input.fullCatalog ? [undefined] : Array.from(new Set(input.searches?.map((value) => value.trim()).filter(Boolean) ?? ["Telegram Stars", "Steam", "PUBG Mobile", "Free Fire"])).slice(0, 12);
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(250, Math.max(1, input.limit ?? 50));
  const maxPages = Math.min(20, Math.max(1, input.maxPages ?? 1));
  const rows: SupplierCatalogRow[] = [];
  const seen = new Set<string>();
  const currencies = new Set<string>();
  const failures: Array<{ search: string; message: string }> = [];
  for (const search of searches) {
    try {
      let pagesToRead = maxPages;
      for (let currentPage = page; currentPage < page + pagesToRead; currentPage += 1) {
        const result = await client.syncOffers({ page: currentPage, limit, search, countryCode: input.countryCode ?? "NG" });
        if (currentPage === page && input.fullCatalog) pagesToRead = Math.min(maxPages, Math.max(1, Math.ceil(result.count / limit)));
        for (const offer of result.rows) {
          const mapped = mapGamesDropOffer(offer);
          if (mapped && isPublicGamesDropOffer(offer, mapped.category) && !seen.has(mapped.supplierOfferId)) {
            seen.add(mapped.supplierOfferId);
            rows.push(mapped);
            currencies.add(mapped.baseCurrency);
          }
        }
        if (result.rows.length < limit) break;
      }
    } catch (error) {
      failures.push({ search: search ?? "all offers", message: error instanceof Error ? error.message.slice(0, 180) : "GamesDrop catalog lookup failed" });
    }
  }
  await upsertGamesDropCatalogRows(rows);
  await configureCommerceIntegration({
    integrationType: "supplier",
    providerName: "GamesDrop",
    apiBaseUrl: "https://partner.gamesdrop.io",
    credentialReference: "GAMESDROP_API_TOKEN",
    supportedCurrencies: Array.from(currencies).sort(),
    syncStatus: failures.length === 0 ? "ready" : "error",
  });
  return { page, searches: searches.map((search) => search ?? "all offers"), productCount: rows.length, currencies: Array.from(currencies).sort(), failures };
}
