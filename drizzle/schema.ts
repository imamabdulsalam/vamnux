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
  suspensionReason: varchar("suspensionReason", { length: 500 }),
  suspendedUntil: timestamp("suspendedUntil"),
  suspensionAppeal: text("suspensionAppeal"),
  appealSubmittedAt: timestamp("appealSubmittedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userUnique: uniqueIndex("customer_profiles_user_unique").on(table.userId),
  usernameUnique: uniqueIndex("customer_profiles_username_unique").on(table.username),
  accountStatusIndex: index("customer_profiles_status_idx").on(table.accountStatus),
  suspendedUntilIndex: index("customer_profiles_suspended_until_idx").on(table.suspendedUntil),
}));

/** Parallel external identity links. Existing Manus OAuth ownership remains the source of truth until a tested Supabase cutover is approved. */
export const customerIdentityLinks = mysqlTable("customer_identity_links", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  provider: mysqlEnum("provider", ["manus_oauth", "supabase"]).notNull(),
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

/** Public email-interest records. This is a consent ledger only; it does not send email or activate a delivery provider. */
export const newsletterInterestSubscribers = mysqlTable("newsletter_interest_subscribers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  source: varchar("source", { length: 80 }).default("storefront_lower_cta").notNull(),
  status: mysqlEnum("status", ["subscribed", "unsubscribed"]).default("subscribed").notNull(),
  consentedAt: timestamp("consentedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  emailUnique: uniqueIndex("newsletter_interest_email_unique").on(table.email),
  statusUpdatedIndex: index("newsletter_interest_status_updated_idx").on(table.status, table.updatedAt),
}));

/** Customer-submitted requests for products or digital services that may be reviewed by VAMNUX. Requests never create catalogue items automatically. */
export const customerProductRequests = mysqlTable("customer_product_requests", {
  id: int("id").autoincrement().primaryKey(),
  requestCode: varchar("requestCode", { length: 32 }).notNull(),
  userId: int("userId").notNull(),
  category: mysqlEnum("category", ["product", "game_top_up", "gift_card", "subscription", "software", "ai_tool", "other"]).default("product").notNull(),
  requestedName: varchar("requestedName", { length: 180 }).notNull(),
  details: text("details"),
  status: mysqlEnum("status", ["submitted", "under_review", "planned", "added", "not_available"]).default("submitted").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  requestCodeUnique: uniqueIndex("customer_product_requests_code_unique").on(table.requestCode),
  userUpdatedIndex: index("customer_product_requests_user_updated_idx").on(table.userId, table.updatedAt),
	statusUpdatedIndex: index("customer_product_requests_status_updated_idx").on(table.status, table.updatedAt),
}));

/** Owner-only read state for operational notification items. Source records remain authoritative and no customer data is duplicated here. */
export const adminNotificationReads = mysqlTable("admin_notification_reads", {
	id: int("id").autoincrement().primaryKey(),
	adminUserId: int("adminUserId").notNull(),
	notificationKey: varchar("notificationKey", { length: 220 }).notNull(),
	readAt: timestamp("readAt").defaultNow().notNull(),
}, (table) => ({
	adminNotificationUnique: uniqueIndex("admin_notification_reads_admin_key_unique").on(table.adminUserId, table.notificationKey),
	adminReadAtIndex: index("admin_notification_reads_admin_read_at_idx").on(table.adminUserId, table.readAt),
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

/** Encrypted native authenticator-app MFA credentials for the Super Admin only. Raw secrets never leave the server after initial enrollment. */
export const adminMfaCredentials = mysqlTable("admin_mfa_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  secretEncrypted: varchar("secretEncrypted", { length: 1024 }).notNull(),
  enrolledAt: timestamp("enrolledAt"),
  lastVerifiedAt: timestamp("lastVerifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userUnique: uniqueIndex("admin_mfa_credentials_user_unique").on(table.userId),
}));

/** Hashed single-use recovery codes. The original code is rendered once during enrollment and is never retained. */
export const adminMfaRecoveryCodes = mysqlTable("admin_mfa_recovery_codes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  codeHash: varchar("codeHash", { length: 128 }).notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userCodeUnique: uniqueIndex("admin_mfa_recovery_user_code_unique").on(table.userId, table.codeHash),
  userUnusedIndex: index("admin_mfa_recovery_user_unused_idx").on(table.userId, table.usedAt),
}));

