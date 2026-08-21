import { and, desc, eq, gte, inArray, isNull, like, lte, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { adminAuditEvents, apiRequestLogs, authorizedCatalogSources, commerceIntegrations, customerConsents, customerIdentityLinks, customerNotificationPreferences, customerNotifications, customerPrivacyRequests, customerProfiles, customerSecurityEvents, exchangeRates, InsertUser, loyaltySettings, marketplaceCategories, marketplacePricingSettings, nativeAuthRateLimits, nativeCredentials, nativeSessions, notificationTemplates, orderItems, orders, priceChangeHistory, productAdminAttributes, products, promotions, referralSettings, resellers, savedProducts, siteContentBlocks, siteContentPages, siteSettings, supplierSyncRuns, supplierWebhookEvents, supportTicketMessages, supportTickets, users, walletEntries, walletFundingAttempts, wallets } from "../drizzle/schema";
import { ADMIN_MANAGED_SUPPLIER_KEY, createAdminManagedCatalogSlug, createRecipientEmailRequirement, type AdminManagedCatalogProductInput, type AdminManagedCatalogProductUpdateInput, type AuthorizedCatalogSourceInput } from "../shared/adminCatalog";
import { calculateOrderTotal, createFulfillmentFieldKey, createOrderCode, type SupportedCurrency } from "../shared/marketplace";
import { calculateCustomerDisplayPrice, describePriceRule } from "../shared/pricing";
import type { SupplierCatalogRow } from "./catalogTypes";
import { ENV } from './_core/env';
import { hashNativePassword, verifyNativePassword } from "./nativeAuthCrypto";
import { nativeAuthTokens } from "../drizzle/schema";

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

function requireDb<T>(db: T | null): T {
  if (!db) throw new Error("Marketplace database is not available");
  return db;
}

const NATIVE_AUTH_WINDOW_MS = 15 * 60 * 1000;
const NATIVE_AUTH_MAX_ATTEMPTS = 8;

function normalizeNativeEmail(email: string) {
  return email.trim().toLowerCase();
}

function nativeOpaqueHash(value: string) {
  return createHash("sha256").update(`${ENV.cookieSecret}:${value}`).digest("hex");
}

function nativeActionTokenHash(value: string) {
  return createHmac("sha256", ENV.cookieSecret).update(value).digest("hex");
}

async function consumeNativeAuthAttempt(input: { email: string; action: "register" | "sign_in" | "forgot_password" | "resend_verification" | "verify_email" }) {
  const db = requireDb(await getDb());
  const bucketHash = nativeOpaqueHash(normalizeNativeEmail(input.email));
  const now = new Date();
  const [existing] = await db.select().from(nativeAuthRateLimits).where(and(eq(nativeAuthRateLimits.bucketHash, bucketHash), eq(nativeAuthRateLimits.action, input.action))).limit(1);
  if (!existing || existing.windowExpiresAt <= now) {
    await db.insert(nativeAuthRateLimits).values({ bucketHash, action: input.action, attemptCount: 1, windowExpiresAt: new Date(now.getTime() + NATIVE_AUTH_WINDOW_MS), lastAttemptAt: now }).onDuplicateKeyUpdate({ set: { attemptCount: 1, windowExpiresAt: new Date(now.getTime() + NATIVE_AUTH_WINDOW_MS), lastAttemptAt: now } });
    return true;
  }
  if (existing.attemptCount >= NATIVE_AUTH_MAX_ATTEMPTS) return false;
  await db.update(nativeAuthRateLimits).set({ attemptCount: existing.attemptCount + 1, lastAttemptAt: now }).where(eq(nativeAuthRateLimits.id, existing.id));
  return true;
}

export async function registerNativeCustomer(input: { firstName: string; lastName: string; countryCode: string; email: string; registrationSource?: string | null; phone?: string | null; password: string; marketingConsent: boolean }) {
  const db = requireDb(await getDb());
  const email = normalizeNativeEmail(input.email);
  if (!(await consumeNativeAuthAttempt({ email, action: "register" }))) throw new Error("Please wait before trying again.");

  const [existingCredential] = await db.select({ id: nativeCredentials.id }).from(nativeCredentials).where(eq(nativeCredentials.email, email)).limit(1);
  if (existingCredential) throw new Error("We could not create an account with those details. Try signing in or use a different email address.");

  const openId = `native_${randomUUID().replaceAll("-", "")}`;
  const passwordHash = await hashNativePassword(input.password);
  const name = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
  try {
    await db.insert(users).values({ openId, name, email, loginMethod: "native_email", role: "user", lastSignedIn: new Date() });
    const [user] = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    if (!user) throw new Error("Unable to initialize account.");
    await ensureCustomerAccountRows(db, user.id);
    await db.update(customerProfiles).set({ firstName: input.firstName.trim(), lastName: input.lastName.trim(), countryCode: input.countryCode.trim().toUpperCase(), phone: input.phone?.trim() || null, registrationSource: input.registrationSource?.trim() || null, accountStatus: "pending_email_verification" }).where(eq(customerProfiles.userId, user.id));
    await db.insert(nativeCredentials).values({ userId: user.id, email, passwordHash });
    await db.insert(customerIdentityLinks).values({ userId: user.id, provider: "native_email", providerSubject: openId, providerEmail: email }).onDuplicateKeyUpdate({ set: { providerEmail: email, lastAuthenticatedAt: new Date() } });
    await db.insert(customerConsents).values([
      { userId: user.id, consentType: "terms_privacy", policyVersion: "draft-1", granted: true },
      { userId: user.id, consentType: "marketing", policyVersion: "draft-1", granted: input.marketingConsent },
    ]);
    await recordCustomerSecurityEvent({ userId: user.id, eventType: "native_registration", summary: "A native VAMNUX password account was created. Email verification is pending." });
    return user;
  } catch (error) {
    const [created] = await db.select({ id: users.id }).from(users).where(eq(users.openId, openId)).limit(1);
    if (created) await db.delete(users).where(eq(users.id, created.id));
    throw error;
  }
}

export async function authenticateNativeCustomer(input: { email: string; password: string }) {
  const db = requireDb(await getDb());
  const email = normalizeNativeEmail(input.email);
  if (!(await consumeNativeAuthAttempt({ email, action: "sign_in" }))) throw new Error("Unable to sign in with those details.");
  const [record] = await db.select({ credential: nativeCredentials, user: users }).from(nativeCredentials).innerJoin(users, eq(nativeCredentials.userId, users.id)).where(eq(nativeCredentials.email, email)).limit(1);
  if (!record || record.credential.credentialStatus !== "active" || !(await verifyNativePassword(record.credential.passwordHash, input.password))) {
    throw new Error("Unable to sign in with those details.");
  }
  await db.update(nativeCredentials).set({ updatedAt: new Date() }).where(eq(nativeCredentials.id, record.credential.id));
  await recordCustomerSecurityEvent({ userId: record.user.id, eventType: "native_sign_in", summary: "A VAMNUX password account signed in." });
  return record.user;
}

export async function createNativeSession(input: { userId: number; sessionToken: string; expiresAt: Date }) {
  const db = requireDb(await getDb());
  await db.insert(nativeSessions).values({ userId: input.userId, sessionHash: nativeOpaqueHash(input.sessionToken), expiresAt: input.expiresAt });
}

export async function isNativeSessionActive(input: { userId: number; sessionToken: string }) {
  const db = requireDb(await getDb());
  const [session] = await db.select({ id: nativeSessions.id }).from(nativeSessions).where(and(eq(nativeSessions.userId, input.userId), eq(nativeSessions.sessionHash, nativeOpaqueHash(input.sessionToken)), isNull(nativeSessions.revokedAt), gte(nativeSessions.expiresAt, new Date()))).limit(1);
  if (!session) return false;
  await db.update(nativeSessions).set({ lastSeenAt: new Date() }).where(eq(nativeSessions.id, session.id));
  return true;
}

export async function revokeNativeSession(input: { userId: number; sessionToken: string }) {
  const db = requireDb(await getDb());
  await db.update(nativeSessions).set({ revokedAt: new Date() }).where(and(eq(nativeSessions.userId, input.userId), eq(nativeSessions.sessionHash, nativeOpaqueHash(input.sessionToken)), isNull(nativeSessions.revokedAt)));
}

export async function revokeAllNativeSessions(userId: number) {
  const db = requireDb(await getDb());
  await db.update(nativeSessions).set({ revokedAt: new Date() }).where(and(eq(nativeSessions.userId, userId), isNull(nativeSessions.revokedAt)));
}

type NativeTokenType = "email_verification" | "password_reset";

function createNativeActionToken() {
  return randomBytes(32).toString("base64url");
}

async function issueNativeActionToken(input: { userId: number; tokenType: NativeTokenType; expiresInMs: number }) {
  const db = requireDb(await getDb());
  const token = createNativeActionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + input.expiresInMs);
  await db.update(nativeAuthTokens).set({ usedAt: now }).where(and(eq(nativeAuthTokens.userId, input.userId), eq(nativeAuthTokens.tokenType, input.tokenType), isNull(nativeAuthTokens.usedAt)));
  await db.insert(nativeAuthTokens).values({ userId: input.userId, tokenHash: nativeActionTokenHash(token), tokenType: input.tokenType, expiresAt });
  return { token, expiresAt };
}

