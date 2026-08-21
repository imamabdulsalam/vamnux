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
  firstName: varchar("firstName", { length: 80 }),
  lastName: varchar("lastName", { length: 80 }),
  username: varchar("username", { length: 30 }),
  phone: varchar("phone", { length: 32 }),
  preferredCurrency: varchar("preferredCurrency", { length: 3 }).default("USD").notNull(),
  countryCode: varchar("countryCode", { length: 2 }),
  registrationSource: varchar("registrationSource", { length: 40 }),
  referralCode: varchar("referralCode", { length: 48 }),
  accountStatus: mysqlEnum("accountStatus", ["active", "restricted", "suspended", "banned", "deleted", "pending_email_verification"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userUnique: uniqueIndex("customer_profiles_user_unique").on(table.userId),
  usernameUnique: uniqueIndex("customer_profiles_username_unique").on(table.username),
  accountStatusIndex: index("customer_profiles_status_idx").on(table.accountStatus),
}));

/** Parallel external identity links. Existing Manus OAuth ownership remains the source of truth until a tested Supabase cutover is approved. */
export const customerIdentityLinks = mysqlTable("customer_identity_links", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  provider: mysqlEnum("provider", ["manus_oauth", "supabase", "native_email"]).notNull(),
  providerSubject: varchar("providerSubject", { length: 255 }).notNull(),
  providerEmail: varchar("providerEmail", { length: 320 }),
  emailVerifiedAt: timestamp("emailVerifiedAt"),
  linkedAt: timestamp("linkedAt").defaultNow().notNull(),
  lastAuthenticatedAt: timestamp("lastAuthenticatedAt").defaultNow().notNull(),
}, (table) => ({
  providerSubjectUnique: uniqueIndex("customer_identity_links_provider_subject_unique").on(table.provider, table.providerSubject),
  userProviderUnique: uniqueIndex("customer_identity_links_user_provider_unique").on(table.userId, table.provider),
  userIndex: index("customer_identity_links_user_idx").on(table.userId),
}));

/** Native VAMNUX credentials. Password values are represented only by a server-side memory-hard hash. */
export const nativeCredentials = mysqlTable("native_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 1024 }).notNull(),
  emailVerifiedAt: timestamp("emailVerifiedAt"),
  credentialStatus: mysqlEnum("credentialStatus", ["active", "locked", "disabled"]).default("active").notNull(),
  passwordChangedAt: timestamp("passwordChangedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userUnique: uniqueIndex("native_credentials_user_unique").on(table.userId),
  emailUnique: uniqueIndex("native_credentials_email_unique").on(table.email),
  statusIndex: index("native_credentials_status_idx").on(table.credentialStatus),
}));

/** Revocable browser sessions for native VAMNUX credentials. Only a SHA-256 session hash is persisted. */
export const nativeSessions = mysqlTable("native_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sessionHash: varchar("sessionHash", { length: 128 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  revokedAt: timestamp("revokedAt"),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  sessionHashUnique: uniqueIndex("native_sessions_hash_unique").on(table.sessionHash),
  userExpiryIndex: index("native_sessions_user_expiry_idx").on(table.userId, table.expiresAt),
}));

/** Privacy-minimized rolling counters for native registration and sign-in abuse controls. */
export const nativeAuthRateLimits = mysqlTable("native_auth_rate_limits", {
  id: int("id").autoincrement().primaryKey(),
  bucketHash: varchar("bucketHash", { length: 128 }).notNull(),
  action: mysqlEnum("action", ["register", "sign_in", "forgot_password", "resend_verification", "verify_email"]).notNull(),
  attemptCount: int("attemptCount").default(0).notNull(),
  windowExpiresAt: timestamp("windowExpiresAt").notNull(),
  lastAttemptAt: timestamp("lastAttemptAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  bucketActionUnique: uniqueIndex("native_auth_rate_limit_bucket_action_unique").on(table.bucketHash, table.action),
  expiryIndex: index("native_auth_rate_limit_expiry_idx").on(table.windowExpiresAt),
}));

/** Single-use native account actions. Raw verification and recovery tokens are never persisted. */
export const nativeAuthTokens = mysqlTable("native_auth_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
  tokenType: mysqlEnum("tokenType", ["email_verification", "password_reset"]).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tokenHashUnique: uniqueIndex("native_auth_tokens_hash_unique").on(table.tokenHash),
  userTypeCreatedIndex: index("native_auth_tokens_user_type_created_idx").on(table.userId, table.tokenType, table.createdAt),
  expiryIndex: index("native_auth_tokens_expiry_idx").on(table.expiresAt),
}));

