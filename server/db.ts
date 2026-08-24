import { and, desc, eq, gte, inArray, like, lte, notInArray, or, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { adminAuditEvents, apiRequestLogs, authorizedCatalogSources, commerceIntegrations, currencyConfigurations, currencyRateVersions, customerConsents, customerIdentityLinks, customerNotificationPreferences, customerNotifications, customerPrivacyRequests, customerProductActivityEvents, customerProfiles, customerSecurityEvents, exchangeRates, financialOrderEvents, financialOrderSnapshots, InsertUser, loyaltySettings, manualDeliveryTasks, marketplaceCategories, marketplacePricingSettings, notificationTemplates, orderItems, orders, priceChangeHistory, pricingRateSnapshots, pricingRuleAuditEvents, pricingRules, productAdminAttributes, products, promotions, referralSettings, resellers, savedProducts, siteContentBlocks, siteContentPages, siteSettings, supplierBalanceObservations, supplierFulfillmentSimulationEvents, supplierFulfillmentSimulationOrders, supplierHealthChecks, supplierManagementProfiles, supplierRoutingDecisions, supplierRoutingPolicies, supplierSyncRuns, supplierWebhookEvents, supportTicketMessages, supportTickets, users, walletEntries, walletFundingAttempts, wallets } from "../drizzle/schema";
import { ADMIN_MANAGED_SUPPLIER_KEY, createAdminManagedCatalogSlug, createRecipientEmailRequirement, type AdminManagedCatalogProductInput, type AuthorizedCatalogSourceInput } from "../shared/adminCatalog";
import { calculateOrderTotal, createFulfillmentFieldKey, createOrderCode, type SupportedCurrency } from "../shared/marketplace";
import { calculateCustomerDisplayPrice, describePriceRule } from "../shared/pricing";
import { calculatePricingPreview, type PricingRoundingRule, type PricingRuleScope } from "../shared/pricingEngine";
import { CURRENCY_DEFINITIONS, MATERIAL_RATE_CHANGE_PERCENT, type CurrencyRateSource, type CurrencyRateUpdateFrequency, type VamnuxSupportedCurrency, VAMNUX_SUPPORTED_CURRENCIES } from "../shared/currencyManagement";
import { LIVE_ROUTING_DISABLED_MESSAGE, selectSimulatedSupplierOffer, type SupplierRoutingStrategy } from "../shared/supplierRouting";
import { canTransitionFulfillmentOrder, FULFILLMENT_ORDER_STATUSES, LIVE_FULFILLMENT_DISABLED_MESSAGE, type FulfillmentOrderStatus } from "../shared/supplierFulfillment";
import { calculateFinancialSnapshot, financialAlertsForSnapshot, type FinancialAlertType } from "../shared/financialControls";
import { formatManualDeliveryWindow, isManualDeliveryTransitionAllowed, manualDeliveryMinutesFromMetadata, type ManualDeliveryStatus } from "../shared/manualDelivery";
import { fundingMinimumForCurrency } from "../shared/walletFunding";
import type { SupplierCatalogRow } from "./catalogTypes";
import { ENV } from './_core/env';
import { adminNotificationReads, newsletterInterestSubscribers } from "../drizzle/schema";
import { customerProductRequests } from "../drizzle/schema";
import { masterProducts, supplierOfferMappingReviews, supplierOffers } from "../drizzle/schema";
import { isSupplierMappingCategory, mappingAttributesMatch, mappingIdentityValue, normalizeMappingAttributes, type MappingAttributes, type MappingStatus, type SupplierMappingCategory } from "../shared/supplierProductMapping";

export const FLASHTOPUP_SUPPLIER_KEY = "flashtopup" as const;
export const FOXRELOAD_SUPPLIER_KEY = "foxreload" as const;
export const GAMESDROP_SUPPLIER_KEY = "gamesdrop" as const;

export function assertSupplierCatalogRowScope(supplierKey: string, rows: SupplierCatalogRow[]) {
  const requiredPrefix = supplierKey === FLASHTOPUP_SUPPLIER_KEY ? "ft-" : supplierKey === FOXRELOAD_SUPPLIER_KEY ? "fr-" : supplierKey === GAMESDROP_SUPPLIER_KEY ? "gd-" : null;
  if (requiredPrefix && rows.some((row) => !row.slug.startsWith(requiredPrefix))) {
    throw new Error(`Catalog rows for ${supplierKey} must use the ${requiredPrefix} supplier slug prefix`);
  }
}

type PricingSettings = { defaultMarkupPercent: number };

type SafeAuditInput = {
  adminUserId: number;
  action: string;
  targetType: string;
  targetId: string | number;
  summary: string;
  metadata?: Record<string, unknown>;
};

const POLICY_DRAFTS = [
  { slug: "terms-of-service", title: "VAMNUX Terms of Service", version: "owner-content-1", status: "published" as const, body: "## Using VAMNUX\nBy using VAMNUX, creating an account, or purchasing a product, you agree to these Terms. Provide accurate account and payment information, keep credentials secure, use VAMNUX lawfully, and provide correct product details.\n\n## Orders and pricing\nOrders are processed after successful payment confirmation. Product operations can be automated or require additional processing. Supplier costs, currency display, and promotions can affect prices; the price shown during checkout applies to that order.\n\n## Accounts and third parties\nVAMNUX may review, suspend, or terminate accounts involved in fraud, payment abuse, unauthorized activity, or policy violations. Third-party products can carry product-specific terms, regions, and restrictions." },
  { slug: "privacy-policy", title: "VAMNUX Privacy Policy", version: "owner-content-1", status: "published" as const, body: "## Information used\nVAMNUX may use the information needed to provide an account-led marketplace, including account details, order and wallet activity, product information needed for eligible orders, and technical information only where collection is enabled and explained.\n\n## Why information is used\nInformation may be used to manage accounts, process eligible orders, verify payments, provide support, prevent fraud, send important notifications, and improve services.\n\n## Sharing and choices\nNecessary information may be shared with trusted payment processors, suppliers, service providers, and technology partners needed to operate VAMNUX. VAMNUX does not sell personal information. Subject to applicable law, requests for access, correction, or deletion can be submitted through Support." },
  { slug: "cookie-policy", title: "VAMNUX Cookie Policy", version: "owner-content-1", status: "published" as const, body: "## Cookie purposes\nCookies and similar technologies may help VAMNUX keep you signed in, secure your account, remember preferences, understand site usage, improve performance, and measure approved marketing activity where applicable.\n\n## Managing cookies\nYou can manage or disable cookies through browser settings. Some essential cookies may be required for VAMNUX to function correctly. By continuing to use VAMNUX, you acknowledge the cookies described here and any applicable consent options." },
  { slug: "refund-policy", title: "VAMNUX Refund Policy", version: "owner-content-1", status: "published" as const, body: "## Eligible situations\nA refund may be considered after review when an eligible order was not delivered after successful payment, a delivered digital product is invalid or defective, the same order was charged more than once, or VAMNUX approves another outcome after investigation.\n\n## When a refund may not be available\nA refund may not be available where incorrect account, region, or denomination information was provided; a code has been revealed or redeemed; or a digital product was successfully delivered and used.\n\n## Requesting review\nSubmit a private Support ticket with the VAMNUX order ID, transaction reference, and an explanation. Requests are reviewed individually and remain subject to applicable consumer-protection law." },
  { slug: "payment-policy", title: "VAMNUX Payment Policy", version: "owner-content-1", status: "published" as const, body: "## Payment readiness\nVAMNUX shows payment methods only when provider integration, verification, and checkout are active. When enabled, supported methods may include Paystack, Korapay, VAMNUX Wallet, USDT TRC20, and other configured methods.\n\n## Payment confirmation\nAn order is processed only after VAMNUX or the relevant provider has successfully verified payment. If a charge is shown but an order remains pending, submit a ticket rather than making another payment.\n\n## Cryptocurrency\nWhere crypto payments are enabled, confirm the correct network and wallet address before sending funds. Funds sent to an incorrect address or unsupported network may not be recoverable." },
  { slug: "delivery-policy", title: "VAMNUX Delivery Policy", version: "owner-content-1", status: "published" as const, body: "## Delivery formats\nEligible products can use a configured game top-up, digital code, account dashboard, activation or licence information, or another product-specific delivery format.\n\n## Timing and requirements\nWhere payment and supplier operations are active, eligible products may be automated after successful verification. Delivery can still be affected by supplier or API responses, verification, network conditions, or availability. Customers must provide the listed account, player, server, or region details.\n\n## Delivery issues\nIf VAMNUX cannot fulfil an eligible order, review may consider a replacement, retry, wallet credit, or refund where applicable. Account-based tracking is available only to the customer who owns the order." },
  { slug: "acceptable-use-policy", title: "VAMNUX Acceptable Use Policy", version: "owner-content-1", status: "published" as const, body: "## Prohibited activity\nDo not use VAMNUX to commit fraud or financial crimes, use stolen payment information, create fraudulent accounts, abuse refunds or promotions, access another user’s account, disrupt the platform, exploit vulnerabilities, abuse bots, conduct unlawful activity, or circumvent security and account restrictions.\n\n## Review and reporting\nVAMNUX may investigate suspicious activity and review accounts involved in prohibited conduct. To report a possible security issue, submit a private ticket with a responsible report and do not include passwords, payment data, or authentication codes." },
] as const;

async function appendAdminAuditEvent(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, input: SafeAuditInput) {
  await db.insert(adminAuditEvents).values({
    adminUserId: input.adminUserId,
    action: input.action.slice(0, 120),
    targetType: input.targetType.slice(0, 80),
    targetId: String(input.targetId).slice(0, 160),
    summary: input.summary.slice(0, 500),
    metadata: input.metadata,
  });
}

export async function recordSuperAdminAuditEvent(input: SafeAuditInput) {
  const db = requireDb(await getDb());
  await appendAdminAuditEvent(db, input);
}

async function ensureCustomerAccountRows(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, userId: number) {
  await db.insert(customerProfiles).values({ userId }).onDuplicateKeyUpdate({ set: { userId } });
  await db.insert(wallets).values({ userId }).onDuplicateKeyUpdate({ set: { userId } });
  await db.insert(customerNotificationPreferences).values({ userId }).onDuplicateKeyUpdate({ set: { userId } });
}

async function ensureDraftPolicyPages(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  for (const policy of POLICY_DRAFTS) {
    const [existing] = await db.select({ id: siteContentPages.id, version: siteContentPages.version }).from(siteContentPages).where(eq(siteContentPages.slug, policy.slug)).limit(1);
    if (!existing) { await db.insert(siteContentPages).values(policy); continue; }
    if (existing.version === "draft-1") await db.update(siteContentPages).set({ title: policy.title, body: policy.body, status: policy.status, version: policy.version }).where(eq(siteContentPages.id, existing.id));
  }
}

async function getCurrentTermsPrivacyConsentVersion(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  await ensureDraftPolicyPages(db);
  const pages = await db.select({ slug: siteContentPages.slug, version: siteContentPages.version })
    .from(siteContentPages)
    .where(inArray(siteContentPages.slug, ["terms-of-service", "privacy-policy"]));
  const versions = new Map(pages.map((page) => [page.slug, page.version]));
  return `terms:${versions.get("terms-of-service") || "draft-1"}|privacy:${versions.get("privacy-policy") || "draft-1"}`;
}

export async function recordCustomerSecurityEvent(input: { userId: number; eventType: string; summary: string; metadata?: Record<string, unknown> }) {
  const db = requireDb(await getDb());
  await db.insert(customerSecurityEvents).values({
    userId: input.userId,
    eventType: input.eventType.slice(0, 80),
    summary: input.summary.slice(0, 255),
    metadata: input.metadata,
  });
}

/** Records explicit email-interest consent only. Delivery remains disabled until a sender is configured separately. */
export async function recordNewsletterInterest(email: string, source = "storefront_lower_cta") {
  const db = requireDb(await getDb());
  const normalizedEmail = email.trim().toLowerCase();
  await db.insert(newsletterInterestSubscribers).values({
    email: normalizedEmail,
    source,
    status: "subscribed",
    consentedAt: new Date(),
  }).onDuplicateKeyUpdate({
    set: {
      source,
      status: "subscribed",
      consentedAt: new Date(),
    },
  });
  return { recorded: true } as const;
}

/** Records dashboard opt-in for the authenticated account; message delivery remains disabled until configured separately. */
export async function subscribeCustomerToNewsletterInterest(userId: number) {
  const db = requireDb(await getDb());
  const [identity] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  const email = identity?.email?.trim().toLowerCase();
  if (!email) throw new Error("Your secure sign-in provider has not supplied an email address for updates.");
  await recordNewsletterInterest(email, "dashboard_subscribe");
  return { email, status: "subscribed" as const };
}

export async function linkManusOAuthIdentity(input: { userId: number; openId: string; email?: string | null }) {
  const db = requireDb(await getDb());
  await db.insert(customerIdentityLinks).values({
    userId: input.userId,
    provider: "manus_oauth",
    providerSubject: input.openId.slice(0, 255),
    providerEmail: input.email?.slice(0, 320) || null,
  }).onDuplicateKeyUpdate({
    set: {
      providerEmail: input.email?.slice(0, 320) || null,
      lastAuthenticatedAt: new Date(),
    },
  });
}

async function ensureMarketplacePricingSettings(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<PricingSettings> {
  await db.insert(marketplacePricingSettings).values({ id: 1, defaultMarkupPercent: "25.00" }).onDuplicateKeyUpdate({ set: { id: 1 } });
  const [settings] = await db.select().from(marketplacePricingSettings).where(eq(marketplacePricingSettings.id, 1)).limit(1);
  return { defaultMarkupPercent: Number(settings?.defaultMarkupPercent ?? 25) };
}

function customerPriceForProduct(product: { basePrice: unknown; markupPercentOverride: unknown; displayPriceOverride: unknown }, settings: PricingSettings) {
  const pricingRule = {
    supplierBasePrice: Number(product.basePrice),
    defaultMarkupPercent: settings.defaultMarkupPercent,
    markupPercentOverride: product.markupPercentOverride === null || product.markupPercentOverride === undefined ? null : Number(product.markupPercentOverride),
    displayPriceOverride: product.displayPriceOverride === null || product.displayPriceOverride === undefined ? null : Number(product.displayPriceOverride),
  };
  return { customerPrice: calculateCustomerDisplayPrice(pricingRule), priceRule: describePriceRule(pricingRule) };
}

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
function requireDb<T>(db: T | null): T {
  if (!db) throw new Error("Marketplace database is not available");
  return db;
}

/**
 * Owner-only, read-only visibility into the additive Master Catalog foundation.
 * This summary intentionally never creates mappings or changes existing legacy
 * product, order, payment, or storefront records.
 */
export async function getMasterCatalogFoundationSummary() {
  const db = requireDb(await getDb());
  const [legacyRows, masterRows, offerRows] = await Promise.all([
    db.select({ total: sql<number>`count(*)` }).from(products),
    db.select({ total: sql<number>`count(*)` }).from(masterProducts),
    db.select({ total: sql<number>`count(*)` }).from(supplierOffers),
  ]);

  return {
    legacyProductCount: Number(legacyRows[0]?.total ?? 0),
    masterProductCount: Number(masterRows[0]?.total ?? 0),
    supplierOfferCount: Number(offerRows[0]?.total ?? 0),
    mappingMode: "unmapped_foundation" as const,
  };
}

const MAPPING_SUPPLIER_NAMES: Record<string, string> = {
  flashtopup: "FlashTopUp",
  foxreload: "FoxReload",
  gamesdrop: "GamesDrop",
};

function mappingSupplierName(supplierKey: string | null) {
  if (!supplierKey) return "Unassigned supplier";
  return MAPPING_SUPPLIER_NAMES[supplierKey] || supplierKey.replace(/[-_]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function mappingAttributesFromMaster(master: typeof masterProducts.$inferSelect): MappingAttributes {
  const metadata = master.metadata && typeof master.metadata === "object" && !Array.isArray(master.metadata) ? master.metadata as Record<string, unknown> : {};
  const attributes = metadata.mappingAttributes && typeof metadata.mappingAttributes === "object" && !Array.isArray(metadata.mappingAttributes) ? metadata.mappingAttributes as Record<string, unknown> : null;
  if (!isSupplierMappingCategory(master.category) || !attributes) throw new Error("This Master Product does not contain verified category-specific mapping attributes.");
  return normalizeMappingAttributes(master.category, attributes);
}

function mappingAttributesFromOffer(offer: typeof supplierOffers.$inferSelect, category: SupplierMappingCategory): MappingAttributes {
  const attributes = offer.mappingAttributes && typeof offer.mappingAttributes === "object" && !Array.isArray(offer.mappingAttributes) ? offer.mappingAttributes as Record<string, unknown> : null;
  if (!attributes) throw new Error("This supplier offer does not contain verified category-specific mapping attributes.");
  return normalizeMappingAttributes(category, attributes);
}

function createMasterProductKey(category: SupplierMappingCategory, attributes: MappingAttributes) {
  const identity = `${category}|${mappingIdentityValue(category, attributes)}`;
  return `master-${category}-${createHash("sha256").update(identity).digest("hex").slice(0, 20)}`;
}

function mappingStatusSummary(totalLegacyProducts: number, supplierOfferRows: Array<{ mappingStatus: MappingStatus }>) {
  const unmappedCount = supplierOfferRows.filter((offer) => offer.mappingStatus === "UNMAPPED").length;
  const pendingReviewCount = supplierOfferRows.filter((offer) => offer.mappingStatus === "PENDING REVIEW").length;
  const approvedMappingCount = supplierOfferRows.filter((offer) => offer.mappingStatus === "APPROVED").length;
  const rejectedMappingCount = supplierOfferRows.filter((offer) => offer.mappingStatus === "REJECTED").length;
  return {
    mappedProductCount: approvedMappingCount,
    unmappedProductCount: unmappedCount + Math.max(0, totalLegacyProducts - supplierOfferRows.length),
    requiringAdminReviewCount: pendingReviewCount,
    approvedMappingCount,
    rejectedMappingCount,
  };
}

/** Owner-only Step 3 counts. It never creates mappings or changes legacy products. */
export async function getSupplierProductMappingSummary() {
  const db = requireDb(await getDb());
  const [legacyRows, masterRows, supplierOfferRows] = await Promise.all([
    db.select({ total: sql<number>`count(*)` }).from(products),
    db.select({ total: sql<number>`count(*)` }).from(masterProducts),
    db.select({ mappingStatus: supplierOffers.mappingStatus }).from(supplierOffers),
  ]);
  const legacyProductCount = Number(legacyRows[0]?.total ?? 0);
  return {
    legacyProductCount,
    masterProductCount: Number(masterRows[0]?.total ?? 0),
    ...mappingStatusSummary(legacyProductCount, supplierOfferRows),
  };
}

export async function listSupplierProductMappingMasters() {
  const db = requireDb(await getDb());
  const [masters, offers] = await Promise.all([
    db.select().from(masterProducts).orderBy(desc(masterProducts.updatedAt)).limit(150),
    db.select({ masterProductId: supplierOffers.masterProductId, mappingStatus: supplierOffers.mappingStatus }).from(supplierOffers),
  ]);
  return masters.map((master) => {
    const masterOffers = offers.filter((offer) => offer.masterProductId === master.id);
    const metadata = master.metadata && typeof master.metadata === "object" && !Array.isArray(master.metadata) ? master.metadata as Record<string, unknown> : {};
    return {
      ...master,
      mappingAttributes: metadata.mappingAttributes ?? {},
      pendingOfferCount: masterOffers.filter((offer) => offer.mappingStatus === "PENDING REVIEW").length,
      approvedOfferCount: masterOffers.filter((offer) => offer.mappingStatus === "APPROVED").length,
    };
  });
}

export async function getSupplierProductMappingMaster(masterProductId: number) {
  const db = requireDb(await getDb());
  const [master] = await db.select().from(masterProducts).where(eq(masterProducts.id, masterProductId)).limit(1);
  if (!master) throw new Error("Master Product was not found");
  const offers = await db.select({
    id: supplierOffers.id,
    legacyProductId: supplierOffers.legacyProductId,
    supplierKey: supplierOffers.supplierKey,
    supplierSku: supplierOffers.supplierSku,
    supplierOfferId: supplierOffers.supplierOfferId,
    supplierProductName: supplierOffers.supplierProductName,
    supplierCost: supplierOffers.supplierCost,
    supplierCurrency: supplierOffers.supplierCurrency,
    regionLabel: supplierOffers.regionLabel,
    mappingStatus: supplierOffers.mappingStatus,
    mappingAttributes: supplierOffers.mappingAttributes,
  }).from(supplierOffers).where(eq(supplierOffers.masterProductId, master.id)).orderBy(supplierOffers.mappingStatus, supplierOffers.supplierKey);
  const metadata = master.metadata && typeof master.metadata === "object" && !Array.isArray(master.metadata) ? master.metadata as Record<string, unknown> : {};
  return {
    ...master,
    mappingAttributes: metadata.mappingAttributes ?? {},
    supplierOffers: offers.map((offer) => ({ ...offer, supplierName: mappingSupplierName(offer.supplierKey), supplierProductId: offer.supplierOfferId || offer.supplierSku || String(offer.legacyProductId), supplierCost: offer.supplierCost === null ? null : Number(offer.supplierCost) })),
  };
}

/** Search existing supplier-normalised legacy products. Search never creates an offer or mapping. */
export async function searchSupplierProductsForMapping(input: { query: string; category?: SupplierMappingCategory; limit?: number }) {
  const db = requireDb(await getDb());
  const query = input.query.trim();
  if (query.length < 2) return [];
  const wildcard = `%${query.replace(/[%_]/g, "\\$&")}%`;
  const conditions = [or(like(products.name, wildcard), like(products.supplierSku, wildcard), like(products.supplierOfferId, wildcard))];
  if (input.category) conditions.push(eq(products.category, input.category));
  const legacyProducts = await db.select({
    id: products.id,
    supplierKey: products.supplierKey,
    supplierSku: products.supplierSku,
    supplierOfferId: products.supplierOfferId,
    name: products.name,
    category: products.category,
    supplierPrice: products.supplierPrice,
    supplierCurrency: products.supplierCurrency,
    regionLabel: products.regionLabel,
    deliveryType: products.deliveryType,
    inputRequirements: products.inputRequirements,
    status: products.status,
  }).from(products).where(and(...conditions)).orderBy(products.name).limit(Math.min(50, Math.max(1, input.limit ?? 30)));
  const mapped = legacyProducts.length ? await db.select({ legacyProductId: supplierOffers.legacyProductId, id: supplierOffers.id, masterProductId: supplierOffers.masterProductId, mappingStatus: supplierOffers.mappingStatus, mappingAttributes: supplierOffers.mappingAttributes })
    .from(supplierOffers).where(inArray(supplierOffers.legacyProductId, legacyProducts.map((product) => product.id))) : [];
  const offerByLegacyProduct = new Map(mapped.map((offer) => [offer.legacyProductId, offer]));
  return legacyProducts.map((product) => {
    const offer = offerByLegacyProduct.get(product.id);
    return {
      ...product,
      supplierName: mappingSupplierName(product.supplierKey),
      supplierProductId: product.supplierOfferId || product.supplierSku || String(product.id),
      supplierCost: product.supplierPrice === null ? null : Number(product.supplierPrice),
      mappingStatus: offer?.mappingStatus ?? "UNMAPPED" as const,
      mappingOfferId: offer?.id ?? null,
      masterProductId: offer?.masterProductId ?? null,
      mappingAttributes: offer?.mappingAttributes ?? null,
    };
  });
}

type CatalogPreparationStatus = "UNMAPPED" | "REVIEW REQUIRED" | "APPROVED MATCH" | "REJECTED MATCH";
type CatalogPreparationFilters = { category?: SupplierMappingCategory; supplierKey?: string; currency?: string; region?: string; platform?: string; mappingStatus?: CatalogPreparationStatus; offset?: number; limit?: number };

const catalogPreparationCategoryGroups: Array<{ key: string; label: string; categories: SupplierMappingCategory[] }> = [
  { key: "top_up", label: "Game Top-Up", categories: ["top_up"] },
  { key: "gift_card", label: "Gift Cards", categories: ["gift_card"] },
  { key: "gaming_vouchers", label: "Gaming Vouchers", categories: [] },
  { key: "game_key", label: "Game Keys", categories: ["game_key"] },
  { key: "subscription", label: "Subscriptions", categories: ["subscription"] },
  { key: "software", label: "Software", categories: ["software"] },
  { key: "ai_tool", label: "AI Tools", categories: ["ai_tool"] },
  { key: "games", label: "Games", categories: ["steam"] },
  { key: "steam_top_up", label: "Steam Top-Up", categories: ["steam_top_up"] },
  { key: "telegram_stars", label: "Telegram Stars", categories: ["telegram_stars"] },
  { key: "other", label: "Other", categories: [] },
];

function catalogPreparationStatus(status: MappingStatus | null | undefined): CatalogPreparationStatus {
  if (status === "PENDING REVIEW") return "REVIEW REQUIRED";
  if (status === "APPROVED") return "APPROVED MATCH";
  if (status === "REJECTED") return "REJECTED MATCH";
  return "UNMAPPED";
}

function safeCatalogPreparationMetadata(metadata: unknown) {
  const record = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata as Record<string, unknown> : {};
  const text = (keys: string[]) => {
    for (const key of keys) { const value = record[key]; if (typeof value === "string" && value.trim()) return value.trim().slice(0, 120); if (typeof value === "number") return String(value); }
    return null;
  };
  return { platform: text(["platform", "gamePlatform", "devicePlatform", "operatingSystem", "os"]), denomination: text(["denomination", "amount", "value", "credits", "points"]), edition: text(["edition", "plan", "tier", "licenseType"]), duration: text(["duration", "period", "months", "days"]) };
}

function toCatalogPreparationProduct(row: { product: typeof products.$inferSelect; offerId: number | null; masterProductId: number | null; mappingStatus: MappingStatus | null }, pricingSettings: PricingSettings) {
  const metadata = safeCatalogPreparationMetadata(row.product.metadata);
  const customerPrice = customerPriceForProduct(row.product, pricingSettings);
  return { id: row.product.id, name: row.product.name, category: row.product.category, supplierKey: row.product.supplierKey, supplierName: mappingSupplierName(row.product.supplierKey), supplierProductId: row.product.supplierOfferId || row.product.supplierSku || String(row.product.id), supplierCost: row.product.supplierPrice === null ? null : Number(row.product.supplierPrice), supplierCurrency: row.product.supplierCurrency, regionLabel: row.product.regionLabel, platform: metadata.platform, denomination: metadata.denomination, edition: metadata.edition, duration: metadata.duration, availability: Boolean(row.product.supplierEligible && row.product.status === "active"), sourceStatus: row.product.status, deliveryType: row.product.deliveryType, inputRequirements: row.product.inputRequirements, existingCustomerPrice: customerPrice.customerPrice, customerCurrency: row.product.baseCurrency, mappingStatus: catalogPreparationStatus(row.mappingStatus), mappingOfferId: row.offerId, masterProductId: row.masterProductId, canBeMapped: Boolean(row.product.supplierKey && isSupplierMappingCategory(row.product.category)) };
}

/** Read-only category counts for the legacy catalog. Missing categories are reported as zero rather than created or reclassified. */
export async function getCatalogPreparationSummary() {
  const db = requireDb(await getDb());
  const [categories, mappingRows] = await Promise.all([
    db.select({ category: products.category, count: sql<number>`count(*)` }).from(products).groupBy(products.category),
    db.select({ mappingStatus: supplierOffers.mappingStatus, count: sql<number>`count(*)` }).from(supplierOffers).groupBy(supplierOffers.mappingStatus),
  ]);
  const categoryCounts = new Map(categories.map((row) => [row.category, Number(row.count)]));
  const mappedCounts = new Map(mappingRows.map((row) => [catalogPreparationStatus(row.mappingStatus), Number(row.count)]));
  const totalProducts = Array.from(categoryCounts.values()).reduce((sum, count) => sum + count, 0);
  const totalMappedRecords = Array.from(mappedCounts.values()).reduce((sum, count) => sum + count, 0);
  return { totalProducts, reviewBatchLimit: 25, categories: catalogPreparationCategoryGroups.map((group) => ({ key: group.key, label: group.label, existingCategories: group.categories, productCount: group.categories.reduce((sum, category) => sum + (categoryCounts.get(category) ?? 0), 0), isPreparationOnly: group.categories.length === 0 })), statuses: { unmapped: Math.max(0, totalProducts - totalMappedRecords), reviewRequired: mappedCounts.get("REVIEW REQUIRED") ?? 0, approvedMatch: mappedCounts.get("APPROVED MATCH") ?? 0, rejectedMatch: mappedCounts.get("REJECTED MATCH") ?? 0 } };
}

/** Reads at most 25 existing products for one owner review batch; this function never writes or suggests a match. */
export async function listCatalogPreparationProducts(input: CatalogPreparationFilters = {}) {
  const db = requireDb(await getDb());
  const pricingSettings = await ensureMarketplacePricingSettings(db);
  const conditions = [];
  if (input.category) conditions.push(eq(products.category, input.category));
  if (input.supplierKey) conditions.push(eq(products.supplierKey, input.supplierKey.trim().slice(0, 80)));
  if (input.currency) conditions.push(or(eq(products.supplierCurrency, input.currency.trim().toUpperCase()), eq(products.baseCurrency, input.currency.trim().toUpperCase()))!);
  if (input.region) conditions.push(eq(products.regionLabel, input.region.trim().slice(0, 120)));
  if (input.platform) conditions.push(sql`cast(${products.metadata} as char) like ${`%${input.platform.trim().slice(0, 120)}%`}`);
  if (input.mappingStatus === "UNMAPPED") conditions.push(sql`${supplierOffers.id} is null`);
  if (input.mappingStatus === "REVIEW REQUIRED") conditions.push(eq(supplierOffers.mappingStatus, "PENDING REVIEW"));
  if (input.mappingStatus === "APPROVED MATCH") conditions.push(eq(supplierOffers.mappingStatus, "APPROVED"));
  if (input.mappingStatus === "REJECTED MATCH") conditions.push(eq(supplierOffers.mappingStatus, "REJECTED"));
  const rawRows = await db.select({ product: products, offerId: supplierOffers.id, masterProductId: supplierOffers.masterProductId, mappingStatus: supplierOffers.mappingStatus }).from(products).leftJoin(supplierOffers, eq(products.id, supplierOffers.legacyProductId)).where(conditions.length ? and(...conditions) : undefined).orderBy(products.category, products.name, products.id).limit(Math.min(25, Math.max(1, input.limit ?? 25))).offset(Math.max(0, input.offset ?? 0));
  const rows = rawRows.map((row) => toCatalogPreparationProduct(row, pricingSettings));
  return { limit: Math.min(25, Math.max(1, input.limit ?? 25)), offset: Math.max(0, input.offset ?? 0), products: rows };
}

function catalogPreparationComparableAttributes(category: SupplierMappingCategory) {
  if (category === "top_up") return ["game", "currency", "denomination", "region or server", "delivery requirements"];
  if (category === "gift_card") return ["brand", "denomination", "currency", "country or redemption region", "redemption restrictions"];
  if (category === "game_key" || category === "steam") return ["game title", "edition", "platform", "region"];
  if (category === "subscription") return ["service", "plan", "duration", "tier", "region"];
  if (category === "software") return ["software", "edition", "license type", "duration", "devices", "operating system", "region"];
  if (category === "ai_tool") return ["service", "plan", "duration", "license or account type", "region"];
  if (category === "steam_top_up") return ["currency", "denomination", "region", "delivery requirements"];
  return ["denomination", "currency", "region", "delivery requirements"];
}

/** Safe side-by-side comparison only. It enforces same category and returns no match suggestion or mutation. */
export async function getCatalogPreparationComparison(input: { leftProductId: number; rightProductId: number }) {
  const db = requireDb(await getDb());
  const pricingSettings = await ensureMarketplacePricingSettings(db);
  if (input.leftProductId === input.rightProductId) throw new Error("Choose two different supplier products for comparison");
  const rows = await db.select({ product: products, offerId: supplierOffers.id, masterProductId: supplierOffers.masterProductId, mappingStatus: supplierOffers.mappingStatus }).from(products).leftJoin(supplierOffers, eq(products.id, supplierOffers.legacyProductId)).where(inArray(products.id, [input.leftProductId, input.rightProductId]));
  if (rows.length !== 2) throw new Error("Both supplier products must exist before comparison");
  const [left, right] = rows.map((row) => toCatalogPreparationProduct(row, pricingSettings));
  if (left.category !== right.category) throw new Error("Cross-category comparison is blocked. Select two products from the exact same existing category.");
  return { category: left.category, left, right, comparisonRule: "Review category-specific attributes manually. Names are never used as sufficient evidence for a match.", comparableAttributes: catalogPreparationComparableAttributes(left.category) };
}

/** Explicit Admin acknowledgement that two products stay separate. It writes only a safe Admin audit event and leaves mapping state UNMAPPED. */
export async function keepCatalogPreparationProductsSeparate(input: { leftProductId: number; rightProductId: number; note?: string | null; adminUserId: number }) {
  const comparison = await getCatalogPreparationComparison({ leftProductId: input.leftProductId, rightProductId: input.rightProductId });
  const db = requireDb(await getDb());
  await appendAdminAuditEvent(db, { adminUserId: input.adminUserId, action: "catalog_preparation.kept_separate", targetType: "legacy_supplier_products", targetId: `${input.leftProductId}:${input.rightProductId}`, summary: `Kept two ${comparison.category} supplier products separate during controlled catalog preparation`, metadata: { leftProductId: input.leftProductId, rightProductId: input.rightProductId, category: comparison.category, note: input.note?.trim().slice(0, 500) || null, mappingChanged: false } });
  return { status: "UNMAPPED" as const, detail: "Products remain separate. No Master Product, Supplier Offer, price, supplier link, or storefront record was changed." };
}

const TOP_UP_PILOT_LIMIT = 25;
const TOP_UP_PILOT_ACTION = "catalog_pilot.";
type MarketplaceDb = NonNullable<Awaited<ReturnType<typeof getDb>>>;

async function getTopUpPilotCandidateRows(db: MarketplaceDb) {
  const settings = await ensureMarketplacePricingSettings(db);
  const rows = await db.select({ product: products, offerId: supplierOffers.id, masterProductId: supplierOffers.masterProductId, mappingStatus: supplierOffers.mappingStatus }).from(products)
    .leftJoin(supplierOffers, eq(products.id, supplierOffers.legacyProductId))
    .where(eq(products.category, "top_up")).orderBy(products.id).limit(TOP_UP_PILOT_LIMIT);
  return rows.map((row, index) => ({ candidateNumber: index + 1, ...toCatalogPreparationProduct(row, settings) }));
}

async function assertTopUpPilotCandidate(db: MarketplaceDb, legacyProductId: number) {
  const candidates = await getTopUpPilotCandidateRows(db);
  const candidate = candidates.find((row) => row.id === legacyProductId);
  if (!candidate) throw new Error("This supplier product is outside the fixed 25-product Game Top-Up pilot cohort.");
  return candidate;
}

async function getTopUpPilotOffer(db: MarketplaceDb, supplierOfferId: number) {
  const [offer] = await db.select().from(supplierOffers).where(eq(supplierOffers.id, supplierOfferId)).limit(1);
  if (!offer) throw new Error("Supplier Offer review record was not found.");
  await assertTopUpPilotCandidate(db, offer.legacyProductId);
  return offer;
}

/** Fixed, read-only first cohort for the controlled Step 10 Game Top-Up pilot. It never creates a mapping or alters a legacy product. */
export async function getTopUpCatalogPilot() {
  const db = requireDb(await getDb());
  const candidates = await getTopUpPilotCandidateRows(db);
  const candidateIds = new Set(candidates.map((candidate) => candidate.id));
  const auditRows = await db.select({ action: adminAuditEvents.action, targetId: adminAuditEvents.targetId, metadata: adminAuditEvents.metadata, createdAt: adminAuditEvents.createdAt }).from(adminAuditEvents).where(like(adminAuditEvents.action, `${TOP_UP_PILOT_ACTION}%`)).orderBy(desc(adminAuditEvents.createdAt)).limit(500);
  const actions = auditRows.filter((event) => {
    const metadata = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata) ? event.metadata as Record<string, unknown> : {};
    const ids = Array.isArray(metadata.legacyProductIds) ? metadata.legacyProductIds.map(Number) : [Number(metadata.legacyProductId ?? event.targetId)];
    return ids.some((id) => candidateIds.has(id));
  });
  const uniqueTargetsFor = (action: string) => new Set(actions.filter((event) => event.action === action).flatMap((event) => {
    const metadata = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata) ? event.metadata as Record<string, unknown> : {};
    return Array.isArray(metadata.legacyProductIds) ? metadata.legacyProductIds.map(Number) : [Number(metadata.legacyProductId ?? event.targetId)];
  }).filter((id) => candidateIds.has(id)));
  const reviewedIds = uniqueTargetsFor("catalog_pilot.reviewed");
  const keptSeparateIds = uniqueTargetsFor("catalog_pilot.kept_separate");
  const approvedIds = uniqueTargetsFor("catalog_pilot.offer_approved");
  const rejectedIds = uniqueTargetsFor("catalog_pilot.offer_rejected");
  const terminalIds = new Set<number>(Array.from(keptSeparateIds).concat(Array.from(approvedIds), Array.from(rejectedIds)));
  return { pilot: { category: "top_up" as const, limit: TOP_UP_PILOT_LIMIT, automaticActionsDisabled: true, liveRoutingDisabled: true, liveFulfillmentDisabled: true }, candidates, outcome: { productsReviewed: reviewedIds.size, masterProductsCreated: actions.filter((event) => event.action === "catalog_pilot.master_created").length, supplierOffersCreated: actions.filter((event) => event.action === "catalog_pilot.offer_created").length, approved: approvedIds.size, rejected: rejectedIds.size, keptSeparate: keptSeparateIds.size, requiringFurtherAdminReview: candidates.filter((candidate) => !terminalIds.has(candidate.id)).map((candidate) => ({ id: candidate.id, name: candidate.name, supplierName: candidate.supplierName, supplierProductId: candidate.supplierProductId, reason: "No explicit approved, rejected, or keep-separate Admin pilot outcome has been recorded." })), auditEvents: actions.slice(0, 50) } };
}

/** Records only an Admin acknowledgement that a pilot candidate was reviewed; it does not create or modify a mapping. */
export async function markTopUpPilotProductReviewed(input: { legacyProductId: number; note?: string | null; adminUserId: number }) {
  const db = requireDb(await getDb());
  const candidate = await assertTopUpPilotCandidate(db, input.legacyProductId);
  await appendAdminAuditEvent(db, { adminUserId: input.adminUserId, action: "catalog_pilot.reviewed", targetType: "legacy_supplier_product", targetId: String(candidate.id), summary: `Reviewed Game Top-Up pilot candidate ${candidate.name}`, metadata: { legacyProductId: candidate.id, category: "top_up", note: input.note?.trim().slice(0, 500) || null, mappingChanged: false } });
  return { legacyProductId: candidate.id, status: "REVIEWED" as const };
}

export async function createTopUpPilotMaster(input: { legacyProductId: number; name: string; subcategory?: string | null; productType?: string | null; regionLabel?: string | null; currency?: string | null; denomination?: string | null; imageUrl?: string | null; mappingAttributes: Record<string, unknown>; adminUserId: number }) {
  const db = requireDb(await getDb());
  const candidate = await assertTopUpPilotCandidate(db, input.legacyProductId);
  const created = await createSupplierProductMappingMaster({ ...input, category: "top_up" });
  await appendAdminAuditEvent(db, { adminUserId: input.adminUserId, action: "catalog_pilot.master_created", targetType: "master_product", targetId: String(created.id), summary: `Created pilot draft Master Product ${created.name}`, metadata: { legacyProductId: candidate.id, masterProductId: created.id, category: "top_up", automatic: false } });
  return created;
}

export async function addTopUpPilotOfferForReview(input: { masterProductId: number; legacyProductId: number; mappingAttributes: Record<string, unknown>; note?: string | null; adminUserId: number }) {
  const db = requireDb(await getDb());
  const candidate = await assertTopUpPilotCandidate(db, input.legacyProductId);
  const result = await addSupplierOfferToMasterForReview(input);
  await appendAdminAuditEvent(db, { adminUserId: input.adminUserId, action: "catalog_pilot.offer_created", targetType: "supplier_offer", targetId: String(result.supplierOfferId), summary: `Created REVIEW REQUIRED Game Top-Up pilot Supplier Offer`, metadata: { legacyProductId: candidate.id, supplierOfferId: result.supplierOfferId, masterProductId: result.masterProductId, category: "top_up", automatic: false } });
  return result;
}

export async function approveTopUpPilotOffer(input: { supplierOfferId: number; note?: string | null; adminUserId: number }) {
  const db = requireDb(await getDb());
  const offer = await getTopUpPilotOffer(db, input.supplierOfferId);
  const result = await approveSupplierOfferMapping(input);
  await appendAdminAuditEvent(db, { adminUserId: input.adminUserId, action: "catalog_pilot.offer_approved", targetType: "supplier_offer", targetId: String(offer.id), summary: "Approved Game Top-Up pilot Supplier Offer mapping", metadata: { legacyProductId: offer.legacyProductId, supplierOfferId: offer.id, category: "top_up", automatic: false } });
  return result;
}

export async function rejectTopUpPilotOffer(input: { supplierOfferId: number; note?: string | null; adminUserId: number }) {
  const db = requireDb(await getDb());
  const offer = await getTopUpPilotOffer(db, input.supplierOfferId);
  const result = await rejectSupplierOfferMapping(input);
  await appendAdminAuditEvent(db, { adminUserId: input.adminUserId, action: "catalog_pilot.offer_rejected", targetType: "supplier_offer", targetId: String(offer.id), summary: "Rejected Game Top-Up pilot Supplier Offer mapping", metadata: { legacyProductId: offer.legacyProductId, supplierOfferId: offer.id, category: "top_up", automatic: false } });
  return result;
}

export async function keepTopUpPilotProductsSeparate(input: { leftProductId: number; rightProductId: number; note?: string | null; adminUserId: number }) {
  const db = requireDb(await getDb());
  await Promise.all([assertTopUpPilotCandidate(db, input.leftProductId), assertTopUpPilotCandidate(db, input.rightProductId)]);
  const result = await keepCatalogPreparationProductsSeparate(input);
  await appendAdminAuditEvent(db, { adminUserId: input.adminUserId, action: "catalog_pilot.kept_separate", targetType: "legacy_supplier_products", targetId: `${input.leftProductId}:${input.rightProductId}`, summary: "Kept Game Top-Up pilot products separate", metadata: { legacyProductIds: [input.leftProductId, input.rightProductId], category: "top_up", note: input.note?.trim().slice(0, 500) || null, automatic: false, mappingChanged: false } });
  return result;
}

/** Creates an empty VAMNUX-owned Master Product only after an owner supplies exact category identity attributes. */
export async function createSupplierProductMappingMaster(input: { name: string; category: SupplierMappingCategory; subcategory?: string | null; productType?: string | null; regionLabel?: string | null; currency?: string | null; denomination?: string | null; imageUrl?: string | null; mappingAttributes: Record<string, unknown>; adminUserId: number }) {
  const db = requireDb(await getDb());
  const name = input.name.trim().slice(0, 255);
  if (!name) throw new Error("Master Product name is required");
  const mappingAttributes = normalizeMappingAttributes(input.category, input.mappingAttributes);
  const masterKey = createMasterProductKey(input.category, mappingAttributes);
  const existing = await db.select({ id: masterProducts.id }).from(masterProducts).where(eq(masterProducts.masterKey, masterKey)).limit(1);
  if (existing[0]) throw new Error("A Master Product already exists for these exact category-specific attributes.");
  const [created] = await db.insert(masterProducts).values({ masterKey, name, category: input.category, subcategory: input.subcategory?.trim() || null, productType: input.productType?.trim() || null, regionLabel: input.regionLabel?.trim() || null, currency: input.currency?.trim().toUpperCase() || null, denomination: input.denomination?.trim() || null, imageUrl: input.imageUrl?.trim() || null, customerFacingStatus: "draft", metadata: { mappingAttributes, createdThrough: "owner_supplier_product_mapping" } }).$returningId();
  if (!created) throw new Error("Master Product could not be created");
  await appendAdminAuditEvent(db, { adminUserId: input.adminUserId, action: "supplier_mapping.master_created", targetType: "master_product", targetId: created.id, summary: `Created draft Master Product ${name}`, metadata: { category: input.category, masterKey } });
  return { id: created.id, masterKey, name, category: input.category, mappingAttributes };
}

/** Adds a legacy supplier product as a PENDING REVIEW offer snapshot; no legacy product row is modified. */
export async function addSupplierOfferToMasterForReview(input: { masterProductId: number; legacyProductId: number; mappingAttributes: Record<string, unknown>; note?: string | null; adminUserId: number }) {
  const db = requireDb(await getDb());
  const [masters, legacyProducts, existingOffers] = await Promise.all([
    db.select().from(masterProducts).where(eq(masterProducts.id, input.masterProductId)).limit(1),
    db.select().from(products).where(eq(products.id, input.legacyProductId)).limit(1),
    db.select().from(supplierOffers).where(eq(supplierOffers.legacyProductId, input.legacyProductId)).limit(1),
  ]);
  const target = masters[0];
  const source = legacyProducts[0];
  if (!target || !source) throw new Error("Master Product or supplier product was not found");
  if (!isSupplierMappingCategory(target.category) || target.category !== source.category) throw new Error("Supplier products may only be reviewed against a Master Product in the exact same category.");
  if (!source.supplierKey) throw new Error("Only supplier-normalised products can be added as supplier offers.");
  if (existingOffers[0]) throw new Error("This supplier product already has a mapping record. Remove it before submitting a new review.");
  const masterAttributes = mappingAttributesFromMaster(target);
  const mappingAttributes = normalizeMappingAttributes(target.category, input.mappingAttributes);
  if (!mappingAttributesMatch(target.category, masterAttributes, mappingAttributes)) throw new Error("The supplied category-specific attributes do not exactly match this Master Product. Product names are not used for mapping.");
  const [created] = await db.transaction(async (tx) => {
    const [offer] = await tx.insert(supplierOffers).values({ masterProductId: target.id, mappingStatus: "PENDING REVIEW", legacyProductId: source.id, supplierKey: source.supplierKey!, supplierSku: source.supplierSku, supplierOfferId: source.supplierOfferId, supplierCategory: source.supplierCategory, supplierProductName: source.name, supplierCost: source.supplierPrice, supplierCurrency: source.supplierCurrency, regionLabel: source.regionLabel, supplierAvailability: source.supplierEligible, sourceStatus: source.status, deliveryType: source.deliveryType, inputRequirements: source.inputRequirements, mappingAttributes, metadata: { source: "owner_mapping_review" }, supplierUpdatedAt: source.supplierUpdatedAt }).$returningId();
    if (!offer) throw new Error("Supplier offer review record could not be created");
    await tx.insert(supplierOfferMappingReviews).values({ supplierOfferId: offer.id, legacyProductId: source.id, masterProductId: target.id, action: "PENDING REVIEW", previousStatus: "UNMAPPED", nextStatus: "PENDING REVIEW", reviewedByAdminId: input.adminUserId, note: input.note?.trim() || null, mappingAttributes });
    await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: "supplier_mapping.offer_submitted", targetType: "supplier_offer", targetId: String(offer.id), summary: `Submitted ${source.name} for mapping review`, metadata: { masterProductId: target.id, legacyProductId: source.id, category: target.category } });
    return [offer];
  });
  return { supplierOfferId: created.id, legacyProductId: source.id, masterProductId: target.id, mappingStatus: "PENDING REVIEW" as const };
}