async function findUsableNativeActionToken(input: { token: string; tokenType: NativeTokenType }) {
  const db = requireDb(await getDb());
  const [record] = await db.select().from(nativeAuthTokens).where(and(eq(nativeAuthTokens.tokenHash, nativeActionTokenHash(input.token)), eq(nativeAuthTokens.tokenType, input.tokenType), isNull(nativeAuthTokens.usedAt), gte(nativeAuthTokens.expiresAt, new Date()))).limit(1);
  return record ?? null;
}

export async function prepareNativeEmailVerification(userId: number) {
  const db = requireDb(await getDb());
  const [record] = await db.select({ user: users, credential: nativeCredentials, profile: customerProfiles }).from(nativeCredentials).innerJoin(users, eq(nativeCredentials.userId, users.id)).leftJoin(customerProfiles, eq(customerProfiles.userId, users.id)).where(eq(nativeCredentials.userId, userId)).limit(1);
  if (!record || record.credential.emailVerifiedAt) return null;
  const token = await issueNativeActionToken({ userId, tokenType: "email_verification", expiresInMs: 24 * 60 * 60 * 1000 });
  return { email: record.credential.email, firstName: record.profile?.firstName ?? record.user.name, ...token };
}

export async function prepareNativePasswordReset(emailAddress: string) {
  const email = normalizeNativeEmail(emailAddress);
  if (!(await consumeNativeAuthAttempt({ email, action: "forgot_password" }))) return null;
  const db = requireDb(await getDb());
  const [record] = await db.select({ user: users, credential: nativeCredentials, profile: customerProfiles }).from(nativeCredentials).innerJoin(users, eq(nativeCredentials.userId, users.id)).leftJoin(customerProfiles, eq(customerProfiles.userId, users.id)).where(and(eq(nativeCredentials.email, email), eq(nativeCredentials.credentialStatus, "active"))).limit(1);
  if (!record) return null;
  const token = await issueNativeActionToken({ userId: record.user.id, tokenType: "password_reset", expiresInMs: 60 * 60 * 1000 });
  await recordCustomerSecurityEvent({ userId: record.user.id, eventType: "password_reset_requested", summary: "A VAMNUX password reset was requested." });
  return { email: record.credential.email, firstName: record.profile?.firstName ?? record.user.name, ...token };
}