/** Independently recorded customer legal and marketing consent decisions. */
export const customerConsents = mysqlTable("customer_consents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  consentType: mysqlEnum("consentType", ["terms_privacy", "marketing"]).notNull(),
  policyVersion: varchar("policyVersion", { length: 40 }).notNull(),
  granted: boolean("granted").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userConsentCreatedIndex: index("customer_consents_user_type_created_idx").on(table.userId, table.consentType, table.createdAt),
}));

/** Customer-visible security events. Metadata is intentionally limited to non-sensitive session context. */
export const customerSecurityEvents = mysqlTable("customer_security_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  eventType: varchar("eventType", { length: 80 }).notNull(),
  summary: varchar("summary", { length: 255 }).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userCreatedIndex: index("customer_security_events_user_created_idx").on(table.userId, table.createdAt),
}));

/** Customer-controlled notification preferences. Security notices remain operational regardless of promotional opt-in. */
export const customerNotificationPreferences = mysqlTable("customer_notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orderUpdates: boolean("orderUpdates").default(true).notNull(),
  paymentUpdates: boolean("paymentUpdates").default(true).notNull(),
  walletUpdates: boolean("walletUpdates").default(true).notNull(),
  securityAlerts: boolean("securityAlerts").default(true).notNull(),
  marketingUpdates: boolean("marketingUpdates").default(false).notNull(),
  productAnnouncements: boolean("productAnnouncements").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userUnique: uniqueIndex("customer_notification_preferences_user_unique").on(table.userId),
}));

/** Private, real customer notifications generated by authorised server-side operations. */
export const customerNotifications = mysqlTable("customer_notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  category: mysqlEnum("category", ["order", "payment", "wallet", "security", "support", "system"]).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body").notNull(),
  actionUrl: varchar("actionUrl", { length: 255 }),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userCreatedIndex: index("customer_notifications_user_created_idx").on(table.userId, table.createdAt),
  userReadIndex: index("customer_notifications_user_read_idx").on(table.userId, table.readAt),
}));

/** Customer-owned support cases. Supplier or payment details remain outside free-text summaries unless explicitly required. */
export const supportTickets = mysqlTable("support_tickets", {
  id: int("id").autoincrement().primaryKey(),
  ticketCode: varchar("ticketCode", { length: 32 }).notNull(),
  userId: int("userId").notNull(),
  orderId: int("orderId"),
  category: mysqlEnum("category", ["payment", "order", "game_top_up", "gift_card", "subscription", "software", "wallet", "account", "refund", "other"]).notNull(),
  subject: varchar("subject", { length: 180 }).notNull(),
  status: mysqlEnum("status", ["open", "processing", "waiting_for_customer", "resolved", "closed"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  ticketCodeUnique: uniqueIndex("support_tickets_code_unique").on(table.ticketCode),
  userUpdatedIndex: index("support_tickets_user_updated_idx").on(table.userId, table.updatedAt),
  orderIndex: index("support_tickets_order_idx").on(table.orderId),
}));

/** Private ticket-thread messages written by the ticket owner or an authorised administrator. */
export const supportTicketMessages = mysqlTable("support_ticket_messages", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull(),
  authorUserId: int("authorUserId").notNull(),
  authorRole: mysqlEnum("authorRole", ["customer", "admin"]).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  ticketCreatedIndex: index("support_ticket_messages_ticket_created_idx").on(table.ticketId, table.createdAt),
}));

/** Customer privacy requests are intentionally queued for review; they never delete account data from a browser request. */
export const customerPrivacyRequests = mysqlTable("customer_privacy_requests", {
  id: int("id").autoincrement().primaryKey(),
  requestCode: varchar("requestCode", { length: 32 }).notNull(),
  userId: int("userId").notNull(),
  requestType: mysqlEnum("requestType", ["data_access", "data_correction", "account_deletion"]).notNull(),
  status: mysqlEnum("status", ["submitted", "under_review", "completed", "rejected", "cancelled"]).default("submitted").notNull(),
  note: varchar("note", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  requestCodeUnique: uniqueIndex("customer_privacy_requests_code_unique").on(table.requestCode),
  userCreatedIndex: index("customer_privacy_requests_user_created_idx").on(table.userId, table.createdAt),
}));

/** Editable public policy content. Draft status must remain visible until owner/legal review publishes a replacement. */
export const siteContentPages = mysqlTable("site_content_pages", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["draft", "published"]).default("draft").notNull(),
  version: varchar("version", { length: 40 }).notNull(),
  updatedByAdminId: int("updatedByAdminId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  slugUnique: uniqueIndex("site_content_pages_slug_unique").on(table.slug),
  statusIndex: index("site_content_pages_status_idx").on(table.status),
}));

