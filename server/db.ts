import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { commerceIntegrations, customerProfiles, InsertUser, orderItems, orders, products, supplierWebhookEvents, users, wallets } from "../drizzle/schema";
import { calculateOrderTotal, createOrderCode, type SupportedCurrency } from "../shared/marketplace";
import type { FlashTopUpCatalogRow } from "./flashtopupCatalog";
import { ENV } from './_core/env';

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
  return db.select().from(products).where(eq(products.status, "active")).orderBy(desc(products.createdAt));
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

export async function upsertFlashTopUpCatalogRows(rows: FlashTopUpCatalogRow[]) {
  const db = requireDb(await getDb());
  for (const row of rows) {
    await db.insert(products).values({
      slug: row.slug,
      supplierKey: "flashtopup",
      supplierSku: row.supplierSku,
      supplierCategory: row.supplierCategory,
      name: row.name,
      category: row.category,
      imageUrl: row.imageUrl,
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
        imageUrl: row.imageUrl,
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
  return { synced: rows.length };
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
  if (catalogRows.length !== productIds.length) throw new Error("One or more selected products are unavailable");

  const orderLines = input.items.map((item) => {
    const product = catalogRows.find((row) => row.id === item.productId);
    if (!product) throw new Error("Selected product is unavailable");
    return { product, quantity: item.quantity, unitPrice: Number(product.basePrice) };
  });
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