export async function verifyNativeEmailToken(token: string) {
  const record = await findUsableNativeActionToken({ token, tokenType: "email_verification" });
  if (!record) return false;
  const db = requireDb(await getDb());
  const now = new Date();
  await db.transaction(async (tx) => {
    const [tokenUse] = await tx.update(nativeAuthTokens).set({ usedAt: now }).where(and(eq(nativeAuthTokens.id, record.id), isNull(nativeAuthTokens.usedAt)));
    if (tokenUse.affectedRows !== 1) throw new Error("This email-verification link is no longer available.");
    await tx.update(nativeCredentials).set({ emailVerifiedAt: now }).where(eq(nativeCredentials.userId, record.userId));
    await tx.update(customerIdentityLinks).set({ emailVerifiedAt: now }).where(and(eq(customerIdentityLinks.userId, record.userId), eq(customerIdentityLinks.provider, "native_email")));
    await tx.update(customerProfiles).set({ accountStatus: "active" }).where(and(eq(customerProfiles.userId, record.userId), eq(customerProfiles.accountStatus, "pending_email_verification")));
  });
  await recordCustomerSecurityEvent({ userId: record.userId, eventType: "email_verified", summary: "The VAMNUX account email address was verified." });
  return true;
}

export async function resetNativePasswordWithToken(input: { token: string; password: string }) {
  const record = await findUsableNativeActionToken({ token: input.token, tokenType: "password_reset" });
  if (!record) return false;
  const db = requireDb(await getDb());
  const passwordHash = await hashNativePassword(input.password);
  const now = new Date();
  await db.transaction(async (tx) => {
    const [tokenUse] = await tx.update(nativeAuthTokens).set({ usedAt: now }).where(and(eq(nativeAuthTokens.id, record.id), isNull(nativeAuthTokens.usedAt)));
    if (tokenUse.affectedRows !== 1) throw new Error("This password-reset link is no longer available.");
    await tx.update(nativeAuthTokens).set({ usedAt: now }).where(and(eq(nativeAuthTokens.userId, record.userId), eq(nativeAuthTokens.tokenType, "password_reset"), isNull(nativeAuthTokens.usedAt)));
    await tx.update(nativeCredentials).set({ passwordHash, passwordChangedAt: now }).where(eq(nativeCredentials.userId, record.userId));
    await tx.update(nativeSessions).set({ revokedAt: now }).where(and(eq(nativeSessions.userId, record.userId), isNull(nativeSessions.revokedAt)));
  });
  await recordCustomerSecurityEvent({ userId: record.userId, eventType: "password_reset_completed", summary: "The VAMNUX password was reset and prior password sessions were signed out." });
  return true;
}