export async function approveSupplierOfferMapping(input: { supplierOfferId: number; note?: string | null; adminUserId: number }) {
  const db = requireDb(await getDb());
  const [offer] = await db.select().from(supplierOffers).where(eq(supplierOffers.id, input.supplierOfferId)).limit(1);
  if (!offer || !offer.masterProductId) throw new Error("Pending supplier offer mapping was not found");
  if (offer.mappingStatus !== "PENDING REVIEW") throw new Error("Only a PENDING REVIEW mapping can be approved");
  const [masters, legacyProducts] = await Promise.all([
    db.select().from(masterProducts).where(eq(masterProducts.id, offer.masterProductId)).limit(1),
    db.select({ category: products.category }).from(products).where(eq(products.id, offer.legacyProductId)).limit(1),
  ]);
  const target = masters[0];
  if (!target || !legacyProducts[0] || !isSupplierMappingCategory(target.category) || target.category !== legacyProducts[0].category) throw new Error("The mapping can no longer be approved because its category is not safe.");
  if (!mappingAttributesMatch(target.category, mappingAttributesFromMaster(target), mappingAttributesFromOffer(offer, target.category))) throw new Error("The mapping can no longer be approved because its verified attributes do not exactly match.");
  await db.transaction(async (tx) => {
    await tx.update(supplierOffers).set({ mappingStatus: "APPROVED" }).where(eq(supplierOffers.id, offer.id));
    await tx.insert(supplierOfferMappingReviews).values({ supplierOfferId: offer.id, legacyProductId: offer.legacyProductId, masterProductId: target.id, action: "APPROVED", previousStatus: "PENDING REVIEW", nextStatus: "APPROVED", reviewedByAdminId: input.adminUserId, note: input.note?.trim() || null, mappingAttributes: offer.mappingAttributes });
    await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: "supplier_mapping.offer_approved", targetType: "supplier_offer", targetId: String(offer.id), summary: `Approved supplier offer mapping for ${offer.supplierProductName}`, metadata: { masterProductId: target.id, legacyProductId: offer.legacyProductId, category: target.category } });
  });
  return { supplierOfferId: offer.id, mappingStatus: "APPROVED" as const };
}

export async function rejectSupplierOfferMapping(input: { supplierOfferId: number; note?: string | null; adminUserId: number }) {
  const db = requireDb(await getDb());
  const [offer] = await db.select().from(supplierOffers).where(eq(supplierOffers.id, input.supplierOfferId)).limit(1);
  if (!offer) throw new Error("Supplier offer mapping was not found");
  if (offer.mappingStatus !== "PENDING REVIEW") throw new Error("Only a PENDING REVIEW mapping can be rejected");
  await db.transaction(async (tx) => {
    await tx.update(supplierOffers).set({ masterProductId: null, mappingStatus: "REJECTED" }).where(eq(supplierOffers.id, offer.id));
    await tx.insert(supplierOfferMappingReviews).values({ supplierOfferId: offer.id, legacyProductId: offer.legacyProductId, masterProductId: offer.masterProductId, action: "REJECTED", previousStatus: "PENDING REVIEW", nextStatus: "REJECTED", reviewedByAdminId: input.adminUserId, note: input.note?.trim() || null, mappingAttributes: offer.mappingAttributes });
    await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: "supplier_mapping.offer_rejected", targetType: "supplier_offer", targetId: String(offer.id), summary: `Rejected supplier offer mapping for ${offer.supplierProductName}`, metadata: { masterProductId: offer.masterProductId, legacyProductId: offer.legacyProductId } });
  });
  return { supplierOfferId: offer.id, mappingStatus: "REJECTED" as const };
}

/** Removes only the additive mapping snapshot. The original supplier product remains untouched in products. */
export async function removeSupplierOfferMapping(input: { supplierOfferId: number; note?: string | null; adminUserId: number }) {
  const db = requireDb(await getDb());
  const [offer] = await db.select().from(supplierOffers).where(eq(supplierOffers.id, input.supplierOfferId)).limit(1);
  if (!offer) throw new Error("Supplier offer mapping was not found");
  await db.transaction(async (tx) => {
    await tx.insert(supplierOfferMappingReviews).values({ supplierOfferId: offer.id, legacyProductId: offer.legacyProductId, masterProductId: offer.masterProductId, action: "REMOVED", previousStatus: offer.mappingStatus, nextStatus: "UNMAPPED", reviewedByAdminId: input.adminUserId, note: input.note?.trim() || null, mappingAttributes: offer.mappingAttributes });
    await tx.delete(supplierOffers).where(eq(supplierOffers.id, offer.id));
    await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: "supplier_mapping.offer_removed", targetType: "supplier_offer", targetId: String(offer.id), summary: `Removed additive mapping record for ${offer.supplierProductName}`, metadata: { legacyProductId: offer.legacyProductId, previousStatus: offer.mappingStatus } });
  });
  return { supplierOfferId: offer.id, mappingStatus: "UNMAPPED" as const };
}

type RoutingEligibilityRow = {
  supplierOfferId: number;
  supplierKey: string;
  supplierName: string;
  supplierProductId: string;
  priority: number;
  supplierCost: number | null;
  supplierCurrency: string | null;
  outputCurrency: string | null;
  exchangeRate: number | null;
  convertedCost: number | null;
  customerPrice: number | null;
  expectedMargin: number | null;
  expectedMarginPercent: number | null;
  eligible: boolean;
  reasons: string[];
  mappingAttributes: Record<string, unknown>;
};

const sameJson = (left: unknown, right: unknown) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

/** Returns the simulation-only routing policy. LIVE routing is always false in Step 6. */
export async function getSupplierRoutingPolicy() {
  const db = requireDb(await getDb());
  const [policy] = await db.select().from(supplierRoutingPolicies).where(eq(supplierRoutingPolicies.id, 1)).limit(1);
  return policy ? { ...policy, liveRoutingEnabled: false, configured: true } : { id: 1, strategy: "lowest_cost_available" as SupplierRoutingStrategy, liveRoutingEnabled: false, configured: false, updatedAt: null };
}

export async function saveSupplierRoutingPolicy(input: { strategy: SupplierRoutingStrategy; adminUserId: number }) {
  const db = requireDb(await getDb());
  const [previous] = await db.select().from(supplierRoutingPolicies).where(eq(supplierRoutingPolicies.id, 1)).limit(1);
  await db.insert(supplierRoutingPolicies).values({ id: 1, strategy: input.strategy, liveRoutingEnabled: false, updatedByAdminId: input.adminUserId }).onDuplicateKeyUpdate({ set: { strategy: input.strategy, liveRoutingEnabled: false, updatedByAdminId: input.adminUserId } });
  await appendAdminAuditEvent(db, { adminUserId: input.adminUserId, action: "supplier_routing.policy_saved", targetType: "supplier_routing_policy", targetId: "1", summary: `Saved ${input.strategy.replaceAll("_", " ")} supplier routing simulation strategy`, metadata: { previousStrategy: previous?.strategy ?? null, strategy: input.strategy, liveRoutingEnabled: false, simulationOnly: true } });
  return getSupplierRoutingPolicy();
}

/** Routing needs a master only when it has at least one approved offer. It never creates mapping rows. */
export async function listSupplierRoutingMasters() {
  const db = requireDb(await getDb());
  const masters = await db.select().from(masterProducts).orderBy(masterProducts.category, masterProducts.name);
  const approved = await db.select({ masterProductId: supplierOffers.masterProductId, count: sql<number>`count(*)` }).from(supplierOffers).where(eq(supplierOffers.mappingStatus, "APPROVED")).groupBy(supplierOffers.masterProductId);
  const countByMaster = new Map(approved.map((row) => [row.masterProductId, Number(row.count)]));
  return masters.map((master) => ({ id: master.id, name: master.name, category: master.category, currency: master.currency, regionLabel: master.regionLabel, denomination: master.denomination, approvedOfferCount: countByMaster.get(master.id) ?? 0 }));
}

/** Restricts routing candidates to exact category-safe, owner-approved offer snapshots and active supplier profiles. */
export async function getSupplierRoutingEligibility(masterProductId: number): Promise<{ master: { id: number; name: string; category: SupplierMappingCategory; currency: string | null; regionLabel: string | null; denomination: string | null }; offers: RoutingEligibilityRow[] }> {
  const db = requireDb(await getDb());
  const [master] = await db.select().from(masterProducts).where(eq(masterProducts.id, masterProductId)).limit(1);
  if (!master || !isSupplierMappingCategory(master.category)) throw new Error("A category-safe Master Product is required for routing simulation");
  const masterAttributes = mappingAttributesFromMaster(master);
  const rows = await db.select({ offer: supplierOffers, legacy: products, profile: supplierManagementProfiles }).from(supplierOffers)
    .innerJoin(products, eq(supplierOffers.legacyProductId, products.id))
    .leftJoin(supplierManagementProfiles, eq(supplierOffers.supplierKey, supplierManagementProfiles.supplierId))
    .where(eq(supplierOffers.masterProductId, master.id));
  const settings = await ensureMarketplacePricingSettings(db);
  const offers: RoutingEligibilityRow[] = [];
  for (const row of rows) {
    const reasons: string[] = [];
    const offer = row.offer; const legacy = row.legacy; const profile = row.profile;
    const offerAttributes = (() => { try { return mappingAttributesFromOffer(offer, master.category); } catch { return null; } })();
    if (offer.mappingStatus !== "APPROVED") reasons.push("Offer mapping is not approved");
    if (legacy.category !== master.category) reasons.push("Legacy supplier product category does not match the Master Product");
    if (!offerAttributes || !mappingAttributesMatch(master.category, masterAttributes, offerAttributes)) reasons.push("Verified category-specific attributes no longer match exactly");
    if (!profile) reasons.push("No active Supplier Management profile exists for this offer");
    if (profile && !profile.isActive) reasons.push("Supplier profile is inactive");
    const supportedCategories = Array.isArray(profile?.supportedCategories) ? profile.supportedCategories.map(String) : [];
    if (profile && !supportedCategories.includes(master.category)) reasons.push("Supplier profile does not support the Master Product category");
    if (!offer.supplierAvailability || !legacy.supplierEligible) reasons.push("Supplier offer is unavailable");
    if (offer.sourceStatus !== "active" || legacy.status !== "active") reasons.push("Supplier offer or legacy product is not active");
    if (offer.supplierCategory !== legacy.supplierCategory) reasons.push("Supplier product identity changed since the approved offer snapshot");
    if (offer.supplierCurrency !== legacy.supplierCurrency) reasons.push("Supplier currency changed since the approved offer snapshot");
    if (offer.regionLabel !== legacy.regionLabel) reasons.push("Supplier region changed since the approved offer snapshot");
    if (offer.deliveryType !== legacy.deliveryType || !sameJson(offer.inputRequirements, legacy.inputRequirements)) reasons.push("Required delivery information changed since the approved offer snapshot");
    const supplierCost = offer.supplierCost === null ? null : Number(offer.supplierCost);
    const supplierCurrency = offer.supplierCurrency;
    const outputCurrency = legacy.baseCurrency;
    let exchangeRate: number | null = null; let convertedCost: number | null = null;
    if (supplierCost === null || !supplierCurrency || !outputCurrency) reasons.push("Supplier cost or currency is incomplete");
    else {
      try { const rate = await resolveVamnuxExchangeRate(db, supplierCurrency, outputCurrency); exchangeRate = rate.rate; convertedCost = supplierCost * rate.rate; }
      catch (error) { reasons.push(error instanceof Error ? error.message : "No VAMNUX exchange rate is available"); }
    }
    const customerPrice = customerPriceForProduct(legacy, settings).customerPrice;
    const expectedMargin = convertedCost === null ? null : customerPrice - convertedCost;
    offers.push({ supplierOfferId: offer.id, supplierKey: offer.supplierKey, supplierName: profile?.supplierName || mappingSupplierName(offer.supplierKey), supplierProductId: offer.supplierOfferId || offer.supplierSku || String(offer.legacyProductId), priority: profile?.priority ?? 9999, supplierCost, supplierCurrency, outputCurrency, exchangeRate, convertedCost, customerPrice, expectedMargin, expectedMarginPercent: expectedMargin === null || customerPrice <= 0 ? null : (expectedMargin / customerPrice) * 100, eligible: reasons.length === 0, reasons, mappingAttributes: offer.mappingAttributes && typeof offer.mappingAttributes === "object" && !Array.isArray(offer.mappingAttributes) ? offer.mappingAttributes as Record<string, unknown> : {} });
  }
  return { master: { id: master.id, name: master.name, category: master.category, currency: master.currency, regionLabel: master.regionLabel, denomination: master.denomination }, offers };
}

export async function updateSupplierRoutingSupplier(input: { profileId: number; isActive: boolean; priority: number; adminUserId: number }) {
  const db = requireDb(await getDb());
  if (!Number.isInteger(input.priority) || input.priority < 1 || input.priority > 100_000) throw new Error("Supplier priority must be an integer between 1 and 100,000");
  const [profile] = await db.select().from(supplierManagementProfiles).where(eq(supplierManagementProfiles.id, input.profileId)).limit(1);
  if (!profile) throw new Error("Supplier Management profile was not found");
  await db.update(supplierManagementProfiles).set({ isActive: input.isActive, priority: input.priority }).where(eq(supplierManagementProfiles.id, profile.id));
  await appendAdminAuditEvent(db, { adminUserId: input.adminUserId, action: "supplier_routing.supplier_state_updated", targetType: "supplier_profile", targetId: String(profile.id), summary: `Updated routing state for ${profile.supplierName}`, metadata: { supplierId: profile.supplierId, isActive: input.isActive, priority: input.priority, simulationOnly: true } });
  return { id: profile.id, supplierId: profile.supplierId, isActive: input.isActive, priority: input.priority };
}

export async function simulateSupplierRouting(input: { masterProductId: number; strategy?: SupplierRoutingStrategy; manualSupplierOfferId?: number | null; adminUserId: number }) {
  const db = requireDb(await getDb());
  const policy = await getSupplierRoutingPolicy();
  const strategy = input.strategy ?? policy.strategy;
  const eligibility = await getSupplierRoutingEligibility(input.masterProductId);
  const eligible = eligibility.offers.filter((offer) => offer.eligible && offer.convertedCost !== null && offer.supplierCost !== null && offer.supplierCurrency && offer.outputCurrency && offer.exchangeRate !== null && offer.customerPrice !== null);
  const selected = selectSimulatedSupplierOffer(strategy, eligible.map((offer) => ({ supplierOfferId: offer.supplierOfferId, supplierKey: offer.supplierKey, supplierName: offer.supplierName, priority: offer.priority, convertedCost: offer.convertedCost!, supplierCost: offer.supplierCost!, supplierCurrency: offer.supplierCurrency! })), input.manualSupplierOfferId);
  const selectedRow = selected ? eligible.find((offer) => offer.supplierOfferId === selected.supplierOfferId) ?? null : null;
  const manualRequested = strategy === "manual_selection" && input.manualSupplierOfferId;
  const outcome = selectedRow ? "selected" as const : manualRequested ? "manual_offer_ineligible" as const : "no_eligible_offer" as const;
  const fallbackSupplierOfferIds = selectedRow ? eligible.filter((offer) => offer.supplierOfferId !== selectedRow.supplierOfferId).sort((a, b) => a.convertedCost! - b.convertedCost! || a.priority - b.priority).map((offer) => offer.supplierOfferId) : [];
  const detail = selectedRow ? `${LIVE_ROUTING_DISABLED_MESSAGE} Recommended ${selectedRow.supplierName} using ${strategy.replaceAll("_", " ")}; ${fallbackSupplierOfferIds.length} eligible fallback offer(s) identified.` : `${LIVE_ROUTING_DISABLED_MESSAGE} No eligible supplier offer was selected.`;
  const [created] = await db.insert(supplierRoutingDecisions).values({ masterProductId: eligibility.master.id, selectedSupplierOfferId: selectedRow?.supplierOfferId ?? null, selectedSupplierKey: selectedRow?.supplierKey ?? null, selectedSupplierProductId: selectedRow?.supplierProductId ?? null, strategy, outcome, simulationMode: true, liveRoutingEnabled: false, supplierCost: selectedRow?.supplierCost === null || selectedRow?.supplierCost === undefined ? null : selectedRow.supplierCost.toFixed(2), supplierCurrency: selectedRow?.supplierCurrency ?? null, outputCurrency: selectedRow?.outputCurrency ?? null, exchangeRate: selectedRow?.exchangeRate === null || selectedRow?.exchangeRate === undefined ? null : selectedRow.exchangeRate.toFixed(6), convertedCost: selectedRow?.convertedCost === null || selectedRow?.convertedCost === undefined ? null : selectedRow.convertedCost.toFixed(2), customerPrice: selectedRow?.customerPrice === null || selectedRow?.customerPrice === undefined ? null : selectedRow.customerPrice.toFixed(2), expectedMargin: selectedRow?.expectedMargin === null || selectedRow?.expectedMargin === undefined ? null : selectedRow.expectedMargin.toFixed(2), expectedMarginPercent: selectedRow?.expectedMarginPercent === null || selectedRow?.expectedMarginPercent === undefined ? null : selectedRow.expectedMarginPercent.toFixed(2), fallbackSupplierOfferIds, eligibilitySnapshot: eligibility.offers.map((offer) => ({ supplierOfferId: offer.supplierOfferId, supplierKey: offer.supplierKey, eligible: offer.eligible, reasons: offer.reasons, priority: offer.priority, convertedCost: offer.convertedCost })), detail, simulatedByAdminId: input.adminUserId }).$returningId();
  if (!created) throw new Error("Routing simulation record could not be stored");
  await appendAdminAuditEvent(db, { adminUserId: input.adminUserId, action: "supplier_routing.simulated", targetType: "supplier_routing_decision", targetId: String(created.id), summary: `Simulated ${strategy.replaceAll("_", " ")} routing for ${eligibility.master.name}`, metadata: { masterProductId: eligibility.master.id, selectedSupplierOfferId: selectedRow?.supplierOfferId ?? null, outcome, simulationOnly: true, liveRoutingEnabled: false } });
  return { decisionId: created.id, strategy, outcome, liveRoutingEnabled: false, master: eligibility.master, selectedOffer: selectedRow, eligibleOffers: eligible, fallbackSupplierOfferIds, offers: eligibility.offers, detail };
}

export async function listSupplierRoutingDecisions(limit = 100) {
  const db = requireDb(await getDb());
  const rows = await db.select({ id: supplierRoutingDecisions.id, masterProductId: supplierRoutingDecisions.masterProductId, masterName: masterProducts.name, strategy: supplierRoutingDecisions.strategy, outcome: supplierRoutingDecisions.outcome, simulationMode: supplierRoutingDecisions.simulationMode, liveRoutingEnabled: supplierRoutingDecisions.liveRoutingEnabled, selectedSupplierKey: supplierRoutingDecisions.selectedSupplierKey, selectedSupplierProductId: supplierRoutingDecisions.selectedSupplierProductId, supplierCost: supplierRoutingDecisions.supplierCost, supplierCurrency: supplierRoutingDecisions.supplierCurrency, outputCurrency: supplierRoutingDecisions.outputCurrency, exchangeRate: supplierRoutingDecisions.exchangeRate, convertedCost: supplierRoutingDecisions.convertedCost, customerPrice: supplierRoutingDecisions.customerPrice, expectedMargin: supplierRoutingDecisions.expectedMargin, expectedMarginPercent: supplierRoutingDecisions.expectedMarginPercent, fallbackSupplierOfferIds: supplierRoutingDecisions.fallbackSupplierOfferIds, detail: supplierRoutingDecisions.detail, adminName: users.name, createdAt: supplierRoutingDecisions.createdAt }).from(supplierRoutingDecisions).leftJoin(masterProducts, eq(supplierRoutingDecisions.masterProductId, masterProducts.id)).leftJoin(users, eq(supplierRoutingDecisions.simulatedByAdminId, users.id)).orderBy(desc(supplierRoutingDecisions.createdAt)).limit(Math.min(250, Math.max(1, limit)));
  return rows.map((row) => ({ ...row, liveRoutingEnabled: false, supplierCost: row.supplierCost === null ? null : Number(row.supplierCost), exchangeRate: row.exchangeRate === null ? null : Number(row.exchangeRate), convertedCost: row.convertedCost === null ? null : Number(row.convertedCost), customerPrice: row.customerPrice === null ? null : Number(row.customerPrice), expectedMargin: row.expectedMargin === null ? null : Number(row.expectedMargin), expectedMarginPercent: row.expectedMarginPercent === null ? null : Number(row.expectedMarginPercent) }));
}

type FulfillmentSimulationInput = { masterProductId: number; selectedSupplierOfferId?: number | null; customerSellingPrice: number; customerCurrency: string; idempotencyKey: string; customerDeliveryInput?: Record<string, string> | null; adminUserId: number };

const fulfillmentEventForStatus: Record<FulfillmentOrderStatus, "payment_simulated" | "processing_started" | "supplier_submission_simulated" | "supplier_processing_simulated" | "completed_simulated" | "failed_simulated" | "cancelled_simulated" | "refund_pending_simulated" | "refunded_simulated"> = {
  "PENDING PAYMENT": "processing_started",
  "PAID": "payment_simulated",
  "PROCESSING": "processing_started",
  "SUPPLIER SUBMITTED": "supplier_submission_simulated",
  "SUPPLIER PROCESSING": "supplier_processing_simulated",
  "COMPLETED": "completed_simulated",
  "FAILED": "failed_simulated",
  "CANCELLED": "cancelled_simulated",
  "REFUND PENDING": "refund_pending_simulated",
  "REFUNDED": "refunded_simulated",
};

function normalizeSimulationDeliveryInput(value: Record<string, string> | null | undefined) {
  if (!value) return null;
  const entries = Object.entries(value).slice(0, 20).map(([key, item]) => [key.trim().slice(0, 80), item.trim().slice(0, 300)] as const).filter(([key, item]) => key && item);
  return Object.fromEntries(entries);
}

function simulationOrderCode(idempotencyKey: string) {
  return `SIM-${createHash("sha256").update(`${idempotencyKey}:${Date.now()}`).digest("hex").slice(0, 10).toUpperCase()}`;
}

/** Lists only additive test orders. Existing VAMNUX orders remain separately managed and untouched. */
export async function listFulfillmentSimulationOrders(input?: { search?: string; status?: FulfillmentOrderStatus; limit?: number }) {
  const db = requireDb(await getDb());
  const predicates = [];
  if (input?.status) predicates.push(eq(supplierFulfillmentSimulationOrders.orderStatus, input.status));
  const term = input?.search?.trim().slice(0, 120);
  if (term) { const pattern = `%${term.replace(/[%_]/g, "\\$&")}%`; predicates.push(or(like(supplierFulfillmentSimulationOrders.simulationOrderCode, pattern), like(masterProducts.name, pattern), like(supplierFulfillmentSimulationOrders.selectedSupplierKey, pattern), like(supplierFulfillmentSimulationOrders.selectedSupplierProductId, pattern))!); }
  const rows = await db.select({ id: supplierFulfillmentSimulationOrders.id, simulationOrderCode: supplierFulfillmentSimulationOrders.simulationOrderCode, masterProductId: supplierFulfillmentSimulationOrders.masterProductId, masterProductName: masterProducts.name, customerUserId: supplierFulfillmentSimulationOrders.customerUserId, customerName: users.name, selectedSupplierKey: supplierFulfillmentSimulationOrders.selectedSupplierKey, selectedSupplierProductId: supplierFulfillmentSimulationOrders.selectedSupplierProductId, customerSellingPrice: supplierFulfillmentSimulationOrders.customerSellingPrice, customerCurrency: supplierFulfillmentSimulationOrders.customerCurrency, supplierCost: supplierFulfillmentSimulationOrders.supplierCost, supplierCurrency: supplierFulfillmentSimulationOrders.supplierCurrency, exchangeRate: supplierFulfillmentSimulationOrders.exchangeRate, markupPercent: supplierFulfillmentSimulationOrders.markupPercent, expectedProfit: supplierFulfillmentSimulationOrders.expectedProfit, paymentStatus: supplierFulfillmentSimulationOrders.paymentStatus, supplierStatus: supplierFulfillmentSimulationOrders.supplierStatus, orderStatus: supplierFulfillmentSimulationOrders.orderStatus, supplierReference: supplierFulfillmentSimulationOrders.supplierReference, simulationMode: supplierFulfillmentSimulationOrders.simulationMode, liveFulfillmentEnabled: supplierFulfillmentSimulationOrders.liveFulfillmentEnabled, createdAt: supplierFulfillmentSimulationOrders.createdAt, updatedAt: supplierFulfillmentSimulationOrders.updatedAt }).from(supplierFulfillmentSimulationOrders).leftJoin(masterProducts, eq(supplierFulfillmentSimulationOrders.masterProductId, masterProducts.id)).leftJoin(users, eq(supplierFulfillmentSimulationOrders.customerUserId, users.id)).where(predicates.length ? and(...predicates) : undefined).orderBy(desc(supplierFulfillmentSimulationOrders.createdAt)).limit(Math.min(250, Math.max(1, input?.limit ?? 100)));
  return rows.map((row) => ({ ...row, liveFulfillmentEnabled: false, customerSellingPrice: Number(row.customerSellingPrice), supplierCost: row.supplierCost === null ? null : Number(row.supplierCost), exchangeRate: row.exchangeRate === null ? null : Number(row.exchangeRate), markupPercent: row.markupPercent === null ? null : Number(row.markupPercent), expectedProfit: row.expectedProfit === null ? null : Number(row.expectedProfit) }));
}

