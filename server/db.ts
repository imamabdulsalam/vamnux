import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { authorizedCatalogSources, commerceIntegrations, customerProfiles, InsertUser, marketplacePricingSettings, orderItems, orders, products, supplierWebhookEvents, users, wallets } from "../drizzle/schema";
import { ADMIN_MANAGED_SUPPLIER_KEY, createAdminManagedCatalogSlug, createRecipientEmailRequirement, type AdminManagedCatalogProductInput, type AuthorizedCatalogSourceInput } from "../shared/adminCatalog";
import { calculateOrderTotal, createFulfillmentFieldKey, createOrderCode, type SupportedCurrency } from "../shared/marketplace";
import { calculateCustomerDisplayPrice, describePriceRule } from "../shared/pricing";
import type { SupplierCatalogRow } from "./catalogTypes";
import { ENV } from './_core/env';

export const FLASHTOPUP_SUPPLIER_KEY = "flashtopup" as const;
export const FOXRELOAD_SUPPLIER_KEY = "foxreload" as const;

export function assertSupplierCatalogRowScope(supplierKey: string, rows: SupplierCatalogRow[]) {
  const requiredPrefix = supplierKey === FLASHTOPUP_SUPPLIER_KEY ? "ft-" : supplierKey === FOXRELOAD_SUPPLIER_KEY ? "fr-" : null;
  if (requiredPrefix && rows.some((row) => !row.slug.startsWith(requiredPrefix))) {
    throw new Error(`Catalog rows for ${supplierKey} must use the ${requiredPrefix} supplier slug prefix`);
  }
}

type PricingSettings = { defaultMarkupPercent: number };

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

function requireDb<T>(db: T | null): T {
  if (!db) throw new Error("Marketplace database is not available");
  return db;
}

export async function listActiveCatalogProducts() {
  const db = await getDb();
  if (!db) return [];
  const settings = await ensureMarketplacePricingSettings(db);
  const activeProducts = await db.select().from(products).where(eq(products.status, "active")).orderBy(desc(products.createdAt));
  return activeProducts.map((product) => ({ ...product, ...customerPriceForProduct(product, settings) }));
}

export async function getMarketplacePricingSettings() {
  const db = requireDb(await getDb());
  return ensureMarketplacePricingSettings(db);
}

export async function updateMarketplacePricingSettings(input: { defaultMarkupPercent: number }) {
  if (!Number.isFinite(input.defaultMarkupPercent) || input.defaultMarkupPercent < -100 || input.defaultMarkupPercent > 500) throw new Error("Default markup must be between -100% and 500%");
  const db = requireDb(await getDb());
  await db.insert(marketplacePricingSettings).values({ id: 1, defaultMarkupPercent: input.defaultMarkupPercent.toFixed(2) }).onDuplicateKeyUpdate({ set: { defaultMarkupPercent: input.defaultMarkupPercent.toFixed(2) } });
  return getMarketplacePricingSettings();
}

export async function listCatalogPricing() {
  const db = requireDb(await getDb());
  const settings = await ensureMarketplacePricingSettings(db);
  const catalog = await db.select().from(products).orderBy(desc(products.updatedAt));
  return catalog.map((product) => ({
    id: product.id, name: product.name, slug: product.slug, supplierKey: product.supplierKey, category: product.category, status: product.status,
    supplierBasePrice: Number(product.basePrice),
    markupPercentOverride: product.markupPercentOverride === null ? null : Number(product.markupPercentOverride),
    displayPriceOverride: product.displayPriceOverride === null ? null : Number(product.displayPriceOverride),
    ...customerPriceForProduct(product, settings),
  }));
}

export async function updateCatalogProductPricing(input: { productId: number; markupPercentOverride?: number | null; displayPriceOverride?: number | null }) {
  const hasMarkup = input.markupPercentOverride !== undefined && input.markupPercentOverride !== null;
  const hasFixed = input.displayPriceOverride !== undefined && input.displayPriceOverride !== null;
  if (hasMarkup && (!Number.isFinite(input.markupPercentOverride!) || input.markupPercentOverride! < -100 || input.markupPercentOverride! > 500)) throw new Error("Product markup must be between -100% and 500%");
  if (hasFixed && (!Number.isFinite(input.displayPriceOverride!) || input.displayPriceOverride! < 0)) throw new Error("Fixed customer price must be a non-negative number");
  if (hasMarkup && hasFixed) throw new Error("Use either a percentage markup or a fixed customer price, not both");
  const db = requireDb(await getDb());
  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, input.productId)).limit(1);
  if (!product) throw new Error("Catalog product was not found");
  await db.update(products).set({
    markupPercentOverride: hasMarkup ? input.markupPercentOverride!.toFixed(2) : null,
    displayPriceOverride: hasFixed ? input.displayPriceOverride!.toFixed(2) : null,
  }).where(eq(products.id, input.productId));
  return listCatalogPricing();
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
    },
  }).$returningId();

  return { id: created.id, name: input.name, status: input.status, slug };
}

export async function setAdminManagedCatalogProductStatus(input: { productId: number; status: "active" | "paused" | "archived" }) {
  const db = requireDb(await getDb());
  const [product] = await db.select({ id: products.id, name: products.name }).from(products)
    .where(and(eq(products.id, input.productId), eq(products.supplierKey, ADMIN_MANAGED_SUPPLIER_KEY))).limit(1);
  if (!product) throw new Error("Admin-managed catalog item was not found");

  await db.update(products).set({
    status: input.status,
    supplierEligible: input.status === "active",
  }).where(eq(products.id, product.id));

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

  return {
    profile: profile ?? null,
    wallet: wallet ? { currency: wallet.currency, availableBalance: wallet.availableBalance, status: wallet.status } : { currency: "USD", availableBalance: "0.00", status: "inactive" as const },
    orders: recentOrders,
  };
}

export async function createMarketplaceOrder(input: {
  userId: number;
  currency: SupportedCurrency;
  items: Array<{ productId: number; quantity: number }>;
  fulfillmentDetails?: Record<string, string>;
}) {
  const db = requireDb(await getDb());
  const productIds = Array.from(new Set(input.items.map((item) => item.productId)));
  const catalogRows = await db.select().from(products).where(and(inArray(products.id, productIds), eq(products.status, "active")));
  const settings = await ensureMarketplacePricingSettings(db);
  if (catalogRows.length !== productIds.length) throw new Error("One or more selected products are unavailable");

  const orderLines = input.items.map((item) => {
    const product = catalogRows.find((row) => row.id === item.productId);
    if (!product) throw new Error("Selected product is unavailable");
    return { product, quantity: item.quantity, unitPrice: customerPriceForProduct(product, settings).customerPrice };
  });
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

  await db.insert(orderItems).values(orderLines.map((line) => ({
    orderId: created.id,
    productId: line.product.id,
    productName: line.product.name,
    supplierSku: line.product.supplierSku,
    quantity: line.quantity,
    unitPrice: line.unitPrice.toFixed(2),
    regionLabel: line.product.regionLabel,
    deliveryType: line.product.deliveryType,
    fulfillmentDetails: input.fulfillmentDetails,
  })));

  return { orderCode, status: "draft" as const, total: total.toFixed(2), currency: input.currency };
}
