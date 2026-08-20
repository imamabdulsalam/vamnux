import { boolean, decimal, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Customer settings that are separate from the OAuth-backed core user record. */
export const customerProfiles = mysqlTable("customer_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  preferredCurrency: varchar("preferredCurrency", { length: 3 }).default("USD").notNull(),
  countryCode: varchar("countryCode", { length: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userUnique: uniqueIndex("customer_profiles_user_unique").on(table.userId),
}));

/** Supplier-normalised catalog records. Supplier secrets must remain in environment variables, never this table. */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 180 }).notNull(),
  supplierKey: varchar("supplierKey", { length: 80 }),
  supplierSku: varchar("supplierSku", { length: 180 }),
  supplierCategory: varchar("supplierCategory", { length: 120 }),
  name: varchar("name", { length: 255 }).notNull(),
  category: mysqlEnum("category", ["top_up", "gift_card", "game_key", "subscription", "ai_tool", "software"]).notNull(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  basePrice: decimal("basePrice", { precision: 12, scale: 2 }).notNull(),
  baseCurrency: varchar("baseCurrency", { length: 3 }).default("USD").notNull(),
  supplierPrice: decimal("supplierPrice", { precision: 12, scale: 2 }),
  supplierCurrency: varchar("supplierCurrency", { length: 3 }),
  markupPercentOverride: decimal("markupPercentOverride", { precision: 7, scale: 2 }),
  displayPriceOverride: decimal("displayPriceOverride", { precision: 12, scale: 2 }),
  supplierOfferId: varchar("supplierOfferId", { length: 120 }),
  supplierUpdatedAt: timestamp("supplierUpdatedAt"),
  supplierEligible: boolean("supplierEligible").default(true).notNull(),
  catalogSourceId: int("catalogSourceId"),
  regionLabel: varchar("regionLabel", { length: 120 }),
  deliveryType: mysqlEnum("deliveryType", ["instant", "digital_code", "activation_link", "manual_processing", "account_access"]).notNull(),
  requiresPlayerId: boolean("requiresPlayerId").default(false).notNull(),
  requiresServerId: boolean("requiresServerId").default(false).notNull(),
  inputRequirements: json("inputRequirements"),
  status: mysqlEnum("status", ["draft", "active", "paused", "archived"]).default("draft").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  slugUnique: uniqueIndex("products_slug_unique").on(table.slug),
  catalogStatusIndex: index("products_catalog_status_idx").on(table.status, table.category),
  supplierSkuIndex: index("products_supplier_sku_idx").on(table.supplierKey, table.supplierSku),
  supplierSkuUnique: uniqueIndex("products_supplier_sku_unique").on(table.supplierKey, table.supplierSku),
  supplierOfferIndex: index("products_supplier_offer_idx").on(table.supplierKey, table.supplierOfferId),
  catalogSourceIndex: index("products_catalog_source_idx").on(table.catalogSourceId),
}));