/** Creates a test-only immutable commercial snapshot. It does not create a real VAMNUX order, charge a customer, or submit a supplier request. */
export async function createFulfillmentSimulationOrder(input: FulfillmentSimulationInput) {
  const db = requireDb(await getDb());
  const idempotencyKey = input.idempotencyKey.trim().slice(0, 160);
  if (idempotencyKey.length < 8) throw new Error("Use an idempotency key with at least 8 characters to prevent duplicate test orders");
  if (!Number.isFinite(input.customerSellingPrice) || input.customerSellingPrice <= 0) throw new Error("Customer selling price must be greater than zero");
  const customerCurrency = input.customerCurrency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(customerCurrency)) throw new Error("Customer currency must be a three-letter code");
  const [master, existing] = await Promise.all([
    db.select().from(masterProducts).where(eq(masterProducts.id, input.masterProductId)).limit(1),
    db.select({ id: supplierFulfillmentSimulationOrders.id, simulationOrderCode: supplierFulfillmentSimulationOrders.simulationOrderCode }).from(supplierFulfillmentSimulationOrders).where(eq(supplierFulfillmentSimulationOrders.idempotencyKey, idempotencyKey)).limit(1),
  ]);
  if (!master[0] || !isSupplierMappingCategory(master[0].category)) throw new Error("A category-safe VAMNUX Master Product is required for fulfillment simulation");
  if (existing[0]) throw new Error(`Duplicate simulation prevented. This idempotency key already created ${existing[0].simulationOrderCode}`);
  let selected: RoutingEligibilityRow | null = null;
  if (input.selectedSupplierOfferId) {
    const eligibility = await getSupplierRoutingEligibility(master[0].id);
    selected = eligibility.offers.find((offer) => offer.supplierOfferId === input.selectedSupplierOfferId && offer.eligible) ?? null;
    if (!selected) throw new Error("Selected supplier offer is not an approved, active, category-safe routing candidate");
    if (selected.outputCurrency !== customerCurrency) throw new Error("Customer currency must match the approved offer's configured VAMNUX output currency for this simulation snapshot");
  }
  const supplierCost = selected?.supplierCost ?? null;
  const exchangeRate = selected?.exchangeRate ?? null;
  const convertedCost = selected?.convertedCost ?? null;
  const expectedProfit = convertedCost === null ? null : input.customerSellingPrice - convertedCost;
  const markupPercent = convertedCost === null || convertedCost <= 0 ? null : ((input.customerSellingPrice - convertedCost) / convertedCost) * 100;
  const code = simulationOrderCode(idempotencyKey);
  const [created] = await db.transaction(async (tx) => {
    const [order] = await tx.insert(supplierFulfillmentSimulationOrders).values({ simulationOrderCode: code, idempotencyKey, masterProductId: master[0].id, selectedSupplierOfferId: selected?.supplierOfferId ?? null, selectedSupplierKey: selected?.supplierKey ?? null, selectedSupplierProductId: selected?.supplierProductId ?? null, customerSellingPrice: input.customerSellingPrice.toFixed(2), customerCurrency, supplierCost: supplierCost === null ? null : supplierCost.toFixed(2), supplierCurrency: selected?.supplierCurrency ?? null, exchangeRate: exchangeRate === null ? null : exchangeRate.toFixed(6), markupPercent: markupPercent === null ? null : markupPercent.toFixed(2), expectedProfit: expectedProfit === null ? null : expectedProfit.toFixed(2), paymentStatus: "NOT CHARGED", supplierStatus: "NOT SUBMITTED", orderStatus: "PENDING PAYMENT", customerDeliveryInput: normalizeSimulationDeliveryInput(input.customerDeliveryInput), simulationMode: true, liveFulfillmentEnabled: false, createdByAdminId: input.adminUserId }).$returningId();
    if (!order) throw new Error("Simulation order could not be stored");
    await tx.insert(supplierFulfillmentSimulationEvents).values({ simulationOrderId: order.id, previousOrderStatus: null, nextOrderStatus: "PENDING PAYMENT", eventType: "created", paymentStatus: "NOT CHARGED", supplierStatus: "NOT SUBMITTED", reason: LIVE_FULFILLMENT_DISABLED_MESSAGE, performedByAdminId: input.adminUserId });
    const financial = calculateFinancialSnapshot({ customerSellingPrice: input.customerSellingPrice, supplierCost, exchangeRate, supplierCostInCustomerCurrency: convertedCost, paymentProcessingFee: 0, otherApplicableFees: 0 });
    const [financialSnapshot] = await tx.insert(financialOrderSnapshots).values({ sourceType: "simulation", simulationOrderId: order.id, masterProductId: master[0].id, category: master[0].category, supplierKey: selected?.supplierKey ?? null, supplierOfferId: selected?.supplierOfferId ?? null, customerSellingPrice: input.customerSellingPrice.toFixed(2), customerCurrency, supplierCost: supplierCost === null ? null : supplierCost.toFixed(2), supplierCurrency: selected?.supplierCurrency ?? null, exchangeRate: exchangeRate === null ? null : exchangeRate.toFixed(6), supplierCostInCustomerCurrency: convertedCost === null ? null : convertedCost.toFixed(2), markupPercent: markupPercent === null ? null : markupPercent.toFixed(2), paymentProcessingFee: "0.00", otherApplicableFees: "0.00", paymentFeeConfigured: false, grossRevenue: financial.grossRevenue.toFixed(2), grossProfit: financial.grossProfit.toFixed(2), netRevenue: financial.netRevenue.toFixed(2), netProfit: financial.netProfit.toFixed(2), profitMarginPercent: financial.profitMarginPercent.toFixed(2), orderStatus: "PENDING PAYMENT" }).$returningId();
    if (!financialSnapshot) throw new Error("Financial simulation snapshot could not be stored");
    await tx.insert(financialOrderEvents).values({ financialSnapshotId: financialSnapshot.id, eventType: "snapshot_created", amount: "0.00", currency: customerCurrency, orderStatus: "PENDING PAYMENT", simulationMode: true, note: "Immutable test-only financial snapshot created. No payment fee or real payment is configured." });
    return [order];
  });
  await appendAdminAuditEvent(db, { adminUserId: input.adminUserId, action: "supplier_fulfillment.simulation_created", targetType: "fulfillment_simulation_order", targetId: String(created.id), summary: `Created test-only fulfillment simulation ${code}`, metadata: { masterProductId: master[0].id, selectedSupplierOfferId: selected?.supplierOfferId ?? null, simulationMode: true, liveFulfillmentEnabled: false } });
  return { id: created.id, simulationOrderCode: code, detail: LIVE_FULFILLMENT_DISABLED_MESSAGE };
}

/** Moves only a test simulation through its permitted lifecycle; it never acts on a real order, wallet, payment, or supplier API. */
export async function transitionFulfillmentSimulationOrder(input: { simulationOrderId: number; nextStatus: FulfillmentOrderStatus; reason?: string | null; safeReference?: string | null; adminUserId: number }) {
  const db = requireDb(await getDb());
  const [current] = await db.select().from(supplierFulfillmentSimulationOrders).where(eq(supplierFulfillmentSimulationOrders.id, input.simulationOrderId)).limit(1);
  if (!current) throw new Error("Fulfillment simulation order was not found");
  if (!current.simulationMode || current.liveFulfillmentEnabled) throw new Error("Only a live-disabled simulation record may be transitioned");
  const previousStatus = current.orderStatus as FulfillmentOrderStatus;
  if (!canTransitionFulfillmentOrder(previousStatus, input.nextStatus)) throw new Error(`${input.nextStatus} is not an allowed transition from ${previousStatus}`);
  let paymentStatus = current.paymentStatus; let supplierStatus = current.supplierStatus; let supplierReference = current.supplierReference;
  if (input.nextStatus === "PAID") paymentStatus = "SIMULATION ONLY";
  if (input.nextStatus === "SUPPLIER SUBMITTED") { supplierStatus = "SIMULATED SUBMITTED"; supplierReference = supplierReference || `SIM-REF-${current.id}`; }
  if (input.nextStatus === "SUPPLIER PROCESSING") supplierStatus = "SIMULATED PROCESSING";
  if (input.nextStatus === "COMPLETED") supplierStatus = "COMPLETED";
  if (input.nextStatus === "FAILED") supplierStatus = "FAILED";
  if (input.nextStatus === "REFUNDED") paymentStatus = "SIMULATION ONLY";
  const eventType = input.nextStatus === "PROCESSING" && previousStatus === "FAILED" ? "retry_simulated" : fulfillmentEventForStatus[input.nextStatus];
  const safeReference = input.safeReference?.trim().slice(0, 500) || null;
  const reason = input.reason?.trim().slice(0, 1000) || LIVE_FULFILLMENT_DISABLED_MESSAGE;
  await db.transaction(async (tx) => {
    await tx.update(supplierFulfillmentSimulationOrders).set({ orderStatus: input.nextStatus, paymentStatus, supplierStatus, supplierReference, safeSupplierResponseReference: safeReference, liveFulfillmentEnabled: false }).where(eq(supplierFulfillmentSimulationOrders.id, current.id));
    await tx.insert(supplierFulfillmentSimulationEvents).values({ simulationOrderId: current.id, previousOrderStatus: previousStatus, nextOrderStatus: input.nextStatus, eventType, paymentStatus, supplierStatus, supplierReference, reason, safeReference, performedByAdminId: input.adminUserId });
    const [financialSnapshot] = await tx.select({ id: financialOrderSnapshots.id, customerCurrency: financialOrderSnapshots.customerCurrency }).from(financialOrderSnapshots).where(eq(financialOrderSnapshots.simulationOrderId, current.id)).limit(1);
    if (financialSnapshot) await tx.insert(financialOrderEvents).values({ financialSnapshotId: financialSnapshot.id, eventType: input.nextStatus === "REFUNDED" ? "refund_recorded" : "status_recorded", amount: "0.00", currency: financialSnapshot.customerCurrency, orderStatus: input.nextStatus, simulationMode: true, note: LIVE_FULFILLMENT_DISABLED_MESSAGE });
  });
  await appendAdminAuditEvent(db, { adminUserId: input.adminUserId, action: "supplier_fulfillment.simulation_transitioned", targetType: "fulfillment_simulation_order", targetId: String(current.id), summary: `Simulated ${previousStatus} → ${input.nextStatus} for ${current.simulationOrderCode}`, metadata: { eventType, simulationMode: true, liveFulfillmentEnabled: false } });
  return { id: current.id, simulationOrderCode: current.simulationOrderCode, previousStatus, nextStatus: input.nextStatus, paymentStatus, supplierStatus, detail: LIVE_FULFILLMENT_DISABLED_MESSAGE };
}

export async function getFulfillmentSimulationOrderDetail(simulationOrderId: number) {
  const db = requireDb(await getDb());
  const [order] = await db.select({ order: supplierFulfillmentSimulationOrders, masterProductName: masterProducts.name, adminName: users.name }).from(supplierFulfillmentSimulationOrders).leftJoin(masterProducts, eq(supplierFulfillmentSimulationOrders.masterProductId, masterProducts.id)).leftJoin(users, eq(supplierFulfillmentSimulationOrders.createdByAdminId, users.id)).where(eq(supplierFulfillmentSimulationOrders.id, simulationOrderId)).limit(1);
  if (!order) throw new Error("Fulfillment simulation order was not found");
  const events = await db.select({ id: supplierFulfillmentSimulationEvents.id, previousOrderStatus: supplierFulfillmentSimulationEvents.previousOrderStatus, nextOrderStatus: supplierFulfillmentSimulationEvents.nextOrderStatus, eventType: supplierFulfillmentSimulationEvents.eventType, paymentStatus: supplierFulfillmentSimulationEvents.paymentStatus, supplierStatus: supplierFulfillmentSimulationEvents.supplierStatus, supplierReference: supplierFulfillmentSimulationEvents.supplierReference, reason: supplierFulfillmentSimulationEvents.reason, safeReference: supplierFulfillmentSimulationEvents.safeReference, adminName: users.name, createdAt: supplierFulfillmentSimulationEvents.createdAt }).from(supplierFulfillmentSimulationEvents).leftJoin(users, eq(supplierFulfillmentSimulationEvents.performedByAdminId, users.id)).where(eq(supplierFulfillmentSimulationEvents.simulationOrderId, simulationOrderId)).orderBy(supplierFulfillmentSimulationEvents.createdAt);
  return { order: { ...order.order, liveFulfillmentEnabled: false, customerSellingPrice: Number(order.order.customerSellingPrice), supplierCost: order.order.supplierCost === null ? null : Number(order.order.supplierCost), exchangeRate: order.order.exchangeRate === null ? null : Number(order.order.exchangeRate), markupPercent: order.order.markupPercent === null ? null : Number(order.order.markupPercent), expectedProfit: order.order.expectedProfit === null ? null : Number(order.order.expectedProfit), masterProductName: order.masterProductName, adminName: order.adminName }, events };
}

type FinancialDashboardFilters = { start?: Date; end?: Date; productId?: number; category?: SupplierMappingCategory; supplierKey?: string; currency?: string; orderStatus?: FulfillmentOrderStatus };

type FinancialSnapshotRow = { id: number; sourceType: "simulation" | "order"; simulationOrderId: number | null; orderId: number | null; masterProductId: number | null; productId: number | null; category: SupplierMappingCategory | null; supplierKey: string | null; supplierOfferId: number | null; customerSellingPrice: number; customerCurrency: string; supplierCost: number | null; supplierCurrency: string | null; exchangeRate: number | null; supplierCostInCustomerCurrency: number | null; markupPercent: number | null; paymentProcessingFee: number; otherApplicableFees: number; paymentFeeConfigured: boolean; grossRevenue: number; grossProfit: number; netRevenue: number; netProfit: number; profitMarginPercent: number; orderStatus: FulfillmentOrderStatus; createdAt: Date; productName: string | null; currentBasePrice: number | null; currentBaseCurrency: string | null };

function toFinancialSnapshotRow(row: typeof financialOrderSnapshots.$inferSelect & { productName?: string | null; currentBasePrice?: string | null; currentBaseCurrency?: string | null }): FinancialSnapshotRow {
  return { ...row, sourceType: row.sourceType as "simulation" | "order", category: row.category as SupplierMappingCategory | null, orderStatus: row.orderStatus as FulfillmentOrderStatus, customerSellingPrice: Number(row.customerSellingPrice), supplierCost: row.supplierCost === null ? null : Number(row.supplierCost), exchangeRate: row.exchangeRate === null ? null : Number(row.exchangeRate), supplierCostInCustomerCurrency: row.supplierCostInCustomerCurrency === null ? null : Number(row.supplierCostInCustomerCurrency), markupPercent: row.markupPercent === null ? null : Number(row.markupPercent), paymentProcessingFee: Number(row.paymentProcessingFee), otherApplicableFees: Number(row.otherApplicableFees), grossRevenue: Number(row.grossRevenue), grossProfit: Number(row.grossProfit), netRevenue: Number(row.netRevenue), netProfit: Number(row.netProfit), profitMarginPercent: Number(row.profitMarginPercent), productName: row.productName ?? null, currentBasePrice: row.currentBasePrice === null || row.currentBasePrice === undefined ? null : Number(row.currentBasePrice), currentBaseCurrency: row.currentBaseCurrency ?? null };
}

function filterFinancialRows(rows: FinancialSnapshotRow[], filters?: FinancialDashboardFilters) {
  return rows.filter((row) => {
    if (filters?.start && row.createdAt < filters.start) return false;
    if (filters?.end && row.createdAt > filters.end) return false;
    if (filters?.productId && row.productId !== filters.productId) return false;
    if (filters?.category && row.category !== filters.category) return false;
    if (filters?.supplierKey && row.supplierKey !== filters.supplierKey) return false;
    if (filters?.currency && row.customerCurrency !== filters.currency) return false;
    return true;
  });
}

function aggregateFinancialRows(rows: Array<FinancialSnapshotRow & { effectiveStatus: FulfillmentOrderStatus; refundAmount: number }>) {
  const result = rows.reduce((totals, row) => ({ grossRevenue: totals.grossRevenue + row.grossRevenue, supplierCost: totals.supplierCost + (row.supplierCostInCustomerCurrency ?? 0), grossProfit: totals.grossProfit + row.grossProfit, paymentFees: totals.paymentFees + row.paymentProcessingFee + row.otherApplicableFees, refunds: totals.refunds + row.refundAmount, netRevenue: totals.netRevenue + (row.netRevenue - row.refundAmount), netProfit: totals.netProfit + (row.netProfit - row.refundAmount) }), { grossRevenue: 0, supplierCost: 0, grossProfit: 0, paymentFees: 0, refunds: 0, netRevenue: 0, netProfit: 0 });
  return { ...result, profitMarginPercent: result.grossRevenue > 0 ? (result.netProfit / result.grossRevenue) * 100 : 0 };
}

function financialGroup<T extends string>(rows: Array<FinancialSnapshotRow & { effectiveStatus: FulfillmentOrderStatus; refundAmount: number }>, keyFor: (row: FinancialSnapshotRow) => T, labelFor: (row: FinancialSnapshotRow) => string) {
  const groups = new Map<T, { key: T; label: string; rows: Array<FinancialSnapshotRow & { effectiveStatus: FulfillmentOrderStatus; refundAmount: number }> }>();
  for (const row of rows) { const key = keyFor(row); const group = groups.get(key) ?? { key, label: labelFor(row), rows: [] }; group.rows.push(row); groups.set(key, group); }
  return Array.from(groups.values()).map((group) => ({ key: group.key, label: group.label, records: group.rows.length, ...aggregateFinancialRows(group.rows) })).sort((a, b) => b.netProfit - a.netProfit);
}

/** Server-only financial analysis derived solely from immutable snapshots and append-only events. It never writes to source orders or financial records. */
export async function getFinancialControlsDashboard(filters?: FinancialDashboardFilters) {
  const db = requireDb(await getDb());
  const rawRows = await db.select({ snapshot: financialOrderSnapshots, productName: products.name, currentBasePrice: products.basePrice, currentBaseCurrency: products.baseCurrency }).from(financialOrderSnapshots).leftJoin(products, eq(financialOrderSnapshots.productId, products.id)).orderBy(desc(financialOrderSnapshots.createdAt)).limit(1000);
  const snapshots = filterFinancialRows(rawRows.map((row) => toFinancialSnapshotRow({ ...row.snapshot, productName: row.productName, currentBasePrice: row.currentBasePrice, currentBaseCurrency: row.currentBaseCurrency })), filters);
  const events = snapshots.length ? await db.select().from(financialOrderEvents).where(inArray(financialOrderEvents.financialSnapshotId, snapshots.map((snapshot) => snapshot.id))).orderBy(financialOrderEvents.createdAt) : [];
  const eventMap = new Map<number, typeof events>();
  for (const event of events) eventMap.set(event.financialSnapshotId, [...(eventMap.get(event.financialSnapshotId) ?? []), event]);
  const rows = snapshots.map((snapshot) => {
    const rowEvents = eventMap.get(snapshot.id) ?? [];
    const lastStatus = rowEvents.at(-1)?.orderStatus as FulfillmentOrderStatus | undefined;
    const refundAmount = rowEvents.filter((event) => event.eventType === "refund_recorded").reduce((sum, event) => sum + Number(event.amount), 0);
    return { ...snapshot, effectiveStatus: lastStatus || snapshot.orderStatus, refundAmount };
  }).filter((row) => !filters?.orderStatus || row.effectiveStatus === filters.orderStatus);
  const alerts = rows.flatMap((row) => {
    const unusualPriceChange = row.currentBasePrice !== null && row.currentBaseCurrency === row.customerCurrency && row.customerSellingPrice > 0 && Math.abs(row.currentBasePrice - row.customerSellingPrice) / row.customerSellingPrice >= 0.5;
    return financialAlertsForSnapshot({ customerSellingPrice: row.customerSellingPrice, supplierCost: row.supplierCost, exchangeRate: row.exchangeRate, supplierCostInCustomerCurrency: row.supplierCostInCustomerCurrency, paymentProcessingFee: row.paymentProcessingFee, otherApplicableFees: row.otherApplicableFees, paymentFeeConfigured: row.paymentFeeConfigured, profitMarginPercent: row.profitMarginPercent, unusualPriceChange }).map((type) => ({ type, snapshotId: row.id, orderReference: row.sourceType === "simulation" ? `SIM-${row.simulationOrderId}` : `ORDER-${row.orderId}`, productName: row.productName || (row.masterProductId ? `Master Product #${row.masterProductId}` : "Unlinked record"), supplierKey: row.supplierKey, category: row.category, currency: row.customerCurrency, sellingPrice: row.customerSellingPrice, supplierCost: row.supplierCostInCustomerCurrency, profitMarginPercent: row.profitMarginPercent, createdAt: row.createdAt }));
  });
  const summary = aggregateFinancialRows(rows);
  return { summary, orders: { total: rows.length, completed: rows.filter((row) => row.effectiveStatus === "COMPLETED").length, failed: rows.filter((row) => row.effectiveStatus === "FAILED").length, refunded: rows.filter((row) => row.effectiveStatus === "REFUNDED").length, simulated: rows.filter((row) => row.sourceType === "simulation").length }, profitability: { products: financialGroup(rows, (row) => String(row.productId ?? row.masterProductId ?? "unlinked"), (row) => row.productName || (row.masterProductId ? `Master Product #${row.masterProductId}` : "Unlinked product")), categories: financialGroup(rows, (row) => row.category || "unclassified", (row) => row.category ? row.category.replaceAll("_", " ") : "Unclassified"), suppliers: financialGroup(rows, (row) => row.supplierKey || "unassigned", (row) => row.supplierKey || "No supplier selected") }, alerts, records: rows.map((row) => ({ id: row.id, sourceType: row.sourceType, orderReference: row.sourceType === "simulation" ? `SIM-${row.simulationOrderId}` : `ORDER-${row.orderId}`, productName: row.productName || (row.masterProductId ? `Master Product #${row.masterProductId}` : "Unlinked product"), category: row.category, supplierKey: row.supplierKey, customerSellingPrice: row.customerSellingPrice, customerCurrency: row.customerCurrency, supplierCostInCustomerCurrency: row.supplierCostInCustomerCurrency, paymentProcessingFee: row.paymentProcessingFee, otherApplicableFees: row.otherApplicableFees, netProfit: row.netProfit - row.refundAmount, profitMarginPercent: row.profitMarginPercent, orderStatus: row.effectiveStatus, createdAt: row.createdAt })) };
}

/** Safe Admin calculator. It is deterministic and never writes, reprices, charges, refunds, or changes a supplier cost. */
export function previewFinancialControls(input: { customerSellingPrice: number; supplierCost: number | null; exchangeRate: number | null; supplierCostInCustomerCurrency: number | null; paymentProcessingFee: number; otherApplicableFees: number; refundAmount: number; paymentFeeConfigured: boolean }) {
  const financial = calculateFinancialSnapshot(input);
  const alerts = financialAlertsForSnapshot({ ...input, profitMarginPercent: financial.profitMarginPercent });
  return { ...financial, alerts, note: "Preview only. No product price, supplier cost, order, payment, wallet, transaction, or refund record was changed." };
}

export type PublicCatalogPageInput = {
  page?: number;
  pageSize?: number;
  category?: "top_up" | "gift_card" | "game_key" | "subscription" | "software" | "ai_tool" | "steam" | "steam_top_up" | "telegram_stars";
  gamePlatform?: "steam" | "xbox" | "playstation" | "nintendo" | "battlenet" | "ea" | "ubisoft" | "mobile" | "quest";
  search?: string;
  slug?: string;
  familyName?: string;
  scope?: "primary" | "all";
  includeMetadata?: boolean;
};

const PUBLIC_PRIMARY_TOP_UP_PREFIXES = ["arena breakout", "bigo live diamonds", "free fire global", "mobile legends global", "pubg mobile", "ragnarok origin"];
const PUBLIC_GLOBAL_REGION_LABELS = ["global", "glb", "worldwide", "ww"];
const PUBLIC_CATALOG_CATEGORIES: NonNullable<PublicCatalogPageInput["category"]>[] = ["top_up", "gift_card", "game_key", "subscription", "software", "ai_tool", "steam", "steam_top_up", "telegram_stars"];

function publicGamesPlatformCondition(platform: NonNullable<PublicCatalogPageInput["gamePlatform"]>) {
  return and(
    eq(products.category, "steam"),
    eq(sql<string>`lower(coalesce(json_unquote(json_extract(${products.metadata}, '$.platformCode')), ''))`, platform),
  );
}

function publicPrimaryCatalogCondition() {
  const normalizedName = sql<string>`lower(${products.name})`;
  const normalizedRegion = sql<string>`lower(coalesce(${products.regionLabel}, ''))`;
  return or(
    and(eq(products.category, "top_up"), or(...PUBLIC_PRIMARY_TOP_UP_PREFIXES.map((family) => like(normalizedName, `${family}%`)))),
    eq(products.category, "telegram_stars"),
    and(inArray(products.category, ["steam", "steam_top_up"]), or(...PUBLIC_GLOBAL_REGION_LABELS.map((region) => like(normalizedRegion, region)))),
  );
}

function publicCatalogSearchCondition(search: string) {
  const normalized = search.trim().toLowerCase().slice(0, 100);
  if (!normalized) return undefined;
  const pattern = `%${normalized}%`;
  return or(
    like(sql<string>`lower(${products.name})`, pattern),
    like(sql<string>`lower(coalesce(${products.regionLabel}, ''))`, pattern),
    like(sql<string>`lower(coalesce(${products.supplierCategory}, ''))`, pattern),
  );
}

export async function listActiveCatalogProducts(input: PublicCatalogPageInput = {}) {
  const db = await getDb();
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const pageSize = Math.min(10_000, Math.max(12, Math.floor(input.pageSize ?? 48)));
  const empty = { items: [], page, pageSize, total: undefined, hasMore: false, categoryCounts: {} as Partial<Record<NonNullable<PublicCatalogPageInput["category"]>, number>> };
  if (!db) return empty;
  await ensureDefaultMarketplaceCategories(db);
  const [settings, visibleCategoryRows, hiddenRows] = await Promise.all([
    ensureMarketplacePricingSettings(db),
    db.select({ slug: marketplaceCategories.slug }).from(marketplaceCategories).where(and(eq(marketplaceCategories.status, "active"), eq(marketplaceCategories.visible, true))),
    db.select({ productId: productAdminAttributes.productId }).from(productAdminAttributes).where(eq(productAdminAttributes.storefrontStatus, "hidden")),
  ]);
  const visibleCategorySlugs = new Set(visibleCategoryRows.map((category) => category.slug));
  const visibleProductCategories = PUBLIC_CATALOG_CATEGORIES.filter((category) => visibleCategorySlugs.has(marketplaceCategorySlugForProductCategory(category)));
  if (!visibleProductCategories.length) return empty;
  const hiddenIds = hiddenRows.map((row) => row.productId);
  const normalizedFamily = input.familyName?.trim().toLowerCase();
  const conditions = [
    eq(products.status, "active"),
    inArray(products.category, visibleProductCategories),
    input.scope === "primary" ? publicPrimaryCatalogCondition() : undefined,
    hiddenIds.length ? notInArray(products.id, hiddenIds) : undefined,
    input.category ? eq(products.category, input.category) : undefined,
    input.gamePlatform ? publicGamesPlatformCondition(input.gamePlatform) : undefined,
    input.slug ? eq(products.slug, input.slug) : undefined,
    normalizedFamily ? or(eq(sql<string>`lower(${products.name})`, normalizedFamily), like(sql<string>`lower(${products.name})`, `${normalizedFamily} —%`)) : undefined,
    input.search ? publicCatalogSearchCondition(input.search) : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
  const where = and(...conditions);
  const pageRows = await db.select({
    id: products.id,
    slug: products.slug,
    category: products.category,
    name: products.name,
    description: products.description,
    imageUrl: products.imageUrl,
    basePrice: products.basePrice,
    baseCurrency: products.baseCurrency,
    markupPercentOverride: products.markupPercentOverride,
    displayPriceOverride: products.displayPriceOverride,
    supplierEligible: products.supplierEligible,
    regionLabel: products.regionLabel,
    deliveryType: products.deliveryType,
    requiresPlayerId: products.requiresPlayerId,
    requiresServerId: products.requiresServerId,
    inputRequirements: products.inputRequirements,
  }).from(products).where(where).orderBy(desc(products.createdAt), desc(products.id)).limit(pageSize + 1).offset((page - 1) * pageSize);
  const hasMore = pageRows.length > pageSize;
  const rows = pageRows.slice(0, pageSize);
  const metadata = input.includeMetadata ? await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(products).where(where),
    db.select({ category: products.category, count: sql<number>`count(*)` }).from(products).where(and(
      eq(products.status, "active"),
      inArray(products.category, visibleProductCategories),
      input.scope === "primary" ? publicPrimaryCatalogCondition() : undefined,
      hiddenIds.length ? notInArray(products.id, hiddenIds) : undefined,
    )).groupBy(products.category),
  ]) : null;
  const categoryCounts = metadata ? Object.fromEntries(metadata[1].map((row) => [row.category, Number(row.count)])) as Partial<Record<NonNullable<PublicCatalogPageInput["category"]>, number>> : {};
  const total = metadata ? Number(metadata[0][0]?.count ?? 0) : undefined;
  return {
    items: rows.map(({ basePrice, markupPercentOverride, displayPriceOverride, ...product }) => ({ ...product, ...customerPriceForProduct({ basePrice, markupPercentOverride, displayPriceOverride }, settings) })),
    page,
    pageSize,
    total,
    hasMore,
    categoryCounts,
  };
}

export async function getMarketplacePricingSettings() {
  const db = requireDb(await getDb());
  return ensureMarketplacePricingSettings(db);
}

export async function updateMarketplacePricingSettings(input: { defaultMarkupPercent: number; adminUserId: number }) {
  if (!Number.isFinite(input.defaultMarkupPercent) || input.defaultMarkupPercent < -100 || input.defaultMarkupPercent > 500) throw new Error("Default markup must be between -100% and 500%");
  const db = requireDb(await getDb());
  const settings = await ensureMarketplacePricingSettings(db);
  await db.insert(marketplacePricingSettings).values({ id: 1, defaultMarkupPercent: input.defaultMarkupPercent.toFixed(2) }).onDuplicateKeyUpdate({ set: { defaultMarkupPercent: input.defaultMarkupPercent.toFixed(2) } });
  await db.insert(priceChangeHistory).values({
    productId: null,
    adminUserId: input.adminUserId,
    changeType: "global_markup",
    oldValue: settings.defaultMarkupPercent.toFixed(2),
    newValue: input.defaultMarkupPercent.toFixed(2),
    reason: "Global customer markup updated in Super Admin",
  });
  await appendAdminAuditEvent(db, {
    adminUserId: input.adminUserId,
    action: "pricing.global_updated",
    targetType: "marketplace_pricing_settings",
    targetId: 1,
    summary: `Updated default customer markup from ${settings.defaultMarkupPercent}% to ${input.defaultMarkupPercent}%`,
    metadata: { previousMarkupPercent: settings.defaultMarkupPercent, nextMarkupPercent: input.defaultMarkupPercent },
  });
  return getMarketplacePricingSettings();
}

export async function listCatalogPricing(limit = 100) {
  const db = requireDb(await getDb());
  const settings = await ensureMarketplacePricingSettings(db);
  const catalog = await db.select().from(products).orderBy(desc(products.updatedAt)).limit(Math.min(250, Math.max(1, limit)));
  return catalog.map((product) => ({
    id: product.id, name: product.name, slug: product.slug, supplierKey: product.supplierKey, category: product.category, status: product.status,
    supplierBasePrice: Number(product.basePrice),
    markupPercentOverride: product.markupPercentOverride === null ? null : Number(product.markupPercentOverride),
    displayPriceOverride: product.displayPriceOverride === null ? null : Number(product.displayPriceOverride),
    ...customerPriceForProduct(product, settings),
  }));
}

export async function updateCatalogProductPricing(input: { productId: number; markupPercentOverride?: number | null; displayPriceOverride?: number | null; adminUserId: number }) {
  const hasMarkup = input.markupPercentOverride !== undefined && input.markupPercentOverride !== null;
  const hasFixed = input.displayPriceOverride !== undefined && input.displayPriceOverride !== null;
  if (hasMarkup && (!Number.isFinite(input.markupPercentOverride!) || input.markupPercentOverride! < -100 || input.markupPercentOverride! > 500)) throw new Error("Product markup must be between -100% and 500%");
  if (hasFixed && (!Number.isFinite(input.displayPriceOverride!) || input.displayPriceOverride! < 0)) throw new Error("Fixed customer price must be a non-negative number");
  if (hasMarkup && hasFixed) throw new Error("Use either a percentage markup or a fixed customer price, not both");
  const db = requireDb(await getDb());
  const [product] = await db.select({ id: products.id, name: products.name, markupPercentOverride: products.markupPercentOverride, displayPriceOverride: products.displayPriceOverride }).from(products).where(eq(products.id, input.productId)).limit(1);
  if (!product) throw new Error("Catalog product was not found");
  await db.update(products).set({
    markupPercentOverride: hasMarkup ? input.markupPercentOverride!.toFixed(2) : null,
    displayPriceOverride: hasFixed ? input.displayPriceOverride!.toFixed(2) : null,
  }).where(eq(products.id, product.id));
  await db.insert(priceChangeHistory).values({
    productId: product.id,
    adminUserId: input.adminUserId,
    changeType: hasMarkup ? "product_markup" : "product_fixed_price",
    oldValue: JSON.stringify({ markupPercentOverride: product.markupPercentOverride, displayPriceOverride: product.displayPriceOverride }),
    newValue: JSON.stringify({ markupPercentOverride: hasMarkup ? input.markupPercentOverride : null, displayPriceOverride: hasFixed ? input.displayPriceOverride : null }),
    reason: "Product customer price rule updated in Super Admin",
  });
  await appendAdminAuditEvent(db, {
    adminUserId: input.adminUserId,
    action: "pricing.product_updated",
    targetType: "product",
    targetId: product.id,
    summary: `Updated customer price rule for ${product.name}`,
    metadata: {
      previousMarkupPercent: product.markupPercentOverride === null ? null : Number(product.markupPercentOverride),
      previousFixedPrice: product.displayPriceOverride === null ? null : Number(product.displayPriceOverride),
      nextMarkupPercent: hasMarkup ? input.markupPercentOverride : null,
      nextFixedPrice: hasFixed ? input.displayPriceOverride : null,
    },
  });
  return listCatalogPricing();
}

type PricingEngineRuleInput = {
  id?: number;
  ruleName: string;
  scope: PricingRuleScope;
  category?: "top_up" | "gift_card" | "game_key" | "subscription" | "ai_tool" | "software" | "steam" | "steam_top_up" | "telegram_stars" | null;
  productId?: number | null;
  supplierKey?: string | null;
  outputCurrency: string;
  percentageMarkup: number;
  fixedMarkup: number;
  fixedFee: number;
  minimumSellingPrice?: number | null;
  maximumDiscountPercent?: number | null;
  roundingRule: PricingRoundingRule;
  manualPriceOverride?: number | null;
  isActive: boolean;
  reason?: string | null;
  adminUserId: number;
};

function normalisePricingRuleInput(input: PricingEngineRuleInput) {
  const ruleName = input.ruleName.trim().slice(0, 160);
  const outputCurrency = input.outputCurrency.trim().toUpperCase();
  const supplierKey = input.supplierKey?.trim().toLowerCase() || null;
  if (!ruleName) throw new Error("Pricing rule name is required");
  if (!/^[A-Z]{3}$/.test(outputCurrency)) throw new Error("Output currency must be a three-letter code");
  calculatePricingPreview({ supplierCost: 0, exchangeRate: 1, percentageMarkup: input.percentageMarkup, fixedMarkup: input.fixedMarkup, fixedFee: input.fixedFee, minimumSellingPrice: input.minimumSellingPrice, maximumDiscountPercent: input.maximumDiscountPercent, roundingRule: input.roundingRule, manualPriceOverride: input.manualPriceOverride });
  if (input.scope === "global" && (input.category || input.productId || supplierKey)) throw new Error("Global pricing rules cannot be limited to a category, product, or supplier");
  if (input.scope === "category" && !input.category) throw new Error("Category pricing rules require a category");
  if (input.scope === "product" && !input.productId) throw new Error("Product pricing rules require a product");
  if (input.scope === "supplier" && !supplierKey) throw new Error("Supplier pricing rules require a supplier key");
  return { ...input, ruleName, outputCurrency, supplierKey, category: input.scope === "category" ? input.category! : null, productId: input.scope === "product" ? input.productId! : null, minimumSellingPrice: input.minimumSellingPrice ?? null, maximumDiscountPercent: input.maximumDiscountPercent ?? null, manualPriceOverride: input.manualPriceOverride ?? null, reason: input.reason?.trim().slice(0, 500) || null };
}

const numericPricingRule = (rule: typeof pricingRules.$inferSelect) => ({ ...rule, percentageMarkup: Number(rule.percentageMarkup), fixedMarkup: Number(rule.fixedMarkup), fixedFee: Number(rule.fixedFee), minimumSellingPrice: rule.minimumSellingPrice === null ? null : Number(rule.minimumSellingPrice), maximumDiscountPercent: rule.maximumDiscountPercent === null ? null : Number(rule.maximumDiscountPercent), manualPriceOverride: rule.manualPriceOverride === null ? null : Number(rule.manualPriceOverride) });

/** Owner-only configuration; saving a rule never changes a product price. */
export async function listPricingEngineRules() {
  const db = requireDb(await getDb());
  return (await db.select().from(pricingRules).orderBy(desc(pricingRules.updatedAt))).map(numericPricingRule);
}

export async function listPricingEngineProducts(limit = 250) {
  const db = requireDb(await getDb());
  const settings = await ensureMarketplacePricingSettings(db);
  const catalog = await db.select().from(products).orderBy(desc(products.updatedAt)).limit(Math.min(500, Math.max(1, limit)));
  return catalog.map((product) => {
    const supplierCost = product.supplierPrice === null ? Number(product.basePrice) : Number(product.supplierPrice);
    const supplierCurrency = product.supplierCurrency || product.baseCurrency;
    return { id: product.id, name: product.name, category: product.category, supplierKey: product.supplierKey, supplierCost, supplierCurrency, baseCurrency: product.baseCurrency, currentSellingPrice: customerPriceForProduct(product, settings).customerPrice, currentMarkupPercent: product.markupPercentOverride === null ? settings.defaultMarkupPercent : Number(product.markupPercentOverride), currentManualPriceOverride: product.displayPriceOverride === null ? null : Number(product.displayPriceOverride) };
  });
}

export async function previewPricingEngine(input: { supplierCost: number; supplierCurrency: string; outputCurrency: string; exchangeRate?: number | null; percentageMarkup: number; fixedMarkup: number; fixedFee: number; minimumSellingPrice?: number | null; maximumDiscountPercent?: number | null; roundingRule: PricingRoundingRule; manualPriceOverride?: number | null }) {
  const db = requireDb(await getDb());
  const supplierCurrency = input.supplierCurrency.trim().toUpperCase();
  const outputCurrency = input.outputCurrency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(supplierCurrency) || !/^[A-Z]{3}$/.test(outputCurrency)) throw new Error("Use three-letter currencies for the pricing preview");
  const providedRate = input.exchangeRate ?? null;
  const effectiveRate = providedRate === null ? await resolveVamnuxExchangeRate(db, supplierCurrency, outputCurrency) : { rate: providedRate, rateVersionId: null as number | null, source: "preview_manual", sourceLabel: "Admin preview-only rate", effectiveAt: new Date() };
  return { supplierCurrency, outputCurrency, rateVersionId: effectiveRate.rateVersionId, rateSource: effectiveRate.source, rateSourceLabel: effectiveRate.sourceLabel, rateEffectiveAt: effectiveRate.effectiveAt, ...calculatePricingPreview({ supplierCost: input.supplierCost, exchangeRate: effectiveRate.rate, percentageMarkup: input.percentageMarkup, fixedMarkup: input.fixedMarkup, fixedFee: input.fixedFee, minimumSellingPrice: input.minimumSellingPrice, maximumDiscountPercent: input.maximumDiscountPercent, roundingRule: input.roundingRule, manualPriceOverride: input.manualPriceOverride }) };
}