/** A customer-owned wishlist of active VAMNUX catalog records. */
export const savedProducts = mysqlTable("saved_products", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  customerProductUnique: uniqueIndex("saved_products_customer_product_unique").on(table.userId, table.productId),
  customerCreatedIndex: index("saved_products_customer_created_idx").on(table.userId, table.createdAt),
  productIndex: index("saved_products_product_idx").on(table.productId),
}));

/** Append-only record of privileged VAMNUX operations. Metadata must never contain credentials or raw customer fulfilment details. */
export const adminAuditEvents = mysqlTable("admin_audit_events", {
  id: int("id").autoincrement().primaryKey(),
  adminUserId: int("adminUserId").notNull(),
  action: varchar("action", { length: 120 }).notNull(),
  targetType: varchar("targetType", { length: 80 }).notNull(),
  targetId: varchar("targetId", { length: 160 }).notNull(),
  summary: varchar("summary", { length: 500 }).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  adminCreatedIndex: index("admin_audit_events_admin_created_idx").on(table.adminUserId, table.createdAt),
  targetCreatedIndex: index("admin_audit_events_target_created_idx").on(table.targetType, table.targetId, table.createdAt),
  actionCreatedIndex: index("admin_audit_events_action_created_idx").on(table.action, table.createdAt),
}));

/** Supplier-normalised catalog records. Supplier secrets must remain in environment variables, never this table. */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 180 }).notNull(),
  supplierKey: varchar("supplierKey", { length: 80 }),
  supplierSku: varchar("supplierSku", { length: 180 }),
  supplierCategory: varchar("supplierCategory", { length: 120 }),
  name: varchar("name", { length: 255 }).notNull(),
  category: mysqlEnum("category", ["top_up", "gift_card", "game_key", "subscription", "ai_tool", "software", "steam", "telegram_stars"]).notNull(),
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

/** VAMNUX-managed storefront taxonomy. Supplier data remains independent from the public category configuration. */
export const marketplaceCategories = mysqlTable("marketplace_categories", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  seoTitle: varchar("seoTitle", { length: 180 }),
  seoDescription: varchar("seoDescription", { length: 300 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  visible: boolean("visible").default(true).notNull(),
  featured: boolean("featured").default(false).notNull(),
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  slugUnique: uniqueIndex("marketplace_categories_slug_unique").on(table.slug),
  publicOrderIndex: index("marketplace_categories_public_order_idx").on(table.status, table.visible, table.sortOrder),
}));

/** Admin-managed product presentation flags and internal notes. Never stores supplier secrets or digital fulfilment codes. */
export const productAdminAttributes = mysqlTable("product_admin_attributes", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  storefrontStatus: mysqlEnum("storefrontStatus", ["visible", "hidden", "coming_soon"]).default("visible").notNull(),
  featured: boolean("featured").default(false).notNull(),
  trending: boolean("trending").default(false).notNull(),
  bestSeller: boolean("bestSeller").default(false).notNull(),
  newProduct: boolean("newProduct").default(false).notNull(),
  deal: boolean("deal").default(false).notNull(),
  seoTitle: varchar("seoTitle", { length: 180 }),
  seoDescription: varchar("seoDescription", { length: 300 }),
  internalNote: text("internalNote"),
  updatedByAdminId: int("updatedByAdminId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  productUnique: uniqueIndex("product_admin_attributes_product_unique").on(table.productId),
  storefrontIndex: index("product_admin_attributes_storefront_idx").on(table.storefrontStatus, table.featured, table.trending),
}));

/** Append-only customer-price changes generated by protected Admin actions. */
export const priceChangeHistory = mysqlTable("price_change_history", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId"),
  adminUserId: int("adminUserId").notNull(),
  changeType: mysqlEnum("changeType", ["global_markup", "product_markup", "product_fixed_price", "product_status"]).notNull(),
  oldValue: varchar("oldValue", { length: 120 }),
  newValue: varchar("newValue", { length: 120 }),
  reason: varchar("reason", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  productCreatedIndex: index("price_change_history_product_created_idx").on(table.productId, table.createdAt),
  adminCreatedIndex: index("price_change_history_admin_created_idx").on(table.adminUserId, table.createdAt),
}));