/** Single-use, short-lived OAuth-to-MFA bridge. A nonce is stored server-side while the browser holds only an opaque HttpOnly cookie. */
export const adminMfaChallenges = mysqlTable("admin_mfa_challenges", {
  id: int("id").autoincrement().primaryKey(),
  challengeHash: varchar("challengeHash", { length: 128 }).notNull(),
  userId: int("userId").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  consumedAt: timestamp("consumedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  challengeUnique: uniqueIndex("admin_mfa_challenge_hash_unique").on(table.challengeHash),
  userExpiryIndex: index("admin_mfa_challenge_user_expiry_idx").on(table.userId, table.expiresAt),
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

/** Customer product interactions for the protected Super Admin activity inbox. No cart contents, payment data, or fulfilment fields are stored here. */
export const customerProductActivityEvents = mysqlTable("customer_product_activity_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  activityType: mysqlEnum("activityType", ["favorite_added", "cart_added"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  customerCreatedIndex: index("customer_product_activity_events_customer_created_idx").on(table.userId, table.createdAt),
  productCreatedIndex: index("customer_product_activity_events_product_created_idx").on(table.productId, table.createdAt),
  activityCreatedIndex: index("customer_product_activity_events_activity_created_idx").on(table.activityType, table.createdAt),
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
  category: mysqlEnum("category", ["top_up", "gift_card", "game_key", "subscription", "ai_tool", "software", "steam", "steam_top_up", "telegram_stars"]).notNull(),
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

/**
 * A future VAMNUX-owned customer product identity. This foundation is additive:
 * it starts empty and does not change the existing supplier-normalised product
 * records or customer-facing catalog selection. Mapping an offer requires a
 * separately approved category-safe review workflow.
 */
export const masterProducts = mysqlTable("master_products", {
  id: int("id").autoincrement().primaryKey(),
  masterKey: varchar("masterKey", { length: 180 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: mysqlEnum("category", ["top_up", "gift_card", "game_key", "subscription", "ai_tool", "software", "steam", "steam_top_up", "telegram_stars"]).notNull(),
  subcategory: varchar("subcategory", { length: 120 }),
  productType: varchar("productType", { length: 120 }),
  regionLabel: varchar("regionLabel", { length: 120 }),
  currency: varchar("currency", { length: 3 }),
  denomination: varchar("denomination", { length: 120 }),
  imageUrl: text("imageUrl"),
  customerFacingStatus: mysqlEnum("customerFacingStatus", ["draft", "active", "paused", "archived"]).default("draft").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  masterKeyUnique: uniqueIndex("master_products_key_unique").on(table.masterKey),
  customerFacingIndex: index("master_products_customer_facing_idx").on(table.customerFacingStatus, table.category),
  categoryIdentityIndex: index("master_products_category_identity_idx").on(table.category, table.productType, table.regionLabel, table.currency),
}));

/**
 * An additive supplier-offer snapshot. Every row can preserve a legacy VAMNUX
 * product row through legacyProductId while optional masterProductId stays null
 * until an owner approves a category-safe mapping. No existing product is moved
 * or replaced by this table.
 */
export const supplierOffers = mysqlTable("supplier_offers", {
  id: int("id").autoincrement().primaryKey(),
  masterProductId: int("masterProductId"),
  mappingStatus: mysqlEnum("mappingStatus", ["UNMAPPED", "PENDING REVIEW", "APPROVED", "REJECTED"]).default("UNMAPPED").notNull(),
  legacyProductId: int("legacyProductId").notNull(),
  commerceIntegrationId: int("commerceIntegrationId"),
  supplierKey: varchar("supplierKey", { length: 80 }).notNull(),
  supplierSku: varchar("supplierSku", { length: 180 }),
  supplierOfferId: varchar("supplierOfferId", { length: 120 }),
  supplierCategory: varchar("supplierCategory", { length: 120 }),
  supplierProductName: varchar("supplierProductName", { length: 255 }).notNull(),
  supplierCost: decimal("supplierCost", { precision: 12, scale: 2 }),
  supplierCurrency: varchar("supplierCurrency", { length: 3 }),
  regionLabel: varchar("regionLabel", { length: 120 }),
  supplierAvailability: boolean("supplierAvailability").default(true).notNull(),
  sourceStatus: mysqlEnum("sourceStatus", ["draft", "active", "paused", "archived"]).default("draft").notNull(),
  deliveryType: mysqlEnum("deliveryType", ["instant", "digital_code", "activation_link", "manual_processing", "account_access"]).notNull(),
  inputRequirements: json("inputRequirements"),
  mappingAttributes: json("mappingAttributes"),
  metadata: json("metadata"),
  supplierUpdatedAt: timestamp("supplierUpdatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  legacyProductUnique: uniqueIndex("supplier_offers_legacy_product_unique").on(table.legacyProductId),
  supplierSkuIndex: index("supplier_offers_supplier_sku_idx").on(table.supplierKey, table.supplierSku),
  supplierOfferIndex: index("supplier_offers_supplier_offer_idx").on(table.supplierKey, table.supplierOfferId),
  masterProductIndex: index("supplier_offers_master_product_idx").on(table.masterProductId),
  mappingStatusIndex: index("supplier_offers_mapping_status_idx").on(table.mappingStatus, table.masterProductId),
  availabilityIndex: index("supplier_offers_availability_idx").on(table.supplierAvailability, table.sourceStatus),
}));

/**
 * Append-only owner review history for supplier-offer mapping. This records
 * decisions without changing the legacy supplier-normalised products table.
 */
export const supplierOfferMappingReviews = mysqlTable("supplier_offer_mapping_reviews", {
  id: int("id").autoincrement().primaryKey(),
  supplierOfferId: int("supplierOfferId").notNull(),
  legacyProductId: int("legacyProductId").notNull(),
  masterProductId: int("masterProductId"),
  action: mysqlEnum("action", ["PENDING REVIEW", "APPROVED", "REJECTED", "REMOVED"]).notNull(),
  previousStatus: mysqlEnum("previousStatus", ["UNMAPPED", "PENDING REVIEW", "APPROVED", "REJECTED"]).notNull(),
  nextStatus: mysqlEnum("nextStatus", ["UNMAPPED", "PENDING REVIEW", "APPROVED", "REJECTED"]).notNull(),
  reviewedByAdminId: int("reviewedByAdminId").notNull(),
  note: varchar("note", { length: 1000 }),
  mappingAttributes: json("mappingAttributes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  offerCreatedIndex: index("supplier_offer_mapping_reviews_offer_created_idx").on(table.supplierOfferId, table.createdAt),
  masterCreatedIndex: index("supplier_offer_mapping_reviews_master_created_idx").on(table.masterProductId, table.createdAt),
  adminCreatedIndex: index("supplier_offer_mapping_reviews_admin_created_idx").on(table.reviewedByAdminId, table.createdAt),
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

/** Admin-managed support and source policy for VAMNUX currencies. No external provider is contacted by this table. */
export const currencyConfigurations = mysqlTable("currency_configurations", {
  currencyCode: varchar("currencyCode", { length: 3 }).primaryKey(),
  displayName: varchar("displayName", { length: 80 }).notNull(),
  symbol: varchar("symbol", { length: 12 }).notNull(),
  active: boolean("active").default(true).notNull(),
  rateUpdateFrequency: mysqlEnum("rateUpdateFrequency", ["manual", "hourly", "daily", "weekly"]).default("manual").notNull(),
  preferredRateSource: mysqlEnum("preferredRateSource", ["manual", "approved_external"]).default("manual").notNull(),
  approvedSourceLabel: varchar("approvedSourceLabel", { length: 160 }),
  updatedByAdminId: int("updatedByAdminId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Append-only VAMNUX exchange-rate versions. Saving a new rate never reprices catalog rows. */
export const currencyRateVersions = mysqlTable("currency_rate_versions", {
  id: int("id").autoincrement().primaryKey(),
  baseCurrency: varchar("baseCurrency", { length: 3 }).notNull(),
  quoteCurrency: varchar("quoteCurrency", { length: 3 }).notNull(),
  rate: decimal("rate", { precision: 16, scale: 6 }).notNull(),
  bufferPercent: decimal("bufferPercent", { precision: 7, scale: 2 }).default("0.00").notNull(),
  source: mysqlEnum("source", ["manual", "approved_external"]).default("manual").notNull(),
  sourceLabel: varchar("sourceLabel", { length: 160 }),
  rateUpdateFrequency: mysqlEnum("rateUpdateFrequency", ["manual", "hourly", "daily", "weekly"]).default("manual").notNull(),
  effectiveAt: timestamp("effectiveAt").notNull(),
  active: boolean("active").default(true).notNull(),
  supersedesRateVersionId: int("supersedesRateVersionId"),
  createdByAdminId: int("createdByAdminId").notNull(),
  reason: varchar("reason", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  pairEffectiveIndex: index("currency_rate_versions_pair_effective_idx").on(table.baseCurrency, table.quoteCurrency, table.active, table.effectiveAt),
  adminCreatedIndex: index("currency_rate_versions_admin_created_idx").on(table.createdByAdminId, table.createdAt),
}));

/** Immutable rate snapshots reserved for explicitly applied pricing and future orders, not transient Admin previews. */
export const pricingRateSnapshots = mysqlTable("pricing_rate_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  pricingRuleId: int("pricingRuleId"),
  productId: int("productId"),
  orderId: int("orderId"),
  rateVersionId: int("rateVersionId"),
  context: mysqlEnum("context", ["price_application", "order"]).notNull(),
  supplierCost: decimal("supplierCost", { precision: 12, scale: 2 }).notNull(),
  supplierCurrency: varchar("supplierCurrency", { length: 3 }).notNull(),
  outputCurrency: varchar("outputCurrency", { length: 3 }).notNull(),
  exchangeRate: decimal("exchangeRate", { precision: 16, scale: 6 }).notNull(),
  convertedCost: decimal("convertedCost", { precision: 12, scale: 2 }).notNull(),
  rateSource: varchar("rateSource", { length: 32 }).notNull(),
  sourceLabel: varchar("sourceLabel", { length: 160 }),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
}, (table) => ({
  productRecordedIndex: index("pricing_rate_snapshots_product_recorded_idx").on(table.productId, table.recordedAt),
  orderRecordedIndex: index("pricing_rate_snapshots_order_recorded_idx").on(table.orderId, table.recordedAt),
  versionRecordedIndex: index("pricing_rate_snapshots_version_recorded_idx").on(table.rateVersionId, table.recordedAt),
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

/** Current supplier-backed availability evidence for an existing VAMNUX product. No source cost, SKU, or customer price is duplicated here. */
export const productTrackingObservations = mysqlTable("product_tracking_observations", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  supplierKey: varchar("supplierKey", { length: 80 }),
  supplierEligible: boolean("supplierEligible").notNull(),
  observedAt: timestamp("observedAt").defaultNow().notNull(),
  firstUnavailableAt: timestamp("firstUnavailableAt"),
  availableAgainAt: timestamp("availableAgainAt"),
  lastTrackingRunId: int("lastTrackingRunId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  productUnique: uniqueIndex("product_tracking_observations_product_unique").on(table.productId),
  supplierAvailabilityIndex: index("product_tracking_observations_supplier_availability_idx").on(table.supplierKey, table.supplierEligible, table.observedAt),
  recoveryIndex: index("product_tracking_observations_recovery_idx").on(table.availableAgainAt),
}));

/** Append-only Product Tracking actions and supplier-availability transitions for owner review. */
export const productTrackingEvents = mysqlTable("product_tracking_events", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  supplierKey: varchar("supplierKey", { length: 80 }),
  eventType: mysqlEnum("eventType", ["observed_available", "observed_out_of_stock", "recovered_available", "storefront_hidden", "storefront_shown"]).notNull(),
  trackingRunId: int("trackingRunId"),
  adminUserId: int("adminUserId"),
  detail: varchar("detail", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  productCreatedIndex: index("product_tracking_events_product_created_idx").on(table.productId, table.createdAt),
  supplierCreatedIndex: index("product_tracking_events_supplier_created_idx").on(table.supplierKey, table.createdAt),
  runIndex: index("product_tracking_events_run_idx").on(table.trackingRunId),
}));

/** One record for every Product Tracking supplier run, including category/subcategory additions derived from real catalog records. */
export const productTrackingRuns = mysqlTable("product_tracking_runs", {
  id: int("id").autoincrement().primaryKey(),
  supplierKey: varchar("supplierKey", { length: 80 }).notNull(),
  trigger: mysqlEnum("trigger", ["manual", "scheduled"]).notNull(),
  status: mysqlEnum("status", ["started", "completed", "failed", "skipped"]).default("started").notNull(),
  initiatedByAdminId: int("initiatedByAdminId"),
  supplierSyncRunId: int("supplierSyncRunId"),
  productsObserved: int("productsObserved").default(0).notNull(),
  outOfStockProducts: int("outOfStockProducts").default(0).notNull(),
  newlySyncedProducts: int("newlySyncedProducts").default(0).notNull(),
  newlySyncedByCategory: json("newlySyncedByCategory"),
  summary: varchar("summary", { length: 500 }),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, (table) => ({
  supplierStartedIndex: index("product_tracking_runs_supplier_started_idx").on(table.supplierKey, table.startedAt),
  statusStartedIndex: index("product_tracking_runs_status_started_idx").on(table.status, table.startedAt),
}));

/** Owner-managed recurring supplier catalog refresh configuration. The task UID is the durable scheduler identity. */
export const productTrackingSchedules = mysqlTable("product_tracking_schedules", {
  id: int("id").autoincrement().primaryKey(),
  supplierKey: varchar("supplierKey", { length: 80 }).notNull(),
  intervalHours: mysqlEnum("intervalHours", ["2", "10", "24"]).notNull(),
  status: mysqlEnum("status", ["pending_deployment", "active", "paused", "error"]).default("pending_deployment").notNull(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  configuredByAdminId: int("configuredByAdminId").notNull(),
  lastRunAt: timestamp("lastRunAt"),
  nextRunAt: timestamp("nextRunAt"),
  lastError: varchar("lastError", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  supplierUnique: uniqueIndex("product_tracking_schedules_supplier_unique").on(table.supplierKey),
  taskUnique: uniqueIndex("product_tracking_schedules_task_unique").on(table.scheduleCronTaskUid),
  statusIndex: index("product_tracking_schedules_status_idx").on(table.status, table.intervalHours),
}));

/** Admin-managed coupon and catalog-discount rules. Customer prices are derived server-side; source product prices remain unchanged. */
export const promotions = mysqlTable("promotions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  code: varchar("code", { length: 64 }),
  offerKind: mysqlEnum("offerKind", ["coupon", "catalog_discount"]).default("coupon").notNull(),
  discountType: mysqlEnum("discountType", ["percentage", "fixed_amount"]).notNull(),
  discountAmount: decimal("discountAmount", { precision: 12, scale: 2 }).notNull(),
  minimumOrder: decimal("minimumOrder", { precision: 12, scale: 2 }),
  maximumDiscount: decimal("maximumDiscount", { precision: 12, scale: 2 }),
  productId: int("productId"),
  categorySlug: varchar("categorySlug", { length: 80 }),
  startsAt: timestamp("startsAt"),
  endsAt: timestamp("endsAt"),
  usageLimit: int("usageLimit"),
  usageCount: int("usageCount").default(0).notNull(),
  perUserLimit: int("perUserLimit"),
  status: mysqlEnum("status", ["draft", "scheduled", "active", "paused", "archived"]).default("draft").notNull(),
  createdByAdminId: int("createdByAdminId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  codeUnique: uniqueIndex("promotions_code_unique").on(table.code),
  statusPeriodIndex: index("promotions_status_period_idx").on(table.status, table.startsAt, table.endsAt),
  offerStatusIndex: index("promotions_offer_status_idx").on(table.offerKind, table.status, table.startsAt, table.endsAt),
  productIndex: index("promotions_product_idx").on(table.productId),
}));

/** Immutable coupon application record. It captures the exact discount applied to an order without changing any product price. */
export const promotionRedemptions = mysqlTable("promotion_redemptions", {
  id: int("id").autoincrement().primaryKey(),
  promotionId: int("promotionId").notNull(),
  userId: int("userId").notNull(),
  orderId: int("orderId").notNull(),
  couponCode: varchar("couponCode", { length: 64 }).notNull(),
  discountAmount: decimal("discountAmount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  promotionOrderUnique: uniqueIndex("promotion_redemptions_promotion_order_unique").on(table.promotionId, table.orderId),
  promotionUserIndex: index("promotion_redemptions_promotion_user_idx").on(table.promotionId, table.userId, table.createdAt),
  orderUnique: uniqueIndex("promotion_redemptions_order_unique").on(table.orderId),
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

/**
 * Owner-configured pricing policies. These policies are additive and do not
 * change a catalog price until an owner explicitly confirms a bounded apply.
 */
export const pricingRules = mysqlTable("pricing_rules", {
  id: int("id").autoincrement().primaryKey(),
  ruleName: varchar("ruleName", { length: 160 }).notNull(),
  scope: mysqlEnum("scope", ["global", "category", "product", "supplier"]).notNull(),
  category: mysqlEnum("category", ["top_up", "gift_card", "game_key", "subscription", "ai_tool", "software", "steam", "steam_top_up", "telegram_stars"]),
  productId: int("productId"),
  supplierKey: varchar("supplierKey", { length: 80 }),
  outputCurrency: varchar("outputCurrency", { length: 3 }).default("USD").notNull(),
  percentageMarkup: decimal("percentageMarkup", { precision: 7, scale: 2 }).default("0.00").notNull(),
  fixedMarkup: decimal("fixedMarkup", { precision: 12, scale: 2 }).default("0.00").notNull(),
  fixedFee: decimal("fixedFee", { precision: 12, scale: 2 }).default("0.00").notNull(),
  minimumSellingPrice: decimal("minimumSellingPrice", { precision: 12, scale: 2 }),
  maximumDiscountPercent: decimal("maximumDiscountPercent", { precision: 7, scale: 2 }),
  roundingRule: mysqlEnum("roundingRule", ["none", "nearest_0_01", "nearest_1", "nearest_5", "nearest_10", "nearest_50", "nearest_100"]).default("nearest_0_01").notNull(),
  manualPriceOverride: decimal("manualPriceOverride", { precision: 12, scale: 2 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdByAdminId: int("createdByAdminId").notNull(),
  updatedByAdminId: int("updatedByAdminId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  scopeIndex: index("pricing_rules_scope_active_idx").on(table.scope, table.isActive),
  categoryIndex: index("pricing_rules_category_active_idx").on(table.category, table.isActive),
  productIndex: index("pricing_rules_product_active_idx").on(table.productId, table.isActive),
  supplierIndex: index("pricing_rules_supplier_active_idx").on(table.supplierKey, table.isActive),
}));

/** Append-only snapshots of Admin pricing rule changes and explicitly confirmed bounded price applications. */
export const pricingRuleAuditEvents = mysqlTable("pricing_rule_audit_events", {
  id: int("id").autoincrement().primaryKey(),
  pricingRuleId: int("pricingRuleId"),
  productId: int("productId"),
  adminUserId: int("adminUserId").notNull(),
  action: mysqlEnum("action", ["rule_created", "rule_updated", "price_applied"]).notNull(),
  previousPrice: decimal("previousPrice", { precision: 12, scale: 2 }),
  newPrice: decimal("newPrice", { precision: 12, scale: 2 }),
  previousMarkup: decimal("previousMarkup", { precision: 7, scale: 2 }),
  newMarkup: decimal("newMarkup", { precision: 7, scale: 2 }),
  reason: varchar("reason", { length: 500 }),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  ruleCreatedIndex: index("pricing_rule_audit_events_rule_created_idx").on(table.pricingRuleId, table.createdAt),
  productCreatedIndex: index("pricing_rule_audit_events_product_created_idx").on(table.productId, table.createdAt),
  adminCreatedIndex: index("pricing_rule_audit_events_admin_created_idx").on(table.adminUserId, table.createdAt),
}));

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

/**
 * Owner-managed supplier metadata. This table intentionally stores no credential
 * values and does not alter catalog-product links, routing, prices, or orders.
 */
export const supplierManagementProfiles = mysqlTable("supplier_management_profiles", {
  id: int("id").autoincrement().primaryKey(),
  integrationId: int("integrationId"),
  supplierId: varchar("supplierId", { length: 80 }).notNull(),
  supplierName: varchar("supplierName", { length: 120 }).notNull(),
  websiteUrl: text("websiteUrl"),
  supportedCategories: json("supportedCategories"),
  supportedCurrencies: json("supportedCurrencies"),
  isActive: boolean("isActive").default(true).notNull(),
  priority: int("priority").default(100).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  supplierIdUnique: uniqueIndex("supplier_management_profiles_supplier_id_unique").on(table.supplierId),
  integrationUnique: uniqueIndex("supplier_management_profiles_integration_unique").on(table.integrationId),
  activePriorityIndex: index("supplier_management_profiles_active_priority_idx").on(table.isActive, table.priority),
}));

/**
 * Safe, server-side supplier configuration health records. They never store raw
 * credentials, request bodies, response payloads, orders, or fulfilment data.
 */
export const supplierHealthChecks = mysqlTable("supplier_health_checks", {
  id: int("id").autoincrement().primaryKey(),
  supplierProfileId: int("supplierProfileId").notNull(),
  integrationId: int("integrationId"),
  checkType: mysqlEnum("checkType", ["configuration", "manual_probe"]).default("configuration").notNull(),
  status: mysqlEnum("status", ["passed", "attention", "failed"]).notNull(),
  responseMs: int("responseMs"),
  detail: varchar("detail", { length: 500 }).notNull(),
  performedByAdminId: int("performedByAdminId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  profileCreatedIndex: index("supplier_health_checks_profile_created_idx").on(table.supplierProfileId, table.createdAt),
  statusCreatedIndex: index("supplier_health_checks_status_created_idx").on(table.status, table.createdAt),
}));

/** Owner-managed simulation-only supplier-routing policy. liveRoutingEnabled remains false in this stage. */
export const supplierRoutingPolicies = mysqlTable("supplier_routing_policies", {
  id: int("id").primaryKey(),
  strategy: mysqlEnum("strategy", ["lowest_cost", "highest_priority", "manual_selection", "availability_first", "lowest_cost_available"]).default("lowest_cost_available").notNull(),
  liveRoutingEnabled: boolean("liveRoutingEnabled").default(false).notNull(),
  updatedByAdminId: int("updatedByAdminId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Append-only owner simulation routing records. These never submit a supplier order or modify an existing order. */
export const supplierRoutingDecisions = mysqlTable("supplier_routing_decisions", {
  id: int("id").autoincrement().primaryKey(),
  masterProductId: int("masterProductId").notNull(),
  selectedSupplierOfferId: int("selectedSupplierOfferId"),
  selectedSupplierKey: varchar("selectedSupplierKey", { length: 80 }),
  selectedSupplierProductId: varchar("selectedSupplierProductId", { length: 180 }),
  strategy: mysqlEnum("strategy", ["lowest_cost", "highest_priority", "manual_selection", "availability_first", "lowest_cost_available"]).notNull(),
  outcome: mysqlEnum("outcome", ["selected", "no_eligible_offer", "manual_offer_ineligible", "validation_failed"]).notNull(),
  simulationMode: boolean("simulationMode").default(true).notNull(),
  liveRoutingEnabled: boolean("liveRoutingEnabled").default(false).notNull(),
  supplierCost: decimal("supplierCost", { precision: 12, scale: 2 }),
  supplierCurrency: varchar("supplierCurrency", { length: 3 }),
  outputCurrency: varchar("outputCurrency", { length: 3 }),
  exchangeRate: decimal("exchangeRate", { precision: 16, scale: 6 }),
  convertedCost: decimal("convertedCost", { precision: 12, scale: 2 }),
  customerPrice: decimal("customerPrice", { precision: 12, scale: 2 }),
  expectedMargin: decimal("expectedMargin", { precision: 12, scale: 2 }),
  expectedMarginPercent: decimal("expectedMarginPercent", { precision: 7, scale: 2 }),
  fallbackSupplierOfferIds: json("fallbackSupplierOfferIds"),
  eligibilitySnapshot: json("eligibilitySnapshot"),
  detail: varchar("detail", { length: 1000 }).notNull(),
  simulatedByAdminId: int("simulatedByAdminId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  masterCreatedIndex: index("supplier_routing_decisions_master_created_idx").on(table.masterProductId, table.createdAt),
  outcomeCreatedIndex: index("supplier_routing_decisions_outcome_created_idx").on(table.outcome, table.createdAt),
  adminCreatedIndex: index("supplier_routing_decisions_admin_created_idx").on(table.simulatedByAdminId, table.createdAt),
}));

/** Explicit supplier wallet observations only. This table never stores credentials, raw supplier responses, or payment data. */
export const supplierBalanceObservations = mysqlTable("supplier_balance_observations", {
  id: int("id").autoincrement().primaryKey(),
  integrationId: int("integrationId").notNull(),
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  source: mysqlEnum("source", ["manual", "authenticated_receipt"]).default("manual").notNull(),
  observedAt: timestamp("observedAt").defaultNow().notNull(),
  recordedByAdminId: int("recordedByAdminId").notNull(),
  note: varchar("note", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  integrationObservedIndex: index("supplier_balance_observations_integration_observed_idx").on(table.integrationId, table.observedAt),
  balanceIndex: index("supplier_balance_observations_balance_idx").on(table.balance, table.currency),
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
  status: mysqlEnum("status", ["initialized", "pending", "settled", "failed", "expired", "cancelled", "reversed"]).default("initialized").notNull(),
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
  providerReferenceUnique: uniqueIndex("wallet_funding_attempts_provider_reference_unique").on(table.providerReference),
}));

/**
 * Redacted payment-provider callback receipt. Raw payloads, signatures, and
 * credentials are deliberately never stored. Credit requires a separate
 * verified Super Admin action against the matching funding request.
 */
export const paymentWebhookEvents = mysqlTable("payment_webhook_events", {
  id: int("id").autoincrement().primaryKey(),
  integrationId: int("integrationId"),
  providerName: varchar("providerName", { length: 120 }).notNull(),
  providerEventId: varchar("providerEventId", { length: 160 }).notNull(),
  eventType: varchar("eventType", { length: 120 }).notNull(),
  providerTransactionId: varchar("providerTransactionId", { length: 160 }),
  providerReference: varchar("providerReference", { length: 160 }),
  fundingAttemptId: int("fundingAttemptId"),
  userId: int("userId"),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 3 }),
  signatureStatus: mysqlEnum("signatureStatus", ["verified", "invalid", "unavailable"]).default("unavailable").notNull(),
  providerStatus: mysqlEnum("providerStatus", ["pending", "successful", "failed", "refunded", "reversed", "unknown"]).default("unknown").notNull(),
  processingStatus: mysqlEnum("processingStatus", ["received", "verified", "credited", "duplicate", "rejected", "error", "reconciled"]).default("received").notNull(),
  errorMessage: varchar("errorMessage", { length: 1000 }),
  payloadHash: varchar("payloadHash", { length: 64 }),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
}, (table) => ({
  providerEventUnique: uniqueIndex("payment_webhook_events_provider_event_unique").on(table.providerName, table.providerEventId),
  providerReceivedIndex: index("payment_webhook_events_provider_received_idx").on(table.providerName, table.receivedAt),
  fundingReceivedIndex: index("payment_webhook_events_funding_received_idx").on(table.fundingAttemptId, table.receivedAt),
  referenceIndex: index("payment_webhook_events_reference_idx").on(table.providerReference, table.receivedAt),
  transactionIndex: index("payment_webhook_events_transaction_idx").on(table.providerTransactionId, table.receivedAt),
  processingIndex: index("payment_webhook_events_processing_idx").on(table.processingStatus, table.receivedAt),
}));

/**
 * Open/closed reconciliation cases for payment receipts that need an explicit
 * Admin decision. Resolution is an immutable review record, not a balance edit.
 */
export const topUpReconciliationCases = mysqlTable("top_up_reconciliation_cases", {
  id: int("id").autoincrement().primaryKey(),
  caseKey: varchar("caseKey", { length: 180 }).notNull(),
  webhookEventId: int("webhookEventId"),
  fundingAttemptId: int("fundingAttemptId"),
  userId: int("userId"),
  providerName: varchar("providerName", { length: 120 }),
  category: mysqlEnum("category", ["missing_wallet_credit", "duplicate_event", "duplicate_reference", "invalid_signature", "amount_currency_mismatch", "provider_failed", "provider_pending", "refunded_or_reversed"]).notNull(),
  status: mysqlEnum("status", ["open", "resolved"]).default("open").notNull(),
  detail: varchar("detail", { length: 1000 }).notNull(),
  resolutionNote: varchar("resolutionNote", { length: 1000 }),
  resolvedByAdminId: int("resolvedByAdminId"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  caseKeyUnique: uniqueIndex("top_up_reconciliation_cases_case_key_unique").on(table.caseKey),
  statusCreatedIndex: index("top_up_reconciliation_cases_status_created_idx").on(table.status, table.createdAt),
  fundingCreatedIndex: index("top_up_reconciliation_cases_funding_created_idx").on(table.fundingAttemptId, table.createdAt),
  webhookCreatedIndex: index("top_up_reconciliation_cases_webhook_created_idx").on(table.webhookEventId, table.createdAt),
}));

/**
 * Immutable link between an original completed ledger entry and one
 * compensating reversal entry. The unique original entry key prevents reversal
 * of the same wallet movement more than once.
 */
export const walletEntryReversals = mysqlTable("wallet_entry_reversals", {
  id: int("id").autoincrement().primaryKey(),
  originalEntryId: int("originalEntryId").notNull(),
  reversalEntryId: int("reversalEntryId").notNull(),
  fundingAttemptId: int("fundingAttemptId"),
  adminUserId: int("adminUserId").notNull(),
  reason: varchar("reason", { length: 1000 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  originalEntryUnique: uniqueIndex("wallet_entry_reversals_original_entry_unique").on(table.originalEntryId),
  reversalEntryUnique: uniqueIndex("wallet_entry_reversals_reversal_entry_unique").on(table.reversalEntryId),
  fundingCreatedIndex: index("wallet_entry_reversals_funding_created_idx").on(table.fundingAttemptId, table.createdAt),
  adminCreatedIndex: index("wallet_entry_reversals_admin_created_idx").on(table.adminUserId, table.createdAt),
}));

/** Immutable balance snapshot captured beside a newly recorded wallet ledger entry. */
export const walletEntryBalanceSnapshots = mysqlTable("wallet_entry_balance_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  walletEntryId: int("walletEntryId").notNull(),
  walletId: int("walletId").notNull(),
  previousBalance: decimal("previousBalance", { precision: 12, scale: 2 }).notNull(),
  resultingBalance: decimal("resultingBalance", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  entryUnique: uniqueIndex("wallet_entry_balance_snapshots_entry_unique").on(table.walletEntryId),
  walletCreatedIndex: index("wallet_entry_balance_snapshots_wallet_created_idx").on(table.walletId, table.createdAt),
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

/**
 * One protected, idempotent Steam Top-Up checkout session. A session snapshots
 * the USD FoxReload source quote and VAMNUX customer price before any wallet
 * debit or supplier call. Supplier submission stays disabled until separately
 * approved after a paid-wallet and controlled-order verification.
 */
export const steamTopUpCheckoutSessions = mysqlTable("steam_top_up_checkout_sessions", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId"),
  userId: int("userId").notNull(),
  productId: int("productId"),
  supplierProductId: varchar("supplierProductId", { length: 180 }).notNull(),
  steamLogin: varchar("steamLogin", { length: 160 }).notNull(),
  amountUsd: int("amountUsd").notNull(),
  sourceUnitPrice: decimal("sourceUnitPrice", { precision: 12, scale: 4 }).notNull(),
  sourceTotal: decimal("sourceTotal", { precision: 12, scale: 2 }).notNull(),
  customerUnitPrice: decimal("customerUnitPrice", { precision: 12, scale: 4 }).notNull(),
  customerTotal: decimal("customerTotal", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  walletEntryId: int("walletEntryId"),
  supplierOrderId: varchar("supplierOrderId", { length: 120 }),
  idempotencyKey: varchar("idempotencyKey", { length: 120 }).notNull(),
  status: mysqlEnum("status", ["prepared", "wallet_paid", "supplier_submission_disabled", "queued", "processing", "completed", "failed", "cancelled", "refunded"]).default("prepared").notNull(),
  supplierErrorCode: varchar("supplierErrorCode", { length: 120 }),
  sourceQuotedAt: timestamp("sourceQuotedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orderUnique: uniqueIndex("steam_top_up_checkout_sessions_order_unique").on(table.orderId),
  idempotencyUnique: uniqueIndex("steam_top_up_checkout_sessions_idempotency_unique").on(table.idempotencyKey),
  userCreatedIndex: index("steam_top_up_checkout_sessions_user_created_idx").on(table.userId, table.createdAt),
  statusCreatedIndex: index("steam_top_up_checkout_sessions_status_created_idx").on(table.status, table.createdAt),
  supplierOrderIndex: index("steam_top_up_checkout_sessions_supplier_order_idx").on(table.supplierOrderId),
}));

/** Additive test-only order and commercial snapshot. It never replaces or changes the existing orders table. */
export const supplierFulfillmentSimulationOrders = mysqlTable("supplier_fulfillment_simulation_orders", {
  id: int("id").autoincrement().primaryKey(),
  simulationOrderCode: varchar("simulationOrderCode", { length: 40 }).notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 160 }).notNull(),
  sourceOrderId: int("sourceOrderId"),
  customerUserId: int("customerUserId"),
  masterProductId: int("masterProductId").notNull(),
  selectedSupplierOfferId: int("selectedSupplierOfferId"),
  selectedSupplierKey: varchar("selectedSupplierKey", { length: 80 }),
  selectedSupplierProductId: varchar("selectedSupplierProductId", { length: 180 }),
  customerSellingPrice: decimal("customerSellingPrice", { precision: 12, scale: 2 }).notNull(),
  customerCurrency: varchar("customerCurrency", { length: 3 }).notNull(),
  supplierCost: decimal("supplierCost", { precision: 12, scale: 2 }),
  supplierCurrency: varchar("supplierCurrency", { length: 3 }),
  exchangeRate: decimal("exchangeRate", { precision: 16, scale: 6 }),
  markupPercent: decimal("markupPercent", { precision: 7, scale: 2 }),
  expectedProfit: decimal("expectedProfit", { precision: 12, scale: 2 }),
  paymentStatus: mysqlEnum("paymentStatus", ["NOT CHARGED", "SIMULATION ONLY", "PAID", "FAILED", "REFUNDED"]).default("NOT CHARGED").notNull(),
  supplierStatus: mysqlEnum("supplierStatus", ["NOT SUBMITTED", "SIMULATED SUBMITTED", "SIMULATED PROCESSING", "COMPLETED", "FAILED"]).default("NOT SUBMITTED").notNull(),
  orderStatus: mysqlEnum("orderStatus", ["PENDING PAYMENT", "PAID", "PROCESSING", "SUPPLIER SUBMITTED", "SUPPLIER PROCESSING", "COMPLETED", "FAILED", "CANCELLED", "REFUND PENDING", "REFUNDED"]).default("PENDING PAYMENT").notNull(),
  supplierReference: varchar("supplierReference", { length: 160 }),
  customerDeliveryInput: json("customerDeliveryInput"),
  safeSupplierResponseReference: varchar("safeSupplierResponseReference", { length: 500 }),
  simulationMode: boolean("simulationMode").default(true).notNull(),
  liveFulfillmentEnabled: boolean("liveFulfillmentEnabled").default(false).notNull(),
  createdByAdminId: int("createdByAdminId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  simulationCodeUnique: uniqueIndex("supplier_fulfillment_simulation_orders_code_unique").on(table.simulationOrderCode),
  idempotencyKeyUnique: uniqueIndex("supplier_fulfillment_simulation_orders_idempotency_unique").on(table.idempotencyKey),
  sourceOrderUnique: uniqueIndex("supplier_fulfillment_simulation_orders_source_order_unique").on(table.sourceOrderId),
  lifecycleIndex: index("supplier_fulfillment_simulation_orders_lifecycle_idx").on(table.orderStatus, table.createdAt),
  masterCreatedIndex: index("supplier_fulfillment_simulation_orders_master_created_idx").on(table.masterProductId, table.createdAt),
}));

/** Append-only lifecycle history for a test-only fulfillment simulation. No raw supplier API payloads, credentials, or payment data are retained. */
export const supplierFulfillmentSimulationEvents = mysqlTable("supplier_fulfillment_simulation_events", {
  id: int("id").autoincrement().primaryKey(),
  simulationOrderId: int("simulationOrderId").notNull(),
  previousOrderStatus: mysqlEnum("previousOrderStatus", ["PENDING PAYMENT", "PAID", "PROCESSING", "SUPPLIER SUBMITTED", "SUPPLIER PROCESSING", "COMPLETED", "FAILED", "CANCELLED", "REFUND PENDING", "REFUNDED"]),
  nextOrderStatus: mysqlEnum("nextOrderStatus", ["PENDING PAYMENT", "PAID", "PROCESSING", "SUPPLIER SUBMITTED", "SUPPLIER PROCESSING", "COMPLETED", "FAILED", "CANCELLED", "REFUND PENDING", "REFUNDED"]).notNull(),
  eventType: mysqlEnum("eventType", ["created", "payment_simulated", "processing_started", "supplier_submission_simulated", "supplier_processing_simulated", "completed_simulated", "failed_simulated", "retry_simulated", "cancelled_simulated", "refund_pending_simulated", "refunded_simulated"]).notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["NOT CHARGED", "SIMULATION ONLY", "PAID", "FAILED", "REFUNDED"]).notNull(),
  supplierStatus: mysqlEnum("supplierStatus", ["NOT SUBMITTED", "SIMULATED SUBMITTED", "SIMULATED PROCESSING", "COMPLETED", "FAILED"]).notNull(),
  supplierReference: varchar("supplierReference", { length: 160 }),
  reason: varchar("reason", { length: 1000 }),
  safeReference: varchar("safeReference", { length: 500 }),
  performedByAdminId: int("performedByAdminId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  simulationCreatedIndex: index("supplier_fulfillment_simulation_events_order_created_idx").on(table.simulationOrderId, table.createdAt),
  statusCreatedIndex: index("supplier_fulfillment_simulation_events_status_created_idx").on(table.nextOrderStatus, table.createdAt),
}));

/** Immutable server-side financial snapshot for a real future order or Step 7 test simulation. It never reprices the underlying order. */
export const financialOrderSnapshots = mysqlTable("financial_order_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  sourceType: mysqlEnum("sourceType", ["simulation", "order"]).default("simulation").notNull(),
  simulationOrderId: int("simulationOrderId"),
  orderId: int("orderId"),
  masterProductId: int("masterProductId"),
  productId: int("productId"),
  category: mysqlEnum("category", ["top_up", "gift_card", "game_key", "subscription", "ai_tool", "software", "steam", "steam_top_up", "telegram_stars"]),
  supplierKey: varchar("supplierKey", { length: 80 }),
  supplierOfferId: int("supplierOfferId"),
  customerSellingPrice: decimal("customerSellingPrice", { precision: 12, scale: 2 }).notNull(),
  customerCurrency: varchar("customerCurrency", { length: 3 }).notNull(),
  supplierCost: decimal("supplierCost", { precision: 12, scale: 2 }),
  supplierCurrency: varchar("supplierCurrency", { length: 3 }),
  exchangeRate: decimal("exchangeRate", { precision: 16, scale: 6 }),
  supplierCostInCustomerCurrency: decimal("supplierCostInCustomerCurrency", { precision: 12, scale: 2 }),
  markupPercent: decimal("markupPercent", { precision: 7, scale: 2 }),
  paymentProcessingFee: decimal("paymentProcessingFee", { precision: 12, scale: 2 }).default("0.00").notNull(),
  otherApplicableFees: decimal("otherApplicableFees", { precision: 12, scale: 2 }).default("0.00").notNull(),
  paymentFeeConfigured: boolean("paymentFeeConfigured").default(false).notNull(),
  grossRevenue: decimal("grossRevenue", { precision: 12, scale: 2 }).notNull(),
  grossProfit: decimal("grossProfit", { precision: 12, scale: 2 }).notNull(),
  netRevenue: decimal("netRevenue", { precision: 12, scale: 2 }).notNull(),
  netProfit: decimal("netProfit", { precision: 12, scale: 2 }).notNull(),
  profitMarginPercent: decimal("profitMarginPercent", { precision: 7, scale: 2 }).notNull(),
  orderStatus: mysqlEnum("orderStatus", ["PENDING PAYMENT", "PAID", "PROCESSING", "SUPPLIER SUBMITTED", "SUPPLIER PROCESSING", "COMPLETED", "FAILED", "CANCELLED", "REFUND PENDING", "REFUNDED"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  simulationOrderUnique: uniqueIndex("financial_order_snapshots_simulation_order_unique").on(table.simulationOrderId),
  orderProductUnique: uniqueIndex("financial_order_snapshots_order_product_unique").on(table.orderId, table.productId),
  createdIndex: index("financial_order_snapshots_created_idx").on(table.createdAt),
  categoryCreatedIndex: index("financial_order_snapshots_category_created_idx").on(table.category, table.createdAt),
  supplierCreatedIndex: index("financial_order_snapshots_supplier_created_idx").on(table.supplierKey, table.createdAt),
  statusCreatedIndex: index("financial_order_snapshots_status_created_idx").on(table.orderStatus, table.createdAt),
}));

/** Append-only financial effects, including test-only refund events. The original financial snapshot stays immutable. */
export const financialOrderEvents = mysqlTable("financial_order_events", {
  id: int("id").autoincrement().primaryKey(),
  financialSnapshotId: int("financialSnapshotId").notNull(),
  eventType: mysqlEnum("eventType", ["snapshot_created", "payment_fee_recorded", "other_fee_recorded", "refund_recorded", "status_recorded"]).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  orderStatus: mysqlEnum("orderStatus", ["PENDING PAYMENT", "PAID", "PROCESSING", "SUPPLIER SUBMITTED", "SUPPLIER PROCESSING", "COMPLETED", "FAILED", "CANCELLED", "REFUND PENDING", "REFUNDED"]).notNull(),
  simulationMode: boolean("simulationMode").default(true).notNull(),
  note: varchar("note", { length: 1000 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  snapshotCreatedIndex: index("financial_order_events_snapshot_created_idx").on(table.financialSnapshotId, table.createdAt),
  eventCreatedIndex: index("financial_order_events_type_created_idx").on(table.eventType, table.createdAt),
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

/** Owner-delivered tasks created only for real Admin-managed order items. They never trigger supplier fulfilment or payment movement. */
export const manualDeliveryTasks = mysqlTable("manual_delivery_tasks", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  orderItemId: int("orderItemId").notNull(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  status: mysqlEnum("status", ["pending_payment", "pending_review", "in_progress", "completed", "failed", "cancelled"]).default("pending_payment").notNull(),
  deliveryMinimumMinutes: int("deliveryMinimumMinutes"),
  deliveryMaximumMinutes: int("deliveryMaximumMinutes"),
  customerStatusNote: varchar("customerStatusNote", { length: 500 }),
  internalNote: varchar("internalNote", { length: 1000 }),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  failedAt: timestamp("failedAt"),
  updatedByAdminId: int("updatedByAdminId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orderItemUnique: uniqueIndex("manual_delivery_tasks_order_item_unique").on(table.orderItemId),
  orderStatusIndex: index("manual_delivery_tasks_order_status_idx").on(table.orderId, table.status),
  customerStatusIndex: index("manual_delivery_tasks_customer_status_idx").on(table.userId, table.status),
}));

export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type CommerceIntegration = typeof commerceIntegrations.$inferSelect;
export type AuthorizedCatalogSource = typeof authorizedCatalogSources.$inferSelect;
export type WalletFundingAttempt = typeof walletFundingAttempts.$inferSelect;
export type PaymentWebhookEvent = typeof paymentWebhookEvents.$inferSelect;
export type TopUpReconciliationCase = typeof topUpReconciliationCases.$inferSelect;
export type WalletEntryReversal = typeof walletEntryReversals.$inferSelect;
export type WalletEntryBalanceSnapshot = typeof walletEntryBalanceSnapshots.$inferSelect;
export type SupplierWebhookEvent = typeof supplierWebhookEvents.$inferSelect;
export type SavedProduct = typeof savedProducts.$inferSelect;
export type AdminAuditEvent = typeof adminAuditEvents.$inferSelect;