export async function listActiveCatalogProducts() {
  const db = await getDb();
  if (!db) return [];
  const settings = await ensureMarketplacePricingSettings(db);
  const activeProducts = await db.select().from(products).where(eq(products.status, "active")).orderBy(desc(products.createdAt));
  const attributes = await db.select({ productId: productAdminAttributes.productId, storefrontStatus: productAdminAttributes.storefrontStatus, featured: productAdminAttributes.featured, trending: productAdminAttributes.trending, bestSeller: productAdminAttributes.bestSeller, newProduct: productAdminAttributes.newProduct, deal: productAdminAttributes.deal })
    .from(productAdminAttributes);
  const attributesByProductId = new Map(attributes.map((attribute) => [attribute.productId, attribute]));
  return activeProducts
    .filter((product) => attributesByProductId.get(product.id)?.storefrontStatus !== "hidden")
    .map((product) => ({ ...product, ...customerPriceForProduct(product, settings), storefrontAttributes: attributesByProductId.get(product.id) ?? null }));
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

/** VAMNUX-controlled navigation categories. No supplier or inventory records are created by these operations. */
export async function listMarketplaceCategories(input: { includeArchived?: boolean } = {}) {
  const db = requireDb(await getDb());
  if (input.includeArchived) return db.select().from(marketplaceCategories).orderBy(marketplaceCategories.sortOrder, marketplaceCategories.name);
  return db.select().from(marketplaceCategories).where(eq(marketplaceCategories.status, "active")).orderBy(marketplaceCategories.sortOrder, marketplaceCategories.name);
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
export async function listAdminProductOperations() {
  const db = requireDb(await getDb());
  const settings = await ensureMarketplacePricingSettings(db);
  const rows = await db.select({ product: products, attributes: productAdminAttributes, sourceName: authorizedCatalogSources.displayName, sourceType: authorizedCatalogSources.sourceType }).from(products)
    .leftJoin(productAdminAttributes, eq(products.id, productAdminAttributes.productId))
    .leftJoin(authorizedCatalogSources, eq(products.catalogSourceId, authorizedCatalogSources.id))
    .orderBy(desc(products.updatedAt));
  return rows.map(({ product, attributes, sourceName, sourceType }) => {
    const price = customerPriceForProduct(product, settings);
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      supplierKey: product.supplierKey,
      sourceName: sourceName ?? (product.supplierKey ? product.supplierKey : "Admin managed"),
      sourceType: sourceType ?? "manual",
      category: product.category,
      description: product.description,
      regionLabel: product.regionLabel,
      deliveryEstimate: product.deliveryEstimate,
      deliveryType: product.deliveryType,
      productStatus: product.status,
      supplierEligible: product.supplierEligible,
      basePrice: Number(product.basePrice),
      supplierPrice: product.supplierPrice === null ? null : Number(product.supplierPrice),
      supplierCurrency: product.supplierCurrency,
      markupPercentOverride: product.markupPercentOverride === null ? null : Number(product.markupPercentOverride),
      displayPriceOverride: product.displayPriceOverride === null ? null : Number(product.displayPriceOverride),
      defaultMarkupPercent: settings.defaultMarkupPercent,
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
    deliveryEstimate: products.deliveryEstimate,
    deliveryType: products.deliveryType,
    description: products.description,
    inputRequirements: products.inputRequirements,
    catalogSourceId: products.catalogSourceId,
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

export async function createAdminManagedCatalogProduct(input: AdminManagedCatalogProductInput & { adminUserId: number }) {
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
    deliveryEstimate: input.deliveryEstimate,
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
  await appendAdminAuditEvent(db, { adminUserId: input.adminUserId, action: "catalog.manual_product_created", targetType: "product", targetId: created.id, summary: `Created manual catalog item ${input.name}`, metadata: { category: input.category, status: input.status, deliveryType: input.deliveryType, deliveryEstimate: input.deliveryEstimate, catalogSourceId: source.id } });
  return { id: created.id, name: input.name, status: input.status, slug };
}

/** Edits only VAMNUX-managed listings; supplier-synchronised catalog records remain immutable to this workflow. */
export async function updateAdminManagedCatalogProduct(input: AdminManagedCatalogProductUpdateInput & { adminUserId: number }) {
  const db = requireDb(await getDb());
  const [product] = await db.select().from(products).where(and(eq(products.id, input.productId), eq(products.supplierKey, ADMIN_MANAGED_SUPPLIER_KEY))).limit(1);
  if (!product) throw new Error("Admin-managed catalog item was not found");
  const [conflicting] = await db.select({ id: products.id }).from(products).where(and(eq(products.slug, createAdminManagedCatalogSlug(input.category, input.name)), ne(products.id, product.id))).limit(1);
  if (conflicting) throw new Error("Another catalog item already uses that category and name");
  await db.update(products).set({
    name: input.name,
    category: input.category,
    description: input.description,
    basePrice: input.basePrice.toFixed(2),
    regionLabel: input.regionLabel || null,
    deliveryEstimate: input.deliveryEstimate,
    deliveryType: input.deliveryType,
    inputRequirements: createRecipientEmailRequirement(input.recipientEmailRequired),
    status: input.status,
    supplierEligible: input.status === "active",
  }).where(eq(products.id, product.id));
  await appendAdminAuditEvent(db, { adminUserId: input.adminUserId, action: "catalog.manual_product_updated", targetType: "product", targetId: product.id, summary: `Updated manual catalog item ${input.name}`, metadata: { previousStatus: product.status, nextStatus: input.status, deliveryType: input.deliveryType, deliveryEstimate: input.deliveryEstimate } });
  return { productId: product.id, name: input.name, status: input.status };
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
    loginMethod: users.loginMethod,
    role: users.role,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
    preferredCurrency: customerProfiles.preferredCurrency,
    countryCode: customerProfiles.countryCode,
    accountStatus: customerProfiles.accountStatus,
    suspensionReason: customerProfiles.suspensionReason,
    suspendedAt: customerProfiles.suspendedAt,
    suspendedUntil: customerProfiles.suspendedUntil,
  }).from(users).leftJoin(customerProfiles, eq(users.id, customerProfiles.userId)).orderBy(desc(users.createdAt)).limit(limit);
}

type SuspensionUnit = "days" | "months" | "years" | "permanent";

function calculateSuspensionExpiry(unit: SuspensionUnit, duration: number | undefined) {
  if (unit === "permanent") return null;
  if (!Number.isInteger(duration) || !duration || duration < 1) throw new Error("A positive suspension duration is required");
  const expiry = new Date();
  if (unit === "days") {
    if (duration > 3650) throw new Error("Suspension duration cannot exceed 3,650 days");
    expiry.setUTCDate(expiry.getUTCDate() + duration);
  } else if (unit === "months") {
    if (duration > 120) throw new Error("Suspension duration cannot exceed 120 months");
    expiry.setUTCMonth(expiry.getUTCMonth() + duration);
  } else {
    if (duration > 10) throw new Error("Suspension duration cannot exceed 10 years");
    expiry.setUTCFullYear(expiry.getUTCFullYear() + duration);
  }
  return expiry;
}

/** Enforces active account state across all authenticated entry points without revealing profile data to other customers. */
export async function getCustomerAccountAccessState(userId: number) {
  const db = requireDb(await getDb());
  await db.insert(customerProfiles).values({ userId }).onDuplicateKeyUpdate({ set: { userId } });
  const [profile] = await db.select({ accountStatus: customerProfiles.accountStatus, suspendedUntil: customerProfiles.suspendedUntil })
    .from(customerProfiles).where(eq(customerProfiles.userId, userId)).limit(1);
  if (profile?.accountStatus === "suspended" && profile.suspendedUntil && profile.suspendedUntil.getTime() <= Date.now()) {
    await db.transaction(async (tx) => {
      await tx.update(customerProfiles).set({ accountStatus: "active", suspensionReason: null, suspendedAt: null, suspendedUntil: null, suspendedByAdminId: null }).where(eq(customerProfiles.userId, userId));
      await tx.insert(customerSecurityEvents).values({ userId, eventType: "account_suspension_expired", summary: "Your VAMNUX account restriction period ended automatically." });
      await tx.insert(customerNotifications).values({ userId, category: "security", title: "Account access restored", body: "Your VAMNUX account restriction period has ended.", actionUrl: "/account" });
    });
    return { allowed: true, status: "active" as const };
  }
  if (profile?.accountStatus === "suspended" || profile?.accountStatus === "banned") return { allowed: false, status: profile.accountStatus };
  return { allowed: true, status: profile?.accountStatus ?? "active" };
}

export async function suspendCustomerAccount(input: { adminUserId: number; userId: number; reason: string; unit: SuspensionUnit; duration?: number }) {
  const db = requireDb(await getDb());
  if (input.adminUserId === input.userId) throw new Error("You cannot suspend your own Admin account");
  const reason = input.reason.trim();
  if (reason.length < 3 || reason.length > 500) throw new Error("Provide a suspension reason between 3 and 500 characters");
  const [target] = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users).where(eq(users.id, input.userId)).limit(1);
  if (!target) throw new Error("Customer account was not found");
  if (target.role === "admin") throw new Error("Admin accounts cannot be suspended from this customer control");
  const expiry = calculateSuspensionExpiry(input.unit, input.duration);
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(customerProfiles).values({ userId: target.id }).onDuplicateKeyUpdate({ set: { userId: target.id } });
    await tx.update(customerProfiles).set({ accountStatus: "suspended", suspensionReason: reason, suspendedAt: now, suspendedUntil: expiry, suspendedByAdminId: input.adminUserId }).where(eq(customerProfiles.userId, target.id));
    await tx.update(nativeSessions).set({ revokedAt: now }).where(and(eq(nativeSessions.userId, target.id), isNull(nativeSessions.revokedAt)));
    await tx.insert(customerSecurityEvents).values({ userId: target.id, eventType: "account_suspended", summary: expiry ? "Your VAMNUX account access has been temporarily restricted." : "Your VAMNUX account access has been restricted." });
    await tx.insert(customerNotifications).values({ userId: target.id, category: "security", title: "Account access restricted", body: expiry ? `Your account has been suspended until ${expiry.toISOString()}.` : "Your account has been suspended until further notice.", actionUrl: "/account" });
    await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: "customer.suspended", targetType: "customer", targetId: String(target.id), summary: `Suspended customer ${target.email || target.name || `#${target.id}`}`, metadata: { unit: input.unit, duration: input.duration ?? null, suspendedUntil: expiry?.toISOString() ?? null, reason } });
  });
  return { userId: target.id, status: "suspended" as const, suspendedUntil: expiry };
}