export async function savePricingEngineRule(input: PricingEngineRuleInput) {
  const db = requireDb(await getDb());
  const rule = normalisePricingRuleInput(input);
  if (rule.scope === "product") {
    const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, rule.productId!)).limit(1);
    if (!product) throw new Error("The selected product does not exist");
  }
  if (rule.id) {
    const [existing] = await db.select().from(pricingRules).where(eq(pricingRules.id, rule.id)).limit(1);
    if (!existing) throw new Error("Pricing rule was not found");
    await db.transaction(async (tx) => {
      await tx.update(pricingRules).set({ ruleName: rule.ruleName, scope: rule.scope, category: rule.category, productId: rule.productId, supplierKey: rule.supplierKey, outputCurrency: rule.outputCurrency, percentageMarkup: rule.percentageMarkup.toFixed(2), fixedMarkup: rule.fixedMarkup.toFixed(2), fixedFee: rule.fixedFee.toFixed(2), minimumSellingPrice: rule.minimumSellingPrice === null ? null : rule.minimumSellingPrice.toFixed(2), maximumDiscountPercent: rule.maximumDiscountPercent === null ? null : rule.maximumDiscountPercent.toFixed(2), roundingRule: rule.roundingRule, manualPriceOverride: rule.manualPriceOverride === null ? null : rule.manualPriceOverride.toFixed(2), isActive: rule.isActive, updatedByAdminId: rule.adminUserId }).where(eq(pricingRules.id, existing.id));
      await tx.insert(pricingRuleAuditEvents).values({ pricingRuleId: existing.id, productId: existing.productId, adminUserId: rule.adminUserId, action: "rule_updated", previousPrice: existing.manualPriceOverride, newPrice: rule.manualPriceOverride === null ? null : rule.manualPriceOverride.toFixed(2), previousMarkup: existing.percentageMarkup, newMarkup: rule.percentageMarkup.toFixed(2), reason: rule.reason, metadata: { scope: rule.scope, outputCurrency: rule.outputCurrency, fixedMarkup: rule.fixedMarkup, fixedFee: rule.fixedFee, minimumSellingPrice: rule.minimumSellingPrice, maximumDiscountPercent: rule.maximumDiscountPercent, roundingRule: rule.roundingRule, isActive: rule.isActive } });
      await tx.insert(adminAuditEvents).values({ adminUserId: rule.adminUserId, action: "pricing_engine.rule_updated", targetType: "pricing_rule", targetId: String(existing.id), summary: `Updated pricing rule ${rule.ruleName}`, metadata: { scope: rule.scope, outputCurrency: rule.outputCurrency, percentageMarkup: rule.percentageMarkup } });
    });
    return { id: existing.id, created: false };
  }
  const [created] = await db.transaction(async (tx) => {
    const [newRule] = await tx.insert(pricingRules).values({ ruleName: rule.ruleName, scope: rule.scope, category: rule.category, productId: rule.productId, supplierKey: rule.supplierKey, outputCurrency: rule.outputCurrency, percentageMarkup: rule.percentageMarkup.toFixed(2), fixedMarkup: rule.fixedMarkup.toFixed(2), fixedFee: rule.fixedFee.toFixed(2), minimumSellingPrice: rule.minimumSellingPrice === null ? null : rule.minimumSellingPrice.toFixed(2), maximumDiscountPercent: rule.maximumDiscountPercent === null ? null : rule.maximumDiscountPercent.toFixed(2), roundingRule: rule.roundingRule, manualPriceOverride: rule.manualPriceOverride === null ? null : rule.manualPriceOverride.toFixed(2), isActive: rule.isActive, createdByAdminId: rule.adminUserId, updatedByAdminId: rule.adminUserId }).$returningId();
    if (!newRule) throw new Error("Pricing rule could not be created");
    await tx.insert(pricingRuleAuditEvents).values({ pricingRuleId: newRule.id, productId: rule.productId, adminUserId: rule.adminUserId, action: "rule_created", previousPrice: null, newPrice: rule.manualPriceOverride === null ? null : rule.manualPriceOverride.toFixed(2), previousMarkup: null, newMarkup: rule.percentageMarkup.toFixed(2), reason: rule.reason, metadata: { scope: rule.scope, category: rule.category, supplierKey: rule.supplierKey, outputCurrency: rule.outputCurrency, fixedMarkup: rule.fixedMarkup, fixedFee: rule.fixedFee, minimumSellingPrice: rule.minimumSellingPrice, maximumDiscountPercent: rule.maximumDiscountPercent, roundingRule: rule.roundingRule, isActive: rule.isActive } });
    await tx.insert(adminAuditEvents).values({ adminUserId: rule.adminUserId, action: "pricing_engine.rule_created", targetType: "pricing_rule", targetId: String(newRule.id), summary: `Created pricing rule ${rule.ruleName}`, metadata: { scope: rule.scope, outputCurrency: rule.outputCurrency, percentageMarkup: rule.percentageMarkup } });
    return [newRule];
  });
  return { id: created.id, created: true };
}

/** Explicitly applies a rule only to selected compatible catalog products after the owner confirms. */
export async function applyPricingEngineRule(input: { pricingRuleId: number; productIds: number[]; confirmation: string; reason?: string | null; adminUserId: number }) {
  if (input.confirmation !== "APPLY") throw new Error("Type APPLY to confirm this bounded price update");
  const productIds = Array.from(new Set(input.productIds)).filter((id) => Number.isInteger(id) && id > 0);
  if (!productIds.length || productIds.length > 100) throw new Error("Select between 1 and 100 products for an explicit price application");
  const db = requireDb(await getDb());
  const [rule] = await db.select().from(pricingRules).where(eq(pricingRules.id, input.pricingRuleId)).limit(1);
  if (!rule || !rule.isActive) throw new Error("An active pricing rule is required");
  const selected = await db.select().from(products).where(inArray(products.id, productIds));
  if (selected.length !== productIds.length) throw new Error("One or more selected products are unavailable");
  const settings = await ensureMarketplacePricingSettings(db);
  const reason = input.reason?.trim().slice(0, 500) || null;
  await db.transaction(async (tx) => {
    for (const product of selected) {
      if (rule.scope === "category" && product.category !== rule.category) throw new Error("Selected products must match the rule category");
      if (rule.scope === "product" && product.id !== rule.productId) throw new Error("Selected products must match the product-specific rule");
      if (rule.scope === "supplier" && product.supplierKey !== rule.supplierKey) throw new Error("Selected products must match the supplier-specific rule");
      const supplierCost = product.supplierPrice === null ? Number(product.basePrice) : Number(product.supplierPrice);
      const supplierCurrency = product.supplierCurrency || product.baseCurrency;
      if (supplierCurrency !== rule.outputCurrency || product.baseCurrency !== rule.outputCurrency) throw new Error(`Apply is currently limited to products whose supplier and VAMNUX base currency already equal ${rule.outputCurrency}. Use the preview and configured exchange rate for cross-currency planning; no currency field is changed automatically.`);
      const preview = calculatePricingPreview({ supplierCost, exchangeRate: 1, percentageMarkup: Number(rule.percentageMarkup), fixedMarkup: Number(rule.fixedMarkup), fixedFee: Number(rule.fixedFee), minimumSellingPrice: rule.minimumSellingPrice === null ? null : Number(rule.minimumSellingPrice), maximumDiscountPercent: rule.maximumDiscountPercent === null ? null : Number(rule.maximumDiscountPercent), roundingRule: rule.roundingRule, manualPriceOverride: rule.manualPriceOverride === null ? null : Number(rule.manualPriceOverride) });
      const previousPrice = customerPriceForProduct(product, settings).customerPrice;
      const previousMarkup = product.markupPercentOverride === null ? settings.defaultMarkupPercent : Number(product.markupPercentOverride);
      await tx.update(products).set({ displayPriceOverride: preview.finalSellingPrice.toFixed(2) }).where(eq(products.id, product.id));
      await tx.insert(priceChangeHistory).values({ productId: product.id, adminUserId: input.adminUserId, changeType: "product_fixed_price", oldValue: String(previousPrice), newValue: String(preview.finalSellingPrice), reason: reason || `Confirmed pricing rule ${rule.ruleName}` });
      await tx.insert(pricingRuleAuditEvents).values({ pricingRuleId: rule.id, productId: product.id, adminUserId: input.adminUserId, action: "price_applied", previousPrice: previousPrice.toFixed(2), newPrice: preview.finalSellingPrice.toFixed(2), previousMarkup: previousMarkup.toFixed(2), newMarkup: Number(rule.percentageMarkup).toFixed(2), reason, metadata: { ruleName: rule.ruleName, supplierCost, supplierCurrency, outputCurrency: rule.outputCurrency, convertedCost: preview.convertedCost, fixedMarkup: preview.fixedMarkup, fixedFee: preview.fixedFee, roundingRule: preview.roundingRule, expectedProfit: preview.expectedProfit, expectedProfitPercent: preview.expectedProfitPercent } });
      await tx.insert(pricingRateSnapshots).values({ pricingRuleId: rule.id, productId: product.id, orderId: null, rateVersionId: null, context: "price_application", supplierCost: supplierCost.toFixed(2), supplierCurrency, outputCurrency: rule.outputCurrency, exchangeRate: "1.000000", convertedCost: preview.convertedCost.toFixed(2), rateSource: "identity", sourceLabel: "Supplier and VAMNUX base currency matched" });
    }
    await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: "pricing_engine.price_applied", targetType: "pricing_rule_batch", targetId: `${rule.id}:${productIds.join(",")}`, summary: `Applied pricing rule ${rule.ruleName} to ${selected.length} selected products`, metadata: { pricingRuleId: rule.id, productIds, confirmation: "APPLY" } });
  });
  return { pricingRuleId: rule.id, productCount: selected.length };
}

export async function listPricingEngineAudit(limit = 100) {
  const db = requireDb(await getDb());
  const events = await db.select({ id: pricingRuleAuditEvents.id, pricingRuleId: pricingRuleAuditEvents.pricingRuleId, productId: pricingRuleAuditEvents.productId, productName: products.name, adminName: users.name, action: pricingRuleAuditEvents.action, previousPrice: pricingRuleAuditEvents.previousPrice, newPrice: pricingRuleAuditEvents.newPrice, previousMarkup: pricingRuleAuditEvents.previousMarkup, newMarkup: pricingRuleAuditEvents.newMarkup, reason: pricingRuleAuditEvents.reason, createdAt: pricingRuleAuditEvents.createdAt }).from(pricingRuleAuditEvents).leftJoin(products, eq(pricingRuleAuditEvents.productId, products.id)).leftJoin(users, eq(pricingRuleAuditEvents.adminUserId, users.id)).orderBy(desc(pricingRuleAuditEvents.createdAt)).limit(Math.min(250, Math.max(1, limit)));
  return events.map((event) => ({ ...event, previousPrice: event.previousPrice === null ? null : Number(event.previousPrice), newPrice: event.newPrice === null ? null : Number(event.newPrice), previousMarkup: event.previousMarkup === null ? null : Number(event.previousMarkup), newMarkup: event.newMarkup === null ? null : Number(event.newMarkup) }));
}

export async function bulkUpdateSyncedProductMarkup(input: { productIds: number[]; markupPercent: number; adminUserId: number }) {
  const uniqueProductIds = Array.from(new Set(input.productIds)).filter((id) => Number.isInteger(id) && id > 0);
  if (!uniqueProductIds.length || uniqueProductIds.length > 100) throw new Error("Select between 1 and 100 synchronized products");
  if (!Number.isFinite(input.markupPercent) || input.markupPercent < -100 || input.markupPercent > 500) throw new Error("Bulk markup must be between -100% and 500%");
  const db = requireDb(await getDb());
  const selected = await db.select({ id: products.id, name: products.name, supplierKey: products.supplierKey, markupPercentOverride: products.markupPercentOverride, displayPriceOverride: products.displayPriceOverride })
    .from(products).where(inArray(products.id, uniqueProductIds));
  if (selected.length !== uniqueProductIds.length) throw new Error("One or more selected products are unavailable");
  if (selected.some((product) => !product.supplierKey)) throw new Error("Bulk markup is limited to supplier-synchronized products");
  await db.transaction(async (tx) => {
    for (const product of selected) {
      await tx.update(products).set({ markupPercentOverride: input.markupPercent.toFixed(2), displayPriceOverride: null }).where(eq(products.id, product.id));
      await tx.insert(priceChangeHistory).values({ productId: product.id, adminUserId: input.adminUserId, changeType: "product_markup", oldValue: JSON.stringify({ markupPercentOverride: product.markupPercentOverride, displayPriceOverride: product.displayPriceOverride }), newValue: JSON.stringify({ markupPercentOverride: input.markupPercent, displayPriceOverride: null }), reason: "Bulk markup updated from Product Sync" });
      await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: "pricing.product_bulk_markup_member", targetType: "product", targetId: String(product.id), summary: `Applied bulk customer markup to ${product.name}`, metadata: { markupPercent: input.markupPercent, supplierKey: product.supplierKey } });
    }
    await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: "pricing.product_bulk_markup", targetType: "product_batch", targetId: uniqueProductIds.join(","), summary: `Applied ${input.markupPercent}% customer markup to ${selected.length} synchronized products`, metadata: { productCount: selected.length, productIds: uniqueProductIds, markupPercent: input.markupPercent } });
  });
  return { productCount: selected.length, markupPercent: input.markupPercent };
}

type MarketplaceCategoryInput = {
  slug: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  sortOrder?: number;
  visible?: boolean;
  featured?: boolean;
  status?: "active" | "archived";
};

function normaliseCategorySlug(value: string) {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug || slug.length > 80) throw new Error("Category slug must contain 1–80 lowercase letters, numbers, or hyphens");
  return slug;
}

export const DEFAULT_MARKETPLACE_CATEGORIES = [
  { slug: "game-top-up", name: "Game top-up", sortOrder: 1 },
  { slug: "gift-cards", name: "Gift cards", sortOrder: 2 },
  { slug: "subscriptions", name: "Subscriptions", sortOrder: 3 },
  { slug: "software", name: "Software", sortOrder: 4 },
  { slug: "ai-tools", name: "AI tools", sortOrder: 5 },
  { slug: "games", name: "Games", sortOrder: 6 },
  { slug: "steam-top-up", name: "Steam Top-Up", sortOrder: 7 },
  { slug: "telegram-stars", name: "Telegram Stars", sortOrder: 8 },
] as const;

function marketplaceCategorySlugForProductCategory(category: string) {
  const normalized = category.trim().toLowerCase().replaceAll("_", "-");
  if (normalized === "top-up" || normalized === "game-top-up" || normalized === "game-key") return "game-top-up";
  if (normalized === "gift-card" || normalized === "voucher") return "gift-cards";
  if (normalized === "subscription") return "subscriptions";
  if (normalized === "ai-tool") return "ai-tools";
  if (normalized === "steam") return "games";
  return normalized;
}

/** Ensure the Admin starts with the exact categories already offered in the VAMNUX storefront. */
async function ensureDefaultMarketplaceCategories(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  const existing = await db.select({ slug: marketplaceCategories.slug }).from(marketplaceCategories);
  const existingSlugs = new Set(existing.map((category) => category.slug));
  const missing = DEFAULT_MARKETPLACE_CATEGORIES.filter((category) => !existingSlugs.has(category.slug));
  if (!missing.length) return;
  await db.insert(marketplaceCategories).values(missing.map((category) => ({ ...category, visible: true, featured: false, status: "active" as const })));
}

/** VAMNUX-controlled navigation categories. No supplier or inventory records are created by these operations. */
export async function listMarketplaceCategories(input: { includeArchived?: boolean } = {}) {
  const db = requireDb(await getDb());
  await ensureDefaultMarketplaceCategories(db);
  if (input.includeArchived) return db.select().from(marketplaceCategories).orderBy(marketplaceCategories.sortOrder, marketplaceCategories.name);
  return db.select().from(marketplaceCategories).where(and(eq(marketplaceCategories.status, "active"), eq(marketplaceCategories.visible, true))).orderBy(marketplaceCategories.sortOrder, marketplaceCategories.name);
}

export async function createMarketplaceCategory(input: MarketplaceCategoryInput & { adminUserId: number }) {
  const db = requireDb(await getDb());
  const slug = normaliseCategorySlug(input.slug);
  const name = input.name.trim();
  if (!name || name.length > 120) throw new Error("Category name must contain 1–120 characters");
  const [created] = await db.insert(marketplaceCategories).values({
    slug,
    name,
    description: input.description?.trim() || null,
    imageUrl: input.imageUrl?.trim() || null,
    seoTitle: input.seoTitle?.trim() || null,
    seoDescription: input.seoDescription?.trim() || null,
    sortOrder: input.sortOrder ?? 0,
    visible: input.visible ?? true,
    featured: input.featured ?? false,
    status: input.status ?? "active",
  }).$returningId();
  await appendAdminAuditEvent(db, {
    adminUserId: input.adminUserId,
    action: "catalog.category_created",
    targetType: "marketplace_category",
    targetId: created.id,
    summary: `Created managed category ${name}`,
    metadata: { slug, visible: input.visible ?? true, featured: input.featured ?? false, status: input.status ?? "active" },
  });
  return { id: created.id, slug, name };
}

export async function updateMarketplaceCategory(input: MarketplaceCategoryInput & { id: number; adminUserId: number }) {
  const db = requireDb(await getDb());
  const [existing] = await db.select().from(marketplaceCategories).where(eq(marketplaceCategories.id, input.id)).limit(1);
  if (!existing) throw new Error("Managed category was not found");
  const slug = normaliseCategorySlug(input.slug);
  const name = input.name.trim();
  if (!name || name.length > 120) throw new Error("Category name must contain 1–120 characters");
  await db.update(marketplaceCategories).set({
    slug,
    name,
    description: input.description?.trim() || null,
    imageUrl: input.imageUrl?.trim() || null,
    seoTitle: input.seoTitle?.trim() || null,
    seoDescription: input.seoDescription?.trim() || null,
    sortOrder: input.sortOrder ?? existing.sortOrder,
    visible: input.visible ?? existing.visible,
    featured: input.featured ?? existing.featured,
    status: input.status ?? existing.status,
  }).where(eq(marketplaceCategories.id, existing.id));
  await appendAdminAuditEvent(db, {
    adminUserId: input.adminUserId,
    action: "catalog.category_updated",
    targetType: "marketplace_category",
    targetId: existing.id,
    summary: `Updated managed category ${name}`,
    metadata: { previousSlug: existing.slug, nextSlug: slug, previousStatus: existing.status, nextStatus: input.status ?? existing.status },
  });
  return { id: existing.id, slug, name };
}

export async function reorderMarketplaceCategories(input: { categoryIds: number[]; adminUserId: number }) {
  const categoryIds = Array.from(new Set(input.categoryIds)).filter((id) => Number.isInteger(id) && id > 0);
  if (!categoryIds.length || categoryIds.length > 100) throw new Error("Provide between 1 and 100 unique category identifiers");
  const db = requireDb(await getDb());
  const categories = await db.select({ id: marketplaceCategories.id, name: marketplaceCategories.name, sortOrder: marketplaceCategories.sortOrder }).from(marketplaceCategories).where(inArray(marketplaceCategories.id, categoryIds));
  if (categories.length !== categoryIds.length) throw new Error("One or more categories are unavailable");
  await db.transaction(async (tx) => {
    for (let index = 0; index < categoryIds.length; index += 1) await tx.update(marketplaceCategories).set({ sortOrder: index + 1 }).where(eq(marketplaceCategories.id, categoryIds[index]));
    await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: "catalog.category_reordered", targetType: "marketplace_category_batch", targetId: categoryIds.join(","), summary: `Reordered ${categoryIds.length} marketplace categories`, metadata: { categoryIds } });
  });
  return { categoryCount: categoryIds.length };
}

export async function bulkUpdateMarketplaceCategoryStatus(input: { categoryIds: number[]; action: "hide" | "archive" | "show" | "restore"; adminUserId: number }) {
  const categoryIds = Array.from(new Set(input.categoryIds)).filter((id) => Number.isInteger(id) && id > 0);
  if (!categoryIds.length || categoryIds.length > 100) throw new Error("Select between 1 and 100 categories");
  const db = requireDb(await getDb());
  const categories = await db.select({ id: marketplaceCategories.id, name: marketplaceCategories.name, status: marketplaceCategories.status, visible: marketplaceCategories.visible }).from(marketplaceCategories).where(inArray(marketplaceCategories.id, categoryIds));
  if (categories.length !== categoryIds.length) throw new Error("One or more categories are unavailable");
  const next = input.action === "archive" ? { visible: false, status: "archived" as const } : input.action === "hide" ? { visible: false, status: undefined } : { visible: true, status: "active" as const };
  const actionLabel = input.action === "archive" ? "Archived" : input.action === "hide" ? "Hid" : input.action === "restore" ? "Restored" : "Showed";
  await db.transaction(async (tx) => {
    for (const category of categories) {
      await tx.update(marketplaceCategories).set(next).where(eq(marketplaceCategories.id, category.id));
      await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: `catalog.category_bulk_${input.action}_member`, targetType: "marketplace_category", targetId: String(category.id), summary: `${actionLabel} category ${category.name}`, metadata: { previousStatus: category.status, previousVisible: category.visible } });
    }
    await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: `catalog.category_bulk_${input.action}`, targetType: "marketplace_category_batch", targetId: categoryIds.join(","), summary: `${actionLabel} ${categories.length} marketplace categories`, metadata: { categoryCount: categories.length, categoryIds } });
  });
  return { categoryCount: categories.length, action: input.action };
}

export async function listPriceChangeHistory(limit = 100) {
  const db = requireDb(await getDb());
  return db.select({
    id: priceChangeHistory.id,
    productId: priceChangeHistory.productId,
    productName: products.name,
    adminUserId: priceChangeHistory.adminUserId,
    changeType: priceChangeHistory.changeType,
    oldValue: priceChangeHistory.oldValue,
    newValue: priceChangeHistory.newValue,
    reason: priceChangeHistory.reason,
    createdAt: priceChangeHistory.createdAt,
  }).from(priceChangeHistory).leftJoin(products, eq(priceChangeHistory.productId, products.id))
    .orderBy(desc(priceChangeHistory.createdAt)).limit(Math.min(250, Math.max(1, limit)));
}

type CurrencyConfigurationInput = {
  currencyCode: VamnuxSupportedCurrency;
  active: boolean;
  rateUpdateFrequency: CurrencyRateUpdateFrequency;
  preferredRateSource: CurrencyRateSource;
  approvedSourceLabel?: string | null;
  adminUserId: number;
};

type CurrencyRateVersionInput = {
  baseCurrency: VamnuxSupportedCurrency;
  quoteCurrency: VamnuxSupportedCurrency;
  rate: number;
  bufferPercent: number;
  source: CurrencyRateSource;
  sourceLabel?: string | null;
  rateUpdateFrequency: CurrencyRateUpdateFrequency;
  effectiveAt: Date;
  active: boolean;
  reason?: string | null;
  adminUserId: number;
};

function assertSupportedCurrency(value: string): asserts value is VamnuxSupportedCurrency {
  if (!VAMNUX_SUPPORTED_CURRENCIES.includes(value as VamnuxSupportedCurrency)) throw new Error("VAMNUX supports USD, NGN, EUR, and GBP in this release");
}

async function resolveVamnuxExchangeRate(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, baseCurrencyInput: string, quoteCurrencyInput: string, at = new Date()) {
  const baseCurrency = baseCurrencyInput.trim().toUpperCase();
  const quoteCurrency = quoteCurrencyInput.trim().toUpperCase();
  if (baseCurrency === quoteCurrency) return { rate: 1, rateVersionId: null as number | null, source: "identity", sourceLabel: "Same-currency conversion", effectiveAt: at };
  assertSupportedCurrency(baseCurrency);
  assertSupportedCurrency(quoteCurrency);
  const configs = await db.select({ currencyCode: currencyConfigurations.currencyCode, active: currencyConfigurations.active }).from(currencyConfigurations).where(inArray(currencyConfigurations.currencyCode, [baseCurrency, quoteCurrency]));
  if (configs.some((config) => !config.active)) throw new Error(`Currency conversion is unavailable because ${configs.find((config) => !config.active)?.currencyCode} is inactive`);
  const [version] = await db.select().from(currencyRateVersions).where(and(eq(currencyRateVersions.baseCurrency, baseCurrency), eq(currencyRateVersions.quoteCurrency, quoteCurrency), eq(currencyRateVersions.active, true), lte(currencyRateVersions.effectiveAt, at))).orderBy(desc(currencyRateVersions.effectiveAt), desc(currencyRateVersions.id)).limit(1);
  if (version) return { rate: Number(version.rate) * (1 + Number(version.bufferPercent) / 100), rateVersionId: version.id, source: version.source, sourceLabel: version.sourceLabel, effectiveAt: version.effectiveAt };
  const [legacy] = await db.select().from(exchangeRates).where(and(eq(exchangeRates.baseCurrency, baseCurrency), eq(exchangeRates.quoteCurrency, quoteCurrency), eq(exchangeRates.active, true))).limit(1);
  if (legacy) return { rate: Number(legacy.rate) * (1 + Number(legacy.bufferPercent) / 100), rateVersionId: null as number | null, source: "legacy_manual", sourceLabel: "Existing VAMNUX manual exchange-rate record", effectiveAt: legacy.updatedAt };
  throw new Error(`No active VAMNUX ${baseCurrency}/${quoteCurrency} rate is effective at this time`);
}

/** Lists only VAMNUX's four supported currencies; defaults remain virtual until an owner saves a configuration. */
export async function listCurrencyManagement() {
  const db = requireDb(await getDb());
  const [configs, latestVersions] = await Promise.all([
    db.select().from(currencyConfigurations).orderBy(currencyConfigurations.currencyCode),
    db.select().from(currencyRateVersions).where(eq(currencyRateVersions.active, true)).orderBy(desc(currencyRateVersions.effectiveAt), desc(currencyRateVersions.id)),
  ]);
  const configByCode = new Map(configs.map((config) => [config.currencyCode, config]));
  const currentVersionByPair = new Map<string, typeof latestVersions[number]>();
  for (const version of latestVersions) {
    const pair = `${version.baseCurrency}/${version.quoteCurrency}`;
    if (!currentVersionByPair.has(pair) && version.effectiveAt <= new Date()) currentVersionByPair.set(pair, version);
  }
  return {
    currencies: VAMNUX_SUPPORTED_CURRENCIES.map((currencyCode) => {
      const configured = configByCode.get(currencyCode);
      const definition = CURRENCY_DEFINITIONS[currencyCode];
      return { currencyCode, displayName: configured?.displayName ?? definition.name, symbol: configured?.symbol ?? definition.symbol, active: configured?.active ?? true, rateUpdateFrequency: configured?.rateUpdateFrequency ?? "manual", preferredRateSource: configured?.preferredRateSource ?? "manual", approvedSourceLabel: configured?.approvedSourceLabel ?? null, configured: Boolean(configured), updatedAt: configured?.updatedAt ?? null };
    }),
    currentRates: Array.from(currentVersionByPair.values()).map((version) => ({ ...version, rate: Number(version.rate), bufferPercent: Number(version.bufferPercent), effectiveRate: Number(version.rate) * (1 + Number(version.bufferPercent) / 100) })),
  };
}

export async function saveCurrencyConfiguration(input: CurrencyConfigurationInput) {
  const db = requireDb(await getDb());
  assertSupportedCurrency(input.currencyCode);
  const approvedSourceLabel = input.approvedSourceLabel?.trim().slice(0, 160) || null;
  if (input.preferredRateSource === "approved_external" && !approvedSourceLabel) throw new Error("An approved external source label is required before it can be selected. This release does not connect to the provider automatically.");
  const definition = CURRENCY_DEFINITIONS[input.currencyCode];
  const [previous] = await db.select().from(currencyConfigurations).where(eq(currencyConfigurations.currencyCode, input.currencyCode)).limit(1);
  await db.insert(currencyConfigurations).values({ currencyCode: input.currencyCode, displayName: definition.name, symbol: definition.symbol, active: input.active, rateUpdateFrequency: input.rateUpdateFrequency, preferredRateSource: input.preferredRateSource, approvedSourceLabel, updatedByAdminId: input.adminUserId }).onDuplicateKeyUpdate({ set: { active: input.active, rateUpdateFrequency: input.rateUpdateFrequency, preferredRateSource: input.preferredRateSource, approvedSourceLabel, updatedByAdminId: input.adminUserId } });
  await appendAdminAuditEvent(db, { adminUserId: input.adminUserId, action: previous ? "currency.configuration_updated" : "currency.configuration_created", targetType: "currency", targetId: input.currencyCode, summary: `${previous ? "Updated" : "Configured"} VAMNUX ${input.currencyCode} currency controls`, metadata: { previousActive: previous?.active ?? null, active: input.active, rateUpdateFrequency: input.rateUpdateFrequency, preferredRateSource: input.preferredRateSource, approvedSourceLabel } });
  return listCurrencyManagement();
}

export async function saveCurrencyRateVersion(input: CurrencyRateVersionInput) {
  const db = requireDb(await getDb());
  assertSupportedCurrency(input.baseCurrency);
  assertSupportedCurrency(input.quoteCurrency);
  if (input.baseCurrency === input.quoteCurrency) throw new Error("Choose two different supported currencies");
  if (!Number.isFinite(input.rate) || input.rate <= 0) throw new Error("VAMNUX exchange rate must be greater than zero");
  if (!Number.isFinite(input.bufferPercent) || input.bufferPercent < 0 || input.bufferPercent > 100) throw new Error("Exchange-rate buffer must be between 0% and 100%");
  if (!(input.effectiveAt instanceof Date) || Number.isNaN(input.effectiveAt.getTime())) throw new Error("A valid effective date and time is required");
  const sourceLabel = input.sourceLabel?.trim().slice(0, 160) || null;
  if (input.source === "approved_external" && !sourceLabel) throw new Error("Record the approved external source label. This release stores its metadata only and does not contact the provider.");
  const [previous] = await db.select().from(currencyRateVersions).where(and(eq(currencyRateVersions.baseCurrency, input.baseCurrency), eq(currencyRateVersions.quoteCurrency, input.quoteCurrency), eq(currencyRateVersions.active, true))).orderBy(desc(currencyRateVersions.effectiveAt), desc(currencyRateVersions.id)).limit(1);
  const priorRate = previous ? Number(previous.rate) * (1 + Number(previous.bufferPercent) / 100) : null;
  const nextRate = input.rate * (1 + input.bufferPercent / 100);
  const changePercent = priorRate === null ? null : ((nextRate - priorRate) / priorRate) * 100;
  const [created] = await db.insert(currencyRateVersions).values({ baseCurrency: input.baseCurrency, quoteCurrency: input.quoteCurrency, rate: input.rate.toFixed(6), bufferPercent: input.bufferPercent.toFixed(2), source: input.source, sourceLabel, rateUpdateFrequency: input.rateUpdateFrequency, effectiveAt: input.effectiveAt, active: input.active, supersedesRateVersionId: previous?.id ?? null, createdByAdminId: input.adminUserId, reason: input.reason?.trim().slice(0, 500) || null }).$returningId();
  if (!created) throw new Error("Currency rate version could not be saved");
  await appendAdminAuditEvent(db, { adminUserId: input.adminUserId, action: "currency.rate_version_saved", targetType: "currency_rate_version", targetId: String(created.id), summary: `Saved ${input.baseCurrency}/${input.quoteCurrency} VAMNUX rate version`, metadata: { previousRate: priorRate, nextRate, changePercent, significantChange: changePercent !== null && Math.abs(changePercent) >= MATERIAL_RATE_CHANGE_PERCENT, source: input.source, sourceLabel, effectiveAt: input.effectiveAt.toISOString(), active: input.active } });
  return { id: created.id, previousRate: priorRate, effectiveRate: nextRate, changePercent, significantChange: changePercent !== null && Math.abs(changePercent) >= MATERIAL_RATE_CHANGE_PERCENT };
}

export async function listCurrencyRateHistory(input: { baseCurrency?: VamnuxSupportedCurrency; quoteCurrency?: VamnuxSupportedCurrency; limit?: number } = {}) {
  const db = requireDb(await getDb());
  const conditions = [];
  if (input.baseCurrency) conditions.push(eq(currencyRateVersions.baseCurrency, input.baseCurrency));
  if (input.quoteCurrency) conditions.push(eq(currencyRateVersions.quoteCurrency, input.quoteCurrency));
  const rows = await db.select({ id: currencyRateVersions.id, baseCurrency: currencyRateVersions.baseCurrency, quoteCurrency: currencyRateVersions.quoteCurrency, rate: currencyRateVersions.rate, bufferPercent: currencyRateVersions.bufferPercent, source: currencyRateVersions.source, sourceLabel: currencyRateVersions.sourceLabel, rateUpdateFrequency: currencyRateVersions.rateUpdateFrequency, effectiveAt: currencyRateVersions.effectiveAt, active: currencyRateVersions.active, supersedesRateVersionId: currencyRateVersions.supersedesRateVersionId, reason: currencyRateVersions.reason, createdAt: currencyRateVersions.createdAt, adminName: users.name }).from(currencyRateVersions).leftJoin(users, eq(currencyRateVersions.createdByAdminId, users.id)).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(currencyRateVersions.effectiveAt), desc(currencyRateVersions.id)).limit(Math.min(250, Math.max(1, input.limit ?? 100)));
  return rows.map((row) => ({ ...row, rate: Number(row.rate), bufferPercent: Number(row.bufferPercent), effectiveRate: Number(row.rate) * (1 + Number(row.bufferPercent) / 100) }));
}

export async function previewCurrencyManagement(input: { supplierCost: number; supplierCurrency: VamnuxSupportedCurrency; outputCurrency: VamnuxSupportedCurrency; percentageMarkup: number; fixedMarkup: number; fixedFee: number; minimumSellingPrice?: number | null; maximumDiscountPercent?: number | null; roundingRule: PricingRoundingRule; manualPriceOverride?: number | null; at?: Date }) {
  const db = requireDb(await getDb());
  const rate = await resolveVamnuxExchangeRate(db, input.supplierCurrency, input.outputCurrency, input.at ?? new Date());
  const preview = calculatePricingPreview({ supplierCost: input.supplierCost, exchangeRate: rate.rate, percentageMarkup: input.percentageMarkup, fixedMarkup: input.fixedMarkup, fixedFee: input.fixedFee, minimumSellingPrice: input.minimumSellingPrice, maximumDiscountPercent: input.maximumDiscountPercent, roundingRule: input.roundingRule, manualPriceOverride: input.manualPriceOverride });
  return { supplierCurrency: input.supplierCurrency, outputCurrency: input.outputCurrency, rateVersionId: rate.rateVersionId, rateSource: rate.source, rateSourceLabel: rate.sourceLabel, rateEffectiveAt: rate.effectiveAt, ...preview };
}

export async function listPricingRateSnapshots(limit = 100) {
  const db = requireDb(await getDb());
  const rows = await db.select({ id: pricingRateSnapshots.id, pricingRuleId: pricingRateSnapshots.pricingRuleId, productId: pricingRateSnapshots.productId, productName: products.name, orderId: pricingRateSnapshots.orderId, rateVersionId: pricingRateSnapshots.rateVersionId, context: pricingRateSnapshots.context, supplierCost: pricingRateSnapshots.supplierCost, supplierCurrency: pricingRateSnapshots.supplierCurrency, outputCurrency: pricingRateSnapshots.outputCurrency, exchangeRate: pricingRateSnapshots.exchangeRate, convertedCost: pricingRateSnapshots.convertedCost, rateSource: pricingRateSnapshots.rateSource, sourceLabel: pricingRateSnapshots.sourceLabel, recordedAt: pricingRateSnapshots.recordedAt }).from(pricingRateSnapshots).leftJoin(products, eq(pricingRateSnapshots.productId, products.id)).orderBy(desc(pricingRateSnapshots.recordedAt)).limit(Math.min(250, Math.max(1, limit)));
  return rows.map((row) => ({ ...row, supplierCost: Number(row.supplierCost), exchangeRate: Number(row.exchangeRate), convertedCost: Number(row.convertedCost) }));
}

export async function listExchangeRates() {
  const db = requireDb(await getDb());
  const rows = await db.select().from(exchangeRates).orderBy(exchangeRates.baseCurrency, exchangeRates.quoteCurrency);
  return rows.map((row) => ({ ...row, rate: Number(row.rate), bufferPercent: Number(row.bufferPercent) }));
}