/** Manual or future-provider exchange-rate configuration. It does not alter current storefront display conversion until explicitly adopted. */
export const exchangeRates = mysqlTable("exchange_rates", {
  id: int("id").autoincrement().primaryKey(),
  baseCurrency: varchar("baseCurrency", { length: 3 }).notNull(),
  quoteCurrency: varchar("quoteCurrency", { length: 3 }).notNull(),
  rate: decimal("rate", { precision: 16, scale: 6 }).notNull(),
  bufferPercent: decimal("bufferPercent", { precision: 7, scale: 2 }).default("0.00").notNull(),
  source: mysqlEnum("source", ["manual", "automatic"]).default("manual").notNull(),
  active: boolean("active").default(true).notNull(),
  updatedByAdminId: int("updatedByAdminId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  pairUnique: uniqueIndex("exchange_rates_pair_unique").on(table.baseCurrency, table.quoteCurrency),
  activeIndex: index("exchange_rates_active_idx").on(table.active, table.baseCurrency, table.quoteCurrency),
}));

/** Managed storefront content blocks. Only published blocks are eligible for a public rendering path. */
export const siteContentBlocks = mysqlTable("site_content_blocks", {
  id: int("id").autoincrement().primaryKey(),
  blockKey: varchar("blockKey", { length: 120 }).notNull(),
  blockType: mysqlEnum("blockType", ["hero_slide", "banner", "announcement", "faq", "featured_list", "category_spotlight"]).notNull(),
  title: varchar("title", { length: 255 }),
  content: json("content"),
  imageUrl: text("imageUrl"),
  ctaLabel: varchar("ctaLabel", { length: 100 }),
  ctaUrl: varchar("ctaUrl", { length: 500 }),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  updatedByAdminId: int("updatedByAdminId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  blockKeyUnique: uniqueIndex("site_content_blocks_key_unique").on(table.blockKey),
  publicOrderIndex: index("site_content_blocks_public_order_idx").on(table.status, table.blockType, table.sortOrder),
}));

/** Outcome history for explicitly initiated supplier catalog synchronization. This is not a background job or scheduler. */
export const supplierSyncRuns = mysqlTable("supplier_sync_runs", {
  id: int("id").autoincrement().primaryKey(),
  integrationId: int("integrationId"),
  supplierKey: varchar("supplierKey", { length: 80 }).notNull(),
  initiatedByAdminId: int("initiatedByAdminId").notNull(),
  operation: mysqlEnum("operation", ["catalog", "price", "stock", "region"]).default("catalog").notNull(),
  status: mysqlEnum("status", ["started", "completed", "failed", "paused"]).default("started").notNull(),
  productsAdded: int("productsAdded").default(0).notNull(),
  productsUpdated: int("productsUpdated").default(0).notNull(),
  productsFailed: int("productsFailed").default(0).notNull(),
  summary: varchar("summary", { length: 500 }),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, (table) => ({
  supplierStartedIndex: index("supplier_sync_runs_supplier_started_idx").on(table.supplierKey, table.startedAt),
  statusStartedIndex: index("supplier_sync_runs_status_started_idx").on(table.status, table.startedAt),
}));

/** Future promotion configuration. Rules remain non-operative until an approved checkout application policy is implemented. */
export const promotions = mysqlTable("promotions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  code: varchar("code", { length: 64 }),
  discountType: mysqlEnum("discountType", ["percentage", "fixed_amount"]).notNull(),
  discountAmount: decimal("discountAmount", { precision: 12, scale: 2 }).notNull(),
  minimumOrder: decimal("minimumOrder", { precision: 12, scale: 2 }),
  maximumDiscount: decimal("maximumDiscount", { precision: 12, scale: 2 }),
  productId: int("productId"),
  categorySlug: varchar("categorySlug", { length: 80 }),
  startsAt: timestamp("startsAt"),
  endsAt: timestamp("endsAt"),
  usageLimit: int("usageLimit"),
  perUserLimit: int("perUserLimit"),
  status: mysqlEnum("status", ["draft", "scheduled", "active", "paused", "archived"]).default("draft").notNull(),
  createdByAdminId: int("createdByAdminId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  codeUnique: uniqueIndex("promotions_code_unique").on(table.code),
  statusPeriodIndex: index("promotions_status_period_idx").on(table.status, table.startsAt, table.endsAt),
  productIndex: index("promotions_product_idx").on(table.productId),
}));