export async function reinstateCustomerAccount(input: { adminUserId: number; userId: number; note?: string }) {
  const db = requireDb(await getDb());
  const [target] = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users).where(eq(users.id, input.userId)).limit(1);
  if (!target) throw new Error("Customer account was not found");
  if (target.role === "admin") throw new Error("Admin accounts are not managed through this customer control");
  const note = input.note?.trim().slice(0, 500) || null;
  await db.transaction(async (tx) => {
    await tx.insert(customerProfiles).values({ userId: target.id }).onDuplicateKeyUpdate({ set: { userId: target.id } });
    await tx.update(customerProfiles).set({ accountStatus: "active", suspensionReason: null, suspendedAt: null, suspendedUntil: null, suspendedByAdminId: null }).where(eq(customerProfiles.userId, target.id));
    await tx.insert(customerSecurityEvents).values({ userId: target.id, eventType: "account_reinstated", summary: "Your VAMNUX account access has been restored by an administrator." });
    await tx.insert(customerNotifications).values({ userId: target.id, category: "security", title: "Account access restored", body: "Your VAMNUX account has been reinstated. Please sign in again if needed.", actionUrl: "/account" });
    await tx.insert(adminAuditEvents).values({ adminUserId: input.adminUserId, action: "customer.reinstated", targetType: "customer", targetId: String(target.id), summary: `Reinstated customer ${target.email || target.name || `#${target.id}`}`, metadata: { note } });
  });
  return { userId: target.id, status: "active" as const };
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
    productName: orderItems.productName,
    quantity: orderItems.quantity,
    unitPrice: orderItems.unitPrice,
    regionLabel: orderItems.regionLabel,
    deliveryType: orderItems.deliveryType,
  }).from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(eq(orders.orderCode, input.orderCode), eq(orders.userId, input.userId)));
  return { order, items };
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