export async function upsertExchangeRate(input: { baseCurrency: string; quoteCurrency: string; rate: number; bufferPercent: number; active: boolean; adminUserId: number }) {
  const baseCurrency = input.baseCurrency.trim().toUpperCase();
  const quoteCurrency = input.quoteCurrency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(baseCurrency) || !/^[A-Z]{3}$/.test(quoteCurrency) || baseCurrency === quoteCurrency) throw new Error("Choose two different three-letter currency codes");
  if (!Number.isFinite(input.rate) || input.rate <= 0) throw new Error("Exchange rate must be greater than zero");
  if (!Number.isFinite(input.bufferPercent) || input.bufferPercent < 0 || input.bufferPercent > 100) throw new Error("Exchange-rate buffer must be between 0% and 100%");
  const db = requireDb(await getDb());
  const [existing] = await db.select().from(exchangeRates).where(and(eq(exchangeRates.baseCurrency, baseCurrency), eq(exchangeRates.quoteCurrency, quoteCurrency))).limit(1);
  const values = { baseCurrency, quoteCurrency, rate: input.rate.toFixed(6), bufferPercent: input.bufferPercent.toFixed(2), source: "manual" as const, active: input.active, updatedByAdminId: input.adminUserId };
  await db.insert(exchangeRates).values(values).onDuplicateKeyUpdate({ set: values });
  await appendAdminAuditEvent(db, {
    adminUserId: input.adminUserId,
    action: existing ? "exchange_rate.updated" : "exchange_rate.created",
    targetType: "exchange_rate",
    targetId: `${baseCurrency}_${quoteCurrency}`,
    summary: `${existing ? "Updated" : "Created"} ${baseCurrency}/${quoteCurrency} manual exchange rate`,
    metadata: { previousRate: existing ? Number(existing.rate) : null, nextRate: input.rate, previousBufferPercent: existing ? Number(existing.bufferPercent) : null, nextBufferPercent: input.bufferPercent, active: input.active },
  });
  return listExchangeRates();
}

/** Storefront presentation settings are additive to supplier catalog records and never replace supplier source data. */
export async function listAdminProductOperations(limit = 10_000) {
  const db = requireDb(await getDb());
  const settings = await ensureMarketplacePricingSettings(db);
  const rows = await db.select({ product: products, attributes: productAdminAttributes }).from(products)
    .leftJoin(productAdminAttributes, eq(products.id, productAdminAttributes.productId))
    .orderBy(desc(products.updatedAt)).limit(Math.min(10_000, Math.max(1, limit)));
  return rows.map(({ product, attributes }) => {
    const price = customerPriceForProduct(product, settings);
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      supplierKey: product.supplierKey,
      category: product.category,
      productStatus: product.status,
      supplierEligible: product.supplierEligible,
      basePrice: Number(product.basePrice),
      baseCurrency: product.baseCurrency,
      displayPrice: price.customerPrice,
      priceRule: price.priceRule,
      storefrontStatus: attributes?.storefrontStatus ?? "visible",
      featured: attributes?.featured ?? false,
      trending: attributes?.trending ?? false,
      bestSeller: attributes?.bestSeller ?? false,
      newProduct: attributes?.newProduct ?? false,
      deal: attributes?.deal ?? false,
      seoTitle: attributes?.seoTitle ?? null,
      seoDescription: attributes?.seoDescription ?? null,
      internalNote: attributes?.internalNote ?? null,
      updatedAt: attributes?.updatedAt ?? product.updatedAt,
    };
  });
}

export async function updateProductAdminAttributes(input: {
  productId: number;
  storefrontStatus: "visible" | "hidden" | "coming_soon";
  featured: boolean;
  trending: boolean;
  bestSeller: boolean;
  newProduct: boolean;
  deal: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  internalNote?: string | null;
  adminUserId: number;
}) {
  const db = requireDb(await getDb());
  const [product] = await db.select({ id: products.id, name: products.name }).from(products).where(eq(products.id, input.productId)).limit(1);
  if (!product) throw new Error("Catalog product was not found");
  const [existing] = await db.select().from(productAdminAttributes).where(eq(productAdminAttributes.productId, product.id)).limit(1);
  const values = {
    productId: product.id,
    storefrontStatus: input.storefrontStatus,
    featured: input.featured,
    trending: input.trending,
    bestSeller: input.bestSeller,
    newProduct: input.newProduct,
    deal: input.deal,
    seoTitle: input.seoTitle?.trim() || null,
    seoDescription: input.seoDescription?.trim() || null,
    internalNote: input.internalNote?.trim() || null,
    updatedByAdminId: input.adminUserId,
  };
  await db.insert(productAdminAttributes).values(values).onDuplicateKeyUpdate({ set: values });
  await db.insert(priceChangeHistory).values({
    productId: product.id,
    adminUserId: input.adminUserId,
    changeType: "product_status",
    oldValue: existing ? JSON.stringify({ storefrontStatus: existing.storefrontStatus, featured: existing.featured, trending: existing.trending, bestSeller: existing.bestSeller, newProduct: existing.newProduct, deal: existing.deal }) : null,
    newValue: JSON.stringify({ storefrontStatus: input.storefrontStatus, featured: input.featured, trending: input.trending, bestSeller: input.bestSeller, newProduct: input.newProduct, deal: input.deal }),
    reason: "Product storefront presentation updated in Super Admin",
  });
  await appendAdminAuditEvent(db, {
    adminUserId: input.adminUserId,
    action: "catalog.product_presentation_updated",
    targetType: "product",
    targetId: product.id,
    summary: `Updated storefront presentation for ${product.name}`,
    metadata: { storefrontStatus: input.storefrontStatus, featured: input.featured, trending: input.trending, bestSeller: input.bestSeller, newProduct: input.newProduct, deal: input.deal },
  });
  return { productId: product.id };
}

export async function bulkUpdateProductStorefrontVisibility(input: { productIds: number[]; storefrontStatus: "visible" | "hidden"; adminUserId: number }) {
  const productIds = Array.from(new Set(input.productIds)).filter((id) => Number.isInteger(id) && id > 0);
  if (!productIds.length || productIds.length > 100) throw new Error("Select between 1 and 100 products");
  const db = requireDb(await getDb());
  const selected = await db.select({ product: products, attributes: productAdminAttributes }).from(products).leftJoin(productAdminAttributes, eq(productAdminAttributes.productId, products.id)).where(inArray(products.id, productIds));
  if (selected.length !== productIds.length) throw new Error("One or more selected products are unavailable");
  await db.transaction(async (tx) => {
    for (const { product, attributes } of selected) {
      const values = { productId: product.id, storefrontStatus: input.storefrontStatus, featured: attributes?.featured ?? false, trending: attributes?.trending ?? false, bestSeller: attributes?.bestSeller ?? false, newProduct: attributes?.newProduct ?? false, deal: attributes?.deal ?? false, seoTitle: attributes?.seoTitle ?? null, seoDescription: attributes?.seoDescription ?? null, internalNote: attributes?.internalNote ?? null, updatedByAdminId: input.adminUserId };
      await tx.insert(productAdminAttributes).values(values).onDuplicateKeyUpdate({ set: values });
      await tx.insert(priceChangeHistory).values({ productId: product.id, adminUserId: input.adminUserId, changeType: "product_status", oldValue: JSON.stringify({ storefrontStatus: attributes?.storefrontStatus ?? "visible" }), newValue: JSON.stringify({ storefrontStatus: input.storefrontStatus }), reason: "Bulk storefront visibility update in Super Admin" });
      await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: "catalog.product_bulk_visibility_member", targetType: "product", targetId: String(product.id), summary: `Set storefront visibility for ${product.name} to ${input.storefrontStatus}`, metadata: { storefrontStatus: input.storefrontStatus } });
    }
    await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: "catalog.product_bulk_visibility", targetType: "product_batch", targetId: productIds.join(","), summary: `Set ${selected.length} product listings to ${input.storefrontStatus}`, metadata: { productCount: selected.length, storefrontStatus: input.storefrontStatus } });
  });
  return { productCount: selected.length, storefrontStatus: input.storefrontStatus };
}

export async function bulkArchiveAdminManagedCatalogProducts(input: { productIds: number[]; adminUserId: number }) {
  const productIds = Array.from(new Set(input.productIds)).filter((id) => Number.isInteger(id) && id > 0);
  if (!productIds.length || productIds.length > 100) throw new Error("Select between 1 and 100 Admin-managed products");
  const db = requireDb(await getDb());
  const selected = await db.select({ id: products.id, name: products.name, supplierKey: products.supplierKey, status: products.status }).from(products).where(inArray(products.id, productIds));
  if (selected.length !== productIds.length || selected.some((product) => product.supplierKey !== ADMIN_MANAGED_SUPPLIER_KEY)) throw new Error("Archive is available only for Admin-managed product listings");
  await db.transaction(async (tx) => {
    for (const product of selected) {
      await tx.update(products).set({ status: "archived", supplierEligible: false }).where(eq(products.id, product.id));
      await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: "catalog.product_bulk_archived_member", targetType: "product", targetId: String(product.id), summary: `Archived Admin-managed product ${product.name}`, metadata: { previousStatus: product.status } });
    }
    await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: "catalog.product_bulk_archived", targetType: "product_batch", targetId: productIds.join(","), summary: `Archived ${selected.length} Admin-managed product listings`, metadata: { productCount: selected.length } });
  });
  return { productCount: selected.length };
}

export async function listSiteContentBlocks() {
  const db = requireDb(await getDb());
  return db.select().from(siteContentBlocks).orderBy(siteContentBlocks.blockType, siteContentBlocks.sortOrder);
}

/** Public projection for intentionally published storefront blocks. Admin notes and unpublished content remain private. */
export async function listPublishedSiteContentBlocks() {
  const db = requireDb(await getDb());
  return db.select({
    blockKey: siteContentBlocks.blockKey,
    blockType: siteContentBlocks.blockType,
    title: siteContentBlocks.title,
    content: siteContentBlocks.content,
    imageUrl: siteContentBlocks.imageUrl,
    ctaLabel: siteContentBlocks.ctaLabel,
    ctaUrl: siteContentBlocks.ctaUrl,
    sortOrder: siteContentBlocks.sortOrder,
    updatedAt: siteContentBlocks.updatedAt,
  }).from(siteContentBlocks).where(eq(siteContentBlocks.status, "published"))
    .orderBy(siteContentBlocks.blockType, siteContentBlocks.sortOrder);
}

export async function upsertSiteContentBlock(input: {
  blockKey: string;
  blockType: "hero_slide" | "banner" | "announcement" | "faq" | "featured_list" | "category_spotlight";
  title?: string | null;
  content?: Record<string, unknown> | null;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  status: "draft" | "published" | "archived";
  sortOrder: number;
  adminUserId: number;
}) {
  const blockKey = input.blockKey.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!blockKey || blockKey.length > 120) throw new Error("Content block key must contain 1–120 letters, numbers, underscores, or hyphens");
  if (input.ctaUrl && !input.ctaUrl.startsWith("/")) throw new Error("Content calls-to-action must use an internal VAMNUX path");
  const db = requireDb(await getDb());
  const [existing] = await db.select({ id: siteContentBlocks.id, status: siteContentBlocks.status }).from(siteContentBlocks).where(eq(siteContentBlocks.blockKey, blockKey)).limit(1);
  const values = { blockKey, blockType: input.blockType, title: input.title?.trim() || null, content: input.content ?? null, imageUrl: input.imageUrl?.trim() || null, ctaLabel: input.ctaLabel?.trim() || null, ctaUrl: input.ctaUrl?.trim() || null, status: input.status, sortOrder: input.sortOrder, updatedByAdminId: input.adminUserId };
  await db.insert(siteContentBlocks).values(values).onDuplicateKeyUpdate({ set: values });
  await appendAdminAuditEvent(db, {
    adminUserId: input.adminUserId,
    action: existing ? "content.block_updated" : "content.block_created",
    targetType: "site_content_block",
    targetId: blockKey,
    summary: `${existing ? "Updated" : "Created"} ${input.blockType} content block ${blockKey}`,
    metadata: { previousStatus: existing?.status ?? null, nextStatus: input.status, sortOrder: input.sortOrder },
  });
  return { blockKey };
}

export async function listSupplierSyncRuns(limit = 100) {
  const db = requireDb(await getDb());
  return db.select().from(supplierSyncRuns).orderBy(desc(supplierSyncRuns.startedAt)).limit(Math.min(250, Math.max(1, limit)));
}

/** Records an already-completed, explicitly initiated read-only catalog operation. It never triggers a supplier request. */
export async function recordCompletedSupplierCatalogSync(input: { supplierKey: string; providerName: string; adminUserId: number; productsAdded?: number; productsUpdated?: number; productsFailed?: number; summary: string }) {
  const db = requireDb(await getDb());
  const [integration] = await db.select({ id: commerceIntegrations.id }).from(commerceIntegrations)
    .where(and(eq(commerceIntegrations.integrationType, "supplier"), eq(commerceIntegrations.providerName, input.providerName))).limit(1);
  await db.insert(supplierSyncRuns).values({
    integrationId: integration?.id ?? null,
    supplierKey: input.supplierKey,
    initiatedByAdminId: input.adminUserId,
    operation: "catalog",
    status: "completed",
    productsAdded: Math.max(0, input.productsAdded ?? 0),
    productsUpdated: Math.max(0, input.productsUpdated ?? 0),
    productsFailed: Math.max(0, input.productsFailed ?? 0),
    summary: input.summary.slice(0, 500),
    completedAt: new Date(),
  });
}

/** Administrative catalog rows have a declared authorised source and never contain supplier credentials. */
export async function listAdminManagedCatalogProducts() {
  const db = requireDb(await getDb());
  return db.select({
    id: products.id,
    name: products.name,
    category: products.category,
    basePrice: products.basePrice,
    baseCurrency: products.baseCurrency,
    regionLabel: products.regionLabel,
    deliveryType: products.deliveryType,
    status: products.status,
    updatedAt: products.updatedAt,
    sourceName: authorizedCatalogSources.displayName,
    sourceType: authorizedCatalogSources.sourceType,
  }).from(products).innerJoin(authorizedCatalogSources, eq(products.catalogSourceId, authorizedCatalogSources.id))
    .where(eq(products.supplierKey, ADMIN_MANAGED_SUPPLIER_KEY))
    .orderBy(desc(products.updatedAt));
}

export async function listAuthorizedCatalogSources() {
  const db = requireDb(await getDb());
  return db.select({
    id: authorizedCatalogSources.id,
    displayName: authorizedCatalogSources.displayName,
    sourceType: authorizedCatalogSources.sourceType,
    commerceIntegrationId: authorizedCatalogSources.commerceIntegrationId,
    agreementReference: authorizedCatalogSources.agreementReference,
    status: authorizedCatalogSources.status,
    createdAt: authorizedCatalogSources.createdAt,
    updatedAt: authorizedCatalogSources.updatedAt,
    integrationName: commerceIntegrations.providerName,
  }).from(authorizedCatalogSources)
    .leftJoin(commerceIntegrations, eq(authorizedCatalogSources.commerceIntegrationId, commerceIntegrations.id))
    .orderBy(desc(authorizedCatalogSources.updatedAt));
}

export async function createAuthorizedCatalogSource(input: AuthorizedCatalogSourceInput) {
  const db = requireDb(await getDb());
  let displayName = input.displayName;
  let commerceIntegrationId: number | null = null;
  if (input.sourceType === "supplier") {
    const [integration] = await db.select().from(commerceIntegrations).where(and(
      eq(commerceIntegrations.id, input.commerceIntegrationId!),
      eq(commerceIntegrations.integrationType, "supplier"),
      eq(commerceIntegrations.syncStatus, "ready"),
    )).limit(1);
    if (!integration) throw new Error("Select a ready configured supplier integration for a supplier source");
    displayName = integration.providerName;
    commerceIntegrationId = integration.id;
  }
  const [existing] = await db.select({ id: authorizedCatalogSources.id }).from(authorizedCatalogSources)
    .where(eq(authorizedCatalogSources.displayName, displayName)).limit(1);
  if (existing) throw new Error("An authorised catalog source already uses this name");

  const [created] = await db.insert(authorizedCatalogSources).values({
    displayName,
    sourceType: input.sourceType,
    commerceIntegrationId,
    agreementReference: input.agreementReference,
    status: "active",
  }).$returningId();
  return { id: created.id, displayName, status: "active" as const };
}

export async function createAdminManagedCatalogProduct(input: AdminManagedCatalogProductInput) {
  const db = requireDb(await getDb());
  const slug = createAdminManagedCatalogSlug(input.category, input.name);
  const [existing] = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
  if (existing) throw new Error("An admin-managed catalog item already uses this name. Update or reactivate the existing item instead.");
  const [source] = await db.select().from(authorizedCatalogSources)
    .where(and(eq(authorizedCatalogSources.id, input.catalogSourceId), eq(authorizedCatalogSources.status, "active"))).limit(1);
  if (!source) throw new Error("Select an active authorised source before saving a catalog item");

  const [created] = await db.insert(products).values({
    slug,
    supplierKey: ADMIN_MANAGED_SUPPLIER_KEY,
    supplierSku: `manual:${slug}`,
    supplierCategory: "admin_managed",
    name: input.name,
    category: input.category,
    description: input.description,
    imageUrl: input.imageUrl?.trim() || null,
    basePrice: input.basePrice.toFixed(2),
    baseCurrency: "USD",
    supplierEligible: input.status === "active",
    catalogSourceId: source.id,
    regionLabel: input.regionLabel || null,
    deliveryType: input.deliveryType,
    requiresPlayerId: false,
    requiresServerId: false,
    inputRequirements: createRecipientEmailRequirement(input.recipientEmailRequired),
    status: input.status,
    metadata: {
      catalogOrigin: "admin_managed",
      authorisedSourceId: source.id,
      authorisedSource: source.displayName,
      sourceType: source.sourceType,
      deliveryMinimumMinutes: input.deliveryMinimumMinutes ?? null,
      deliveryMaximumMinutes: input.deliveryMaximumMinutes ?? null,
      customerRequirements: input.customerRequirements?.trim() || null,
      platform: input.platform?.trim() || null,
      productType: input.productType?.trim() || null,
    },
  }).$returningId();

  return { id: created.id, name: input.name, status: input.status, slug };
}

export async function setAdminManagedCatalogProductStatus(input: { productId: number; status: "active" | "paused" | "archived"; adminUserId: number }) {
  const db = requireDb(await getDb());
  const [product] = await db.select({ id: products.id, name: products.name, status: products.status }).from(products)
    .where(and(eq(products.id, input.productId), eq(products.supplierKey, ADMIN_MANAGED_SUPPLIER_KEY))).limit(1);
  if (!product) throw new Error("Admin-managed catalog item was not found");

  await db.update(products).set({
    status: input.status,
    supplierEligible: input.status === "active",
  }).where(eq(products.id, product.id));
  await appendAdminAuditEvent(db, {
    adminUserId: input.adminUserId,
    action: "catalog.status_updated",
    targetType: "product",
    targetId: product.id,
    summary: `Changed ${product.name} from ${product.status} to ${input.status}`,
    metadata: { previousStatus: product.status, nextStatus: input.status },
  });

  return { productId: product.id, name: product.name, status: input.status };
}

export async function listCommerceIntegrations() {
  const db = requireDb(await getDb());
  return db.select({
    id: commerceIntegrations.id,
    integrationType: commerceIntegrations.integrationType,
    providerName: commerceIntegrations.providerName,
    apiBaseUrl: commerceIntegrations.apiBaseUrl,
    credentialReference: commerceIntegrations.credentialReference,
    publicKeyReference: commerceIntegrations.publicKeyReference,
    webhookSecretReference: commerceIntegrations.webhookSecretReference,
    supportedCurrencies: commerceIntegrations.supportedCurrencies,
    syncStatus: commerceIntegrations.syncStatus,
    lastSyncAt: commerceIntegrations.lastSyncAt,
    lastError: commerceIntegrations.lastError,
    updatedAt: commerceIntegrations.updatedAt,
  }).from(commerceIntegrations).orderBy(desc(commerceIntegrations.updatedAt));
}

function safeStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 40) : [];
}

function managementSupplierId(providerName: string) {
  return providerName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 80);
}

async function supplierCategories(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, supplierId: string) {
  const rows = await db.select({ category: products.category }).from(products).where(eq(products.supplierKey, supplierId)).groupBy(products.category);
  return rows.map((row) => row.category);
}

/** Ensures additive profiles exist for current supplier integrations without changing integrations, products, routing, prices, or credentials. */
export async function ensureSupplierManagementProfiles() {
  const db = requireDb(await getDb());
  const integrations = await db.select({ id: commerceIntegrations.id, providerName: commerceIntegrations.providerName, apiBaseUrl: commerceIntegrations.apiBaseUrl, supportedCurrencies: commerceIntegrations.supportedCurrencies, syncStatus: commerceIntegrations.syncStatus })
    .from(commerceIntegrations).where(eq(commerceIntegrations.integrationType, "supplier"));
  for (const integration of integrations) {
    const supplierId = managementSupplierId(integration.providerName);
    await db.insert(supplierManagementProfiles).values({ integrationId: integration.id, supplierId, supplierName: integration.providerName, websiteUrl: integration.apiBaseUrl, supportedCategories: await supplierCategories(db, supplierId), supportedCurrencies: safeStringList(integration.supportedCurrencies), isActive: integration.syncStatus !== "paused", priority: 100 })
      .onDuplicateKeyUpdate({ set: { integrationId: integration.id } });
  }
}

export async function listSupplierManagement() {
  const db = requireDb(await getDb());
  await ensureSupplierManagementProfiles();
  const profiles = await db.select().from(supplierManagementProfiles).orderBy(supplierManagementProfiles.priority, supplierManagementProfiles.supplierName);
  return Promise.all(profiles.map(async (profile) => {
    const [integration] = profile.integrationId ? await db.select({ apiBaseUrl: commerceIntegrations.apiBaseUrl, credentialReference: commerceIntegrations.credentialReference, supportedCurrencies: commerceIntegrations.supportedCurrencies, syncStatus: commerceIntegrations.syncStatus })
      .from(commerceIntegrations).where(eq(commerceIntegrations.id, profile.integrationId)).limit(1) : [];
    const [performance] = await db.select({ total: sql<number>`count(*)`, successes: sql<number>`sum(case when ${apiRequestLogs.success} = true then 1 else 0 end)`, failures: sql<number>`sum(case when ${apiRequestLogs.success} = false then 1 else 0 end)`, averageResponseMs: sql<number | null>`avg(${apiRequestLogs.responseMs})` })
      .from(apiRequestLogs).where(eq(apiRequestLogs.supplierKey, profile.supplierId));
    const [lastSuccess] = await db.select({ createdAt: apiRequestLogs.createdAt }).from(apiRequestLogs).where(and(eq(apiRequestLogs.supplierKey, profile.supplierId), eq(apiRequestLogs.success, true))).orderBy(desc(apiRequestLogs.createdAt)).limit(1);
    const [lastFailure] = await db.select({ createdAt: apiRequestLogs.createdAt, errorCode: apiRequestLogs.errorCode }).from(apiRequestLogs).where(and(eq(apiRequestLogs.supplierKey, profile.supplierId), eq(apiRequestLogs.success, false))).orderBy(desc(apiRequestLogs.createdAt)).limit(1);
    const [latestBalance] = profile.integrationId ? await db.select({ balance: supplierBalanceObservations.balance, currency: supplierBalanceObservations.currency, observedAt: supplierBalanceObservations.observedAt }).from(supplierBalanceObservations).where(eq(supplierBalanceObservations.integrationId, profile.integrationId)).orderBy(desc(supplierBalanceObservations.observedAt)).limit(1) : [];
    const [latestHealth] = await db.select({ status: supplierHealthChecks.status, detail: supplierHealthChecks.detail, createdAt: supplierHealthChecks.createdAt, responseMs: supplierHealthChecks.responseMs }).from(supplierHealthChecks).where(eq(supplierHealthChecks.supplierProfileId, profile.id)).orderBy(desc(supplierHealthChecks.createdAt)).limit(1);
    const total = Number(performance?.total ?? 0);
    const successes = Number(performance?.successes ?? 0);
    const failures = Number(performance?.failures ?? 0);
    return { id: profile.id, integrationId: profile.integrationId, supplierId: profile.supplierId, supplierName: profile.supplierName, websiteUrl: profile.websiteUrl || integration?.apiBaseUrl || null, supportedCategories: safeStringList(profile.supportedCategories).length ? safeStringList(profile.supportedCategories) : await supplierCategories(db, profile.supplierId), supportedCurrencies: safeStringList(profile.supportedCurrencies).length ? safeStringList(profile.supportedCurrencies) : safeStringList(integration?.supportedCurrencies), isActive: profile.isActive, priority: profile.priority, apiStatus: integration?.syncStatus ?? "not_configured", connectionStatus: latestHealth?.status ?? "not_checked", credentialConfigured: Boolean(integration?.credentialReference), lastSuccessfulRequest: lastSuccess?.createdAt ?? null, lastFailedRequest: lastFailure?.createdAt ?? null, lastFailureCode: lastFailure?.errorCode ?? null, successRate: total ? Math.round((successes / total) * 10_000) / 100 : null, failureRate: total ? Math.round((failures / total) * 10_000) / 100 : null, averageResponseMs: performance?.averageResponseMs == null ? null : Math.round(Number(performance.averageResponseMs)), supplierBalance: latestBalance ? numericValue(latestBalance.balance) : null, supplierBalanceCurrency: latestBalance?.currency ?? null, supplierBalanceObservedAt: latestBalance?.observedAt ?? null, lastHealthCheck: latestHealth ?? null, createdAt: profile.createdAt, updatedAt: profile.updatedAt };
  }));
}

export async function createSupplierManagementProfile(input: { supplierId: string; supplierName: string; websiteUrl?: string | null; supportedCategories: string[]; supportedCurrencies: string[]; isActive: boolean; priority: number; adminUserId: number }) {
  const db = requireDb(await getDb());
  const supplierId = input.supplierId.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  const supplierName = input.supplierName.trim().slice(0, 120);
  if (!supplierId || !supplierName) throw new Error("Supplier ID and supplier name are required");
  const [created] = await db.insert(supplierManagementProfiles).values({ supplierId, supplierName, websiteUrl: input.websiteUrl?.trim() || null, supportedCategories: input.supportedCategories.map((value) => value.trim()).filter(Boolean).slice(0, 40), supportedCurrencies: input.supportedCurrencies.map((value) => value.trim().toUpperCase()).filter((value) => /^[A-Z]{3}$/.test(value)).slice(0, 20), isActive: input.isActive, priority: input.priority }).$returningId();
  if (!created) throw new Error("Supplier management profile could not be created");
  await appendAdminAuditEvent(db, { adminUserId: input.adminUserId, action: "supplier_management.profile_created", targetType: "supplier_profile", targetId: created.id, summary: `Created supplier management profile for ${supplierName}`, metadata: { supplierId, isActive: input.isActive, priority: input.priority } });
  return { id: created.id, supplierId, supplierName };
}

export async function updateSupplierManagementProfile(input: { id: number; supplierName: string; websiteUrl?: string | null; supportedCategories: string[]; supportedCurrencies: string[]; isActive: boolean; priority: number; adminUserId: number }) {
  const db = requireDb(await getDb());
  const [profile] = await db.select({ supplierId: supplierManagementProfiles.supplierId }).from(supplierManagementProfiles).where(eq(supplierManagementProfiles.id, input.id)).limit(1);
  if (!profile) throw new Error("Supplier management profile was not found");
  const supplierName = input.supplierName.trim().slice(0, 120);
  if (!supplierName) throw new Error("Supplier name is required");
  await db.update(supplierManagementProfiles).set({ supplierName, websiteUrl: input.websiteUrl?.trim() || null, supportedCategories: input.supportedCategories.map((value) => value.trim()).filter(Boolean).slice(0, 40), supportedCurrencies: input.supportedCurrencies.map((value) => value.trim().toUpperCase()).filter((value) => /^[A-Z]{3}$/.test(value)).slice(0, 20), isActive: input.isActive, priority: input.priority }).where(eq(supplierManagementProfiles.id, input.id));
  await appendAdminAuditEvent(db, { adminUserId: input.adminUserId, action: "supplier_management.profile_updated", targetType: "supplier_profile", targetId: input.id, summary: `Updated supplier management profile for ${supplierName}`, metadata: { supplierId: profile.supplierId, isActive: input.isActive, priority: input.priority } });
  return { id: input.id, supplierId: profile.supplierId, supplierName };
}

/** Records a server-side configuration readiness test only; it never calls supplier order, balance, payment, fulfilment, or credential endpoints. */
export async function testSupplierManagementConnection(input: { id: number; adminUserId: number }) {
  const db = requireDb(await getDb());
  const [profile] = await db.select().from(supplierManagementProfiles).where(eq(supplierManagementProfiles.id, input.id)).limit(1);
  if (!profile) throw new Error("Supplier management profile was not found");
  const [integration] = profile.integrationId ? await db.select().from(commerceIntegrations).where(eq(commerceIntegrations.id, profile.integrationId)).limit(1) : [];
  const hasEndpoint = Boolean(integration?.apiBaseUrl);
  const hasCredentialReference = Boolean(integration?.credentialReference);
  const status = hasEndpoint && hasCredentialReference && integration?.syncStatus !== "not_configured" ? "passed" as const : "attention" as const;
  const detail = status === "passed" ? "Server-only configuration readiness check passed. No live supplier request or commercial operation was made." : "Supplier configuration needs review. Confirm the protected endpoint and credential reference before any separate live health check.";
  await db.insert(supplierHealthChecks).values({ supplierProfileId: profile.id, integrationId: profile.integrationId, checkType: "configuration", status, responseMs: 0, detail, performedByAdminId: input.adminUserId });
  await appendAdminAuditEvent(db, { adminUserId: input.adminUserId, action: "supplier_management.configuration_test", targetType: "supplier_profile", targetId: profile.id, summary: `Ran safe configuration test for ${profile.supplierName}`, metadata: { supplierId: profile.supplierId, result: status } });
  return { supplierProfileId: profile.id, status, detail };
}

export async function listSuperAdminSupplierBalances() {
  const db = requireDb(await getDb());
  const suppliers = await db.select({ id: commerceIntegrations.id, providerName: commerceIntegrations.providerName, syncStatus: commerceIntegrations.syncStatus, lastSyncAt: commerceIntegrations.lastSyncAt })
    .from(commerceIntegrations).where(eq(commerceIntegrations.integrationType, "supplier")).orderBy(commerceIntegrations.providerName);
  return Promise.all(suppliers.map(async (supplier) => {
    const [latest] = await db.select({ balance: supplierBalanceObservations.balance, currency: supplierBalanceObservations.currency, source: supplierBalanceObservations.source, observedAt: supplierBalanceObservations.observedAt, note: supplierBalanceObservations.note })
      .from(supplierBalanceObservations).where(eq(supplierBalanceObservations.integrationId, supplier.id)).orderBy(desc(supplierBalanceObservations.observedAt)).limit(1);
    const balance = latest ? numericValue(latest.balance) : null;
    return { ...supplier, balance, currency: latest?.currency ?? null, source: latest?.source ?? null, observedAt: latest?.observedAt ?? null, note: latest?.note ?? null, lowBalance: balance !== null && latest?.currency === "USD" && balance <= 5 };
  }));
}

export async function recordSuperAdminSupplierBalance(input: { integrationId: number; balance: number; currency: string; note?: string; adminUserId: number }) {
  const db = requireDb(await getDb());
  const [supplier] = await db.select({ id: commerceIntegrations.id, providerName: commerceIntegrations.providerName }).from(commerceIntegrations).where(and(eq(commerceIntegrations.id, input.integrationId), eq(commerceIntegrations.integrationType, "supplier"))).limit(1);
  if (!supplier) throw new Error("Supplier connector was not found");
  if (!Number.isFinite(input.balance) || input.balance < 0 || input.balance > 1_000_000) throw new Error("Enter a balance between 0 and 1,000,000");
  const currency = input.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Use a three-letter balance currency");
  const note = input.note?.trim().slice(0, 500) || null;
  await db.transaction(async (tx) => {
    await tx.insert(supplierBalanceObservations).values({ integrationId: supplier.id, balance: input.balance.toFixed(2), currency, source: "manual", recordedByAdminId: input.adminUserId, note });
    await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: "supplier.balance_recorded", targetType: "supplier", targetId: String(supplier.id), summary: `Recorded balance observation for ${supplier.providerName}`, metadata: { balance: input.balance, currency, source: "manual", lowBalance: currency === "USD" && input.balance <= 5 } });
  });
  return { integrationId: supplier.id, balance: input.balance, currency };
}

const numericValue = (value: unknown) => Number(value ?? 0);

export async function getSuperAdminOverview() {
  const db = requireDb(await getDb());
  const [[catalog], [customerCount], [orderCount], [walletEntryCount], [pendingFundingCount], suppliers, recentAudit] = await Promise.all([
    db.select({ total: sql<number>`count(*)`, active: sql<number>`sum(case when ${products.status} = 'active' then 1 else 0 end)`, paused: sql<number>`sum(case when ${products.status} = 'paused' then 1 else 0 end)` }).from(products),
    db.select({ total: sql<number>`count(*)` }).from(users).where(eq(users.role, "user")),
    db.select({ total: sql<number>`count(*)` }).from(orders),
    db.select({ total: sql<number>`count(*)` }).from(walletEntries),
    db.select({ total: sql<number>`count(*)` }).from(walletFundingAttempts).where(eq(walletFundingAttempts.status, "pending")),
    db.select({ id: commerceIntegrations.id, providerName: commerceIntegrations.providerName, syncStatus: commerceIntegrations.syncStatus, lastSyncAt: commerceIntegrations.lastSyncAt, lastError: commerceIntegrations.lastError }).from(commerceIntegrations).where(eq(commerceIntegrations.integrationType, "supplier")).orderBy(desc(commerceIntegrations.updatedAt)),
    listSuperAdminAuditEvents(6),
  ]);
  return {
    metrics: {
      totalProducts: numericValue(catalog?.total),
      activeProducts: numericValue(catalog?.active),
      pausedProducts: numericValue(catalog?.paused),
      customers: numericValue(customerCount?.total),
      orders: numericValue(orderCount?.total),
      walletEntries: numericValue(walletEntryCount?.total),
      pendingFundingRequests: numericValue(pendingFundingCount?.total),
    },
    suppliers,
    recentAudit,
  };
}

export async function listSuperAdminCustomers(limit = 100) {
  const db = requireDb(await getDb());
  const customerRows = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
    username: customerProfiles.username,
    preferredCurrency: customerProfiles.preferredCurrency,
    countryCode: customerProfiles.countryCode,
    registrationSource: customerProfiles.registrationSource,
    accountStatus: customerProfiles.accountStatus,
    suspensionReason: customerProfiles.suspensionReason,
    suspendedUntil: customerProfiles.suspendedUntil,
    suspensionAppeal: customerProfiles.suspensionAppeal,
    appealSubmittedAt: customerProfiles.appealSubmittedAt,
  }).from(users).leftJoin(customerProfiles, eq(users.id, customerProfiles.userId)).orderBy(desc(users.createdAt)).limit(limit);
  const customerIds = customerRows.map((customer) => customer.id);
  if (!customerIds.length) return [];
  const [walletRows, orderRows, transactionRows] = await Promise.all([
    db.select({ userId: wallets.userId, id: wallets.id, availableBalance: wallets.availableBalance, currency: wallets.currency, status: wallets.status }).from(wallets).where(inArray(wallets.userId, customerIds)),
    db.select({ userId: orders.userId, total: orders.total, currency: orders.currency, paymentStatus: orders.paymentStatus, createdAt: orders.createdAt }).from(orders).where(inArray(orders.userId, customerIds)),
    db.select({ userId: wallets.userId, entryId: walletEntries.id }).from(walletEntries).innerJoin(wallets, eq(walletEntries.walletId, wallets.id)).where(inArray(wallets.userId, customerIds)),
  ]);
  const walletByUser = new Map(walletRows.map((wallet) => [wallet.userId, wallet]));
  const ordersByUser = new Map<number, typeof orderRows>();
  orderRows.forEach((order) => ordersByUser.set(order.userId, [...(ordersByUser.get(order.userId) ?? []), order]));
  const transactionCountByUser = new Map<number, number>();
  transactionRows.forEach((transaction) => transactionCountByUser.set(transaction.userId, (transactionCountByUser.get(transaction.userId) ?? 0) + 1));
  return customerRows.map((customer) => {
    const wallet = walletByUser.get(customer.id);
    const customerOrders = ordersByUser.get(customer.id) ?? [];
    const paidOrders = customerOrders.filter((order) => order.paymentStatus === "paid");
    const spendCurrencies = Array.from(new Set(paidOrders.map((order) => order.currency)));
    const lastPurchaseAt = paidOrders.reduce<Date | null>((latest, order) => !latest || new Date(order.createdAt) > latest ? new Date(order.createdAt) : latest, null);
    return {
      ...customer,
      walletBalance: wallet ? numericValue(wallet.availableBalance) : null,
      walletCurrency: wallet?.currency ?? null,
      walletStatus: wallet?.status ?? "inactive",
      totalOrders: customerOrders.length,
      paidOrderCount: paidOrders.length,
      settledSpend: spendCurrencies.length <= 1 ? paidOrders.reduce((sum, order) => sum + numericValue(order.total), 0) : null,
      spendCurrency: spendCurrencies.length === 1 ? spendCurrencies[0] : spendCurrencies.length > 1 ? "MULTI" : wallet?.currency ?? "USD",
      lastPurchaseAt,
      transactionCount: transactionCountByUser.get(customer.id) ?? 0,
    };
  });
}

