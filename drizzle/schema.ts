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
export type SupplierWebhookEvent = typeof supplierWebhookEvents.$inferSelect;
export type SavedProduct = typeof savedProducts.$inferSelect;
export type AdminAuditEvent = typeof adminAuditEvents.$inferSelect;