export async function getWalletFundingQuote(currency: "USD" | "EUR" | "GBP" | "NGN") {
  const db = requireDb(await getDb());
  if (currency === "USD") return { currency, minimumAmount: 5, minimumUsd: 5, configuredRate: 1, quoteAvailable: true, note: "Minimum wallet funding is $5.00 USD." };
  if (currency !== "NGN") return { currency, minimumAmount: null, minimumUsd: 5, configuredRate: null, quoteAvailable: false, note: "Wallet funding currently requires a USD or Admin-configured NGN wallet currency." };
  const [rate] = await db.select().from(exchangeRates).where(and(eq(exchangeRates.baseCurrency, "USD"), eq(exchangeRates.quoteCurrency, "NGN"), eq(exchangeRates.active, true))).limit(1);
  if (!rate) return { currency, minimumAmount: null, minimumUsd: 5, configuredRate: null, quoteAvailable: false, note: "An Admin-configured USD/NGN rate is required before NGN wallet funding can be requested." };
  const configuredRate = Number(rate.rate) * (1 + Number(rate.bufferPercent) / 100);
  return { currency, minimumAmount: Number((5 * configuredRate).toFixed(2)), minimumUsd: 5, configuredRate, quoteAvailable: true, note: "Estimate based on the current Admin-configured VAMNUX USD/NGN rate; a payment provider confirmation is still required before any wallet credit." };
}