/** Owner-only customer operations detail. It intentionally excludes passwords, sessions, credentials, provider references, and free-text private messages. */
export async function getSuperAdminCustomerControlDetail(userId: number) {
  const db = requireDb(await getDb());
  const [customer] = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn, username: customerProfiles.username, phone: customerProfiles.phone, countryCode: customerProfiles.countryCode, preferredCurrency: customerProfiles.preferredCurrency, registrationSource: customerProfiles.registrationSource, accountStatus: customerProfiles.accountStatus, suspensionReason: customerProfiles.suspensionReason, suspendedUntil: customerProfiles.suspendedUntil, suspensionAppeal: customerProfiles.suspensionAppeal, appealSubmittedAt: customerProfiles.appealSubmittedAt }).from(users).leftJoin(customerProfiles, eq(users.id, customerProfiles.userId)).where(eq(users.id, userId)).limit(1);
  if (!customer) throw new Error("Customer account was not found");
  const [wallet] = await db.select({ id: wallets.id, availableBalance: wallets.availableBalance, currency: wallets.currency, status: wallets.status, updatedAt: wallets.updatedAt }).from(wallets).where(eq(wallets.userId, userId)).limit(1);
  const [customerOrders, securityEvents, tickets] = await Promise.all([
    db.select({ orderCode: orders.orderCode, status: orders.status, paymentStatus: orders.paymentStatus, supplierStatus: orders.supplierStatus, total: orders.total, currency: orders.currency, createdAt: orders.createdAt, updatedAt: orders.updatedAt }).from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt)).limit(25),
    db.select({ eventType: customerSecurityEvents.eventType, summary: customerSecurityEvents.summary, createdAt: customerSecurityEvents.createdAt }).from(customerSecurityEvents).where(eq(customerSecurityEvents.userId, userId)).orderBy(desc(customerSecurityEvents.createdAt)).limit(20),
    db.select({ ticketCode: supportTickets.ticketCode, category: supportTickets.category, subject: supportTickets.subject, status: supportTickets.status, updatedAt: supportTickets.updatedAt }).from(supportTickets).where(eq(supportTickets.userId, userId)).orderBy(desc(supportTickets.updatedAt)).limit(20),
  ]);
  const transactions = wallet ? await db.select({ direction: walletEntries.direction, entryType: walletEntries.entryType, amount: walletEntries.amount, currency: walletEntries.currency, status: walletEntries.status, createdAt: walletEntries.createdAt }).from(walletEntries).where(eq(walletEntries.walletId, wallet.id)).orderBy(desc(walletEntries.createdAt)).limit(25) : [];
  return { customer, wallet: wallet ? { balance: numericValue(wallet.availableBalance), currency: wallet.currency, status: wallet.status, updatedAt: wallet.updatedAt } : null, orders: customerOrders, transactions: transactions.map((transaction) => ({ ...transaction, amount: numericValue(transaction.amount) })), securityEvents, tickets };
}

export async function suspendCustomerAccount(input: { userId: number; reason: string; suspendedUntil?: Date | null; adminUserId: number }) {
  const db = requireDb(await getDb());
  const [customer] = await db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(eq(users.id, input.userId)).limit(1);
  if (!customer) throw new Error("Customer account was not found");
  if (customer.role === "admin") throw new Error("Admin accounts cannot be suspended from this workspace");
  const reason = input.reason.trim().slice(0, 500);
  if (reason.length < 3) throw new Error("Provide a clear suspension reason");
  await ensureCustomerAccountRows(db, customer.id);
  await db.transaction(async (tx) => {
    await tx.update(customerProfiles).set({ accountStatus: "suspended", suspensionReason: reason, suspendedUntil: input.suspendedUntil ?? null, suspensionAppeal: null, appealSubmittedAt: null }).where(eq(customerProfiles.userId, customer.id));
    await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: "customer.suspended", targetType: "customer", targetId: String(customer.id), summary: `Suspended customer ${customer.name || `#${customer.id}`}`, metadata: { reason, suspendedUntil: input.suspendedUntil?.toISOString() ?? null } });
  });
  return { userId: customer.id, accountStatus: "suspended" as const };
}

/** Enforces customer account restrictions for all customer-facing marketplace actions. Admin accounts are never restricted by this guard. */
export async function assertCustomerAccountActive(userId: number) {
  const db = requireDb(await getDb());
  const [account] = await db.select({ role: users.role, accountStatus: customerProfiles.accountStatus, suspendedUntil: customerProfiles.suspendedUntil }).from(users).leftJoin(customerProfiles, eq(users.id, customerProfiles.userId)).where(eq(users.id, userId)).limit(1);
  if (!account || account.role === "admin" || account.accountStatus !== "suspended") return;
  if (account.suspendedUntil && account.suspendedUntil <= new Date()) {
    await db.update(customerProfiles).set({ accountStatus: "active", suspensionReason: null, suspendedUntil: null }).where(eq(customerProfiles.userId, userId));
    return;
  }
  throw new Error("This customer account is suspended. Contact support if you believe this is an error.");
}

export async function reinstateCustomerAccount(input: { userId: number; decisionNote?: string; adminUserId: number }) {
  const db = requireDb(await getDb());
  const [customer] = await db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(eq(users.id, input.userId)).limit(1);
  if (!customer) throw new Error("Customer account was not found");
  if (customer.role === "admin") throw new Error("Admin accounts do not require reinstatement");
  await ensureCustomerAccountRows(db, customer.id);
  const decisionNote = input.decisionNote?.trim().slice(0, 500) || null;
  await db.transaction(async (tx) => {
    await tx.update(customerProfiles).set({ accountStatus: "active", suspensionReason: null, suspendedUntil: null, suspensionAppeal: null, appealSubmittedAt: null }).where(eq(customerProfiles.userId, customer.id));
    await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: "customer.reinstated", targetType: "customer", targetId: String(customer.id), summary: `Reinstated customer ${customer.name || `#${customer.id}`}`, metadata: { decisionNote } });
  });
  return { userId: customer.id, accountStatus: "active" as const };
}

export async function listSuperAdminOrders(limit = 100) {
  const db = requireDb(await getDb());
  return db.select({
    id: orders.id,
    orderCode: orders.orderCode,
    status: orders.status,
    paymentStatus: orders.paymentStatus,
    supplierStatus: orders.supplierStatus,
    currency: orders.currency,
    total: orders.total,
    createdAt: orders.createdAt,
    updatedAt: orders.updatedAt,
    supplierOrderId: orders.supplierOrderId,
    supplierIntegrationId: orders.supplierIntegrationId,
    customerId: users.id,
    customerName: users.name,
    customerEmail: users.email,
  }).from(orders).leftJoin(users, eq(orders.userId, users.id)).orderBy(desc(orders.createdAt)).limit(limit);
}

/** Owner-only queue for personally fulfilled VAMNUX catalog items. Supplier/API records are not queried or changed here. */
export async function listSuperAdminManualDeliveryTasks(limit = 200) {
  const db = requireDb(await getDb());
  const rows = await db.select({
    id: manualDeliveryTasks.id, status: manualDeliveryTasks.status,
    deliveryMinimumMinutes: manualDeliveryTasks.deliveryMinimumMinutes, deliveryMaximumMinutes: manualDeliveryTasks.deliveryMaximumMinutes,
    customerStatusNote: manualDeliveryTasks.customerStatusNote, internalNote: manualDeliveryTasks.internalNote,
    startedAt: manualDeliveryTasks.startedAt, completedAt: manualDeliveryTasks.completedAt, failedAt: manualDeliveryTasks.failedAt,
    createdAt: manualDeliveryTasks.createdAt, updatedAt: manualDeliveryTasks.updatedAt,
    orderId: orders.id, orderCode: orders.orderCode, orderStatus: orders.status, paymentStatus: orders.paymentStatus, currency: orders.currency, orderTotal: orders.total,
    productName: orderItems.productName, quantity: orderItems.quantity,
    customerId: users.id, customerName: users.name, customerEmail: users.email, customerCountryCode: customerProfiles.countryCode,
  }).from(manualDeliveryTasks)
    .innerJoin(orders, eq(manualDeliveryTasks.orderId, orders.id))
    .innerJoin(orderItems, eq(manualDeliveryTasks.orderItemId, orderItems.id))
    .leftJoin(users, eq(manualDeliveryTasks.userId, users.id))
    .leftJoin(customerProfiles, eq(manualDeliveryTasks.userId, customerProfiles.userId))
    .orderBy(desc(manualDeliveryTasks.updatedAt)).limit(limit);
  return rows.map((row) => ({ ...row, deliveryWindow: formatManualDeliveryWindow(row.deliveryMinimumMinutes, row.deliveryMaximumMinutes) }));
}

export async function updateSuperAdminManualDeliveryTask(input: { taskId: number; status: ManualDeliveryStatus; customerStatusNote?: string | null; internalNote?: string | null; adminUserId: number }) {
  const db = requireDb(await getDb());
  const [task] = await db.select({ id: manualDeliveryTasks.id, status: manualDeliveryTasks.status, orderId: manualDeliveryTasks.orderId, productId: manualDeliveryTasks.productId, orderCode: orders.orderCode, paymentStatus: orders.paymentStatus, productName: orderItems.productName })
    .from(manualDeliveryTasks).innerJoin(orders, eq(manualDeliveryTasks.orderId, orders.id)).innerJoin(orderItems, eq(manualDeliveryTasks.orderItemId, orderItems.id))
    .where(eq(manualDeliveryTasks.id, input.taskId)).limit(1);
  if (!task) throw new Error("Manual delivery task was not found");
  const currentStatus = task.status as ManualDeliveryStatus;
  if (currentStatus !== input.status && !isManualDeliveryTransitionAllowed(currentStatus, input.status)) throw new Error(`Manual delivery cannot move from ${currentStatus.replaceAll("_", " ")} to ${input.status.replaceAll("_", " ")}.`);
  if (currentStatus === "pending_payment" && input.status === "pending_review" && task.paymentStatus !== "paid") throw new Error("A manual delivery task can enter review only after its VAMNUX payment status is recorded as paid.");
  const now = new Date();
  const customerStatusNote = input.customerStatusNote?.trim().slice(0, 500) || null;
  const internalNote = input.internalNote?.trim().slice(0, 1000) || null;
  await db.transaction(async (tx) => {
    await tx.update(manualDeliveryTasks).set({ status: input.status, customerStatusNote, internalNote, updatedByAdminId: input.adminUserId, startedAt: input.status === "in_progress" ? now : undefined, completedAt: input.status === "completed" ? now : undefined, failedAt: input.status === "failed" ? now : undefined }).where(eq(manualDeliveryTasks.id, task.id));
    await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: "manual_delivery.task_updated", targetType: "manual_delivery_task", targetId: String(task.id), summary: `Changed manual delivery ${task.orderCode} · ${task.productName} from ${currentStatus.replaceAll("_", " ")} to ${input.status.replaceAll("_", " ")}`, metadata: { orderId: task.orderId, productId: task.productId, previousStatus: currentStatus, nextStatus: input.status, customerStatusNote } });
  });
  return { taskId: task.id, status: input.status };
}

/** Cancellation is limited to unfunded, unsent drafts; it cannot reverse a payment, supplier action, or delivery. */
export async function cancelSuperAdminDraftOrder(input: { orderId: number; adminUserId: number; reason: string }) {
  const db = requireDb(await getDb());
  const [order] = await db.select({ id: orders.id, orderCode: orders.orderCode, status: orders.status, paymentStatus: orders.paymentStatus, supplierStatus: orders.supplierStatus, walletEntryId: orders.walletEntryId })
    .from(orders).where(eq(orders.id, input.orderId)).limit(1);
  if (!order) throw new Error("Order was not found");
  if (!(order.status === "draft" || order.status === "pending_payment") || order.paymentStatus !== "unpaid" || order.supplierStatus !== "not_sent" || order.walletEntryId !== null) throw new Error("Only unfunded, unsent draft orders can be cancelled here. This control cannot reverse a payment, supplier action, or delivery.");
  const reason = input.reason.trim().slice(0, 500);
  if (reason.length < 3) throw new Error("Provide a clear review reason before cancelling an order.");
  await db.transaction(async (tx) => {
    await tx.update(orders).set({ status: "cancelled" }).where(eq(orders.id, order.id));
    await tx.update(manualDeliveryTasks).set({ status: "cancelled", customerStatusNote: "Order cancelled before payment or delivery.", updatedByAdminId: input.adminUserId }).where(and(eq(manualDeliveryTasks.orderId, order.id), eq(manualDeliveryTasks.status, "pending_payment")));
    await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: "order.cancelled_before_processing", targetType: "order", targetId: String(order.id), summary: `Cancelled unfunded unsent order ${order.orderCode}`, metadata: { reason } });
  });
  return { id: order.id, status: "cancelled" as const };
}

export async function listSuperAdminSupportTickets(limit = 100) {
  const db = requireDb(await getDb());
  return db.select({
    ticketCode: supportTickets.ticketCode,
    category: supportTickets.category,
    subject: supportTickets.subject,
    status: supportTickets.status,
    orderId: supportTickets.orderId,
    createdAt: supportTickets.createdAt,
    updatedAt: supportTickets.updatedAt,
    customerId: users.id,
    customerName: users.name,
    customerEmail: users.email,
    customerUsername: customerProfiles.username,
    customerCountryCode: customerProfiles.countryCode,
  }).from(supportTickets)
    .leftJoin(users, eq(supportTickets.userId, users.id))
    .leftJoin(customerProfiles, eq(supportTickets.userId, customerProfiles.userId))
    .orderBy(desc(supportTickets.updatedAt)).limit(limit);
}

export async function getSuperAdminSupportTicket(ticketCode: string) {
  const db = requireDb(await getDb());
  const [ticket] = await db.select({
    id: supportTickets.id,
    ticketCode: supportTickets.ticketCode,
    userId: supportTickets.userId,
    category: supportTickets.category,
    subject: supportTickets.subject,
    status: supportTickets.status,
    orderId: supportTickets.orderId,
    createdAt: supportTickets.createdAt,
    updatedAt: supportTickets.updatedAt,
    customerName: users.name,
    customerEmail: users.email,
  }).from(supportTickets).leftJoin(users, eq(supportTickets.userId, users.id)).where(eq(supportTickets.ticketCode, ticketCode)).limit(1);
  if (!ticket) throw new Error("Support ticket not found.");
  const messages = await db.select({ id: supportTicketMessages.id, authorUserId: supportTicketMessages.authorUserId, authorRole: supportTicketMessages.authorRole, body: supportTicketMessages.body, createdAt: supportTicketMessages.createdAt })
    .from(supportTicketMessages).where(eq(supportTicketMessages.ticketId, ticket.id)).orderBy(supportTicketMessages.createdAt);
  return { ticket, messages };
}

export async function replyToSuperAdminSupportTicket(input: { adminUserId: number; ticketCode: string; message: string; status: "processing" | "waiting_for_customer" | "resolved" | "closed" }) {
  const db = requireDb(await getDb());
  const message = input.message.trim().slice(0, 5000);
  if (!message) throw new Error("A support reply is required.");
  const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.ticketCode, input.ticketCode)).limit(1);
  if (!ticket) throw new Error("Support ticket not found.");
  await db.transaction(async (tx) => {
    await tx.insert(supportTicketMessages).values({ ticketId: ticket.id, authorUserId: input.adminUserId, authorRole: "admin", body: message });
    await tx.update(supportTickets).set({ status: input.status }).where(eq(supportTickets.id, ticket.id));
    await tx.insert(customerNotifications).values({ userId: ticket.userId, category: "support", title: "VAMNUX Support replied", body: `Ticket ${ticket.ticketCode} has a new support response.`, actionUrl: "/account" });
    await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: "support_ticket.replied", targetType: "support_ticket", targetId: ticket.ticketCode, summary: `Replied to support ticket ${ticket.ticketCode}`, metadata: { status: input.status } });
  });
  return { ticketCode: ticket.ticketCode, status: input.status };
}

export async function listSuperAdminWalletFundingRequests(limit = 100) {
  const db = requireDb(await getDb());
  return db.select({
    fundingCode: walletFundingAttempts.fundingCode,
    userId: walletFundingAttempts.userId,
    walletId: walletFundingAttempts.walletId,
    amount: walletFundingAttempts.amount,
    currency: walletFundingAttempts.currency,
    status: walletFundingAttempts.status,
    providerReference: walletFundingAttempts.providerReference,
    createdAt: walletFundingAttempts.createdAt,
    settledAt: walletFundingAttempts.settledAt,
    customerName: users.name,
    customerEmail: users.email,
  }).from(walletFundingAttempts).leftJoin(users, eq(walletFundingAttempts.userId, users.id)).orderBy(desc(walletFundingAttempts.createdAt)).limit(limit);
}

export async function listSuperAdminAuditEvents(limit = 100) {
  const db = requireDb(await getDb());
  return db.select({
    id: adminAuditEvents.id,
    action: adminAuditEvents.action,
    targetType: adminAuditEvents.targetType,
    targetId: adminAuditEvents.targetId,
    summary: adminAuditEvents.summary,
    metadata: adminAuditEvents.metadata,
    createdAt: adminAuditEvents.createdAt,
    adminUserId: adminAuditEvents.adminUserId,
    adminName: users.name,
    adminEmail: users.email,
  }).from(adminAuditEvents).leftJoin(users, eq(adminAuditEvents.adminUserId, users.id)).orderBy(desc(adminAuditEvents.createdAt)).limit(limit);
}

export async function getSuperAdminSystemHealth() {
  const db = requireDb(await getDb());
  const supplierRows = await db.select({ providerName: commerceIntegrations.providerName, syncStatus: commerceIntegrations.syncStatus, lastSyncAt: commerceIntegrations.lastSyncAt, lastError: commerceIntegrations.lastError })
    .from(commerceIntegrations).where(eq(commerceIntegrations.integrationType, "supplier")).orderBy(desc(commerceIntegrations.updatedAt));
  return {
    database: { status: "operational" as const, detail: "Managed marketplace database is reachable." },
    payments: { status: "paused" as const, detail: "No payment gateway is active." },
    walletFunding: { status: "manual_review" as const, detail: "Customer top-up requests use Super Admin verification only; no payment-provider checkout is active." },
    supplierOrdering: { status: "paused" as const, detail: "Supplier ordering and fulfilment remain disabled." },
    suppliers: supplierRows.map((supplier) => ({
      ...supplier,
      status: supplier.syncStatus === "ready" ? "operational" as const : supplier.syncStatus === "error" ? "attention" as const : "paused" as const,
      detail: supplier.syncStatus === "ready" ? "Catalog connector configured for approved read-only operations." : supplier.syncStatus === "paused" ? "Catalog connector is paused by policy." : supplier.syncStatus === "error" ? (supplier.lastError || "Catalog connector requires review.") : "Catalog connector is not configured for active operations.",
    })),
  };
}

export async function getSupplierSyncStatus(providerName: string) {
  const db = requireDb(await getDb());
  const [integration] = await db.select({ syncStatus: commerceIntegrations.syncStatus }).from(commerceIntegrations)
    .where(and(eq(commerceIntegrations.integrationType, "supplier"), eq(commerceIntegrations.providerName, providerName))).limit(1);
  return integration?.syncStatus ?? null;
}

export function canRunSupplierCatalogSync(syncStatus: "not_configured" | "ready" | "paused" | "error" | null) {
  return syncStatus !== "paused";
}

export async function configureCommerceIntegration(input: {
  integrationType: "supplier" | "payment";
  providerName: string;
  apiBaseUrl?: string;
  credentialReference?: string;
  publicKeyReference?: string;
  webhookSecretReference?: string;
  supportedCurrencies?: string[];
  syncStatus: "not_configured" | "ready" | "paused" | "error";
}) {
  const db = requireDb(await getDb());
  await db.insert(commerceIntegrations).values({
    ...input,
    supportedCurrencies: input.supportedCurrencies,
  }).onDuplicateKeyUpdate({
    set: {
      apiBaseUrl: input.apiBaseUrl,
      credentialReference: input.credentialReference,
      publicKeyReference: input.publicKeyReference,
      webhookSecretReference: input.webhookSecretReference,
      supportedCurrencies: input.supportedCurrencies,
      syncStatus: input.syncStatus,
    },
  });
  return listCommerceIntegrations();
}

export async function upsertSupplierCatalogRows(input: { supplierKey: string; rows: SupplierCatalogRow[] }) {
  const db = requireDb(await getDb());
  assertSupplierCatalogRowScope(input.supplierKey, input.rows);
  for (const row of input.rows) {
    await db.insert(products).values({
      slug: row.slug,
      supplierKey: input.supplierKey,
      supplierSku: row.supplierSku,
      supplierCategory: row.supplierCategory,
      name: row.name,
      category: row.category,
      description: row.description,
      imageUrl: row.imageUrl,
      regionLabel: row.regionLabel,
      basePrice: row.basePrice,
      baseCurrency: row.baseCurrency,
      supplierPrice: row.supplierPrice,
      supplierCurrency: row.supplierCurrency,
      supplierOfferId: row.supplierOfferId,
      supplierUpdatedAt: row.supplierUpdatedAt,
      supplierEligible: row.supplierEligible,
      deliveryType: row.deliveryType,
      requiresPlayerId: row.requiresPlayerId,
      requiresServerId: row.requiresServerId,
      inputRequirements: row.inputRequirements,
      status: row.status,
      metadata: row.metadata,
    }).onDuplicateKeyUpdate({
      set: {
        slug: row.slug,
        supplierCategory: row.supplierCategory,
        name: row.name,
        category: row.category,
        description: row.description,
        imageUrl: row.imageUrl,
        regionLabel: row.regionLabel,
        basePrice: row.basePrice,
        baseCurrency: row.baseCurrency,
        supplierPrice: row.supplierPrice,
        supplierCurrency: row.supplierCurrency,
        supplierOfferId: row.supplierOfferId,
        supplierUpdatedAt: row.supplierUpdatedAt,
        supplierEligible: row.supplierEligible,
        deliveryType: row.deliveryType,
        requiresPlayerId: row.requiresPlayerId,
        requiresServerId: row.requiresServerId,
        inputRequirements: row.inputRequirements,
        status: row.status,
        metadata: row.metadata,
      },
    });
  }
  return { synced: input.rows.length };
}

export async function upsertFlashTopUpCatalogRows(rows: SupplierCatalogRow[]) {
  return upsertSupplierCatalogRows({ supplierKey: FLASHTOPUP_SUPPLIER_KEY, rows });
}

export async function upsertFoxReloadCatalogRows(rows: SupplierCatalogRow[]) {
  return upsertSupplierCatalogRows({ supplierKey: FOXRELOAD_SUPPLIER_KEY, rows });
}

export async function upsertGamesDropCatalogRows(rows: SupplierCatalogRow[]) {
  return upsertSupplierCatalogRows({ supplierKey: GAMESDROP_SUPPLIER_KEY, rows });
}

export async function processFlashTopUpWebhook(input: {
  eventId: string;
  eventType: string;
  referenceId: string;
  supplierOrderId?: string;
  orderStatus?: string;
  payloadHash: string;
}) {
  const db = requireDb(await getDb());
  const [existing] = await db.select().from(supplierWebhookEvents)
    .where(and(eq(supplierWebhookEvents.supplierKey, "flashtopup"), eq(supplierWebhookEvents.eventId, input.eventId))).limit(1);
  if (existing) return { duplicate: true } as const;

  await db.insert(supplierWebhookEvents).values({
    supplierKey: "flashtopup",
    eventId: input.eventId,
    eventType: input.eventType,
    payloadHash: input.payloadHash,
    processingStatus: "received",
  });

  const [order] = await db.select().from(orders).where(eq(orders.orderCode, input.referenceId)).limit(1);
  if (order) {
    const completed = input.orderStatus?.toLowerCase() === "completed";
    const failed = input.orderStatus?.toLowerCase() === "failed";
    await db.update(orders).set({
      supplierOrderId: input.supplierOrderId,
      supplierStatus: completed ? "fulfilled" : failed ? "failed" : "processing",
      status: completed ? "delivered" : failed ? "failed" : "processing",
    }).where(eq(orders.id, order.id));
  }
  await db.update(supplierWebhookEvents).set({ processingStatus: "processed", processedAt: new Date() })
    .where(and(eq(supplierWebhookEvents.supplierKey, "flashtopup"), eq(supplierWebhookEvents.eventId, input.eventId)));
  return { duplicate: false } as const;
}

export async function getAccountCommerceSummary(userId: number) {
  const db = requireDb(await getDb());
  await db.insert(customerProfiles).values({ userId }).onDuplicateKeyUpdate({ set: { userId } });
  await db.insert(wallets).values({ userId }).onDuplicateKeyUpdate({ set: { userId } });
  const [profile] = await db.select().from(customerProfiles).where(eq(customerProfiles.userId, userId)).limit(1);
  const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  const recentOrders = await db.select({
    orderCode: orders.orderCode,
    status: orders.status,
    paymentStatus: orders.paymentStatus,
    currency: orders.currency,
    total: orders.total,
    createdAt: orders.createdAt,
  }).from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt)).limit(10);

  const manualTasks = await db.select({ orderCode: orders.orderCode, status: manualDeliveryTasks.status, deliveryMinimumMinutes: manualDeliveryTasks.deliveryMinimumMinutes, deliveryMaximumMinutes: manualDeliveryTasks.deliveryMaximumMinutes, customerStatusNote: manualDeliveryTasks.customerStatusNote, updatedAt: manualDeliveryTasks.updatedAt }).from(manualDeliveryTasks).innerJoin(orders, eq(manualDeliveryTasks.orderId, orders.id)).where(eq(manualDeliveryTasks.userId, userId)).orderBy(desc(manualDeliveryTasks.updatedAt)).limit(20);
  return {
    profile: profile ?? null,
    wallet: wallet ? { currency: wallet.currency, availableBalance: wallet.availableBalance, status: wallet.status } : { currency: "USD", availableBalance: "0.00", status: "inactive" as const },
    orders: recentOrders,
    manualDeliveryTasks: manualTasks.map((task) => ({ ...task, deliveryWindow: formatManualDeliveryWindow(task.deliveryMinimumMinutes, task.deliveryMaximumMinutes) })),
  };
}

export async function getCustomerOrderDetail(input: { userId: number; orderCode: string }) {
  const db = requireDb(await getDb());
  const [order] = await db.select({
    orderCode: orders.orderCode,
    status: orders.status,
    paymentStatus: orders.paymentStatus,
    supplierStatus: orders.supplierStatus,
    currency: orders.currency,
    subtotal: orders.subtotal,
    total: orders.total,
    createdAt: orders.createdAt,
    updatedAt: orders.updatedAt,
  }).from(orders).where(and(eq(orders.orderCode, input.orderCode), eq(orders.userId, input.userId))).limit(1);
  if (!order) throw new Error("Order not found in your account.");
  const items = await db.select({
    id: orderItems.id,
    productName: orderItems.productName,
    quantity: orderItems.quantity,
    unitPrice: orderItems.unitPrice,
    regionLabel: orderItems.regionLabel,
    deliveryType: orderItems.deliveryType,
  }).from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(eq(orders.orderCode, input.orderCode), eq(orders.userId, input.userId)));
  const manualTasks = await db.select({ orderItemId: manualDeliveryTasks.orderItemId, status: manualDeliveryTasks.status, deliveryMinimumMinutes: manualDeliveryTasks.deliveryMinimumMinutes, deliveryMaximumMinutes: manualDeliveryTasks.deliveryMaximumMinutes, customerStatusNote: manualDeliveryTasks.customerStatusNote, updatedAt: manualDeliveryTasks.updatedAt }).from(manualDeliveryTasks).innerJoin(orders, eq(manualDeliveryTasks.orderId, orders.id)).where(and(eq(orders.orderCode, input.orderCode), eq(manualDeliveryTasks.userId, input.userId)));
  return { order, items: items.map((item) => { const task = manualTasks.find((candidate) => candidate.orderItemId === item.id); return { ...item, manualDelivery: task ? { ...task, deliveryWindow: formatManualDeliveryWindow(task.deliveryMinimumMinutes, task.deliveryMaximumMinutes) } : null }; }) };
}

/** Returns only the authenticated customer's own operational records for the VAMNUX user dashboard. */
export async function getCustomerDashboard(userId: number) {
  const db = requireDb(await getDb());
  await ensureCustomerAccountRows(db, userId);
  await ensureDraftPolicyPages(db);
  const settings = await ensureMarketplacePricingSettings(db);
  const savedExchangeRates = await listExchangeRates();
  const [profile] = await db.select().from(customerProfiles).where(eq(customerProfiles.userId, userId)).limit(1);
  const [identity] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  const recentOrders = await db.select({
    orderCode: orders.orderCode,
    status: orders.status,
    paymentStatus: orders.paymentStatus,
    supplierStatus: orders.supplierStatus,
    currency: orders.currency,
    total: orders.total,
    createdAt: orders.createdAt,
  }).from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt)).limit(12);
  const manualDeliveryTaskRows = await db.select({ orderCode: orders.orderCode, status: manualDeliveryTasks.status, deliveryMinimumMinutes: manualDeliveryTasks.deliveryMinimumMinutes, deliveryMaximumMinutes: manualDeliveryTasks.deliveryMaximumMinutes, customerStatusNote: manualDeliveryTasks.customerStatusNote, updatedAt: manualDeliveryTasks.updatedAt }).from(manualDeliveryTasks).innerJoin(orders, eq(manualDeliveryTasks.orderId, orders.id)).where(eq(manualDeliveryTasks.userId, userId)).orderBy(desc(manualDeliveryTasks.updatedAt)).limit(20);
  const recentWalletEntries = wallet
    ? await db.select({
      id: walletEntries.id,
      direction: walletEntries.direction,
      entryType: walletEntries.entryType,
      amount: walletEntries.amount,
      currency: walletEntries.currency,
      reference: walletEntries.reference,
      status: walletEntries.status,
      createdAt: walletEntries.createdAt,
    }).from(walletEntries).where(eq(walletEntries.walletId, wallet.id)).orderBy(desc(walletEntries.createdAt)).limit(12)
    : [];
  const savedRows = await db.select({
    savedId: savedProducts.id,
    savedAt: savedProducts.createdAt,
    id: products.id,
    slug: products.slug,
    name: products.name,
    category: products.category,
    imageUrl: products.imageUrl,
    regionLabel: products.regionLabel,
    deliveryType: products.deliveryType,
    basePrice: products.basePrice,
    markupPercentOverride: products.markupPercentOverride,
    displayPriceOverride: products.displayPriceOverride,
  }).from(savedProducts).innerJoin(products, eq(savedProducts.productId, products.id))
    .where(and(eq(savedProducts.userId, userId), eq(products.status, "active"))).orderBy(desc(savedProducts.createdAt)).limit(24);
  const fundingRequests = await db.select({
    fundingCode: walletFundingAttempts.fundingCode,
    amount: walletFundingAttempts.amount,
    currency: walletFundingAttempts.currency,
    status: walletFundingAttempts.status,
    createdAt: walletFundingAttempts.createdAt,
    settledAt: walletFundingAttempts.settledAt,
  }).from(walletFundingAttempts).where(eq(walletFundingAttempts.userId, userId)).orderBy(desc(walletFundingAttempts.createdAt)).limit(12);
  const [notificationPreferences] = await db.select().from(customerNotificationPreferences).where(eq(customerNotificationPreferences.userId, userId)).limit(1);
  const notifications = await db.select({
    id: customerNotifications.id,
    category: customerNotifications.category,
    title: customerNotifications.title,
    body: customerNotifications.body,
    actionUrl: customerNotifications.actionUrl,
    readAt: customerNotifications.readAt,
    createdAt: customerNotifications.createdAt,
  }).from(customerNotifications).where(eq(customerNotifications.userId, userId)).orderBy(desc(customerNotifications.createdAt)).limit(20);
  const securityEvents = await db.select({
    id: customerSecurityEvents.id,
    eventType: customerSecurityEvents.eventType,
    summary: customerSecurityEvents.summary,
    createdAt: customerSecurityEvents.createdAt,
  }).from(customerSecurityEvents).where(eq(customerSecurityEvents.userId, userId)).orderBy(desc(customerSecurityEvents.createdAt)).limit(20);
  const tickets = await db.select({
    ticketCode: supportTickets.ticketCode,
    category: supportTickets.category,
    subject: supportTickets.subject,
    status: supportTickets.status,
    orderId: supportTickets.orderId,
    createdAt: supportTickets.createdAt,
    updatedAt: supportTickets.updatedAt,
  }).from(supportTickets).where(eq(supportTickets.userId, userId)).orderBy(desc(supportTickets.updatedAt)).limit(20);
  const privacyRequests = await db.select({
    requestCode: customerPrivacyRequests.requestCode,
    requestType: customerPrivacyRequests.requestType,
    status: customerPrivacyRequests.status,
    note: customerPrivacyRequests.note,
    createdAt: customerPrivacyRequests.createdAt,
    updatedAt: customerPrivacyRequests.updatedAt,
  }).from(customerPrivacyRequests).where(eq(customerPrivacyRequests.userId, userId)).orderBy(desc(customerPrivacyRequests.updatedAt)).limit(12);
  const productRequests = await db.select({
    requestCode: customerProductRequests.requestCode,
    category: customerProductRequests.category,
    requestedName: customerProductRequests.requestedName,
    details: customerProductRequests.details,
    status: customerProductRequests.status,
    createdAt: customerProductRequests.createdAt,
    updatedAt: customerProductRequests.updatedAt,
  }).from(customerProductRequests).where(eq(customerProductRequests.userId, userId)).orderBy(desc(customerProductRequests.updatedAt)).limit(20);
  const normalizedEmail = identity?.email?.trim().toLowerCase() ?? null;
  const [newsletterInterest] = normalizedEmail
    ? await db.select({ status: newsletterInterestSubscribers.status, consentedAt: newsletterInterestSubscribers.consentedAt }).from(newsletterInterestSubscribers).where(eq(newsletterInterestSubscribers.email, normalizedEmail)).limit(1)
    : [];
  const policyPages = await db.select({
    slug: siteContentPages.slug,
    title: siteContentPages.title,
    status: siteContentPages.status,
    version: siteContentPages.version,
    updatedAt: siteContentPages.updatedAt,
  }).from(siteContentPages).orderBy(siteContentPages.title);
  const currentTermsPrivacyVersion = await getCurrentTermsPrivacyConsentVersion(db);
  const consentRows = await db.select({
    consentType: customerConsents.consentType,
    policyVersion: customerConsents.policyVersion,
    granted: customerConsents.granted,
    createdAt: customerConsents.createdAt,
  }).from(customerConsents).where(eq(customerConsents.userId, userId)).orderBy(desc(customerConsents.createdAt));
  const latestTermsPrivacyConsent = consentRows.find((consent) => consent.consentType === "terms_privacy") ?? null;
  const latestMarketingConsent = consentRows.find((consent) => consent.consentType === "marketing") ?? null;
  return {
    profile: profile ?? null,
    wallet: wallet ? { currency: wallet.currency, availableBalance: wallet.availableBalance, status: wallet.status } : { currency: "USD", availableBalance: "0.00", status: "inactive" as const },
    exchangeRates: savedExchangeRates.filter((rate) => rate.active && rate.baseCurrency === "USD"),
    orders: recentOrders,
    manualDeliveryTasks: manualDeliveryTaskRows.map((task) => ({ ...task, deliveryWindow: formatManualDeliveryWindow(task.deliveryMinimumMinutes, task.deliveryMaximumMinutes) })),
    walletEntries: recentWalletEntries,
    fundingRequests,
    savedProducts: savedRows.map((product) => ({ ...product, ...customerPriceForProduct(product, settings) })),
    notificationPreferences: notificationPreferences ?? null,
    notifications,
    securityEvents,
    tickets,
    privacyRequests,
    productRequests,
    subscription: { email: normalizedEmail, status: newsletterInterest?.status ?? "not_subscribed", consentedAt: newsletterInterest?.consentedAt ?? null },
    policyPages,
    consents: {
      termsPrivacy: latestTermsPrivacyConsent,
      marketing: latestMarketingConsent,
      currentTermsPrivacyVersion,
      termsPrivacyAccepted: Boolean(latestTermsPrivacyConsent?.granted && latestTermsPrivacyConsent.policyVersion === currentTermsPrivacyVersion),
    },
  };
}

export async function updateCustomerDashboardPreferences(input: { userId: number; preferredCurrency: "USD" | "EUR" | "GBP" | "NGN"; countryCode?: string | null }) {
  const db = requireDb(await getDb());
  const countryCode = input.countryCode?.trim().toUpperCase() || null;
  await db.insert(customerProfiles).values({ userId: input.userId, preferredCurrency: input.preferredCurrency, countryCode })
    .onDuplicateKeyUpdate({ set: { preferredCurrency: input.preferredCurrency, countryCode } });
  const [profile] = await db.select().from(customerProfiles).where(eq(customerProfiles.userId, input.userId)).limit(1);
  return profile;
}

export async function updateCustomerProfile(input: { userId: number; firstName?: string | null; lastName?: string | null; username?: string | null; phone?: string | null; countryCode?: string | null; registrationSource?: string | null }) {
  const db = requireDb(await getDb());
  await ensureCustomerAccountRows(db, input.userId);
  const username = input.username?.trim().toLowerCase() || null;
  if (username && (!/^[a-z0-9._-]{3,30}$/.test(username) || /^vamnux(?:[-_.]?admin)?$/.test(username))) throw new Error("Choose a 3–30 character username using letters, numbers, dots, hyphens, or underscores.");
  if (username) {
    const [existing] = await db.select({ userId: customerProfiles.userId }).from(customerProfiles).where(eq(customerProfiles.username, username)).limit(1);
    if (existing && existing.userId !== input.userId) throw new Error("That username is unavailable.");
  }
  const updateSet = {
    firstName: input.firstName?.trim().slice(0, 80) || null,
    lastName: input.lastName?.trim().slice(0, 80) || null,
    username,
    phone: input.phone?.trim().slice(0, 32) || null,
    countryCode: input.countryCode?.trim().toUpperCase().slice(0, 2) || null,
    registrationSource: input.registrationSource?.trim().slice(0, 40) || null,
  };
  if (updateSet.countryCode && !/^[A-Z]{2}$/.test(updateSet.countryCode)) throw new Error("Use a two-letter country code.");
  await db.update(customerProfiles).set(updateSet).where(eq(customerProfiles.userId, input.userId));
  await recordCustomerSecurityEvent({ userId: input.userId, eventType: "profile_updated", summary: "Profile information was updated." });
  const [profile] = await db.select().from(customerProfiles).where(eq(customerProfiles.userId, input.userId)).limit(1);
  return profile;
}