/** Store-wide customer display-price policy. Supplier base prices remain unchanged and are never stored here. */
export const marketplacePricingSettings = mysqlTable("marketplace_pricing_settings", {
  id: int("id").primaryKey(),
  defaultMarkupPercent: decimal("defaultMarkupPercent", { precision: 7, scale: 2 }).default("25.00").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Integration metadata only. Provider credentials must remain in protected environment variables, not in the database. */
export const commerceIntegrations = mysqlTable("commerce_integrations", {
  id: int("id").autoincrement().primaryKey(),
  integrationType: mysqlEnum("integrationType", ["supplier", "payment"]).notNull(),
  providerName: varchar("providerName", { length: 120 }).notNull(),
  apiBaseUrl: text("apiBaseUrl"),
  credentialReference: varchar("credentialReference", { length: 120 }),
  publicKeyReference: varchar("publicKeyReference", { length: 120 }),
  webhookSecretReference: varchar("webhookSecretReference", { length: 120 }),
  supportedCurrencies: json("supportedCurrencies"),
  syncStatus: mysqlEnum("syncStatus", ["not_configured", "ready", "paused", "error"]).default("not_configured").notNull(),
  lastSyncAt: timestamp("lastSyncAt"),
  lastError: text("lastError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  providerUnique: uniqueIndex("commerce_integrations_type_provider_unique").on(table.integrationType, table.providerName),
  typeStatusIndex: index("commerce_integrations_type_status_idx").on(table.integrationType, table.syncStatus),
}));

/** An auditable commercial source for products entered by a VAMNUX administrator. It stores references, never API credentials. */
export const authorizedCatalogSources = mysqlTable("authorized_catalog_sources", {
  id: int("id").autoincrement().primaryKey(),
  displayName: varchar("displayName", { length: 120 }).notNull(),
  sourceType: mysqlEnum("sourceType", ["supplier", "direct_agreement"]).notNull(),
  commerceIntegrationId: int("commerceIntegrationId"),
  agreementReference: varchar("agreementReference", { length: 120 }).notNull(),
  status: mysqlEnum("status", ["active", "paused"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  displayNameUnique: uniqueIndex("authorized_catalog_sources_name_unique").on(table.displayName),
  statusIndex: index("authorized_catalog_sources_status_idx").on(table.status),
  integrationIndex: index("authorized_catalog_sources_integration_idx").on(table.commerceIntegrationId),
}));

/** Wallet balance is derived from a ledger; this row provides the current customer wallet configuration. */
export const wallets = mysqlTable("wallets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  availableBalance: decimal("availableBalance", { precision: 12, scale: 2 }).default("0.00").notNull(),
  status: mysqlEnum("status", ["active", "locked", "closed"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userUnique: uniqueIndex("wallets_user_unique").on(table.userId),
}));

/** Immutable wallet movements used for payments, funding, refunds, and manual adjustments. */
export const walletEntries = mysqlTable("wallet_entries", {
  id: int("id").autoincrement().primaryKey(),
  walletId: int("walletId").notNull(),
  direction: mysqlEnum("direction", ["credit", "debit"]).notNull(),
  entryType: mysqlEnum("entryType", ["funding", "purchase", "refund", "adjustment", "reward"]).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  reference: varchar("reference", { length: 120 }).notNull(),
  status: mysqlEnum("status", ["pending", "completed", "reversed", "failed"]).default("pending").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  walletCreatedIndex: index("wallet_entries_wallet_created_idx").on(table.walletId, table.createdAt),
  referenceIndex: index("wallet_entries_reference_idx").on(table.reference),
}));

/** One provider transaction attempt that may eventually create a completed wallet-credit ledger entry. */
export const walletFundingAttempts = mysqlTable("wallet_funding_attempts", {
  id: int("id").autoincrement().primaryKey(),
  fundingCode: varchar("fundingCode", { length: 32 }).notNull(),
  userId: int("userId").notNull(),
  walletId: int("walletId").notNull(),
  integrationId: int("integrationId").notNull(),
  providerReference: varchar("providerReference", { length: 160 }),
  providerEventId: varchar("providerEventId", { length: 160 }),
  idempotencyKey: varchar("idempotencyKey", { length: 120 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  status: mysqlEnum("status", ["initialized", "pending", "settled", "failed", "expired", "cancelled"]).default("initialized").notNull(),
  checkoutUrl: text("checkoutUrl"),
  metadata: json("metadata"),
  settledAt: timestamp("settledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  fundingCodeUnique: uniqueIndex("wallet_funding_attempts_code_unique").on(table.fundingCode),
  idempotencyUnique: uniqueIndex("wallet_funding_attempts_idempotency_unique").on(table.idempotencyKey),
  providerEventUnique: uniqueIndex("wallet_funding_attempts_event_unique").on(table.providerEventId),
  userCreatedIndex: index("wallet_funding_attempts_user_created_idx").on(table.userId, table.createdAt),
  providerReferenceIndex: index("wallet_funding_attempts_reference_idx").on(table.providerReference),
}));

/** Idempotent supplier callback receipt log. The raw payload is not persisted; only its integrity hash and processing state are retained. */
export const supplierWebhookEvents = mysqlTable("supplier_webhook_events", {
  id: int("id").autoincrement().primaryKey(),
  supplierKey: varchar("supplierKey", { length: 80 }).notNull(),
  eventId: varchar("eventId", { length: 160 }).notNull(),
  eventType: varchar("eventType", { length: 120 }).notNull(),
  payloadHash: varchar("payloadHash", { length: 64 }).notNull(),
  processingStatus: mysqlEnum("processingStatus", ["received", "processed", "failed"]).default("received").notNull(),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
}, (table) => ({
  supplierEventUnique: uniqueIndex("supplier_webhook_events_supplier_event_unique").on(table.supplierKey, table.eventId),
  supplierReceivedIndex: index("supplier_webhook_events_supplier_received_idx").on(table.supplierKey, table.receivedAt),
}));

/** Customer order envelope. Payment and supplier operations should update state through protected server procedures only. */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderCode: varchar("orderCode", { length: 32 }).notNull(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["draft", "pending_payment", "paid", "processing", "delivered", "failed", "refunded", "cancelled"]).default("draft").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["unpaid", "pending", "paid", "failed", "refunded"]).default("unpaid").notNull(),
  supplierStatus: mysqlEnum("supplierStatus", ["not_sent", "queued", "processing", "fulfilled", "failed"]).default("not_sent").notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  walletEntryId: int("walletEntryId"),
  supplierIntegrationId: int("supplierIntegrationId"),
  supplierOrderId: varchar("supplierOrderId", { length: 120 }),
  supplierIdempotencyKey: varchar("supplierIdempotencyKey", { length: 120 }),
  supplierCurrency: varchar("supplierCurrency", { length: 3 }),
  supplierTotal: decimal("supplierTotal", { precision: 12, scale: 2 }),
  supplierErrorCode: varchar("supplierErrorCode", { length: 120 }),
  fulfillmentDetails: json("fulfillmentDetails"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orderCodeUnique: uniqueIndex("orders_code_unique").on(table.orderCode),
  customerCreatedIndex: index("orders_customer_created_idx").on(table.userId, table.createdAt),
  supplierOrderIndex: index("orders_supplier_order_idx").on(table.supplierIntegrationId, table.supplierOrderId),
}));

/** Immutable order-item snapshot. Product data can change, but prior customer orders must retain their original terms. */
export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  supplierSku: varchar("supplierSku", { length: 180 }),
  quantity: int("quantity").default(1).notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  regionLabel: varchar("regionLabel", { length: 120 }),
  deliveryType: varchar("deliveryType", { length: 40 }).notNull(),
  fulfillmentDetails: json("fulfillmentDetails"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  orderItemIndex: index("order_items_order_idx").on(table.orderId),
}));

export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type CommerceIntegration = typeof commerceIntegrations.$inferSelect;
export type AuthorizedCatalogSource = typeof authorizedCatalogSources.$inferSelect;
export type WalletFundingAttempt = typeof walletFundingAttempts.$inferSelect;
export type SupplierWebhookEvent = typeof supplierWebhookEvents.$inferSelect;