/** Singleton future referral policy. The setting stores no customer reward and does not create wallet credits by itself. */
export const referralSettings = mysqlTable("referral_settings", {
  id: int("id").primaryKey(),
  percentageReward: decimal("percentageReward", { precision: 7, scale: 2 }).default("0.00").notNull(),
  fixedReward: decimal("fixedReward", { precision: 12, scale: 2 }).default("0.00").notNull(),
  minimumQualifyingOrder: decimal("minimumQualifyingOrder", { precision: 12, scale: 2 }).default("0.00").notNull(),
  maximumReward: decimal("maximumReward", { precision: 12, scale: 2 }),
  releaseDays: int("releaseDays").default(0).notNull(),
  status: mysqlEnum("status", ["disabled", "configured"]).default("disabled").notNull(),
  updatedByAdminId: int("updatedByAdminId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Singleton future loyalty policy. No points ledger is created or awarded until qualifying commerce rules are approved. */
export const loyaltySettings = mysqlTable("loyalty_settings", {
  id: int("id").primaryKey(),
  pointsPerCurrencyUnit: decimal("pointsPerCurrencyUnit", { precision: 12, scale: 4 }).default("0.0000").notNull(),
  redemptionValuePerPoint: decimal("redemptionValuePerPoint", { precision: 12, scale: 4 }).default("0.0000").notNull(),
  expiryDays: int("expiryDays"),
  status: mysqlEnum("status", ["disabled", "configured"]).default("disabled").notNull(),
  updatedByAdminId: int("updatedByAdminId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Owner-reviewed reseller designation. This does not generate API credentials or apply a pricing discount without future approval. */
export const resellers = mysqlTable("resellers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tier: mysqlEnum("tier", ["retail", "reseller", "vip_reseller", "enterprise"]).default("retail").notNull(),
  discountPercent: decimal("discountPercent", { precision: 7, scale: 2 }).default("0.00").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "suspended", "rejected"]).default("pending").notNull(),
  approvedAt: timestamp("approvedAt"),
  updatedByAdminId: int("updatedByAdminId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userUnique: uniqueIndex("resellers_user_unique").on(table.userId),
  statusTierIndex: index("resellers_status_tier_idx").on(table.status, table.tier),
}));

/** Non-secret marketplace settings. Provider secrets continue to live only in protected environment configuration. */
export const siteSettings = mysqlTable("site_settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 120 }).notNull(),
  category: mysqlEnum("category", ["general", "currency", "payments", "email", "notifications", "orders", "security"]).notNull(),
  value: json("value").notNull(),
  updatedByAdminId: int("updatedByAdminId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  settingKeyUnique: uniqueIndex("site_settings_key_unique").on(table.settingKey),
  categoryIndex: index("site_settings_category_idx").on(table.category),
}));

/** Configurable message templates. External delivery remains disabled unless a future provider is explicitly activated. */
export const notificationTemplates = mysqlTable("notification_templates", {
  id: int("id").autoincrement().primaryKey(),
  templateKey: varchar("templateKey", { length: 120 }).notNull(),
  channel: mysqlEnum("channel", ["in_app", "email", "sms", "whatsapp"]).notNull(),
  eventType: varchar("eventType", { length: 120 }).notNull(),
  subject: varchar("subject", { length: 180 }),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["draft", "active", "archived"]).default("draft").notNull(),
  updatedByAdminId: int("updatedByAdminId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  templateKeyUnique: uniqueIndex("notification_templates_key_unique").on(table.templateKey),
  statusChannelIndex: index("notification_templates_status_channel_idx").on(table.status, table.channel),
}));

/** Redacted operational metadata for supplier API calls. No request bodies, response payloads, credentials, or fulfilment codes are stored. */
export const apiRequestLogs = mysqlTable("api_request_logs", {
  id: int("id").autoincrement().primaryKey(),
  supplierKey: varchar("supplierKey", { length: 80 }).notNull(),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  requestId: varchar("requestId", { length: 160 }),
  httpStatus: int("httpStatus"),
  responseMs: int("responseMs"),
  success: boolean("success").notNull(),
  errorCode: varchar("errorCode", { length: 120 }),
  orderId: int("orderId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  supplierCreatedIndex: index("api_request_logs_supplier_created_idx").on(table.supplierKey, table.createdAt),
  requestIdIndex: index("api_request_logs_request_id_idx").on(table.requestId),
  successCreatedIndex: index("api_request_logs_success_created_idx").on(table.success, table.createdAt),
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
  referenceUnique: uniqueIndex("wallet_entries_reference_unique").on(table.reference),
}));

/** One provider transaction attempt that may eventually create a completed wallet-credit ledger entry. */
export const walletFundingAttempts = mysqlTable("wallet_funding_attempts", {
  id: int("id").autoincrement().primaryKey(),
  fundingCode: varchar("fundingCode", { length: 32 }).notNull(),
  userId: int("userId").notNull(),
  walletId: int("walletId").notNull(),
  integrationId: int("integrationId"),
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
export type SavedProduct = typeof savedProducts.$inferSelect;
export type AdminAuditEvent = typeof adminAuditEvents.$inferSelect;