export async function updateCustomerNotificationPreferences(input: { userId: number; orderUpdates: boolean; paymentUpdates: boolean; walletUpdates: boolean; marketingUpdates: boolean; productAnnouncements: boolean; securityAlerts?: boolean }) {
  const db = requireDb(await getDb());
  await ensureCustomerAccountRows(db, input.userId);
  await db.update(customerNotificationPreferences).set({
    orderUpdates: input.orderUpdates,
    paymentUpdates: input.paymentUpdates,
    walletUpdates: input.walletUpdates,
    marketingUpdates: input.marketingUpdates,
    productAnnouncements: input.productAnnouncements,
    ...(input.securityAlerts === undefined ? {} : { securityAlerts: input.securityAlerts }),
  }).where(eq(customerNotificationPreferences.userId, input.userId));
  const [preferences] = await db.select().from(customerNotificationPreferences).where(eq(customerNotificationPreferences.userId, input.userId)).limit(1);
  if (input.securityAlerts !== undefined) await recordCustomerSecurityEvent({ userId: input.userId, eventType: "security_alert_preference_updated", summary: `Security alerts were ${input.securityAlerts ? "enabled" : "disabled"}.` });
  return preferences;
}

/** Appends a customer-owned legal or marketing-consent decision; it never sends email or changes provider authentication. */
export async function recordCustomerConsent(input: { userId: number; consentType: "terms_privacy" | "marketing"; granted: boolean }) {
  const db = requireDb(await getDb());
  await ensureCustomerAccountRows(db, input.userId);
  if (input.consentType === "terms_privacy" && !input.granted) throw new Error("Terms and Privacy acceptance is required before wallet funding or product orders can continue.");
  const policyVersion = input.consentType === "terms_privacy" ? await getCurrentTermsPrivacyConsentVersion(db) : "marketing-draft-1";
  await db.insert(customerConsents).values({ userId: input.userId, consentType: input.consentType, policyVersion, granted: input.granted });
  if (input.consentType === "marketing") {
    await db.update(customerNotificationPreferences).set({ marketingUpdates: input.granted }).where(eq(customerNotificationPreferences.userId, input.userId));
  }
  await recordCustomerSecurityEvent({
    userId: input.userId,
    eventType: input.consentType === "terms_privacy" ? "terms_privacy_accepted" : "marketing_consent_updated",
    summary: input.consentType === "terms_privacy" ? "Current VAMNUX Terms and Privacy drafts were accepted." : `Marketing consent was ${input.granted ? "granted" : "withdrawn"}.`,
  });
  return { consentType: input.consentType, granted: input.granted, policyVersion } as const;
}

export async function assertCustomerTermsPrivacyConsent(userId: number) {
  const db = requireDb(await getDb());
  const currentTermsPrivacyVersion = await getCurrentTermsPrivacyConsentVersion(db);
  const [latestConsent] = await db.select({ granted: customerConsents.granted, policyVersion: customerConsents.policyVersion })
    .from(customerConsents)
    .where(and(eq(customerConsents.userId, userId), eq(customerConsents.consentType, "terms_privacy")))
    .orderBy(desc(customerConsents.createdAt))
    .limit(1);
  if (!latestConsent?.granted || latestConsent.policyVersion !== currentTermsPrivacyVersion) {
    throw new Error("Accept the current VAMNUX Terms and Privacy drafts in Account settings before continuing.");
  }
}

export async function markCustomerNotificationRead(input: { userId: number; notificationId: number }) {
  const db = requireDb(await getDb());
  const [notification] = await db.select({ id: customerNotifications.id }).from(customerNotifications).where(and(eq(customerNotifications.id, input.notificationId), eq(customerNotifications.userId, input.userId))).limit(1);
  if (!notification) throw new Error("Notification not found.");
  await db.update(customerNotifications).set({ readAt: new Date() }).where(eq(customerNotifications.id, notification.id));
  return { notificationId: notification.id, read: true } as const;
}

function createSupportTicketCode() {
  return `VS${crypto.randomUUID().replace(/-/g, "").slice(0, 18).toUpperCase()}`;
}

function createPrivacyRequestCode() {
  return `VP${crypto.randomUUID().replace(/-/g, "").slice(0, 18).toUpperCase()}`;
}

function createProductRequestCode() {
  return `VR${crypto.randomUUID().replace(/-/g, "").slice(0, 18).toUpperCase()}`;
}

export async function createCustomerProductRequest(input: { userId: number; category: "product" | "game_top_up" | "gift_card" | "subscription" | "software" | "ai_tool" | "other"; requestedName: string; details?: string }) {
  const db = requireDb(await getDb());
  const requestedName = input.requestedName.trim().slice(0, 180);
  const details = input.details?.trim().slice(0, 2000) || null;
  if (!requestedName) throw new Error("Tell VAMNUX what product or service you would like to request.");
  const requestCode = createProductRequestCode();
  await db.transaction(async (tx) => {
    await tx.insert(customerProductRequests).values({ requestCode, userId: input.userId, category: input.category, requestedName, details });
    await tx.insert(customerNotifications).values({
      userId: input.userId,
      category: "system",
      title: "Product request received",
      body: `Your request ${requestCode} for ${requestedName} is queued for VAMNUX review. A request does not guarantee availability.`,
      actionUrl: "/account?tab=request",
    });
  });
  return { requestCode, status: "submitted" as const };
}

export async function createCustomerSupportTicket(input: { userId: number; category: "payment" | "order" | "game_top_up" | "gift_card" | "subscription" | "software" | "wallet" | "account" | "refund" | "other"; subject: string; message: string; orderCode?: string }) {
  const db = requireDb(await getDb());
  const subject = input.subject.trim().slice(0, 180);
  const message = input.message.trim().slice(0, 5000);
  if (!subject || !message) throw new Error("A support subject and message are required.");
  let orderId: number | null = null;
  if (input.orderCode) {
    const [order] = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.orderCode, input.orderCode), eq(orders.userId, input.userId))).limit(1);
    if (!order) throw new Error("The selected order is not available in your account.");
    orderId = order.id;
  }
  const ticketCode = createSupportTicketCode();
  return db.transaction(async (tx) => {
    const [created] = await tx.insert(supportTickets).values({ ticketCode, userId: input.userId, orderId, category: input.category, subject }).$returningId();
    await tx.insert(supportTicketMessages).values({ ticketId: created.id, authorUserId: input.userId, authorRole: "customer", body: message });
    await tx.insert(customerNotifications).values({ userId: input.userId, category: "support", title: "Support ticket submitted", body: `Your ticket ${ticketCode} is open for review.`, actionUrl: "/account" });
    return { ticketCode, status: "open" as const };
  });
}

export async function getCustomerSupportTicket(input: { userId: number; ticketCode: string }) {
  const db = requireDb(await getDb());
  const [ticket] = await db.select().from(supportTickets).where(and(eq(supportTickets.ticketCode, input.ticketCode), eq(supportTickets.userId, input.userId))).limit(1);
  if (!ticket) throw new Error("Support ticket not found.");
  const messages = await db.select({ id: supportTicketMessages.id, authorRole: supportTicketMessages.authorRole, body: supportTicketMessages.body, createdAt: supportTicketMessages.createdAt })
    .from(supportTicketMessages).where(eq(supportTicketMessages.ticketId, ticket.id)).orderBy(supportTicketMessages.createdAt);
  return { ticket, messages };
}

export async function replyToCustomerSupportTicket(input: { userId: number; ticketCode: string; message: string }) {
  const db = requireDb(await getDb());
  const message = input.message.trim().slice(0, 5000);
  if (!message) throw new Error("A reply is required.");
  const [ticket] = await db.select().from(supportTickets).where(and(eq(supportTickets.ticketCode, input.ticketCode), eq(supportTickets.userId, input.userId))).limit(1);
  if (!ticket) throw new Error("Support ticket not found.");
  if (ticket.status === "closed") throw new Error("Closed support tickets cannot receive a reply.");
  await db.transaction(async (tx) => {
    await tx.insert(supportTicketMessages).values({ ticketId: ticket.id, authorUserId: input.userId, authorRole: "customer", body: message });
    await tx.update(supportTickets).set({ status: "open" }).where(eq(supportTickets.id, ticket.id));
  });
  return { ticketCode: ticket.ticketCode, status: "open" as const };
}

export async function createCustomerPrivacyRequest(input: { userId: number; requestType: "data_access" | "data_correction" | "account_deletion"; note?: string }) {
  const db = requireDb(await getDb());
  const requestCode = createPrivacyRequestCode();
  await db.insert(customerPrivacyRequests).values({ requestCode, userId: input.userId, requestType: input.requestType, note: input.note?.trim().slice(0, 500) || null });
  await db.insert(customerNotifications).values({ userId: input.userId, category: "system", title: "Privacy request submitted", body: `Your privacy request ${requestCode} is queued for review.`, actionUrl: "/account" });
  return { requestCode, status: "submitted" as const };
}

export async function getPublicPolicyPage(slug: string) {
  const db = requireDb(await getDb());
  await ensureDraftPolicyPages(db);
  const [page] = await db.select({ slug: siteContentPages.slug, title: siteContentPages.title, body: siteContentPages.body, status: siteContentPages.status, version: siteContentPages.version, updatedAt: siteContentPages.updatedAt })
    .from(siteContentPages).where(eq(siteContentPages.slug, slug)).limit(1);
  return page ?? null;
}

export async function listAdminPolicyPages() {
  const db = requireDb(await getDb());
  await ensureDraftPolicyPages(db);
  const order = new Map<string, number>(POLICY_DRAFTS.map((policy, index) => [policy.slug, index]));
  const pages = await db.select({ id: siteContentPages.id, slug: siteContentPages.slug, title: siteContentPages.title, body: siteContentPages.body, status: siteContentPages.status, version: siteContentPages.version, updatedAt: siteContentPages.updatedAt, updatedByAdminId: siteContentPages.updatedByAdminId }).from(siteContentPages);
  return pages.filter((page) => order.has(page.slug)).sort((a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99));
}

export async function updateAdminPolicyPage(input: { slug: string; title: string; body: string; adminUserId: number }) {
  const db = requireDb(await getDb());
  await ensureDraftPolicyPages(db);
  const allowed = new Set<string>(POLICY_DRAFTS.map((policy) => policy.slug));
  if (!allowed.has(input.slug)) throw new Error("Unknown VAMNUX policy");
  const title = input.title.trim().slice(0, 180);
  const body = input.body.trim().slice(0, 50_000);
  if (title.length < 3 || body.length < 30) throw new Error("Policy title and content must be complete before saving");
  const [page] = await db.select({ id: siteContentPages.id }).from(siteContentPages).where(eq(siteContentPages.slug, input.slug)).limit(1);
  if (!page) throw new Error("Policy page was not found");
  const version = `policy-${Date.now()}`;
  await db.transaction(async (tx) => {
    await tx.update(siteContentPages).set({ title, body, status: "published", version, updatedByAdminId: input.adminUserId }).where(eq(siteContentPages.id, page.id));
    await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: "policy.updated", targetType: "policy_page", targetId: input.slug, summary: `Updated customer-facing policy ${title}`, metadata: { version } });
  });
  return { slug: input.slug, title, version };
}

export async function toggleCustomerSavedProduct(input: { userId: number; productId: number }) {
  const db = requireDb(await getDb());
  const [existing] = await db.select({ id: savedProducts.id }).from(savedProducts)
    .where(and(eq(savedProducts.userId, input.userId), eq(savedProducts.productId, input.productId))).limit(1);
  if (existing) {
    await db.delete(savedProducts).where(eq(savedProducts.id, existing.id));
    return { productId: input.productId, saved: false } as const;
  }
  const [product] = await db.select({ id: products.id }).from(products)
    .where(and(eq(products.id, input.productId), eq(products.status, "active"))).limit(1);
  if (!product) throw new Error("This VAMNUX product is unavailable to save");
  await db.transaction(async (tx) => {
    await tx.insert(savedProducts).values({ userId: input.userId, productId: input.productId });
    await tx.insert(customerProductActivityEvents).values({ userId: input.userId, productId: input.productId, activityType: "favorite_added" });
  });
  return { productId: input.productId, saved: true } as const;
}

/** Records a signed-in customer's request to add a currently active product to their local VAMNUX cart. */
export async function recordCustomerCartAddition(input: { userId: number; productId: number }) {
  const db = requireDb(await getDb());
  const [product] = await db.select({ id: products.id }).from(products)
    .where(and(eq(products.id, input.productId), eq(products.status, "active"))).limit(1);
  if (!product) throw new Error("This VAMNUX product is unavailable to add to cart");
  await db.insert(customerProductActivityEvents).values({ userId: input.userId, productId: input.productId, activityType: "cart_added" });
  return { recorded: true, productId: input.productId } as const;
}

/** Returns only the customer identity and product context needed for the protected Super Admin product-activity inbox. */
export async function listSuperAdminProductActivityEvents(input: { limit?: number } = {}) {
  const db = requireDb(await getDb());
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 250);
  return db.select({
    id: customerProductActivityEvents.id,
    activityType: customerProductActivityEvents.activityType,
    createdAt: customerProductActivityEvents.createdAt,
    userId: users.id,
    customerName: users.name,
    customerEmail: users.email,
    customerUsername: customerProfiles.username,
    productId: products.id,
    productName: products.name,
    productSlug: products.slug,
    productCategory: products.category,
  }).from(customerProductActivityEvents)
    .innerJoin(users, eq(customerProductActivityEvents.userId, users.id))
    .innerJoin(products, eq(customerProductActivityEvents.productId, products.id))
    .leftJoin(customerProfiles, eq(customerProfiles.userId, users.id))
    .orderBy(desc(customerProductActivityEvents.createdAt))
		.limit(limit);
}

export type SuperAdminNotificationGroup = "Orders" | "Favorites & cart" | "Support tickets" | "Customer requests" | "Subscribers" | "Wallet funding" | "Supplier readiness" | "Refunds & failures";
export type SuperAdminNotificationItem = {
	key: string;
	group: SuperAdminNotificationGroup;
	title: string;
	body: string;
	createdAt: Date;
	read: boolean;
	customerName?: string | null;
	customerEmail?: string | null;
	entityType: "order" | "activity" | "ticket" | "request" | "subscriber" | "funding" | "supplier" | "refund" | "api";
	entityId: string;
};

/** Owner-only notification view assembled from persisted VAMNUX records. It does not invent orders, payment events, or external delivery. */
export async function listSuperAdminNotificationInbox(input: { adminUserId: number; limit?: number }) {
	const db = requireDb(await getDb());
	const limit = Math.min(Math.max(input.limit ?? 250, 1), 250);
	const [orderRows, ticketRows, activityRows, requestRows, subscriberRows, fundingRows, supplierRows, failedApiRows, readRows] = await Promise.all([
		listSuperAdminOrders(limit),
		listSuperAdminSupportTickets(limit),
		listSuperAdminProductActivityEvents({ limit }),
		db.select({ id: customerProductRequests.id, requestCode: customerProductRequests.requestCode, category: customerProductRequests.category, requestedName: customerProductRequests.requestedName, status: customerProductRequests.status, createdAt: customerProductRequests.createdAt, updatedAt: customerProductRequests.updatedAt, customerName: users.name, customerEmail: users.email, customerUsername: customerProfiles.username }).from(customerProductRequests).leftJoin(users, eq(customerProductRequests.userId, users.id)).leftJoin(customerProfiles, eq(customerProductRequests.userId, customerProfiles.userId)).orderBy(desc(customerProductRequests.updatedAt)).limit(limit),
		db.select({ id: newsletterInterestSubscribers.id, email: newsletterInterestSubscribers.email, source: newsletterInterestSubscribers.source, status: newsletterInterestSubscribers.status, consentedAt: newsletterInterestSubscribers.consentedAt, updatedAt: newsletterInterestSubscribers.updatedAt }).from(newsletterInterestSubscribers).where(eq(newsletterInterestSubscribers.status, "subscribed")).orderBy(desc(newsletterInterestSubscribers.updatedAt)).limit(limit),
		listSuperAdminWalletFundingRequests(limit),
		db.select({ id: supplierBalanceObservations.id, providerName: commerceIntegrations.providerName, balance: supplierBalanceObservations.balance, currency: supplierBalanceObservations.currency, observedAt: supplierBalanceObservations.observedAt }).from(supplierBalanceObservations).innerJoin(commerceIntegrations, eq(supplierBalanceObservations.integrationId, commerceIntegrations.id)).where(and(eq(supplierBalanceObservations.currency, "USD"), lte(supplierBalanceObservations.balance, "5"))).orderBy(desc(supplierBalanceObservations.observedAt)).limit(limit),
		db.select({ id: apiRequestLogs.id, supplierKey: apiRequestLogs.supplierKey, endpoint: apiRequestLogs.endpoint, errorCode: apiRequestLogs.errorCode, createdAt: apiRequestLogs.createdAt }).from(apiRequestLogs).where(eq(apiRequestLogs.success, false)).orderBy(desc(apiRequestLogs.createdAt)).limit(limit),
		db.select({ notificationKey: adminNotificationReads.notificationKey }).from(adminNotificationReads).where(eq(adminNotificationReads.adminUserId, input.adminUserId)),
	]);
	const readKeys = new Set(readRows.map((row) => row.notificationKey));
	const items: SuperAdminNotificationItem[] = [];
	const add = (item: Omit<SuperAdminNotificationItem, "read">) => items.push({ ...item, read: readKeys.has(item.key) });
	for (const order of orderRows) {
		const isRefund = order.status === "failed" || order.status === "refunded" || order.paymentStatus === "failed" || order.paymentStatus === "refunded";
		const version = order.updatedAt.getTime();
		add({ key: `${isRefund ? "refund" : "order"}:${order.id}:${version}`, group: isRefund ? "Refunds & failures" : "Orders", title: isRefund ? `Order needs review · ${order.orderCode}` : `New or updated order · ${order.orderCode}`, body: `${order.customerName || "Customer"} · ${order.paymentStatus.replaceAll("_", " ")} · ${order.status.replaceAll("_", " ")}`, createdAt: order.updatedAt, customerName: order.customerName, customerEmail: order.customerEmail, entityType: isRefund ? "refund" : "order", entityId: String(order.id) });
	}
	for (const activity of activityRows) add({ key: `activity:${activity.id}`, group: "Favorites & cart", title: activity.activityType === "favorite_added" ? "Product favorited" : "Product added to cart", body: `${activity.customerUsername || activity.customerName || "Customer"} · ${activity.productName}`, createdAt: activity.createdAt, customerName: activity.customerName, customerEmail: activity.customerEmail, entityType: "activity", entityId: String(activity.id) });
	for (const ticket of ticketRows) add({ key: `ticket:${ticket.ticketCode}:${ticket.updatedAt.getTime()}`, group: "Support tickets", title: `Support ticket · ${ticket.ticketCode}`, body: `${ticket.subject} · ${ticket.status.replaceAll("_", " ")}`, createdAt: ticket.updatedAt, customerName: ticket.customerUsername || ticket.customerName, customerEmail: ticket.customerEmail, entityType: "ticket", entityId: ticket.ticketCode });
	for (const request of requestRows) add({ key: `request:${request.id}:${request.updatedAt.getTime()}`, group: "Customer requests", title: `Requested product · ${request.requestedName}`, body: `${request.category.replaceAll("_", " ")} · ${request.status.replaceAll("_", " ")}`, createdAt: request.updatedAt, customerName: request.customerUsername || request.customerName, customerEmail: request.customerEmail, entityType: "request", entityId: request.requestCode });
	for (const subscriber of subscriberRows) add({ key: `subscriber:${subscriber.id}:${subscriber.updatedAt.getTime()}`, group: "Subscribers", title: "New update-interest subscriber", body: `${subscriber.email} · ${subscriber.source.replaceAll("_", " ")}`, createdAt: subscriber.updatedAt, customerEmail: subscriber.email, entityType: "subscriber", entityId: String(subscriber.id) });
	for (const funding of fundingRows.filter((row) => row.status === "pending")) add({ key: `funding:${funding.fundingCode}:${funding.createdAt.getTime()}`, group: "Wallet funding", title: `Funding review · ${funding.fundingCode}`, body: `${funding.customerName || "Customer"} · ${funding.amount} ${funding.currency}`, createdAt: funding.createdAt, customerName: funding.customerName, customerEmail: funding.customerEmail, entityType: "funding", entityId: funding.fundingCode });
	for (const supplier of supplierRows) add({ key: `supplier:${supplier.id}:${supplier.observedAt.getTime()}`, group: "Supplier readiness", title: `Low supplier balance · ${supplier.providerName}`, body: `${supplier.balance ?? 0} ${supplier.currency || "USD"} recorded at or below the owner threshold`, createdAt: supplier.observedAt, entityType: "supplier", entityId: String(supplier.id) });
	for (const api of failedApiRows) add({ key: `api:${api.id}`, group: "Supplier readiness", title: `Supplier request failed · ${api.supplierKey}`, body: `${api.endpoint} · ${api.errorCode || "Error details unavailable"}`, createdAt: api.createdAt, entityType: "api", entityId: String(api.id) });
	const sorted = items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
	return { items: sorted, unreadCount: sorted.filter((item) => !item.read).length };
}

export type SuperAdminNotificationDetail = {
	notificationKey: string;
	sourceLabel: string;
	reference: string;
	fields: Array<{ label: string; value: string }>;
	message: string | null;
	messages: Array<{ authorRole: "customer" | "admin"; body: string; createdAt: Date }>;
};

/** Resolves only the authorised, safe operational context for an existing inbox key. Customer messages are returned in full as stored; secret fulfilment and provider credential data are never returned. */
export async function getSuperAdminNotificationDetail(notificationKey: string): Promise<SuperAdminNotificationDetail> {
	const db = requireDb(await getDb());
	const [kind, sourceId] = notificationKey.trim().split(":", 3);
	if (!kind || !sourceId) throw new Error("Notification reference is invalid.");
	const numericId = Number(sourceId);
	const dateValue = (value: Date | null | undefined) => value ? value.toISOString() : "Not recorded";
	const personValue = (name: string | null | undefined, email: string | null | undefined) => name || email || "Not recorded";
	const detail = (sourceLabel: string, reference: string, fields: Array<{ label: string; value: string }>, message: string | null = null, messages: SuperAdminNotificationDetail["messages"] = []): SuperAdminNotificationDetail => ({ notificationKey, sourceLabel, reference, fields, message, messages });

	if (kind === "ticket") {
		const ticket = await getSuperAdminSupportTicket(sourceId);
		return detail("Customer support ticket", ticket.ticket.ticketCode, [
			{ label: "Subject", value: ticket.ticket.subject },
			{ label: "Category", value: ticket.ticket.category.replaceAll("_", " ") },
			{ label: "Status", value: ticket.ticket.status.replaceAll("_", " ") },
			{ label: "Customer", value: personValue(ticket.ticket.customerName, ticket.ticket.customerEmail) },
			{ label: "Customer email", value: ticket.ticket.customerEmail || "Not recorded" },
			{ label: "Linked order", value: ticket.ticket.orderId ? `Order record #${ticket.ticket.orderId}` : "Not linked" },
			{ label: "Created", value: dateValue(ticket.ticket.createdAt) },
			{ label: "Last updated", value: dateValue(ticket.ticket.updatedAt) },
		], null, ticket.messages.map((item) => ({ authorRole: item.authorRole, body: item.body, createdAt: item.createdAt })));
	}
	if (!Number.isSafeInteger(numericId) || numericId <= 0) throw new Error("Notification source is invalid.");

	if (kind === "request") {
		const [request] = await db.select({ id: customerProductRequests.id, requestCode: customerProductRequests.requestCode, category: customerProductRequests.category, requestedName: customerProductRequests.requestedName, details: customerProductRequests.details, status: customerProductRequests.status, createdAt: customerProductRequests.createdAt, updatedAt: customerProductRequests.updatedAt, customerName: users.name, customerEmail: users.email, customerUsername: customerProfiles.username }).from(customerProductRequests).leftJoin(users, eq(customerProductRequests.userId, users.id)).leftJoin(customerProfiles, eq(customerProductRequests.userId, customerProfiles.userId)).where(eq(customerProductRequests.id, numericId)).limit(1);
		if (!request) throw new Error("Customer request is no longer available.");
		return detail("Customer product request", request.requestCode, [
			{ label: "Requested product or service", value: request.requestedName },
			{ label: "Category", value: request.category.replaceAll("_", " ") },
			{ label: "Status", value: request.status.replaceAll("_", " ") },
			{ label: "Customer", value: request.customerUsername || personValue(request.customerName, request.customerEmail) },
			{ label: "Customer email", value: request.customerEmail || "Not recorded" },
			{ label: "Submitted", value: dateValue(request.createdAt) },
			{ label: "Last updated", value: dateValue(request.updatedAt) },
		], request.details || "No additional request message was provided.");
	}
	if (kind === "activity") {
		const [activity] = await db.select({ id: customerProductActivityEvents.id, activityType: customerProductActivityEvents.activityType, createdAt: customerProductActivityEvents.createdAt, customerName: users.name, customerEmail: users.email, customerUsername: customerProfiles.username, productName: products.name, productCategory: products.category, basePrice: products.basePrice, baseCurrency: products.baseCurrency, markupPercentOverride: products.markupPercentOverride, displayPriceOverride: products.displayPriceOverride, productStatus: products.status, supplierKey: products.supplierKey, regionLabel: products.regionLabel, deliveryType: products.deliveryType }).from(customerProductActivityEvents).innerJoin(users, eq(customerProductActivityEvents.userId, users.id)).innerJoin(products, eq(customerProductActivityEvents.productId, products.id)).leftJoin(customerProfiles, eq(customerProfiles.userId, users.id)).where(eq(customerProductActivityEvents.id, numericId)).limit(1);
		if (!activity) throw new Error("Product activity is no longer available.");
		const pricing = customerPriceForProduct(activity, await ensureMarketplacePricingSettings(db));
		return detail("Customer product activity", `Activity #${activity.id}`, [
			{ label: "Activity", value: activity.activityType === "favorite_added" ? "Added to favorites" : "Added to saved cart" },
			{ label: "Customer", value: activity.customerUsername || personValue(activity.customerName, activity.customerEmail) },
			{ label: "Customer email", value: activity.customerEmail || "Not recorded" },
			{ label: "Product", value: activity.productName },
			{ label: "Category", value: activity.productCategory.replaceAll("_", " ") },
			{ label: "Current customer price", value: `${pricing.customerPrice.toFixed(2)} ${activity.baseCurrency}` },
			{ label: "Product source", value: activity.supplierKey ? "Synchronized catalog listing" : "Admin-managed listing" },
			{ label: "Region", value: activity.regionLabel || "Not specified" },
			{ label: "Delivery format", value: activity.deliveryType.replaceAll("_", " ") },
			{ label: "Product status", value: activity.productStatus },
			{ label: "Recorded", value: dateValue(activity.createdAt) },
		]);
	}
	if (kind === "order" || kind === "refund") {
		const [order] = await db.select({ id: orders.id, orderCode: orders.orderCode, status: orders.status, paymentStatus: orders.paymentStatus, supplierStatus: orders.supplierStatus, currency: orders.currency, total: orders.total, createdAt: orders.createdAt, updatedAt: orders.updatedAt, customerName: users.name, customerEmail: users.email }).from(orders).leftJoin(users, eq(orders.userId, users.id)).where(eq(orders.id, numericId)).limit(1);
		if (!order) throw new Error("Order is no longer available.");
		const items = await db.select({ productName: orderItems.productName, quantity: orderItems.quantity, unitPrice: orderItems.unitPrice, regionLabel: orderItems.regionLabel, deliveryType: orderItems.deliveryType }).from(orderItems).where(eq(orderItems.orderId, order.id));
		return detail(kind === "refund" ? "Order failure or refund review" : "VAMNUX order", order.orderCode, [
			{ label: "Customer", value: personValue(order.customerName, order.customerEmail) },
			{ label: "Customer email", value: order.customerEmail || "Not recorded" },
			{ label: "Order status", value: order.status.replaceAll("_", " ") },
			{ label: "Payment status", value: order.paymentStatus.replaceAll("_", " ") },
			{ label: "Supplier status", value: order.supplierStatus.replaceAll("_", " ") },
			{ label: "Order total", value: `${Number(order.total).toFixed(2)} ${order.currency}` },
			{ label: "Created", value: dateValue(order.createdAt) },
			{ label: "Last updated", value: dateValue(order.updatedAt) },
		], items.length ? items.map((item) => `${item.quantity} × ${item.productName} · ${Number(item.unitPrice).toFixed(2)} ${order.currency}${item.regionLabel ? ` · ${item.regionLabel}` : ""} · ${item.deliveryType.replaceAll("_", " ")}`).join("\n") : "No order items are available.");
	}
	if (kind === "subscriber") {
		const [subscriber] = await db.select().from(newsletterInterestSubscribers).where(eq(newsletterInterestSubscribers.id, numericId)).limit(1);
		if (!subscriber) throw new Error("Subscriber record is no longer available.");
		return detail("Update-interest consent record", `Subscriber #${subscriber.id}`, [{ label: "Email", value: subscriber.email }, { label: "Source", value: subscriber.source.replaceAll("_", " ") }, { label: "Status", value: subscriber.status }, { label: "Consented", value: dateValue(subscriber.consentedAt) }, { label: "Last updated", value: dateValue(subscriber.updatedAt) }]);
	}
	if (kind === "funding") {
		const [funding] = await db.select({ fundingCode: walletFundingAttempts.fundingCode, amount: walletFundingAttempts.amount, currency: walletFundingAttempts.currency, status: walletFundingAttempts.status, createdAt: walletFundingAttempts.createdAt, updatedAt: walletFundingAttempts.updatedAt, customerName: users.name, customerEmail: users.email }).from(walletFundingAttempts).leftJoin(users, eq(walletFundingAttempts.userId, users.id)).where(eq(walletFundingAttempts.fundingCode, sourceId)).limit(1);
		if (!funding) throw new Error("Funding record is no longer available.");
		return detail("Wallet funding review record", funding.fundingCode, [{ label: "Customer", value: personValue(funding.customerName, funding.customerEmail) }, { label: "Customer email", value: funding.customerEmail || "Not recorded" }, { label: "Amount", value: `${Number(funding.amount).toFixed(2)} ${funding.currency}` }, { label: "Status", value: funding.status }, { label: "Created", value: dateValue(funding.createdAt) }, { label: "Last updated", value: dateValue(funding.updatedAt) }]);
	}
	if (kind === "supplier") {
		const [supplier] = await db.select({ id: supplierBalanceObservations.id, providerName: commerceIntegrations.providerName, balance: supplierBalanceObservations.balance, currency: supplierBalanceObservations.currency, source: supplierBalanceObservations.source, note: supplierBalanceObservations.note, observedAt: supplierBalanceObservations.observedAt }).from(supplierBalanceObservations).innerJoin(commerceIntegrations, eq(supplierBalanceObservations.integrationId, commerceIntegrations.id)).where(eq(supplierBalanceObservations.id, numericId)).limit(1);
		if (!supplier) throw new Error("Supplier balance observation is no longer available.");
		return detail("Recorded supplier balance observation", `Balance observation #${supplier.id}`, [{ label: "Supplier", value: supplier.providerName }, { label: "Recorded balance", value: `${Number(supplier.balance).toFixed(2)} ${supplier.currency}` }, { label: "Observation source", value: supplier.source.replaceAll("_", " ") }, { label: "Observed", value: dateValue(supplier.observedAt) }], supplier.note || "No balance note was recorded.");
	}
	if (kind === "api") {
		const [api] = await db.select({ id: apiRequestLogs.id, supplierKey: apiRequestLogs.supplierKey, endpoint: apiRequestLogs.endpoint, httpStatus: apiRequestLogs.httpStatus, responseMs: apiRequestLogs.responseMs, errorCode: apiRequestLogs.errorCode, createdAt: apiRequestLogs.createdAt }).from(apiRequestLogs).where(eq(apiRequestLogs.id, numericId)).limit(1);
		if (!api) throw new Error("Supplier API log is no longer available.");
		return detail("Recorded supplier API request log", `API log #${api.id}`, [{ label: "Supplier", value: api.supplierKey }, { label: "Endpoint", value: api.endpoint }, { label: "HTTP status", value: api.httpStatus === null ? "Not recorded" : String(api.httpStatus) }, { label: "Response time", value: api.responseMs === null ? "Not recorded" : `${api.responseMs} ms` }, { label: "Error code", value: api.errorCode || "Not recorded" }, { label: "Recorded", value: dateValue(api.createdAt) }]);
	}
	throw new Error("This notification type is not available for review.");
}

/** Sends an owner-authored in-app reply for an existing notification source. It never changes customer requests, favorites, cart activity, or external delivery settings. */
export async function replyToSuperAdminNotification(input: { adminUserId: number; notificationKey: string; message: string; ticketStatus?: "processing" | "waiting_for_customer" | "resolved" | "closed" }) {
	const db = requireDb(await getDb());
	const [kind, sourceId] = input.notificationKey.trim().split(":", 3);
	const message = input.message.trim().slice(0, 5000);
	if (!kind || !sourceId || !message) throw new Error("A notification source and reply are required.");
	if (kind === "ticket") {
		const result = await replyToSuperAdminSupportTicket({ adminUserId: input.adminUserId, ticketCode: sourceId, message, status: input.ticketStatus || "waiting_for_customer" });
		return { sourceType: "ticket" as const, reference: result.ticketCode, delivery: "in_app_ticket" as const };
	}
	const sourceNumericId = Number(sourceId);
	if (!Number.isSafeInteger(sourceNumericId) || sourceNumericId <= 0) throw new Error("Notification source is invalid.");
	if (kind === "request") {
		const [request] = await db.select({ id: customerProductRequests.id, userId: customerProductRequests.userId, requestCode: customerProductRequests.requestCode, requestedName: customerProductRequests.requestedName }).from(customerProductRequests).where(eq(customerProductRequests.id, sourceNumericId)).limit(1);
		if (!request) throw new Error("Customer request is no longer available.");
		await db.transaction(async (tx) => {
			await tx.insert(customerNotifications).values({ userId: request.userId, category: "support", title: `VAMNUX response to your request · ${request.requestedName}`, body: message, actionUrl: "/account" });
			await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: "customer_request.replied", targetType: "customer_product_request", targetId: request.requestCode, summary: `Sent an in-app reply for request ${request.requestCode}`, metadata: { delivery: "in_app" } });
		});
		return { sourceType: "request" as const, reference: request.requestCode, delivery: "in_app" as const };
	}
	if (kind === "activity") {
		const [activity] = await db.select({ id: customerProductActivityEvents.id, userId: customerProductActivityEvents.userId, activityType: customerProductActivityEvents.activityType, productName: products.name }).from(customerProductActivityEvents).innerJoin(products, eq(customerProductActivityEvents.productId, products.id)).where(eq(customerProductActivityEvents.id, sourceNumericId)).limit(1);
		if (!activity) throw new Error("Product activity is no longer available.");
		const activityLabel = activity.activityType === "favorite_added" ? "saved product" : "saved cart";
		await db.transaction(async (tx) => {
			await tx.insert(customerNotifications).values({ userId: activity.userId, category: "support", title: `VAMNUX message about ${activity.productName}`, body: message, actionUrl: "/account" });
			await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: "product_activity.replied", targetType: "customer_product_activity", targetId: String(activity.id), summary: `Sent an in-app reply about a ${activityLabel} activity`, metadata: { delivery: "in_app", activityType: activity.activityType } });
		});
		return { sourceType: "activity" as const, reference: `Activity #${activity.id}`, delivery: "in_app" as const };
	}
	throw new Error("Replies are available only for support tickets, customer requests, and product activity.");
}

export async function markSuperAdminNotificationsRead(input: { adminUserId: number; notificationKeys: string[] }) {
	const db = requireDb(await getDb());
	const notificationKeys = Array.from(new Set(input.notificationKeys.map((key) => key.trim()).filter((key) => key.length > 0 && key.length <= 220))).slice(0, 250);
	if (!notificationKeys.length) return { marked: 0 } as const;
	const readAt = new Date();
	await db.transaction(async (tx) => {
		await tx.insert(adminNotificationReads).values(notificationKeys.map((notificationKey) => ({ adminUserId: input.adminUserId, notificationKey, readAt }))).onDuplicateKeyUpdate({ set: { readAt } });
		await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: "admin_notifications.marked_read", targetType: "admin_notification", targetId: notificationKeys.length === 1 ? notificationKeys[0] : "bulk", summary: `Marked ${notificationKeys.length} Admin notification${notificationKeys.length === 1 ? "" : "s"} as read`, metadata: { count: notificationKeys.length } });
	});
	return { marked: notificationKeys.length } as const;
}

export async function markAllSuperAdminNotificationsRead(adminUserId: number) {
	const inbox = await listSuperAdminNotificationInbox({ adminUserId, limit: 250 });
	return markSuperAdminNotificationsRead({ adminUserId, notificationKeys: inbox.items.filter((item) => !item.read).map((item) => item.key) });
}

function createWalletFundingCode() {
  return `WF${crypto.randomUUID().replace(/-/g, "").slice(0, 18).toUpperCase()}`;
}