export async function createCustomerWalletFundingRequest(input: { userId: number; amount: number; currency: "USD" | "EUR" | "GBP" | "NGN"; customerNote?: string }) {
  if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 1_000_000) throw new Error("Enter a valid wallet top-up amount");
  const db = requireDb(await getDb());
  await db.insert(wallets).values({ userId: input.userId, currency: input.currency }).onDuplicateKeyUpdate({ set: { userId: input.userId } });
  const [wallet] = await db.select({ id: wallets.id, status: wallets.status, currency: wallets.currency }).from(wallets).where(eq(wallets.userId, input.userId)).limit(1);
  if (!wallet || wallet.status !== "active") throw new Error("This wallet is not available for a top-up request");
  if (wallet.currency !== input.currency) throw new Error(`Use your active ${wallet.currency} wallet currency for this top-up request`);
  const quote = await getWalletFundingQuote(input.currency);
  if (!quote.quoteAvailable || quote.minimumAmount === null) throw new Error(quote.note);
  if (input.amount < quote.minimumAmount) throw new Error(`Minimum wallet funding is ${quote.minimumAmount.toFixed(2)} ${input.currency}, equivalent to $5.00 USD at the configured rate.`);
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
    metadata: { requestKind: "manual_admin_review", customerNote: input.customerNote?.trim().slice(0, 500) || null, minimumUsd: quote.minimumUsd, configuredRate: quote.configuredRate, quoteNote: quote.note },
  });
  return { fundingCode, status: "pending" as const, amount: input.amount.toFixed(2), currency: input.currency, quoteNote: quote.note };
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
  const trendRows = await db.select({
    date: sql<string>`date(${orders.createdAt})`,
    orders: sql<number>`count(*)`,
    revenue: sql<string>`coalesce(sum(case when ${orders.paymentStatus} = 'paid' then ${orders.total} else 0 end), 0)`,
    supplierCost: sql<string>`coalesce(sum(case when ${orders.paymentStatus} = 'paid' then coalesce(${orders.supplierTotal}, 0) else 0 end), 0)`,
  }).from(orders).where(between(orders.createdAt)).groupBy(sql`date(${orders.createdAt})`).orderBy(sql`date(${orders.createdAt})`);
  const [productPerformance, categoryPerformance] = await Promise.all([
    db.select({ productId: orderItems.productId, productName: orderItems.productName, units: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`, revenue: sql<string>`coalesce(sum(${orderItems.quantity} * ${orderItems.unitPrice}), 0)` }).from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id)).where(paidOrderWhere).groupBy(orderItems.productId, orderItems.productName).orderBy(desc(sql`coalesce(sum(${orderItems.quantity} * ${orderItems.unitPrice}), 0)`)).limit(20),
    db.select({ category: products.category, units: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`, revenue: sql<string>`coalesce(sum(${orderItems.quantity} * ${orderItems.unitPrice}), 0)` }).from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id)).innerJoin(products, eq(orderItems.productId, products.id)).where(paidOrderWhere).groupBy(products.category).orderBy(desc(sql`coalesce(sum(${orderItems.quantity} * ${orderItems.unitPrice}), 0)`)).limit(20),
  ]);
  const revenue = numeric(orderSummary?.settledRevenue); const supplierCost = numeric(orderSummary?.recordedSupplierCost); const grossProfit = revenue - supplierCost;
  return { finance: { settledRevenue: revenue, recordedSupplierCost: supplierCost, paymentFees: null as number | null, refunds: 0, grossProfit, estimatedNetProfit: null as number | null, grossMarginPercent: revenue > 0 ? (grossProfit / revenue) * 100 : null as number | null, currency: "USD", note: "Revenue and supplier cost include only orders marked paid within the selected period. Provider fees, automatic refunds, and supplier fulfilment remain inactive or unavailable." }, orders: { total: numeric(orderSummary?.totalOrders), settled: numeric(orderSummary?.settledOrders), refunded: numeric(orderSummary?.refundedOrders), failed: numeric(orderSummary?.failedOrders) }, customers: { total: numeric(customerSummary?.totalCustomers), active: numeric(customerSummary?.activeCustomers), restrictedOrSuspended: numeric(customerSummary?.restrictedOrSuspended), newInPeriod: numeric(newCustomerSummary?.newCustomers) }, wallets: { totalBalance: numeric(walletSummary?.totalBalance), activeWallets: numeric(walletSummary?.activeWallets), pendingFundingRequests: numeric(fundingSummary?.pendingFunding), manuallySettledFunding: numeric(fundingSummary?.settledFunding) }, performance: { topProducts: productPerformance.map((row) => ({ ...row, units: numeric(row.units), revenue: numeric(row.revenue), profit: null as number | null })), topCategories: categoryPerformance.map((row) => ({ ...row, units: numeric(row.units), revenue: numeric(row.revenue), profit: null as number | null })) }, trends: trendRows.map((row) => ({ date: row.date, orders: numeric(row.orders), revenue: numeric(row.revenue), grossProfit: numeric(row.revenue) - numeric(row.supplierCost) })), period: { start: range?.start ?? null, end: range?.end ?? null } };
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
  if (term.length < 2) return { customers: [], orders: [], products: [], tickets: [], funding: [] };
  const pattern = `%${term}%`;
  const [customers, foundOrders, foundProducts, tickets, funding] = await Promise.all([
    db.select({ id: users.id, name: users.name, email: users.email, username: customerProfiles.username, accountStatus: customerProfiles.accountStatus }).from(users).leftJoin(customerProfiles, eq(users.id, customerProfiles.userId)).where(or(like(users.name, pattern), like(users.email, pattern), like(customerProfiles.username, pattern), like(customerProfiles.phone, pattern))).limit(10),
    db.select({ orderCode: orders.orderCode, status: orders.status, paymentStatus: orders.paymentStatus, total: orders.total, currency: orders.currency, userId: orders.userId, createdAt: orders.createdAt }).from(orders).where(or(like(orders.orderCode, pattern), like(orders.supplierOrderId, pattern))).limit(10),
    db.select({ id: products.id, name: products.name, slug: products.slug, supplierKey: products.supplierKey, supplierSku: products.supplierSku, status: products.status }).from(products).where(or(like(products.name, pattern), like(products.slug, pattern), like(products.supplierSku, pattern))).limit(10),
    db.select({ ticketCode: supportTickets.ticketCode, subject: supportTickets.subject, status: supportTickets.status, userId: supportTickets.userId, updatedAt: supportTickets.updatedAt }).from(supportTickets).where(or(like(supportTickets.ticketCode, pattern), like(supportTickets.subject, pattern))).limit(10),
    db.select({ fundingCode: walletFundingAttempts.fundingCode, providerReference: walletFundingAttempts.providerReference, status: walletFundingAttempts.status, amount: walletFundingAttempts.amount, currency: walletFundingAttempts.currency, userId: walletFundingAttempts.userId, createdAt: walletFundingAttempts.createdAt }).from(walletFundingAttempts).where(or(like(walletFundingAttempts.fundingCode, pattern), like(walletFundingAttempts.providerReference, pattern))).limit(10),
  ]);
  return { customers, orders: foundOrders, products: foundProducts, tickets, funding };
}
