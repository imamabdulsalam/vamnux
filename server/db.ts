import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { adminAuditEvents, authorizedCatalogSources, commerceIntegrations, customerConsents, customerNotificationPreferences, customerNotifications, customerPrivacyRequests, customerProfiles, customerSecurityEvents, InsertUser, marketplacePricingSettings, orderItems, orders, products, savedProducts, siteContentPages, supplierWebhookEvents, supportTicketMessages, supportTickets, users, walletEntries, walletFundingAttempts, wallets } from "../drizzle/schema";
import { ADMIN_MANAGED_SUPPLIER_KEY, createAdminManagedCatalogSlug, createRecipientEmailRequirement, type AdminManagedCatalogProductInput, type AuthorizedCatalogSourceInput } from "../shared/adminCatalog";
import { calculateOrderTotal, createFulfillmentFieldKey, createOrderCode, type SupportedCurrency } from "../shared/marketplace";
import { calculateCustomerDisplayPrice, describePriceRule } from "../shared/pricing";
import type { SupplierCatalogRow } from "./catalogTypes";
import { ENV } from './_core/env';

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
  { slug: "terms-of-service", title: "VAMNUX Terms of Service", version: "draft-1", body: "# Draft Terms of Service\n\n**Draft for owner and legal review — not a final legal document.**\n\nThese draft terms describe the proposed rules for using VAMNUX, including account responsibility, wallet-only purchases, product eligibility, order handling, acceptable use, and dispute contact. They must be reviewed, edited, and approved by qualified legal counsel before publication or launch." },
  { slug: "privacy-policy", title: "VAMNUX Privacy Policy", version: "draft-1", body: "# Draft Privacy Policy\n\n**Draft for owner and legal review — not a final legal document.**\n\nThis draft explains the proposed collection and use of minimum account, order, wallet, and support information needed to operate VAMNUX. It also describes customer rights to request access, correction, or account-deletion review. It must be reviewed, edited, and approved by qualified legal counsel before publication or launch." },
  { slug: "refund-policy", title: "VAMNUX Refund Policy", version: "draft-1", body: "# Draft Refund Policy\n\n**Draft for owner and legal review — not a final legal document.**\n\nThis draft sets out a proposed review process for eligible failed, duplicate, or unfulfilled digital-product transactions. Product, supplier, payment, and jurisdiction-specific rules must be confirmed before any final customer-facing policy is published." },
  { slug: "cookie-policy", title: "VAMNUX Cookie Policy", version: "draft-1", body: "# Draft Cookie Policy\n\n**Draft for owner and legal review — not a final legal document.**\n\nThis draft explains the proposed use of essential session cookies and any future optional analytics or preference technologies. It must be reviewed, edited, and approved before publication or launch." },
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
    await db.insert(siteContentPages).values(policy).onDuplicateKeyUpdate({ set: { slug: policy.slug } });
  }
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

export async function updateMarketplacePricingSettings(input: { defaultMarkupPercent: number; adminUserId: number }) {
  if (!Number.isFinite(input.defaultMarkupPercent) || input.defaultMarkupPercent < -100 || input.defaultMarkupPercent > 500) throw new Error("Default markup must be between -100% and 500%");
  const db = requireDb(await getDb());
  const settings = await ensureMarketplacePricingSettings(db);
  await db.insert(marketplacePricingSettings).values({ id: 1, defaultMarkupPercent: input.defaultMarkupPercent.toFixed(2) }).onDuplicateKeyUpdate({ set: { defaultMarkupPercent: input.defaultMarkupPercent.toFixed(2) } });
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

const numericValue = (value: unknown) => Number(value ?? 0);

export async function getSuperAdminOverview() {
  const db = requireDb(await getDb());
  const [catalog] = await db.select({
    total: sql<number>`count(*)`,
    active: sql<number>`sum(case when ${products.status} = 'active' then 1 else 0 end)`,
    paused: sql<number>`sum(case when ${products.status} = 'paused' then 1 else 0 end)`,
  }).from(products);
  const [customerCount] = await db.select({ total: sql<number>`count(*)` }).from(users).where(eq(users.role, "user"));
  const [orderCount] = await db.select({ total: sql<number>`count(*)` }).from(orders);
  const [walletEntryCount] = await db.select({ total: sql<number>`count(*)` }).from(walletEntries);
  const [pendingFundingCount] = await db.select({ total: sql<number>`count(*)` }).from(walletFundingAttempts).where(eq(walletFundingAttempts.status, "pending"));
  const suppliers = await db.select({
    id: commerceIntegrations.id,
    providerName: commerceIntegrations.providerName,
    syncStatus: commerceIntegrations.syncStatus,
    lastSyncAt: commerceIntegrations.lastSyncAt,
    lastError: commerceIntegrations.lastError,
  }).from(commerceIntegrations).where(eq(commerceIntegrations.integrationType, "supplier")).orderBy(desc(commerceIntegrations.updatedAt));
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
    recentAudit: await listSuperAdminAuditEvents(6),
  };
}