export async function createCustomerWalletFundingRequest(input: { userId: number; amount: number; currency: "USD" | "EUR" | "GBP" | "NGN"; customerNote?: string }) {
  if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 1_000_000) throw new Error("Enter a valid wallet funding amount.");
  const db = requireDb(await getDb());
  await assertCustomerTermsPrivacyConsent(input.userId);
  const minimumAmount = fundingMinimumForCurrency(input.currency, await listExchangeRates());
  if (minimumAmount === null) throw new Error(`An active USD/${input.currency} rate is required before funding in ${input.currency}.`);
  if (input.amount < minimumAmount) throw new Error(`The minimum wallet funding amount is ${minimumAmount.toFixed(2)} ${input.currency}, based on the $3.00 USD minimum.`);
  await db.insert(wallets).values({ userId: input.userId, currency: input.currency }).onDuplicateKeyUpdate({ set: { userId: input.userId } });
  const [wallet] = await db.select({ id: wallets.id, status: wallets.status, currency: wallets.currency }).from(wallets).where(eq(wallets.userId, input.userId)).limit(1);
  if (!wallet || wallet.status !== "active") throw new Error("This wallet is not available for a top-up request");
  if (wallet.currency !== input.currency) throw new Error(`Use your active ${wallet.currency} wallet currency for this top-up request`);
  const fundingCode = createWalletFundingCode();
  await db.insert(walletFundingAttempts).values({
    fundingCode,
    userId: input.userId,
    walletId: wallet.id,
    integrationId: null,
    idempotencyKey: `manual-request:${fundingCode}`,
    amount: input.amount.toFixed(2),
    currency: input.currency,
    status: "pending",
    metadata: { requestKind: "manual_admin_review", customerNote: input.customerNote?.trim().slice(0, 500) || null },
  });
  return { fundingCode, status: "pending" as const, amount: input.amount.toFixed(2), currency: input.currency };
}

export async function reviewCustomerWalletFundingRequest(input: { adminUserId: number; fundingCode: string; action: "settle" | "reject"; verificationReference?: string; reviewNote?: string }) {
  const db = requireDb(await getDb());
  const reviewNote = input.reviewNote?.trim().slice(0, 500) || null;
  const verificationReference = input.verificationReference?.trim().slice(0, 160) || null;
  if (input.action === "settle" && !verificationReference) throw new Error("A verified settlement reference is required before crediting a wallet");
  return db.transaction(async (tx) => {
    const [attempt] = await tx.select().from(walletFundingAttempts).where(eq(walletFundingAttempts.fundingCode, input.fundingCode)).limit(1);
    if (!attempt) throw new Error("Wallet funding request was not found");
    if (attempt.status !== "pending") throw new Error(`Only pending funding requests can be reviewed; this request is ${attempt.status}`);
    const nextMetadata = {
      ...(attempt.metadata && typeof attempt.metadata === "object" && !Array.isArray(attempt.metadata) ? attempt.metadata as Record<string, unknown> : {}),
      reviewedByAdminId: input.adminUserId,
      reviewNote,
      verificationReference,
    };
    if (input.action === "reject") {
      await tx.update(walletFundingAttempts).set({ status: "failed", metadata: nextMetadata }).where(eq(walletFundingAttempts.id, attempt.id));
      await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: "wallet_funding.rejected", targetType: "wallet_funding_request", targetId: attempt.fundingCode, summary: `Rejected wallet top-up request ${attempt.fundingCode}`, metadata: { amount: Number(attempt.amount), currency: attempt.currency, reviewNote } });
      return { fundingCode: attempt.fundingCode, status: "failed" as const };
    }
    const ledgerReference = `wallet-funding:${attempt.fundingCode}`;
    const [existingEntry] = await tx.select({ id: walletEntries.id }).from(walletEntries).where(eq(walletEntries.reference, ledgerReference)).limit(1);
    if (existingEntry) throw new Error("This wallet funding request already has a ledger entry");
    await tx.insert(walletEntries).values({ walletId: attempt.walletId, direction: "credit", entryType: "funding", amount: attempt.amount, currency: attempt.currency, reference: ledgerReference, status: "completed", metadata: { fundingCode: attempt.fundingCode, verificationReference } });
    await tx.update(wallets).set({ availableBalance: sql`${wallets.availableBalance} + ${attempt.amount}` }).where(eq(wallets.id, attempt.walletId));
    await tx.update(walletFundingAttempts).set({ status: "settled", providerReference: verificationReference, metadata: nextMetadata, settledAt: new Date() }).where(eq(walletFundingAttempts.id, attempt.id));
    await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: "wallet_funding.settled", targetType: "wallet_funding_request", targetId: attempt.fundingCode, summary: `Settled wallet top-up request ${attempt.fundingCode}`, metadata: { amount: Number(attempt.amount), currency: attempt.currency, verificationReference, reviewNote } });
    return { fundingCode: attempt.fundingCode, status: "settled" as const };
  });
}

export function walletCanCoverOrder(input: { walletStatus?: "active" | "locked" | "closed"; walletCurrency?: string; orderCurrency: string; availableBalance?: string | number; total: number }) {
  return input.walletStatus === "active" && input.walletCurrency === input.orderCurrency && Number(input.availableBalance ?? 0) >= input.total;
}

export async function createMarketplaceOrder(input: {
  userId: number;
  currency: SupportedCurrency;
  items: Array<{ productId: number; quantity: number }>;
  fulfillmentDetails?: Record<string, string>;
}) {
  const db = requireDb(await getDb());
  await assertCustomerTermsPrivacyConsent(input.userId);
  const productIds = Array.from(new Set(input.items.map((item) => item.productId)));
  const catalogRows = await db.select().from(products).where(and(inArray(products.id, productIds), eq(products.status, "active")));
  const settings = await ensureMarketplacePricingSettings(db);
  if (catalogRows.length !== productIds.length) throw new Error("One or more selected products are unavailable");

  const orderLines = input.items.map((item) => {
    const product = catalogRows.find((row) => row.id === item.productId);
    if (!product) throw new Error("Selected product is unavailable");
    return { product, quantity: item.quantity, unitPrice: customerPriceForProduct(product, settings).customerPrice };
  });
  const orderRateSnapshots = await Promise.all(orderLines.map(async (line) => {
    const supplierCost = line.product.supplierPrice === null ? Number(line.product.basePrice) : Number(line.product.supplierPrice);
    const supplierCurrency = line.product.supplierCurrency || line.product.baseCurrency;
    const rate = await resolveVamnuxExchangeRate(db, supplierCurrency, line.product.baseCurrency);
    return { productId: line.product.id, supplierCost, supplierCurrency, outputCurrency: line.product.baseCurrency, exchangeRate: rate.rate, convertedCost: supplierCost * rate.rate, rateVersionId: rate.rateVersionId, rateSource: rate.source, sourceLabel: rate.sourceLabel };
  }));
  for (const line of orderLines) {
    const requirements = Array.isArray(line.product.inputRequirements)
      ? line.product.inputRequirements as Array<{ key?: string; label?: string; required?: boolean }>
      : [];
    for (const requirement of requirements) {
      if (!requirement.required || !requirement.key) continue;
      const fieldKey = createFulfillmentFieldKey(line.product.id, requirement.key);
      if (!input.fulfillmentDetails?.[fieldKey]?.trim()) {
        throw new Error(`${requirement.label || requirement.key} is required for ${line.product.name}`);
      }
    }
  }
  const total = calculateOrderTotal(orderLines.map((line) => ({ productId: line.product.id, quantity: line.quantity, unitPrice: line.unitPrice })));
  const [wallet] = await db.select({ availableBalance: wallets.availableBalance, currency: wallets.currency, status: wallets.status }).from(wallets).where(eq(wallets.userId, input.userId)).limit(1);
  if (!wallet || wallet.status !== "active") throw new Error("An active VAMNUX wallet is required before a product order can be created");
  if (wallet.currency !== input.currency) throw new Error(`This order is in ${input.currency}; your active wallet uses ${wallet.currency}`);
  if (!walletCanCoverOrder({ walletStatus: wallet.status, walletCurrency: wallet.currency, orderCurrency: input.currency, availableBalance: wallet.availableBalance, total })) throw new Error(`Insufficient settled VAMNUX wallet balance. Your ${wallet.currency} wallet must cover ${total.toFixed(2)} before you can create this product order.`);
  const orderCode = createOrderCode();

  const [created] = await db.insert(orders).values({
    orderCode,
    userId: input.userId,
    status: "draft",
    paymentStatus: "unpaid",
    supplierStatus: "not_sent",
    currency: input.currency,
    subtotal: total.toFixed(2),
    total: total.toFixed(2),
    fulfillmentDetails: input.fulfillmentDetails,
  }).$returningId();

  const createdItems = await db.insert(orderItems).values(orderLines.map((line) => ({
    orderId: created.id,
    productId: line.product.id,
    productName: line.product.name,
    supplierSku: line.product.supplierSku,
    quantity: line.quantity,
    unitPrice: line.unitPrice.toFixed(2),
    regionLabel: line.product.regionLabel,
    deliveryType: line.product.deliveryType,
    fulfillmentDetails: input.fulfillmentDetails,
  }))).$returningId();
  const manualTaskRows = orderLines.flatMap((line, index) => {
    if (line.product.supplierKey !== ADMIN_MANAGED_SUPPLIER_KEY) return [];
    const item = createdItems[index];
    if (!item) return [];
    const delivery = manualDeliveryMinutesFromMetadata(line.product.metadata);
    return [{ orderId: created.id, orderItemId: item.id, userId: input.userId, productId: line.product.id, status: "pending_payment" as const, deliveryMinimumMinutes: delivery.minimumMinutes, deliveryMaximumMinutes: delivery.maximumMinutes, customerStatusNote: delivery.minimumMinutes || delivery.maximumMinutes ? `Personal VAMNUX delivery is planned within ${formatManualDeliveryWindow(delivery.minimumMinutes, delivery.maximumMinutes)} after payment review.` : "Personal VAMNUX delivery timing will be confirmed after payment review." }];
  });
  if (manualTaskRows.length) await db.insert(manualDeliveryTasks).values(manualTaskRows);
  await db.insert(pricingRateSnapshots).values(orderRateSnapshots.map((snapshot) => ({ pricingRuleId: null, productId: snapshot.productId, orderId: created.id, rateVersionId: snapshot.rateVersionId, context: "order" as const, supplierCost: snapshot.supplierCost.toFixed(2), supplierCurrency: snapshot.supplierCurrency, outputCurrency: snapshot.outputCurrency, exchangeRate: snapshot.exchangeRate.toFixed(6), convertedCost: snapshot.convertedCost.toFixed(2), rateSource: snapshot.rateSource, sourceLabel: snapshot.sourceLabel })));
  const financialRows = orderLines.map((line) => {
    const rate = orderRateSnapshots.find((snapshot) => snapshot.productId === line.product.id);
    const supplierCostInCustomerCurrency = rate?.outputCurrency === input.currency ? rate.convertedCost * line.quantity : null;
    const sellingPrice = line.unitPrice * line.quantity;
    const markupPercent = supplierCostInCustomerCurrency && supplierCostInCustomerCurrency > 0 ? ((sellingPrice - supplierCostInCustomerCurrency) / supplierCostInCustomerCurrency) * 100 : null;
    const financial = calculateFinancialSnapshot({ customerSellingPrice: sellingPrice, supplierCost: rate?.supplierCost ?? null, exchangeRate: rate?.exchangeRate ?? null, supplierCostInCustomerCurrency, paymentProcessingFee: 0, otherApplicableFees: 0 });
    return { sourceType: "order" as const, orderId: created.id, productId: line.product.id, category: line.product.category, supplierKey: line.product.supplierKey, customerSellingPrice: sellingPrice.toFixed(2), customerCurrency: input.currency, supplierCost: rate ? (rate.supplierCost * line.quantity).toFixed(2) : null, supplierCurrency: rate?.supplierCurrency ?? null, exchangeRate: rate?.exchangeRate.toFixed(6) ?? null, supplierCostInCustomerCurrency: supplierCostInCustomerCurrency?.toFixed(2) ?? null, markupPercent: markupPercent?.toFixed(2) ?? null, paymentProcessingFee: "0.00", otherApplicableFees: "0.00", paymentFeeConfigured: false, grossRevenue: financial.grossRevenue.toFixed(2), grossProfit: financial.grossProfit.toFixed(2), netRevenue: financial.netRevenue.toFixed(2), netProfit: financial.netProfit.toFixed(2), profitMarginPercent: financial.profitMarginPercent.toFixed(2), orderStatus: "PENDING PAYMENT" as const, financial };
  });
  const createdFinancialSnapshots = financialRows.length ? await db.insert(financialOrderSnapshots).values(financialRows.map(({ financial: _financial, ...row }) => row)).$returningId() : [];
  if (createdFinancialSnapshots.length) await db.insert(financialOrderEvents).values(createdFinancialSnapshots.map((snapshot) => ({ financialSnapshotId: snapshot.id, eventType: "snapshot_created" as const, amount: "0.00", currency: input.currency, orderStatus: "PENDING PAYMENT" as const, simulationMode: false, note: "Immutable financial snapshot created at order creation. Payment fee remains unconfigured until a provider is approved." })));

  return { orderCode, status: "draft" as const, total: total.toFixed(2), currency: input.currency };
}

function numeric(value: unknown) { return Number(value ?? 0); }

/** Financial and operating metrics derive only from persisted orders, wallets, and customer records. No pending or draft record is represented as revenue. */
export async function getSuperAdminFinanceAnalytics(range?: { start?: Date; end?: Date }) {
  const db = requireDb(await getDb());
  const between = <T extends { createdAt: unknown }>(column: T["createdAt"]) => range?.start && range.end ? and(gte(column as never, range.start), lte(column as never, range.end)) : range?.start ? gte(column as never, range.start) : range?.end ? lte(column as never, range.end) : undefined;
  const [orderSummary] = await db.select({ totalOrders: sql<number>`count(*)`, settledOrders: sql<number>`coalesce(sum(case when ${orders.paymentStatus} = 'paid' then 1 else 0 end), 0)`, refundedOrders: sql<number>`coalesce(sum(case when ${orders.paymentStatus} = 'refunded' then 1 else 0 end), 0)`, failedOrders: sql<number>`coalesce(sum(case when ${orders.status} = 'failed' then 1 else 0 end), 0)`, settledRevenue: sql<string>`coalesce(sum(case when ${orders.paymentStatus} = 'paid' then ${orders.total} else 0 end), 0)`, recordedSupplierCost: sql<string>`coalesce(sum(case when ${orders.paymentStatus} = 'paid' then coalesce(${orders.supplierTotal}, 0) else 0 end), 0)` }).from(orders).where(between(orders.createdAt));
  const [walletSummary] = await db.select({ totalBalance: sql<string>`coalesce(sum(${wallets.availableBalance}), 0)`, activeWallets: sql<number>`coalesce(sum(case when ${wallets.status} = 'active' then 1 else 0 end), 0)` }).from(wallets);
  const [fundingSummary] = await db.select({ pendingFunding: sql<number>`coalesce(sum(case when ${walletFundingAttempts.status} = 'pending' then 1 else 0 end), 0)`, settledFunding: sql<string>`coalesce(sum(case when ${walletFundingAttempts.status} = 'settled' then ${walletFundingAttempts.amount} else 0 end), 0)` }).from(walletFundingAttempts).where(between(walletFundingAttempts.createdAt));
  const [customerSummary] = await db.select({ totalCustomers: sql<number>`count(*)`, activeCustomers: sql<number>`coalesce(sum(case when ${customerProfiles.accountStatus} = 'active' then 1 else 0 end), 0)`, restrictedOrSuspended: sql<number>`coalesce(sum(case when ${customerProfiles.accountStatus} in ('suspended', 'banned', 'restricted') then 1 else 0 end), 0)` }).from(customerProfiles);
  const [newCustomerSummary] = await db.select({ newCustomers: sql<number>`count(*)` }).from(customerProfiles).where(between(customerProfiles.createdAt));
  const paidOrderWhere = and(eq(orders.paymentStatus, "paid"), between(orders.createdAt));
  const [productPerformance, categoryPerformance] = await Promise.all([
    db.select({ productId: orderItems.productId, productName: orderItems.productName, units: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`, revenue: sql<string>`coalesce(sum(${orderItems.quantity} * ${orderItems.unitPrice}), 0)` }).from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id)).where(paidOrderWhere).groupBy(orderItems.productId, orderItems.productName).orderBy(desc(sql`coalesce(sum(${orderItems.quantity} * ${orderItems.unitPrice}), 0)`)).limit(20),
    db.select({ category: products.category, units: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`, revenue: sql<string>`coalesce(sum(${orderItems.quantity} * ${orderItems.unitPrice}), 0)` }).from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id)).innerJoin(products, eq(orderItems.productId, products.id)).where(paidOrderWhere).groupBy(products.category).orderBy(desc(sql`coalesce(sum(${orderItems.quantity} * ${orderItems.unitPrice}), 0)`)).limit(20),
  ]);
  const revenue = numeric(orderSummary?.settledRevenue); const supplierCost = numeric(orderSummary?.recordedSupplierCost); const grossProfit = revenue - supplierCost;
  return { finance: { settledRevenue: revenue, recordedSupplierCost: supplierCost, paymentFees: null as number | null, refunds: 0, grossProfit, estimatedNetProfit: null as number | null, grossMarginPercent: revenue > 0 ? (grossProfit / revenue) * 100 : null as number | null, currency: "USD", note: "Revenue and supplier cost include only orders marked paid within the selected period. Provider fees, automatic refunds, and supplier fulfilment remain inactive or unavailable." }, orders: { total: numeric(orderSummary?.totalOrders), settled: numeric(orderSummary?.settledOrders), refunded: numeric(orderSummary?.refundedOrders), failed: numeric(orderSummary?.failedOrders) }, customers: { total: numeric(customerSummary?.totalCustomers), active: numeric(customerSummary?.activeCustomers), restrictedOrSuspended: numeric(customerSummary?.restrictedOrSuspended), newInPeriod: numeric(newCustomerSummary?.newCustomers) }, wallets: { totalBalance: numeric(walletSummary?.totalBalance), activeWallets: numeric(walletSummary?.activeWallets), pendingFundingRequests: numeric(fundingSummary?.pendingFunding), manuallySettledFunding: numeric(fundingSummary?.settledFunding) }, performance: { topProducts: productPerformance.map((row) => ({ ...row, units: numeric(row.units), revenue: numeric(row.revenue), profit: null as number | null })), topCategories: categoryPerformance.map((row) => ({ ...row, units: numeric(row.units), revenue: numeric(row.revenue), profit: null as number | null })) }, period: { start: range?.start ?? null, end: range?.end ?? null } };
}

/** Owner-only attribution reporting. It uses customer-provided registration source and stored paid orders; it does not infer visitors, referrers, or search performance. */
export async function getSuperAdminTrafficAnalytics(window: "1d" | "3d" | "7d" | "14d" | "1m" | "3m" | "1y") {
  const db = requireDb(await getDb());
  const end = new Date();
  const start = new Date(end);
  if (window === "1d") start.setDate(start.getDate() - 1);
  if (window === "3d") start.setDate(start.getDate() - 3);
  if (window === "7d") start.setDate(start.getDate() - 7);
  if (window === "14d") start.setDate(start.getDate() - 14);
  if (window === "1m") start.setMonth(start.getMonth() - 1);
  if (window === "3m") start.setMonth(start.getMonth() - 3);
  if (window === "1y") start.setFullYear(start.getFullYear() - 1);

  const [profilesInPeriod, allProfiles, paidOrders] = await Promise.all([
    db.select({ userId: customerProfiles.userId, registrationSource: customerProfiles.registrationSource, countryCode: customerProfiles.countryCode }).from(customerProfiles).where(and(gte(customerProfiles.createdAt, start), lte(customerProfiles.createdAt, end))),
    db.select({ userId: customerProfiles.userId, registrationSource: customerProfiles.registrationSource }).from(customerProfiles),
    db.select({ userId: orders.userId, total: orders.total, currency: orders.currency }).from(orders).where(and(eq(orders.paymentStatus, "paid"), gte(orders.createdAt, start), lte(orders.createdAt, end))),
  ]);

  type SourceRollup = { signups: number; purchases: number; revenue: Record<string, number> };
  const sourceFor = (value: string | null) => value?.trim() || "Direct / unknown";
  const sourceRows = new Map<string, SourceRollup>();
  const countryRows = new Map<string, number>();
  const profileSourceByUser = new Map(allProfiles.map((profile) => [profile.userId, sourceFor(profile.registrationSource)]));
  const rollupFor = (source: string) => {
    const current = sourceRows.get(source) || { signups: 0, purchases: 0, revenue: {} };
    sourceRows.set(source, current);
    return current;
  };

  for (const profile of profilesInPeriod) {
    rollupFor(sourceFor(profile.registrationSource)).signups += 1;
    const country = profile.countryCode?.trim().toUpperCase() || "Not provided";
    countryRows.set(country, (countryRows.get(country) || 0) + 1);
  }
  for (const order of paidOrders) {
    const rollup = rollupFor(profileSourceByUser.get(order.userId) || "Direct / unknown");
    const currency = order.currency || "USD";
    rollup.purchases += 1;
    rollup.revenue[currency] = (rollup.revenue[currency] || 0) + numeric(order.total);
  }

  const totalRevenue: Record<string, number> = {};
  for (const order of paidOrders) {
    const currency = order.currency || "USD";
    totalRevenue[currency] = (totalRevenue[currency] || 0) + numeric(order.total);
  }
  const totalSignups = profilesInPeriod.length;
  const sources = Array.from(sourceRows.entries()).map(([source, row]) => ({
    source,
    signups: row.signups,
    purchases: row.purchases,
    revenue: Object.entries(row.revenue).map(([currency, total]) => ({ currency, total })).sort((a, b) => a.currency.localeCompare(b.currency)),
    signupShare: totalSignups ? (row.signups / totalSignups) * 100 : 0,
  })).sort((a, b) => b.signups - a.signups || b.purchases - a.purchases || a.source.localeCompare(b.source));

  return {
    period: { start, end, window },
    metrics: { signups: totalSignups, purchases: paidOrders.length, revenue: Object.entries(totalRevenue).map(([currency, total]) => ({ currency, total })).sort((a, b) => a.currency.localeCompare(b.currency)), sourceCount: sources.length, countryCount: countryRows.size },
    sources,
    countries: Array.from(countryRows.entries()).map(([country, signups]) => ({ country, signups, signupShare: totalSignups ? (signups / totalSignups) * 100 : 0 })).sort((a, b) => b.signups - a.signups || a.country.localeCompare(b.country)),
    note: "Traffic source reflects stored customer registration attribution. Visitor counts, external referrers, Google ranking, impressions, and clicks are unavailable until a privacy-reviewed analytics or search integration is connected.",
  };
}

export async function listPromotions() {
  const db = requireDb(await getDb());
  const rows = await db.select().from(promotions).orderBy(desc(promotions.updatedAt));
  return rows.map((row) => ({ ...row, discountAmount: numeric(row.discountAmount), minimumOrder: row.minimumOrder === null ? null : numeric(row.minimumOrder), maximumDiscount: row.maximumDiscount === null ? null : numeric(row.maximumDiscount) }));
}

export async function createPromotion(input: { name: string; code?: string | null; discountType: "percentage" | "fixed_amount"; discountAmount: number; minimumOrder?: number | null; maximumDiscount?: number | null; productId?: number | null; categorySlug?: string | null; startsAt?: Date | null; endsAt?: Date | null; usageLimit?: number | null; perUserLimit?: number | null; status: "draft" | "scheduled" | "active" | "paused" | "archived"; adminUserId: number }) {
  const name = input.name.trim();
  const code = input.code?.trim().toUpperCase() || null;
  if (!name || name.length > 160) throw new Error("Promotion name must contain 1–160 characters");
  if (code && !/^[A-Z0-9_-]{3,64}$/.test(code)) throw new Error("Promotion code must use 3–64 uppercase letters, numbers, underscores, or hyphens");
  if (!Number.isFinite(input.discountAmount) || input.discountAmount <= 0 || (input.discountType === "percentage" && input.discountAmount > 100)) throw new Error("Enter a valid positive discount; percentage discounts cannot exceed 100%");
  if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) throw new Error("Promotion end time must be after its start time");
  const db = requireDb(await getDb());
  const [created] = await db.insert(promotions).values({ name, code, discountType: input.discountType, discountAmount: input.discountAmount.toFixed(2), minimumOrder: input.minimumOrder === null || input.minimumOrder === undefined ? null : input.minimumOrder.toFixed(2), maximumDiscount: input.maximumDiscount === null || input.maximumDiscount === undefined ? null : input.maximumDiscount.toFixed(2), productId: input.productId ?? null, categorySlug: input.categorySlug?.trim() || null, startsAt: input.startsAt ?? null, endsAt: input.endsAt ?? null, usageLimit: input.usageLimit ?? null, perUserLimit: input.perUserLimit ?? null, status: input.status, createdByAdminId: input.adminUserId }).$returningId();
  await appendAdminAuditEvent(db, { adminUserId: input.adminUserId, action: "promotion.created", targetType: "promotion", targetId: created.id, summary: `Created ${input.status} promotion ${name}`, metadata: { code, discountType: input.discountType, discountAmount: input.discountAmount, status: input.status, operational: false } });
  return { id: created.id, name, code, status: input.status };
}

export async function getReferralSettings() {
  const db = requireDb(await getDb());
  const [settings] = await db.select().from(referralSettings).where(eq(referralSettings.id, 1)).limit(1);
  return settings ? { ...settings, percentageReward: numeric(settings.percentageReward), fixedReward: numeric(settings.fixedReward), minimumQualifyingOrder: numeric(settings.minimumQualifyingOrder), maximumReward: settings.maximumReward === null ? null : numeric(settings.maximumReward) } : null;
}

export async function updateReferralSettings(input: { percentageReward: number; fixedReward: number; minimumQualifyingOrder: number; maximumReward?: number | null; releaseDays: number; status: "disabled" | "configured"; adminUserId: number }) {
  if ([input.percentageReward, input.fixedReward, input.minimumQualifyingOrder].some((value) => !Number.isFinite(value) || value < 0) || !Number.isInteger(input.releaseDays) || input.releaseDays < 0) throw new Error("Referral values must be non-negative and release days must be a whole number");
  const db = requireDb(await getDb());
  const values = { id: 1, percentageReward: input.percentageReward.toFixed(2), fixedReward: input.fixedReward.toFixed(2), minimumQualifyingOrder: input.minimumQualifyingOrder.toFixed(2), maximumReward: input.maximumReward === null || input.maximumReward === undefined ? null : input.maximumReward.toFixed(2), releaseDays: input.releaseDays, status: input.status, updatedByAdminId: input.adminUserId };
  await db.insert(referralSettings).values(values).onDuplicateKeyUpdate({ set: values });
  await appendAdminAuditEvent(db, { adminUserId: input.adminUserId, action: "referral.settings_updated", targetType: "referral_settings", targetId: 1, summary: `Updated referral policy configuration (${input.status})`, metadata: { operational: false, status: input.status } });
  return getReferralSettings();
}

export async function getLoyaltySettings() {
  const db = requireDb(await getDb());
  const [settings] = await db.select().from(loyaltySettings).where(eq(loyaltySettings.id, 1)).limit(1);
  return settings ? { ...settings, pointsPerCurrencyUnit: numeric(settings.pointsPerCurrencyUnit), redemptionValuePerPoint: numeric(settings.redemptionValuePerPoint) } : null;
}

export async function updateLoyaltySettings(input: { pointsPerCurrencyUnit: number; redemptionValuePerPoint: number; expiryDays?: number | null; status: "disabled" | "configured"; adminUserId: number }) {
  if (![input.pointsPerCurrencyUnit, input.redemptionValuePerPoint].every((value) => Number.isFinite(value) && value >= 0) || (input.expiryDays !== null && input.expiryDays !== undefined && (!Number.isInteger(input.expiryDays) || input.expiryDays < 0))) throw new Error("Loyalty values must be non-negative; expiry days must be a non-negative whole number");
  const db = requireDb(await getDb());
  const values = { id: 1, pointsPerCurrencyUnit: input.pointsPerCurrencyUnit.toFixed(4), redemptionValuePerPoint: input.redemptionValuePerPoint.toFixed(4), expiryDays: input.expiryDays ?? null, status: input.status, updatedByAdminId: input.adminUserId };
  await db.insert(loyaltySettings).values(values).onDuplicateKeyUpdate({ set: values });
  await appendAdminAuditEvent(db, { adminUserId: input.adminUserId, action: "loyalty.settings_updated", targetType: "loyalty_settings", targetId: 1, summary: `Updated loyalty policy configuration (${input.status})`, metadata: { operational: false, status: input.status } });
  return getLoyaltySettings();
}

export async function listResellers() {
  const db = requireDb(await getDb());
  const rows = await db.select({ reseller: resellers, user: users, profile: customerProfiles }).from(resellers)
    .innerJoin(users, eq(resellers.userId, users.id)).leftJoin(customerProfiles, eq(users.id, customerProfiles.userId))
    .orderBy(desc(resellers.updatedAt));
  return rows.map(({ reseller, user, profile }) => ({ id: reseller.id, userId: reseller.userId, tier: reseller.tier, discountPercent: numeric(reseller.discountPercent), status: reseller.status, approvedAt: reseller.approvedAt, updatedAt: reseller.updatedAt, customerName: user.name, email: user.email, username: profile?.username ?? null }));
}

export async function upsertReseller(input: { userId: number; tier: "retail" | "reseller" | "vip_reseller" | "enterprise"; discountPercent: number; status: "pending" | "approved" | "suspended" | "rejected"; adminUserId: number }) {
  if (!Number.isFinite(input.discountPercent) || input.discountPercent < 0 || input.discountPercent > 100) throw new Error("Reseller discount must be between 0% and 100%");
  const db = requireDb(await getDb());
  const [user] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, input.userId)).limit(1);
  if (!user) throw new Error("Customer account was not found");
  const [existing] = await db.select({ id: resellers.id, status: resellers.status }).from(resellers).where(eq(resellers.userId, input.userId)).limit(1);
  const approvedAt = input.status === "approved" ? new Date() : null;
  const values = { userId: input.userId, tier: input.tier, discountPercent: input.discountPercent.toFixed(2), status: input.status, approvedAt, updatedByAdminId: input.adminUserId };
  await db.insert(resellers).values(values).onDuplicateKeyUpdate({ set: values });
  await appendAdminAuditEvent(db, { adminUserId: input.adminUserId, action: existing ? "reseller.updated" : "reseller.created", targetType: "reseller", targetId: input.userId, summary: `${existing ? "Updated" : "Created"} reseller designation for ${user.name || `customer #${input.userId}`}`, metadata: { tier: input.tier, discountPercent: input.discountPercent, status: input.status, operational: false } });
  return listResellers();
}

export async function listSiteSettings() {
  const db = requireDb(await getDb());
  return db.select().from(siteSettings).orderBy(siteSettings.category, siteSettings.settingKey);
}

export async function upsertSiteSetting(input: { settingKey: string; category: "general" | "currency" | "payments" | "email" | "notifications" | "orders" | "security"; value: Record<string, unknown>; adminUserId: number }) {
  const settingKey = input.settingKey.trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!settingKey || settingKey.length > 120) throw new Error("Setting key must contain 1–120 letters, numbers, dots, underscores, or hyphens");
  const safeText = JSON.stringify(input.value);
  if (/api[_-]?key|secret|password|private[_-]?key/i.test(safeText)) throw new Error("Secrets and credentials must remain in protected environment configuration, not site settings");
  const db = requireDb(await getDb());
  const [existing] = await db.select({ id: siteSettings.id }).from(siteSettings).where(eq(siteSettings.settingKey, settingKey)).limit(1);
  const values = { settingKey, category: input.category, value: input.value, updatedByAdminId: input.adminUserId };
  await db.insert(siteSettings).values(values).onDuplicateKeyUpdate({ set: values });
  await appendAdminAuditEvent(db, { adminUserId: input.adminUserId, action: existing ? "settings.updated" : "settings.created", targetType: "site_setting", targetId: settingKey, summary: `${existing ? "Updated" : "Created"} ${input.category} setting ${settingKey}`, metadata: { category: input.category } });
  return { settingKey, category: input.category };
}

export async function listNotificationTemplates() {
  const db = requireDb(await getDb());
  return db.select().from(notificationTemplates).orderBy(notificationTemplates.channel, notificationTemplates.eventType);
}

export async function upsertNotificationTemplate(input: { templateKey: string; channel: "in_app" | "email" | "sms" | "whatsapp"; eventType: string; subject?: string | null; body: string; status: "draft" | "active" | "archived"; adminUserId: number }) {
  const templateKey = input.templateKey.trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, "-").replace(/^-+|-+$/g, "");
  const eventType = input.eventType.trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, "_").replace(/^_+|_+$/g, "");
  const body = input.body.trim();
  if (!templateKey || !eventType || !body) throw new Error("Template key, event type, and body are required");
  const db = requireDb(await getDb());
  const [existing] = await db.select({ id: notificationTemplates.id }).from(notificationTemplates).where(eq(notificationTemplates.templateKey, templateKey)).limit(1);
  const values = { templateKey, channel: input.channel, eventType, subject: input.subject?.trim() || null, body, status: input.status, updatedByAdminId: input.adminUserId };
  await db.insert(notificationTemplates).values(values).onDuplicateKeyUpdate({ set: values });
  await appendAdminAuditEvent(db, { adminUserId: input.adminUserId, action: existing ? "notification_template.updated" : "notification_template.created", targetType: "notification_template", targetId: templateKey, summary: `${existing ? "Updated" : "Created"} ${input.channel} ${eventType} notification template`, metadata: { channel: input.channel, status: input.status, externalDeliveryEnabled: false } });
  return { templateKey, channel: input.channel, status: input.status };
}

export async function listRedactedApiRequestLogs(limit = 100) {
  const db = requireDb(await getDb());
  return db.select().from(apiRequestLogs).orderBy(desc(apiRequestLogs.createdAt)).limit(Math.min(250, Math.max(1, limit)));
}

/** Safe supplier webhook receipt list. Raw webhook payloads, signatures, and fulfilment details remain unavailable to the Admin browser. */
export async function listRedactedSupplierWebhookEvents(limit = 100) {
  const db = requireDb(await getDb());
  return db.select({
    supplierKey: supplierWebhookEvents.supplierKey,
    eventId: supplierWebhookEvents.eventId,
    eventType: supplierWebhookEvents.eventType,
    processingStatus: supplierWebhookEvents.processingStatus,
    integrityHashRecorded: sql<boolean>`case when ${supplierWebhookEvents.payloadHash} is not null then true else false end`,
    receivedAt: supplierWebhookEvents.receivedAt,
    processedAt: supplierWebhookEvents.processedAt,
  }).from(supplierWebhookEvents).orderBy(desc(supplierWebhookEvents.receivedAt)).limit(Math.min(250, Math.max(1, limit)));
}

/** Fast owner-only lookup across safe operational identifiers. Search results deliberately omit credentials, digital codes, and fulfilment payloads. */
export async function globalAdminSearch(query: string) {
  const db = requireDb(await getDb());
  const term = query.trim().slice(0, 120);
  if (term.length < 2) return { customers: [], orders: [], products: [], tickets: [], funding: [], requests: [], activity: [] };
  const pattern = `%${term}%`;
  const [customers, foundOrders, foundProducts, tickets, funding, requests, activity] = await Promise.all([
    db.select({ id: users.id, name: users.name, email: users.email, username: customerProfiles.username, accountStatus: customerProfiles.accountStatus }).from(users).leftJoin(customerProfiles, eq(users.id, customerProfiles.userId)).where(or(like(users.name, pattern), like(users.email, pattern), like(customerProfiles.username, pattern), like(customerProfiles.phone, pattern))).limit(10),
    db.select({ orderCode: orders.orderCode, status: orders.status, paymentStatus: orders.paymentStatus, total: orders.total, currency: orders.currency, userId: orders.userId, createdAt: orders.createdAt }).from(orders).where(or(like(orders.orderCode, pattern), like(orders.supplierOrderId, pattern))).limit(10),
    db.select({ id: products.id, name: products.name, slug: products.slug, supplierKey: products.supplierKey, supplierSku: products.supplierSku, status: products.status }).from(products).where(or(like(products.name, pattern), like(products.slug, pattern), like(products.supplierSku, pattern))).limit(10),
    db.select({ ticketCode: supportTickets.ticketCode, subject: supportTickets.subject, status: supportTickets.status, userId: supportTickets.userId, updatedAt: supportTickets.updatedAt }).from(supportTickets).where(or(like(supportTickets.ticketCode, pattern), like(supportTickets.subject, pattern))).limit(10),
    db.select({ fundingCode: walletFundingAttempts.fundingCode, providerReference: walletFundingAttempts.providerReference, status: walletFundingAttempts.status, amount: walletFundingAttempts.amount, currency: walletFundingAttempts.currency, userId: walletFundingAttempts.userId, createdAt: walletFundingAttempts.createdAt }).from(walletFundingAttempts).where(or(like(walletFundingAttempts.fundingCode, pattern), like(walletFundingAttempts.providerReference, pattern))).limit(10),
    db.select({ id: customerProductRequests.id, requestCode: customerProductRequests.requestCode, requestedName: customerProductRequests.requestedName, status: customerProductRequests.status, category: customerProductRequests.category, updatedAt: customerProductRequests.updatedAt }).from(customerProductRequests).where(or(like(customerProductRequests.requestCode, pattern), like(customerProductRequests.requestedName, pattern), like(customerProductRequests.details, pattern))).limit(10),
    db.select({ id: customerProductActivityEvents.id, activityType: customerProductActivityEvents.activityType, productName: products.name, customerName: users.name, customerEmail: users.email, createdAt: customerProductActivityEvents.createdAt }).from(customerProductActivityEvents).innerJoin(products, eq(customerProductActivityEvents.productId, products.id)).innerJoin(users, eq(customerProductActivityEvents.userId, users.id)).where(or(like(products.name, pattern), like(users.name, pattern), like(users.email, pattern))).limit(10),
  ]);
  return { customers, orders: foundOrders, products: foundProducts, tickets, funding, requests, activity };
}