export async function listSuperAdminCustomers(limit = 100) {
  const db = requireDb(await getDb());
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
    preferredCurrency: customerProfiles.preferredCurrency,
    countryCode: customerProfiles.countryCode,
  }).from(users).leftJoin(customerProfiles, eq(users.id, customerProfiles.userId)).orderBy(desc(users.createdAt)).limit(limit);
}

export async function listSuperAdminOrders(limit = 100) {
  const db = requireDb(await getDb());
  return db.select({
    orderCode: orders.orderCode,
    status: orders.status,
    paymentStatus: orders.paymentStatus,
    supplierStatus: orders.supplierStatus,
    currency: orders.currency,
    total: orders.total,
    createdAt: orders.createdAt,
    customerId: users.id,
    customerName: users.name,
    customerEmail: users.email,
  }).from(orders).leftJoin(users, eq(orders.userId, users.id)).orderBy(desc(orders.createdAt)).limit(limit);
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

  return {
    profile: profile ?? null,
    wallet: wallet ? { currency: wallet.currency, availableBalance: wallet.availableBalance, status: wallet.status } : { currency: "USD", availableBalance: "0.00", status: "inactive" as const },
    orders: recentOrders,
  };
}

/** Returns only the authenticated customer's own operational records for the VAMNUX user dashboard. */
export async function getCustomerDashboard(userId: number) {
  const db = requireDb(await getDb());
  await ensureCustomerAccountRows(db, userId);
  await ensureDraftPolicyPages(db);
  const settings = await ensureMarketplacePricingSettings(db);
  const [profile] = await db.select().from(customerProfiles).where(eq(customerProfiles.userId, userId)).limit(1);
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
  }).from(customerPrivacyRequests).where(eq(customerPrivacyRequests.userId, userId)).orderBy(desc(customerPrivacyRequests.createdAt)).limit(12);
  const policyPages = await db.select({
    slug: siteContentPages.slug,
    title: siteContentPages.title,
    status: siteContentPages.status,
    version: siteContentPages.version,
    updatedAt: siteContentPages.updatedAt,
  }).from(siteContentPages).orderBy(siteContentPages.title);
  return {
    profile: profile ?? null,
    wallet: wallet ? { currency: wallet.currency, availableBalance: wallet.availableBalance, status: wallet.status } : { currency: "USD", availableBalance: "0.00", status: "inactive" as const },
    orders: recentOrders,
    walletEntries: recentWalletEntries,
    fundingRequests,
    savedProducts: savedRows.map((product) => ({ ...product, ...customerPriceForProduct(product, settings) })),
    notificationPreferences: notificationPreferences ?? null,
    notifications,
    securityEvents,
    tickets,
    privacyRequests,
    policyPages,
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

export async function updateCustomerNotificationPreferences(input: { userId: number; orderUpdates: boolean; paymentUpdates: boolean; walletUpdates: boolean; marketingUpdates: boolean; productAnnouncements: boolean }) {
  const db = requireDb(await getDb());
  await ensureCustomerAccountRows(db, input.userId);
  await db.update(customerNotificationPreferences).set({
    orderUpdates: input.orderUpdates,
    paymentUpdates: input.paymentUpdates,
    walletUpdates: input.walletUpdates,
    marketingUpdates: input.marketingUpdates,
    productAnnouncements: input.productAnnouncements,
  }).where(eq(customerNotificationPreferences.userId, input.userId));
  const [preferences] = await db.select().from(customerNotificationPreferences).where(eq(customerNotificationPreferences.userId, input.userId)).limit(1);
  return preferences;
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
  await db.insert(savedProducts).values({ userId: input.userId, productId: input.productId });
  return { productId: input.productId, saved: true } as const;
}

function createWalletFundingCode() {
  return `WF${crypto.randomUUID().replace(/-/g, "").slice(0, 18).toUpperCase()}`;
}

export async function createCustomerWalletFundingRequest(input: { userId: number; amount: number; currency: "USD" | "EUR" | "GBP" | "NGN"; customerNote?: string }) {
  if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 1_000_000) throw new Error("Enter a wallet top-up amount between 0.01 and 1,000,000");
  const db = requireDb(await getDb());
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
