import { ADMIN_MFA_CHALLENGE_COOKIE, ADMIN_MFA_VERIFIED_COOKIE, COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSuperAdminOverview } from "./db";
import { listActiveCatalogSearchSuggestions } from "./db";
import { parse as parseCookieHeader } from "cookie";
import { z } from "zod";
import { adminManagedCatalogProductInputSchema, authorizedCatalogSourceInputSchema } from "../shared/adminCatalog";
import { decodeManualProductImage, manualProductImageContentTypes } from "../shared/manualProductImage";
import { bulkUpdateSyncedProductMarkup, canRunSupplierCatalogSync, cancelSuperAdminDraftOrder, configureCommerceIntegration, createAdminManagedCatalogProduct, createAuthorizedCatalogSource, createCustomerPrivacyRequest, createCustomerSupportTicket, createCustomerWalletFundingRequest, createMarketplaceCategory, createMarketplaceOrder, createPromotion, createSupplierManagementProfile, getAccountCommerceSummary, getCustomerDashboard, getCustomerOrderDetail, getCustomerSupportTicket, getLoyaltySettings, getMarketplacePricingSettings, getPublicPolicyPage, getReferralSettings, getSuperAdminCustomerControlDetail, getSuperAdminFinanceAnalytics, getSuperAdminSupportTicket, getSuperAdminSystemHealth, getSupplierSyncStatus, getUserById, globalAdminSearch, listActiveCatalogProducts, listAdminManagedCatalogProducts, listAdminProductOperations, listAuthorizedCatalogSources, listCatalogPricing, listCommerceIntegrations, listExchangeRates, listMarketplaceCategories, listNotificationTemplates, listPriceChangeHistory, listPromotions, listPublishedSiteContentBlocks, listRedactedApiRequestLogs, listRedactedSupplierWebhookEvents, listResellers, listSiteContentBlocks, listSiteSettings, listSupplierManagement, listSupplierSyncRuns, listSuperAdminAuditEvents, listSuperAdminCustomers, listSuperAdminManualDeliveryTasks, listSuperAdminOrders, listSuperAdminProductActivityEvents, listSuperAdminSupplierBalances, listSuperAdminSupportTickets, listSuperAdminWalletFundingRequests, markCustomerNotificationRead, recordCompletedSupplierCatalogSync, recordCustomerCartAddition, recordSuperAdminAuditEvent, recordSuperAdminSupplierBalance, reinstateCustomerAccount, replyToCustomerSupportTicket, replyToSuperAdminSupportTicket, reviewCustomerWalletFundingRequest, setAdminManagedCatalogProductStatus, suspendCustomerAccount, testSupplierManagementConnection, toggleCustomerSavedProduct, updateCatalogProductPricing, updateCustomerDashboardPreferences, updateCustomerNotificationPreferences, updateCustomerProfile, updateLoyaltySettings, updateMarketplaceCategory, updateMarketplacePricingSettings, updateProductAdminAttributes, updateReferralSettings, updateSupplierManagementProfile, updateSuperAdminManualDeliveryTask, upsertExchangeRate, upsertNotificationTemplate, upsertReseller, upsertSiteContentBlock, upsertSiteSetting } from "./db";
import { bulkArchiveAdminManagedCatalogProducts, bulkUpdateProductStorefrontVisibility } from "./db";
import { activateProductTrackingSchedule, getProductTrackingScheduleById, isProductTrackingSupplierKey, listProductTrackingDashboard, saveProductTrackingScheduleConfiguration, setProductTrackingStorefrontVisibility, updateProductTrackingScheduleState } from "./db";
import { bulkUpdateMarketplaceCategoryStatus, reorderMarketplaceCategories } from "./db";
import { assertCustomerAccountActive, recordCustomerConsent } from "./db";
import { createCustomerProductRequest, recordNewsletterInterest, subscribeCustomerToNewsletterInterest } from "./db";
import { listAdminPolicyPages, updateAdminPolicyPage } from "./db";
import { getSuperAdminNotificationDetail, listSuperAdminNotificationInbox, markAllSuperAdminNotificationsRead, markSuperAdminNotificationsRead } from "./db";
import { replyToSuperAdminNotification } from "./db";
import { getSuperAdminTrafficAnalytics } from "./db";
import { getUsdSteamTopUpQuote, prepareUsdSteamTopUpWalletOrder } from "./db";
import { getSafeSupplierApiAccessStatus } from "./apiAccessControl";
import { getMasterCatalogFoundationSummary } from "./db";
import { addSupplierOfferToMasterForReview, approveSupplierOfferMapping, createSupplierProductMappingMaster, getSupplierProductMappingMaster, getSupplierProductMappingSummary, listSupplierProductMappingMasters, rejectSupplierOfferMapping, removeSupplierOfferMapping, searchSupplierProductsForMapping } from "./db";
import { SUPPLIER_MAPPING_CATEGORIES } from "../shared/supplierProductMapping";
import { applyPricingEngineRule, listPricingEngineAudit, listPricingEngineProducts, listPricingEngineRules, previewPricingEngine, savePricingEngineRule } from "./db";
import { PRICING_ROUNDING_RULES, PRICING_RULE_SCOPES } from "../shared/pricingEngine";
import { listCurrencyManagement, listCurrencyRateHistory, listPricingRateSnapshots, previewCurrencyManagement, saveCurrencyConfiguration, saveCurrencyRateVersion } from "./db";
import { CURRENCY_RATE_SOURCES, CURRENCY_RATE_UPDATE_FREQUENCIES, VAMNUX_SUPPORTED_CURRENCIES } from "../shared/currencyManagement";
import { getSupplierRoutingEligibility, getSupplierRoutingPolicy, listSupplierRoutingDecisions, listSupplierRoutingMasters, saveSupplierRoutingPolicy, simulateSupplierRouting, updateSupplierRoutingSupplier } from "./db";
import { SUPPLIER_ROUTING_STRATEGIES } from "../shared/supplierRouting";
import { createFulfillmentSimulationOrder, getFulfillmentSimulationOrderDetail, listFulfillmentSimulationOrders, transitionFulfillmentSimulationOrder } from "./db";
import { FULFILLMENT_ORDER_STATUSES } from "../shared/supplierFulfillment";
import { getFinancialControlsDashboard, previewFinancialControls } from "./db";
import { getCatalogPreparationComparison, getCatalogPreparationSummary, keepCatalogPreparationProductsSeparate, listCatalogPreparationProducts } from "./db";
import { addTopUpPilotOfferForReview, approveTopUpPilotOffer, createTopUpPilotMaster, getTopUpCatalogPilot, keepTopUpPilotProductsSeparate, markTopUpPilotProductReviewed, rejectTopUpPilotOffer } from "./db";
import { MOBILE_LEGENDS_ADAPTER_PROFILES, simulateSupplierInputAdapter, SUPPLIER_INPUT_ADAPTER_MODE } from "../shared/supplierInputAdapter";
import { syncFlashTopUpCatalog } from "./flashtopupCatalog";
import { syncFoxReloadCatalog } from "./foxreloadCatalog";
import { syncGamesDropCatalog } from "./gamesdropCatalog";
import { runProductTrackingSupplierSync } from "./productTracking";
import { createHeartbeatJob, updateHeartbeatJob } from "./_core/heartbeat";
import { getSessionCookieOptions } from "./_core/cookies";
import { storagePut } from "./storage";
import { systemRouter } from "./_core/systemRouter";
import { completeAdminMfaChallenge, confirmAdminMfaEnrollment, createAdminMfaSessionToken, getAdminMfaStatus, regenerateAdminMfaRecoveryCodes, startAdminMfaEnrollment } from "./adminMfa";
import { sdk } from "./_core/sdk";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";

const customerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  await assertCustomerAccountActive(ctx.user.id);
  return next();
});

const supplierMappingCategorySchema = z.enum(SUPPLIER_MAPPING_CATEGORIES);
const supplierMappingAttributesSchema = z.record(z.string().trim().min(1).max(80), z.string().trim().min(1).max(200)).refine((attributes) => Object.keys(attributes).length <= 20, { message: "Provide no more than 20 mapping attributes" });
const pricingRuleScopeSchema = z.enum(PRICING_RULE_SCOPES);
const pricingRoundingRuleSchema = z.enum(PRICING_ROUNDING_RULES);
const pricingRuleInputSchema = z.object({
  id: z.number().int().positive().optional(),
  ruleName: z.string().trim().min(2).max(160),
  scope: pricingRuleScopeSchema,
  category: supplierMappingCategorySchema.nullable().optional(),
  productId: z.number().int().positive().nullable().optional(),
  supplierKey: z.string().trim().min(2).max(80).nullable().optional(),
  outputCurrency: z.string().trim().length(3),
  percentageMarkup: z.number().min(-100).max(500),
  fixedMarkup: z.number().min(0).max(1_000_000),
  fixedFee: z.number().min(0).max(1_000_000),
  minimumSellingPrice: z.number().min(0).max(1_000_000).nullable().optional(),
  maximumDiscountPercent: z.number().min(0).max(100).nullable().optional(),
  roundingRule: pricingRoundingRuleSchema,
  manualPriceOverride: z.number().min(0).max(1_000_000).nullable().optional(),
  isActive: z.boolean(),
  reason: z.string().trim().max(500).nullable().optional(),
});
const currencyCodeSchema = z.enum(VAMNUX_SUPPORTED_CURRENCIES);
const currencyRateSourceSchema = z.enum(CURRENCY_RATE_SOURCES);
const currencyRateFrequencySchema = z.enum(CURRENCY_RATE_UPDATE_FREQUENCIES);
const supplierRoutingStrategySchema = z.enum(SUPPLIER_ROUTING_STRATEGIES);
const fulfillmentOrderStatusSchema = z.enum(FULFILLMENT_ORDER_STATUSES);
const catalogPreparationStatusSchema = z.enum(["UNMAPPED", "REVIEW REQUIRED", "APPROVED MATCH", "REJECTED MATCH"]);
const supplierAdapterCanonicalInputSchema = z.object({
  gameUserId: z.string().trim().min(1).max(80),
  serverId: z.string().trim().min(1).max(80),
  region: z.enum(["GLOBAL", "RUSSIA"]),
  productId: z.string().trim().min(1).max(120),
  denomination: z.string().trim().min(1).max(32),
});
const productTrackingSupplierSchema = z.enum(["flashtopup", "foxreload", "gamesdrop"]);
const productTrackingIntervalSchema = z.union([z.literal(2), z.literal(10), z.literal(24)]);

function productTrackingCron(intervalHours: 2 | 10 | 24) {
  // A two-hour callback is used for both 2h and 10h schedules. The callback
  // checks its persisted due time, preserving the selected supplier cadence.
  return intervalHours === 24 ? "0 0 0 * * *" : "0 0 */2 * * *";
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(ADMIN_MFA_VERIFIED_COOKIE, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    completeAdminMfa: publicProcedure.input(z.object({ code: z.string().trim().min(6).max(32), method: z.enum(["totp", "recovery"]) })).mutation(async ({ ctx, input }) => {
      const challenge = parseCookieHeader(ctx.req.headers.cookie ?? "")[ADMIN_MFA_CHALLENGE_COOKIE];
      const result = await completeAdminMfaChallenge({ challenge: challenge || "", label: "Super Admin", code: input.code, method: input.method });
      const user = await getUserById(result.userId);
      if (!user || user.role !== "admin") throw new Error("Admin MFA challenge is no longer valid");
      const cookieOptions = getSessionCookieOptions(ctx.req);
      const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || "", expiresInMs: ONE_YEAR_MS });
      const mfaToken = await createAdminMfaSessionToken(user.id);
      ctx.res.clearCookie(ADMIN_MFA_CHALLENGE_COOKIE, { ...cookieOptions, maxAge: -1 });
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      ctx.res.cookie(ADMIN_MFA_VERIFIED_COOKIE, mfaToken, { ...cookieOptions, maxAge: 12 * 60 * 60 * 1000 });
      return { success: true } as const;
    }),
  }),
  marketplace: router({
    catalog: publicProcedure.input(z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(12).max(50_000).default(48),
      category: z.enum(["top_up", "gift_card", "game_key", "subscription", "software", "ai_tool", "steam", "steam_top_up", "telegram_stars"]).optional(),
      gamePlatform: z.enum(["steam", "xbox", "playstation", "nintendo", "battlenet", "ea", "ubisoft", "mobile", "quest"]).optional(),
      topUpMode: z.enum(["direct", "activation"]).optional(),
      search: z.string().trim().max(100).optional(),
      slug: z.string().trim().max(255).optional(),
      familyName: z.string().trim().max(255).optional(),
      scope: z.enum(["primary", "all"]).default("primary"),
      includeMetadata: z.boolean().default(false),
    }).optional()).query(({ input }) => listActiveCatalogProducts(input)),
    catalogSuggestions: publicProcedure.input(z.object({
      query: z.string().trim().min(2).max(100),
      category: z.enum(["top_up", "gift_card", "game_key", "subscription", "software", "ai_tool", "steam", "steam_top_up", "telegram_stars"]).optional(),
      gamePlatform: z.enum(["steam", "xbox", "playstation", "nintendo", "battlenet", "ea", "ubisoft", "mobile", "quest"]).optional(),
      topUpMode: z.enum(["direct", "activation"]).optional(),
      scope: z.enum(["primary", "all"]).default("all"),
    })).query(({ input }) => listActiveCatalogSearchSuggestions(input)),
    categories: publicProcedure.query(() => listMarketplaceCategories()),
    siteContentBlocks: publicProcedure.query(() => listPublishedSiteContentBlocks()),
    subscribeNewsletter: publicProcedure.input(z.object({ email: z.string().trim().email().max(320), consent: z.literal(true) }))
      .mutation(({ input }) => recordNewsletterInterest(input.email)),
    subscribeDashboardNewsletter: customerProcedure.mutation(({ ctx }) => subscribeCustomerToNewsletterInterest(ctx.user.id)),
    policyPage: publicProcedure.input(z.object({ slug: z.enum(["terms-of-service", "privacy-policy", "cookie-policy", "refund-policy", "payment-policy", "delivery-policy", "acceptable-use-policy"]) })).query(({ input }) => getPublicPolicyPage(input.slug)),
    accountSummary: customerProcedure.query(({ ctx }) => getAccountCommerceSummary(ctx.user.id)),
    customerDashboard: customerProcedure.query(({ ctx }) => getCustomerDashboard(ctx.user.id)),
    orderDetail: customerProcedure.input(z.object({ orderCode: z.string().trim().min(3).max(32) })).query(({ ctx, input }) => getCustomerOrderDetail({ userId: ctx.user.id, ...input })),
    updateCustomerPreferences: customerProcedure.input(z.object({
      preferredCurrency: z.enum(["USD", "EUR", "GBP", "NGN"]),
      countryCode: z.string().trim().length(2).toUpperCase().nullable().optional(),
    })).mutation(({ ctx, input }) => updateCustomerDashboardPreferences({ userId: ctx.user.id, ...input })),
    toggleSavedProduct: customerProcedure.input(z.object({ productId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => toggleCustomerSavedProduct({ userId: ctx.user.id, productId: input.productId })),
    recordCartAddition: customerProcedure.input(z.object({ productId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => recordCustomerCartAddition({ userId: ctx.user.id, productId: input.productId })),
    updateCustomerProfile: customerProcedure.input(z.object({
      firstName: z.string().trim().max(80).nullable().optional(),
      lastName: z.string().trim().max(80).nullable().optional(),
      username: z.string().trim().max(30).nullable().optional(),
      phone: z.string().trim().max(32).nullable().optional(),
      countryCode: z.string().trim().length(2).toUpperCase().nullable().optional(),
      registrationSource: z.enum(["Google", "Facebook", "Instagram", "TikTok", "X", "YouTube", "WhatsApp", "Friend", "Referral", "Advertisement", "Other"]).nullable().optional(),
    })).mutation(({ ctx, input }) => updateCustomerProfile({ userId: ctx.user.id, ...input })),
    updateNotificationPreferences: customerProcedure.input(z.object({
      orderUpdates: z.boolean(),
      paymentUpdates: z.boolean(),
      walletUpdates: z.boolean(),
      securityAlerts: z.boolean().optional(),
      marketingUpdates: z.boolean(),
      productAnnouncements: z.boolean(),
    })).mutation(({ ctx, input }) => updateCustomerNotificationPreferences({ userId: ctx.user.id, ...input })),
    recordCustomerConsent: customerProcedure.input(z.object({ consentType: z.enum(["terms_privacy", "marketing"]), granted: z.boolean() }))
      .mutation(({ ctx, input }) => recordCustomerConsent({ userId: ctx.user.id, ...input })),
    markNotificationRead: customerProcedure.input(z.object({ notificationId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => markCustomerNotificationRead({ userId: ctx.user.id, ...input })),
    createSupportTicket: customerProcedure.input(z.object({
      category: z.enum(["payment", "order", "game_top_up", "gift_card", "subscription", "software", "wallet", "account", "refund", "other"]),
      subject: z.string().trim().min(3).max(180),
      message: z.string().trim().min(3).max(5000),
      orderCode: z.string().trim().min(3).max(32).optional(),
    })).mutation(({ ctx, input }) => createCustomerSupportTicket({ userId: ctx.user.id, ...input })),
    createProductRequest: customerProcedure.input(z.object({
      category: z.enum(["product", "game_top_up", "gift_card", "subscription", "software", "ai_tool", "other"]),
      requestedName: z.string().trim().min(2).max(180),
      details: z.string().trim().max(2000).optional(),
    })).mutation(({ ctx, input }) => createCustomerProductRequest({ userId: ctx.user.id, ...input })),
    getSupportTicket: customerProcedure.input(z.object({ ticketCode: z.string().trim().min(3).max(32) }))
      .query(({ ctx, input }) => getCustomerSupportTicket({ userId: ctx.user.id, ...input })),
    replyToSupportTicket: customerProcedure.input(z.object({ ticketCode: z.string().trim().min(3).max(32), message: z.string().trim().min(3).max(5000) }))
      .mutation(({ ctx, input }) => replyToCustomerSupportTicket({ userId: ctx.user.id, ...input })),
    createPrivacyRequest: customerProcedure.input(z.object({ requestType: z.enum(["data_access", "data_correction", "account_deletion"]), note: z.string().trim().max(500).optional() }))
      .mutation(({ ctx, input }) => createCustomerPrivacyRequest({ userId: ctx.user.id, ...input })),
    createWalletFundingRequest: customerProcedure.input(z.object({
      amount: z.number().positive().max(1_000_000),
      currency: z.enum(["USD", "EUR", "GBP", "NGN"]),
      customerNote: z.string().trim().max(500).optional(),
    })).mutation(({ ctx, input }) => createCustomerWalletFundingRequest({ userId: ctx.user.id, ...input })),
    createOrder: customerProcedure.input(z.object({
      currency: z.enum(["USD", "EUR", "GBP", "NGN"]),
      items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(25) })).min(1).max(25),
      fulfillmentDetails: z.record(z.string(), z.string()).optional(),
    })).mutation(({ ctx, input }) => createMarketplaceOrder({
      userId: ctx.user.id,
      currency: input.currency,
      items: input.items,
      fulfillmentDetails: input.fulfillmentDetails,
    })),
    steamTopUpQuote: customerProcedure.query(() => getUsdSteamTopUpQuote()),
    prepareSteamTopUpWalletOrder: customerProcedure.input(z.object({
      amountUsd: z.number().int().min(1).max(300),
      steamLogin: z.string().trim().min(2).max(160),
      idempotencyKey: z.string().trim().min(12).max(120),
    })).mutation(({ ctx, input }) => prepareUsdSteamTopUpWalletOrder({ userId: ctx.user.id, ...input })),
  }),
  admin: router({
    mfaStatus: adminProcedure.query(({ ctx }) => getAdminMfaStatus(ctx.user.id)),
    startMfaEnrollment: adminProcedure.mutation(({ ctx }) => startAdminMfaEnrollment({ userId: ctx.user.id, label: "Super Admin" })),
    confirmMfaEnrollment: adminProcedure.input(z.object({ code: z.string().trim().length(6) })).mutation(async ({ ctx, input }) => {
      const result = await confirmAdminMfaEnrollment({ userId: ctx.user.id, label: "Super Admin", code: input.code });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(ADMIN_MFA_VERIFIED_COOKIE, await createAdminMfaSessionToken(ctx.user.id), { ...cookieOptions, maxAge: 12 * 60 * 60 * 1000 });
      return result;
    }),
    regenerateMfaRecoveryCodes: adminProcedure.input(z.object({ code: z.string().trim().length(6) })).mutation(({ ctx, input }) => regenerateAdminMfaRecoveryCodes({ userId: ctx.user.id, label: "Super Admin", code: input.code })),
    getOverview: adminProcedure.query(() => getSuperAdminOverview()),
    getMasterCatalogFoundation: adminProcedure.query(() => getMasterCatalogFoundationSummary()),
    getSupplierProductMappingSummary: adminProcedure.query(() => getSupplierProductMappingSummary()),
    listSupplierProductMappingMasters: adminProcedure.query(() => listSupplierProductMappingMasters()),
    getSupplierProductMappingMaster: adminProcedure.input(z.object({ masterProductId: z.number().int().positive() })).query(({ input }) => getSupplierProductMappingMaster(input.masterProductId)),
    searchSupplierProductsForMapping: adminProcedure.input(z.object({ query: z.string().trim().min(2).max(120), category: supplierMappingCategorySchema.optional(), limit: z.number().int().min(1).max(50).optional() }))
      .query(({ input }) => searchSupplierProductsForMapping(input)),
    createSupplierProductMappingMaster: adminProcedure.input(z.object({
      name: z.string().trim().min(2).max(255),
      category: supplierMappingCategorySchema,
      subcategory: z.string().trim().max(120).nullable().optional(),
      productType: z.string().trim().max(120).nullable().optional(),
      regionLabel: z.string().trim().max(120).nullable().optional(),
      currency: z.string().trim().length(3).nullable().optional(),
      denomination: z.string().trim().max(120).nullable().optional(),
      imageUrl: z.string().trim().url().max(2_000).nullable().optional(),
      mappingAttributes: supplierMappingAttributesSchema,
    })).mutation(({ ctx, input }) => createSupplierProductMappingMaster({ ...input, adminUserId: ctx.user.id })),
    addSupplierOfferToMasterForReview: adminProcedure.input(z.object({ masterProductId: z.number().int().positive(), legacyProductId: z.number().int().positive(), mappingAttributes: supplierMappingAttributesSchema, note: z.string().trim().max(1_000).nullable().optional() }))
      .mutation(({ ctx, input }) => addSupplierOfferToMasterForReview({ ...input, adminUserId: ctx.user.id })),
    approveSupplierOfferMapping: adminProcedure.input(z.object({ supplierOfferId: z.number().int().positive(), note: z.string().trim().max(1_000).nullable().optional() }))
      .mutation(({ ctx, input }) => approveSupplierOfferMapping({ ...input, adminUserId: ctx.user.id })),
    rejectSupplierOfferMapping: adminProcedure.input(z.object({ supplierOfferId: z.number().int().positive(), note: z.string().trim().max(1_000).nullable().optional() }))
      .mutation(({ ctx, input }) => rejectSupplierOfferMapping({ ...input, adminUserId: ctx.user.id })),
    removeSupplierOfferMapping: adminProcedure.input(z.object({ supplierOfferId: z.number().int().positive(), note: z.string().trim().max(1_000).nullable().optional() }))
      .mutation(({ ctx, input }) => removeSupplierOfferMapping({ ...input, adminUserId: ctx.user.id })),
    listPricingEngineRules: adminProcedure.query(() => listPricingEngineRules()),
    listPricingEngineProducts: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(500).default(250) }).optional()).query(({ input }) => listPricingEngineProducts(input?.limit)),
    previewPricingEngine: adminProcedure.input(z.object({ supplierCost: z.number().min(0).max(1_000_000), supplierCurrency: z.string().trim().length(3), outputCurrency: z.string().trim().length(3), exchangeRate: z.number().positive().max(10_000_000).nullable().optional(), percentageMarkup: z.number().min(-100).max(500), fixedMarkup: z.number().min(0).max(1_000_000), fixedFee: z.number().min(0).max(1_000_000), minimumSellingPrice: z.number().min(0).max(1_000_000).nullable().optional(), maximumDiscountPercent: z.number().min(0).max(100).nullable().optional(), roundingRule: pricingRoundingRuleSchema, manualPriceOverride: z.number().min(0).max(1_000_000).nullable().optional() }))
      .query(({ input }) => previewPricingEngine(input)),
    savePricingEngineRule: adminProcedure.input(pricingRuleInputSchema).mutation(({ ctx, input }) => savePricingEngineRule({ ...input, adminUserId: ctx.user.id })),
    applyPricingEngineRule: adminProcedure.input(z.object({ pricingRuleId: z.number().int().positive(), productIds: z.array(z.number().int().positive()).min(1).max(100), confirmation: z.literal("APPLY"), reason: z.string().trim().max(500).nullable().optional() }))
      .mutation(({ ctx, input }) => applyPricingEngineRule({ ...input, adminUserId: ctx.user.id })),
    listPricingEngineAudit: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(250).default(100) }).optional()).query(({ input }) => listPricingEngineAudit(input?.limit)),
    getCurrencyManagement: adminProcedure.query(() => listCurrencyManagement()),
    saveCurrencyConfiguration: adminProcedure.input(z.object({ currencyCode: currencyCodeSchema, active: z.boolean(), rateUpdateFrequency: currencyRateFrequencySchema, preferredRateSource: currencyRateSourceSchema, approvedSourceLabel: z.string().trim().max(160).nullable().optional() }))
      .mutation(({ ctx, input }) => saveCurrencyConfiguration({ ...input, adminUserId: ctx.user.id })),
    saveCurrencyRateVersion: adminProcedure.input(z.object({ baseCurrency: currencyCodeSchema, quoteCurrency: currencyCodeSchema, rate: z.number().positive().max(10_000_000), bufferPercent: z.number().min(0).max(100), source: currencyRateSourceSchema, sourceLabel: z.string().trim().max(160).nullable().optional(), rateUpdateFrequency: currencyRateFrequencySchema, effectiveAt: z.date(), active: z.boolean(), reason: z.string().trim().max(500).nullable().optional() }))
      .mutation(({ ctx, input }) => saveCurrencyRateVersion({ ...input, adminUserId: ctx.user.id })),
    listCurrencyRateHistory: adminProcedure.input(z.object({ baseCurrency: currencyCodeSchema.optional(), quoteCurrency: currencyCodeSchema.optional(), limit: z.number().int().min(1).max(250).default(100) }).optional())
      .query(({ input }) => listCurrencyRateHistory(input)),
    previewCurrencyManagement: adminProcedure.input(z.object({ supplierCost: z.number().min(0).max(1_000_000), supplierCurrency: currencyCodeSchema, outputCurrency: currencyCodeSchema, percentageMarkup: z.number().min(-100).max(500), fixedMarkup: z.number().min(0).max(1_000_000), fixedFee: z.number().min(0).max(1_000_000), minimumSellingPrice: z.number().min(0).max(1_000_000).nullable().optional(), maximumDiscountPercent: z.number().min(0).max(100).nullable().optional(), roundingRule: pricingRoundingRuleSchema, manualPriceOverride: z.number().min(0).max(1_000_000).nullable().optional(), at: z.date().optional() }))
      .query(({ input }) => previewCurrencyManagement(input)),
    listPricingRateSnapshots: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(250).default(100) }).optional()).query(({ input }) => listPricingRateSnapshots(input?.limit)),
    getSupplierRoutingPolicy: adminProcedure.query(() => getSupplierRoutingPolicy()),
    saveSupplierRoutingPolicy: adminProcedure.input(z.object({ strategy: supplierRoutingStrategySchema })).mutation(({ ctx, input }) => saveSupplierRoutingPolicy({ ...input, adminUserId: ctx.user.id })),
    listSupplierRoutingMasters: adminProcedure.query(() => listSupplierRoutingMasters()),
    getSupplierRoutingEligibility: adminProcedure.input(z.object({ masterProductId: z.number().int().positive() })).query(({ input }) => getSupplierRoutingEligibility(input.masterProductId)),
    updateSupplierRoutingSupplier: adminProcedure.input(z.object({ profileId: z.number().int().positive(), isActive: z.boolean(), priority: z.number().int().min(1).max(100_000) })).mutation(({ ctx, input }) => updateSupplierRoutingSupplier({ ...input, adminUserId: ctx.user.id })),
    simulateSupplierRouting: adminProcedure.input(z.object({ masterProductId: z.number().int().positive(), strategy: supplierRoutingStrategySchema.optional(), manualSupplierOfferId: z.number().int().positive().nullable().optional() })).mutation(({ ctx, input }) => simulateSupplierRouting({ ...input, adminUserId: ctx.user.id })),
    listSupplierRoutingDecisions: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(250).default(100) }).optional()).query(({ input }) => listSupplierRoutingDecisions(input?.limit)),
    listFulfillmentSimulationOrders: adminProcedure.input(z.object({ search: z.string().trim().max(120).optional(), status: fulfillmentOrderStatusSchema.optional(), limit: z.number().int().min(1).max(250).default(100) }).optional()).query(({ input }) => listFulfillmentSimulationOrders(input)),
    getFulfillmentSimulationOrderDetail: adminProcedure.input(z.object({ simulationOrderId: z.number().int().positive() })).query(({ input }) => getFulfillmentSimulationOrderDetail(input.simulationOrderId)),
    createFulfillmentSimulationOrder: adminProcedure.input(z.object({ masterProductId: z.number().int().positive(), selectedSupplierOfferId: z.number().int().positive().nullable().optional(), customerSellingPrice: z.number().positive().max(1_000_000), customerCurrency: z.string().trim().length(3), idempotencyKey: z.string().trim().min(8).max(160), customerDeliveryInput: z.record(z.string().trim().min(1).max(80), z.string().trim().min(1).max(300)).refine((input) => Object.keys(input).length <= 20, { message: "Provide no more than 20 delivery fields" }).nullable().optional() })).mutation(({ ctx, input }) => createFulfillmentSimulationOrder({ ...input, adminUserId: ctx.user.id })),
    transitionFulfillmentSimulationOrder: adminProcedure.input(z.object({ simulationOrderId: z.number().int().positive(), nextStatus: fulfillmentOrderStatusSchema, reason: z.string().trim().max(1000).nullable().optional(), safeReference: z.string().trim().max(500).nullable().optional() })).mutation(({ ctx, input }) => transitionFulfillmentSimulationOrder({ ...input, adminUserId: ctx.user.id })),
    getFinancialControlsDashboard: adminProcedure.input(z.object({ start: z.coerce.date().optional(), end: z.coerce.date().optional(), productId: z.number().int().positive().optional(), category: supplierMappingCategorySchema.optional(), supplierKey: z.string().trim().min(2).max(80).optional(), currency: currencyCodeSchema.optional(), orderStatus: fulfillmentOrderStatusSchema.optional() }).optional()).query(({ input }) => getFinancialControlsDashboard(input)),
    previewFinancialControls: adminProcedure.input(z.object({ customerSellingPrice: z.number().positive().max(1_000_000), supplierCost: z.number().min(0).max(1_000_000).nullable(), exchangeRate: z.number().positive().max(1_000_000).nullable(), supplierCostInCustomerCurrency: z.number().min(0).max(1_000_000).nullable(), paymentProcessingFee: z.number().min(0).max(1_000_000), otherApplicableFees: z.number().min(0).max(1_000_000), refundAmount: z.number().min(0).max(1_000_000), paymentFeeConfigured: z.boolean() })).query(({ input }) => previewFinancialControls(input)),
    getCatalogPreparationSummary: adminProcedure.query(() => getCatalogPreparationSummary()),
    listCatalogPreparationProducts: adminProcedure.input(z.object({ category: supplierMappingCategorySchema.optional(), supplierKey: z.string().trim().min(2).max(80).optional(), currency: z.string().trim().length(3).optional(), region: z.string().trim().min(1).max(120).optional(), platform: z.string().trim().min(1).max(120).optional(), mappingStatus: catalogPreparationStatusSchema.optional(), offset: z.number().int().min(0).max(10_000).optional(), limit: z.number().int().min(1).max(25).optional() }).optional()).query(({ input }) => listCatalogPreparationProducts(input)),
    getCatalogPreparationComparison: adminProcedure.input(z.object({ leftProductId: z.number().int().positive(), rightProductId: z.number().int().positive() })).query(({ input }) => getCatalogPreparationComparison(input)),
    keepCatalogPreparationProductsSeparate: adminProcedure.input(z.object({ leftProductId: z.number().int().positive(), rightProductId: z.number().int().positive(), note: z.string().trim().max(500).nullable().optional() })).mutation(({ ctx, input }) => keepCatalogPreparationProductsSeparate({ ...input, adminUserId: ctx.user.id })),
    getTopUpCatalogPilot: adminProcedure.query(() => getTopUpCatalogPilot()),
    markTopUpPilotProductReviewed: adminProcedure.input(z.object({ legacyProductId: z.number().int().positive(), note: z.string().trim().max(500).nullable().optional() })).mutation(({ ctx, input }) => markTopUpPilotProductReviewed({ ...input, adminUserId: ctx.user.id })),
    createTopUpPilotMaster: adminProcedure.input(z.object({ legacyProductId: z.number().int().positive(), name: z.string().trim().min(1).max(255), subcategory: z.string().trim().max(120).nullable().optional(), productType: z.string().trim().max(120).nullable().optional(), regionLabel: z.string().trim().max(120).nullable().optional(), currency: z.string().trim().length(3).nullable().optional(), denomination: z.string().trim().max(120).nullable().optional(), imageUrl: z.string().trim().url().max(2000).nullable().optional(), mappingAttributes: supplierMappingAttributesSchema })).mutation(({ ctx, input }) => createTopUpPilotMaster({ ...input, adminUserId: ctx.user.id })),
    addTopUpPilotOfferForReview: adminProcedure.input(z.object({ masterProductId: z.number().int().positive(), legacyProductId: z.number().int().positive(), mappingAttributes: supplierMappingAttributesSchema, note: z.string().trim().max(500).nullable().optional() })).mutation(({ ctx, input }) => addTopUpPilotOfferForReview({ ...input, adminUserId: ctx.user.id })),
    approveTopUpPilotOffer: adminProcedure.input(z.object({ supplierOfferId: z.number().int().positive(), note: z.string().trim().max(500).nullable().optional() })).mutation(({ ctx, input }) => approveTopUpPilotOffer({ ...input, adminUserId: ctx.user.id })),
    rejectTopUpPilotOffer: adminProcedure.input(z.object({ supplierOfferId: z.number().int().positive(), note: z.string().trim().max(500).nullable().optional() })).mutation(({ ctx, input }) => rejectTopUpPilotOffer({ ...input, adminUserId: ctx.user.id })),
    keepTopUpPilotProductsSeparate: adminProcedure.input(z.object({ leftProductId: z.number().int().positive(), rightProductId: z.number().int().positive(), note: z.string().trim().max(500).nullable().optional() })).mutation(({ ctx, input }) => keepTopUpPilotProductsSeparate({ ...input, adminUserId: ctx.user.id })),
    listSupplierInputAdapterProfiles: adminProcedure.query(() => ({ mode: SUPPLIER_INPUT_ADAPTER_MODE, profiles: MOBILE_LEGENDS_ADAPTER_PROFILES })),
    previewSupplierInputAdapter: adminProcedure.input(z.object({ pairId: z.string().trim().min(1).max(120), canonicalInput: supplierAdapterCanonicalInputSchema })).mutation(({ input }) => simulateSupplierInputAdapter(input)),
    getSystemHealth: adminProcedure.query(() => getSuperAdminSystemHealth()),
    listCustomers: adminProcedure.query(() => listSuperAdminCustomers()),
    getCustomerControlDetail: adminProcedure.input(z.object({ userId: z.number().int().positive() })).query(({ input }) => getSuperAdminCustomerControlDetail(input.userId)),
    suspendCustomer: adminProcedure.input(z.object({ userId: z.number().int().positive(), reason: z.string().trim().min(3).max(500), suspendedUntil: z.date().nullable().optional() }))
      .mutation(({ ctx, input }) => suspendCustomerAccount({ ...input, adminUserId: ctx.user.id })),
    reinstateCustomer: adminProcedure.input(z.object({ userId: z.number().int().positive(), decisionNote: z.string().trim().max(500).optional() }))
      .mutation(({ ctx, input }) => reinstateCustomerAccount({ ...input, adminUserId: ctx.user.id })),
    listOrders: adminProcedure.query(() => listSuperAdminOrders()),
    listProductActivityEvents: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(250).optional() }).optional())
      .query(({ input }) => listSuperAdminProductActivityEvents(input)),
    listManualDeliveryTasks: adminProcedure.query(() => listSuperAdminManualDeliveryTasks()),
    updateManualDeliveryTask: adminProcedure.input(z.object({
      taskId: z.number().int().positive(),
      status: z.enum(["pending_payment", "pending_review", "in_progress", "completed", "failed", "cancelled"]),
      customerStatusNote: z.string().trim().max(500).nullable().optional(),
      internalNote: z.string().trim().max(1000).nullable().optional(),
    })).mutation(({ ctx, input }) => updateSuperAdminManualDeliveryTask({ ...input, adminUserId: ctx.user.id })),
    cancelDraftOrder: adminProcedure.input(z.object({ orderId: z.number().int().positive(), reason: z.string().trim().min(3).max(500) }))
      .mutation(({ ctx, input }) => cancelSuperAdminDraftOrder({ ...input, adminUserId: ctx.user.id })),
    listSupportTickets: adminProcedure.query(() => listSuperAdminSupportTickets()),
    getSupportTicket: adminProcedure.input(z.object({ ticketCode: z.string().trim().min(3).max(32) })).query(({ input }) => getSuperAdminSupportTicket(input.ticketCode)),
    replyToSupportTicket: adminProcedure.input(z.object({ ticketCode: z.string().trim().min(3).max(32), message: z.string().trim().min(3).max(5000), status: z.enum(["processing", "waiting_for_customer", "resolved", "closed"]) }))
      .mutation(({ ctx, input }) => replyToSuperAdminSupportTicket({ adminUserId: ctx.user.id, ...input })),
    listWalletFundingRequests: adminProcedure.query(() => listSuperAdminWalletFundingRequests()),
    reviewWalletFundingRequest: adminProcedure.input(z.object({
      fundingCode: z.string().trim().min(4).max(32),
      action: z.enum(["settle", "reject"]),
      verificationReference: z.string().trim().min(2).max(160).optional(),
      reviewNote: z.string().trim().max(500).optional(),
    })).mutation(({ ctx, input }) => reviewCustomerWalletFundingRequest({ adminUserId: ctx.user.id, ...input })),
    listAuditEvents: adminProcedure.query(() => listSuperAdminAuditEvents()),
    search: adminProcedure.input(z.object({ query: z.string().trim().min(2).max(120) })).query(({ input }) => globalAdminSearch(input.query)),
    getFinanceAnalytics: adminProcedure.input(z.object({ start: z.coerce.date().optional(), end: z.coerce.date().optional() }).refine((input) => !input.start || !input.end || input.start <= input.end, { message: "Analytics start time must be before end time" }).optional()).query(({ input }) => getSuperAdminFinanceAnalytics(input)),
    getTrafficAnalytics: adminProcedure.input(z.object({ window: z.enum(["1d", "3d", "7d", "14d", "1m", "3m", "1y"]) })).query(({ input }) => getSuperAdminTrafficAnalytics(input.window)),
    getMarketplacePricingSettings: adminProcedure.query(() => getMarketplacePricingSettings()),
    listCatalogPricing: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(250).default(100) }).optional()).query(({ input }) => listCatalogPricing(input?.limit)),
    listPriceChangeHistory: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(250).default(100) }).optional()).query(({ input }) => listPriceChangeHistory(input?.limit)),
    updateMarketplacePricingSettings: adminProcedure.input(z.object({ defaultMarkupPercent: z.number().min(-100).max(500) })).mutation(({ ctx, input }) => updateMarketplacePricingSettings({ ...input, adminUserId: ctx.user.id })),
    updateCatalogProductPricing: adminProcedure.input(z.object({
      productId: z.number().int().positive(),
      markupPercentOverride: z.number().min(-100).max(500).nullable().optional(),
      displayPriceOverride: z.number().min(0).max(1_000_000).nullable().optional(),
    }).refine((input) => !(input.markupPercentOverride !== null && input.markupPercentOverride !== undefined && input.displayPriceOverride !== null && input.displayPriceOverride !== undefined), { message: "Use either a percentage markup or a fixed customer price" })).mutation(({ ctx, input }) => updateCatalogProductPricing({ ...input, adminUserId: ctx.user.id })),
    bulkUpdateSyncedProductMarkup: adminProcedure.input(z.object({ productIds: z.array(z.number().int().positive()).min(1).max(100), markupPercent: z.number().min(-100).max(500) }))
      .mutation(({ ctx, input }) => bulkUpdateSyncedProductMarkup({ ...input, adminUserId: ctx.user.id })),
    bulkUpdateProductStorefrontVisibility: adminProcedure.input(z.object({ productIds: z.array(z.number().int().positive()).min(1).max(100), storefrontStatus: z.enum(["visible", "hidden"]) }))
      .mutation(({ ctx, input }) => bulkUpdateProductStorefrontVisibility({ ...input, adminUserId: ctx.user.id })),
    bulkArchiveAdminManagedCatalogProducts: adminProcedure.input(z.object({ productIds: z.array(z.number().int().positive()).min(1).max(100) }))
      .mutation(({ ctx, input }) => bulkArchiveAdminManagedCatalogProducts({ ...input, adminUserId: ctx.user.id })),
    listMarketplaceCategories: adminProcedure.query(() => listMarketplaceCategories({ includeArchived: true })),
    createMarketplaceCategory: adminProcedure.input(z.object({
      slug: z.string().trim().min(1).max(80), name: z.string().trim().min(1).max(120), description: z.string().trim().max(5000).nullable().optional(), imageUrl: z.string().url().nullable().optional(), seoTitle: z.string().trim().max(180).nullable().optional(), seoDescription: z.string().trim().max(300).nullable().optional(), sortOrder: z.number().int().min(-10_000).max(10_000).default(0), visible: z.boolean().default(true), featured: z.boolean().default(false), status: z.enum(["active", "archived"]).default("active"),
    })).mutation(({ ctx, input }) => createMarketplaceCategory({ ...input, adminUserId: ctx.user.id })),
    updateMarketplaceCategory: adminProcedure.input(z.object({
      id: z.number().int().positive(), slug: z.string().trim().min(1).max(80), name: z.string().trim().min(1).max(120), description: z.string().trim().max(5000).nullable().optional(), imageUrl: z.string().url().nullable().optional(), seoTitle: z.string().trim().max(180).nullable().optional(), seoDescription: z.string().trim().max(300).nullable().optional(), sortOrder: z.number().int().min(-10_000).max(10_000).default(0), visible: z.boolean().default(true), featured: z.boolean().default(false), status: z.enum(["active", "archived"]).default("active"),
    })).mutation(({ ctx, input }) => updateMarketplaceCategory({ ...input, adminUserId: ctx.user.id })),
    reorderMarketplaceCategories: adminProcedure.input(z.object({ categoryIds: z.array(z.number().int().positive()).min(1).max(100) }))
      .mutation(({ ctx, input }) => reorderMarketplaceCategories({ ...input, adminUserId: ctx.user.id })),
    bulkUpdateMarketplaceCategoryStatus: adminProcedure.input(z.object({ categoryIds: z.array(z.number().int().positive()).min(1).max(100), action: z.enum(["hide", "archive", "show", "restore"]) }))
      .mutation(({ ctx, input }) => bulkUpdateMarketplaceCategoryStatus({ ...input, adminUserId: ctx.user.id })),
    listAdminProductOperations: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(10_000).default(10_000) }).optional()).query(({ input }) => listAdminProductOperations(input?.limit)),
    updateProductAdminAttributes: adminProcedure.input(z.object({
      productId: z.number().int().positive(), storefrontStatus: z.enum(["visible", "hidden", "coming_soon"]), featured: z.boolean(), trending: z.boolean(), bestSeller: z.boolean(), newProduct: z.boolean(), deal: z.boolean(), seoTitle: z.string().trim().max(180).nullable().optional(), seoDescription: z.string().trim().max(300).nullable().optional(), internalNote: z.string().trim().max(5000).nullable().optional(),
    })).mutation(({ ctx, input }) => updateProductAdminAttributes({ ...input, adminUserId: ctx.user.id })),
    listExchangeRates: adminProcedure.query(() => listExchangeRates()),
    upsertExchangeRate: adminProcedure.input(z.object({ baseCurrency: z.string().trim().length(3), quoteCurrency: z.string().trim().length(3), rate: z.number().positive().max(10_000_000), bufferPercent: z.number().min(0).max(100), active: z.boolean() }))
      .mutation(({ ctx, input }) => upsertExchangeRate({ ...input, adminUserId: ctx.user.id })),
    listSiteContentBlocks: adminProcedure.query(() => listSiteContentBlocks()),
    upsertSiteContentBlock: adminProcedure.input(z.object({
      blockKey: z.string().trim().min(1).max(120), blockType: z.enum(["hero_slide", "banner", "announcement", "faq", "featured_list", "category_spotlight"]), title: z.string().trim().max(255).nullable().optional(), content: z.record(z.string(), z.unknown()).nullable().optional(), imageUrl: z.string().url().nullable().optional(), ctaLabel: z.string().trim().max(100).nullable().optional(), ctaUrl: z.string().trim().max(500).nullable().optional(), status: z.enum(["draft", "published", "archived"]), sortOrder: z.number().int().min(-10_000).max(10_000),
    })).mutation(({ ctx, input }) => upsertSiteContentBlock({ ...input, adminUserId: ctx.user.id })),
    listPolicyPages: adminProcedure.query(() => listAdminPolicyPages()),
    updatePolicyPage: adminProcedure.input(z.object({ slug: z.enum(["terms-of-service", "privacy-policy", "cookie-policy", "refund-policy", "payment-policy", "delivery-policy", "acceptable-use-policy"]), title: z.string().trim().min(3).max(180), body: z.string().trim().min(30).max(50_000) }))
      .mutation(({ ctx, input }) => updateAdminPolicyPage({ ...input, adminUserId: ctx.user.id })),
    listSupplierSyncRuns: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(250).default(100) }).optional()).query(({ input }) => listSupplierSyncRuns(input?.limit)),
    getProductTrackingDashboard: adminProcedure.query(() => listProductTrackingDashboard()),
    runProductTrackingManualSync: adminProcedure.input(z.object({ supplierKey: productTrackingSupplierSchema })).mutation(({ ctx, input }) => runProductTrackingSupplierSync({ supplierKey: input.supplierKey, trigger: "manual", adminUserId: ctx.user.id })),
    setProductTrackingStorefrontVisibility: adminProcedure.input(z.object({ productId: z.number().int().positive(), storefrontStatus: z.enum(["visible", "hidden"]) })).mutation(({ ctx, input }) => setProductTrackingStorefrontVisibility({ ...input, adminUserId: ctx.user.id })),
    saveProductTrackingSchedule: adminProcedure.input(z.object({ supplierKey: productTrackingSupplierSchema, intervalHours: productTrackingIntervalSchema })).mutation(({ ctx, input }) => saveProductTrackingScheduleConfiguration({ ...input, adminUserId: ctx.user.id })),
    activateProductTrackingSchedule: adminProcedure.input(z.object({ scheduleId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const schedule = await getProductTrackingScheduleById(input.scheduleId);
      if (!schedule || !isProductTrackingSupplierKey(schedule.supplierKey)) throw new Error("Product Tracking schedule was not found.");
      const intervalHours = Number(schedule.intervalHours) as 2 | 10 | 24;
      const sessionToken = parseCookieHeader(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      const cron = productTrackingCron(intervalHours);
      const description = `VAMNUX Product Tracking ${schedule.supplierKey} supplier availability sync every ${intervalHours} hours`;
      if (schedule.scheduleCronTaskUid) {
        const updated = await updateHeartbeatJob(schedule.scheduleCronTaskUid, { cron, path: "/api/scheduled/product-tracking", payload: {}, description, enable: true }, sessionToken);
        await updateProductTrackingScheduleState({ id: schedule.id, status: "active", nextRunAt: updated.nextExecutionAt });
        return { status: "active" as const, nextRunAt: updated.nextExecutionAt ?? null };
      }
      const job = await createHeartbeatJob({ name: `product-tracking-${schedule.supplierKey}`, cron, path: "/api/scheduled/product-tracking", payload: {}, description }, sessionToken);
      await activateProductTrackingSchedule({ id: schedule.id, taskUid: job.taskUid, nextRunAt: job.nextExecutionAt });
      return { status: "active" as const, nextRunAt: job.nextExecutionAt ?? null };
    }),
    setProductTrackingScheduleEnabled: adminProcedure.input(z.object({ scheduleId: z.number().int().positive(), enabled: z.boolean() })).mutation(async ({ ctx, input }) => {
      const schedule = await getProductTrackingScheduleById(input.scheduleId);
      if (!schedule?.scheduleCronTaskUid) throw new Error("Activate the saved Product Tracking schedule after publishing this version first.");
      const sessionToken = parseCookieHeader(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      const updated = await updateHeartbeatJob(schedule.scheduleCronTaskUid, { enable: input.enabled }, sessionToken);
      await updateProductTrackingScheduleState({ id: schedule.id, status: input.enabled ? "active" : "paused", nextRunAt: updated.nextExecutionAt });
      return { status: input.enabled ? "active" as const : "paused" as const, nextRunAt: updated.nextExecutionAt ?? null };
    }),
    listPromotions: adminProcedure.query(() => listPromotions()),
    createPromotion: adminProcedure.input(z.object({
      name: z.string().trim().min(1).max(160), code: z.string().trim().min(3).max(64).nullable().optional(), discountType: z.enum(["percentage", "fixed_amount"]), discountAmount: z.number().positive().max(1_000_000), minimumOrder: z.number().min(0).max(1_000_000).nullable().optional(), maximumDiscount: z.number().min(0).max(1_000_000).nullable().optional(), productId: z.number().int().positive().nullable().optional(), categorySlug: z.string().trim().min(1).max(80).nullable().optional(), startsAt: z.coerce.date().nullable().optional(), endsAt: z.coerce.date().nullable().optional(), usageLimit: z.number().int().positive().max(10_000_000).nullable().optional(), perUserLimit: z.number().int().positive().max(10_000_000).nullable().optional(), status: z.enum(["draft", "scheduled", "active", "paused", "archived"]),
    })).mutation(({ ctx, input }) => createPromotion({ ...input, adminUserId: ctx.user.id })),
    getReferralSettings: adminProcedure.query(() => getReferralSettings()),
    updateReferralSettings: adminProcedure.input(z.object({ percentageReward: z.number().min(0).max(100), fixedReward: z.number().min(0).max(1_000_000), minimumQualifyingOrder: z.number().min(0).max(1_000_000), maximumReward: z.number().min(0).max(1_000_000).nullable().optional(), releaseDays: z.number().int().min(0).max(3650), status: z.enum(["disabled", "configured"]) }))
      .mutation(({ ctx, input }) => updateReferralSettings({ ...input, adminUserId: ctx.user.id })),
    getLoyaltySettings: adminProcedure.query(() => getLoyaltySettings()),
    updateLoyaltySettings: adminProcedure.input(z.object({ pointsPerCurrencyUnit: z.number().min(0).max(1_000_000), redemptionValuePerPoint: z.number().min(0).max(1_000_000), expiryDays: z.number().int().min(0).max(36500).nullable().optional(), status: z.enum(["disabled", "configured"]) }))
      .mutation(({ ctx, input }) => updateLoyaltySettings({ ...input, adminUserId: ctx.user.id })),
    listResellers: adminProcedure.query(() => listResellers()),
    upsertReseller: adminProcedure.input(z.object({ userId: z.number().int().positive(), tier: z.enum(["retail", "reseller", "vip_reseller", "enterprise"]), discountPercent: z.number().min(0).max(100), status: z.enum(["pending", "approved", "suspended", "rejected"]) }))
      .mutation(({ ctx, input }) => upsertReseller({ ...input, adminUserId: ctx.user.id })),
    listSiteSettings: adminProcedure.query(() => listSiteSettings()),
    upsertSiteSetting: adminProcedure.input(z.object({ settingKey: z.string().trim().min(1).max(120), category: z.enum(["general", "currency", "payments", "email", "notifications", "orders", "security"]), value: z.record(z.string(), z.unknown()) }))
      .mutation(({ ctx, input }) => upsertSiteSetting({ ...input, adminUserId: ctx.user.id })),
    listNotificationTemplates: adminProcedure.query(() => listNotificationTemplates()),
    upsertNotificationTemplate: adminProcedure.input(z.object({ templateKey: z.string().trim().min(1).max(120), channel: z.enum(["in_app", "email", "sms", "whatsapp"]), eventType: z.string().trim().min(1).max(120), subject: z.string().trim().max(180).nullable().optional(), body: z.string().trim().min(1).max(10_000), status: z.enum(["draft", "active", "archived"]) }))
      .mutation(({ ctx, input }) => upsertNotificationTemplate({ ...input, adminUserId: ctx.user.id })),
    listNotificationInbox: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(250).default(250) }).optional()).query(({ ctx, input }) => listSuperAdminNotificationInbox({ adminUserId: ctx.user.id, limit: input?.limit })),
    getNotificationDetail: adminProcedure.input(z.object({ notificationKey: z.string().trim().min(3).max(220) })).query(({ input }) => getSuperAdminNotificationDetail(input.notificationKey)),
    replyToNotificationCustomer: adminProcedure.input(z.object({ notificationKey: z.string().trim().min(3).max(220), message: z.string().trim().min(1).max(5000), ticketStatus: z.enum(["processing", "waiting_for_customer", "resolved", "closed"]).optional() })).mutation(({ ctx, input }) => replyToSuperAdminNotification({ adminUserId: ctx.user.id, ...input })),
    markNotificationsRead: adminProcedure.input(z.object({ notificationKeys: z.array(z.string().trim().min(1).max(220)).min(1).max(250) }))
      .mutation(({ ctx, input }) => markSuperAdminNotificationsRead({ adminUserId: ctx.user.id, notificationKeys: input.notificationKeys })),
    markAllNotificationsRead: adminProcedure.mutation(({ ctx }) => markAllSuperAdminNotificationsRead(ctx.user.id)),
    listApiRequestLogs: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(250).default(100) }).optional()).query(({ input }) => listRedactedApiRequestLogs(input?.limit)),
    listSupplierWebhookEvents: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(250).default(100) }).optional()).query(({ input }) => listRedactedSupplierWebhookEvents(input?.limit)),
    recordCsvExport: adminProcedure.input(z.object({ exportType: z.enum(["products", "customers", "orders", "wallet_funding", "finance_summary"]), rowCount: z.number().int().min(0).max(1_000_000) })).mutation(async ({ ctx, input }) => {
      await recordSuperAdminAuditEvent({ adminUserId: ctx.user.id, action: "admin.csv_export", targetType: "csv_export", targetId: input.exportType, summary: `Exported authorized ${input.exportType.replaceAll("_", " ")} CSV`, metadata: { rowCount: input.rowCount } });
      return { exportType: input.exportType, rowCount: input.rowCount };
    }),
    listCommerceIntegrations: adminProcedure.query(() => listCommerceIntegrations()),
    listSupplierManagement: adminProcedure.query(() => listSupplierManagement()),
    createSupplierManagementProfile: adminProcedure.input(z.object({ supplierId: z.string().trim().min(2).max(80), supplierName: z.string().trim().min(2).max(120), websiteUrl: z.string().trim().url().max(1_000).nullable().optional(), supportedCategories: z.array(z.string().trim().min(1).max(120)).max(40), supportedCurrencies: z.array(z.string().trim().length(3)).max(20), isActive: z.boolean(), priority: z.number().int().min(1).max(10_000) }))
      .mutation(({ ctx, input }) => createSupplierManagementProfile({ ...input, adminUserId: ctx.user.id })),
    updateSupplierManagementProfile: adminProcedure.input(z.object({ id: z.number().int().positive(), supplierName: z.string().trim().min(2).max(120), websiteUrl: z.string().trim().url().max(1_000).nullable().optional(), supportedCategories: z.array(z.string().trim().min(1).max(120)).max(40), supportedCurrencies: z.array(z.string().trim().length(3)).max(20), isActive: z.boolean(), priority: z.number().int().min(1).max(10_000) }))
      .mutation(({ ctx, input }) => updateSupplierManagementProfile({ ...input, adminUserId: ctx.user.id })),
    testSupplierManagementConnection: adminProcedure.input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) => testSupplierManagementConnection({ ...input, adminUserId: ctx.user.id })),
    listSupplierBalances: adminProcedure.query(() => listSuperAdminSupplierBalances()),
    apiAccessControlStatus: adminProcedure.query(() => getSafeSupplierApiAccessStatus()),
    recordSupplierBalance: adminProcedure.input(z.object({ integrationId: z.number().int().positive(), balance: z.number().min(0).max(1_000_000), currency: z.string().trim().length(3), note: z.string().trim().max(500).optional() }))
      .mutation(({ ctx, input }) => recordSuperAdminSupplierBalance({ ...input, adminUserId: ctx.user.id })),
    listAdminManagedCatalog: adminProcedure.query(() => listAdminManagedCatalogProducts()),
    uploadManualProductImage: adminProcedure.input(z.object({
      fileName: z.string().trim().min(1).max(180),
      contentType: z.enum(manualProductImageContentTypes),
      dataBase64: z.string().min(1).max(7_000_000),
    })).mutation(async ({ ctx, input }) => {
      const { bytes, extension } = decodeManualProductImage(input);
      const safeName = input.fileName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "manual-product";
      const { key, url } = await storagePut(`manual-products/${ctx.user.id}/${safeName}-${Date.now()}.${extension}`, bytes, input.contentType);
      await recordSuperAdminAuditEvent({ adminUserId: ctx.user.id, action: "admin.manual_product_image_upload", targetType: "manual_product_image", targetId: key, summary: "Uploaded an owner-managed product image", metadata: { contentType: input.contentType, byteLength: bytes.length } });
      return { imageUrl: url };
    }),
    listAuthorizedCatalogSources: adminProcedure.query(() => listAuthorizedCatalogSources()),
    createAuthorizedCatalogSource: adminProcedure.input(authorizedCatalogSourceInputSchema)
      .mutation(({ input }) => createAuthorizedCatalogSource(input)),
    createAdminManagedCatalogProduct: adminProcedure.input(adminManagedCatalogProductInputSchema)
      .mutation(({ input }) => createAdminManagedCatalogProduct(input)),
    setAdminManagedCatalogProductStatus: adminProcedure.input(z.object({
      productId: z.number().int().positive(),
      status: z.enum(["active", "paused", "archived"]),
    })).mutation(({ ctx, input }) => setAdminManagedCatalogProductStatus({ ...input, adminUserId: ctx.user.id })),
    syncFlashTopUpCatalog: adminProcedure.input(z.object({
      page: z.number().int().min(1).default(1),
      perPage: z.number().int().min(1).max(10).default(5),
    }).optional()).mutation(async ({ ctx, input }) => {
      const syncStatus = await getSupplierSyncStatus("FlashTopUp");
      if (!canRunSupplierCatalogSync(syncStatus)) throw new Error("FlashTopUp catalog sync is paused. FoxReload catalog access remains unaffected.");
      const result = await syncFlashTopUpCatalog(input);
      await recordCompletedSupplierCatalogSync({ supplierKey: "flashtopup", providerName: "FlashTopUp", adminUserId: ctx.user.id, productsUpdated: result.productCount, productsFailed: result.failures.length, summary: `Read-only catalog page ${result.page}: ${result.productCount} product records, ${result.serviceCount} services.` });
      await recordSuperAdminAuditEvent({ adminUserId: ctx.user.id, action: "supplier.catalog_sync", targetType: "supplier", targetId: "FlashTopUp", summary: `Read-only FlashTopUp catalog sync completed for page ${result.page}`, metadata: { page: result.page, productCount: result.productCount, serviceCount: result.serviceCount, failures: result.failures.length } });
      return result;
    }),
    syncFoxReloadCatalog: adminProcedure.input(z.object({
      cursor: z.string().trim().min(1).max(512).optional(),
      categoryLimit: z.number().int().min(1).max(10).default(5),
      productLimit: z.number().int().min(1).max(200).default(100),
      categorySlugs: z.array(z.string().trim().min(1).max(120)).max(10).optional(),
      searchQueries: z.array(z.string().trim().min(2).max(80)).max(10).optional(),
      searchLimit: z.number().int().min(1).max(25).default(10),
    }).optional()).mutation(async ({ ctx, input }) => {
      const result = await syncFoxReloadCatalog(input);
      await recordCompletedSupplierCatalogSync({ supplierKey: "foxreload", providerName: "FoxReload", adminUserId: ctx.user.id, productsUpdated: result.productCount, productsFailed: result.failures.length, summary: `Read-only catalog sync: ${result.categoryCount} categories and ${result.productCount} product records.` });
      await recordSuperAdminAuditEvent({ adminUserId: ctx.user.id, action: "supplier.catalog_sync", targetType: "supplier", targetId: "FoxReload", summary: "Read-only FoxReload catalog sync completed", metadata: { categoryCount: result.categoryCount, productCount: result.productCount, failures: result.failures.length } });
      return result;
    }),
    syncGamesDropCatalog: adminProcedure.input(z.object({
      searches: z.array(z.string().trim().min(2).max(120)).max(12).optional(),
      page: z.number().int().min(1).max(1000).default(1),
      limit: z.number().int().min(1).max(250).default(50),
      countryCode: z.string().trim().length(2).toUpperCase().default("NG"),
    }).optional()).mutation(async ({ ctx, input }) => {
      const result = await syncGamesDropCatalog(input);
      await recordCompletedSupplierCatalogSync({ supplierKey: "gamesdrop", providerName: "GamesDrop", adminUserId: ctx.user.id, productsUpdated: result.productCount, productsFailed: result.failures.length, summary: `Read-only catalog sync: ${result.productCount} product records across ${result.searches.length} searches.` });
      await recordSuperAdminAuditEvent({ adminUserId: ctx.user.id, action: "supplier.catalog_sync", targetType: "supplier", targetId: "GamesDrop", summary: "Read-only GamesDrop catalog sync completed", metadata: { searches: result.searches, productCount: result.productCount, failures: result.failures.length } });
      return result;
    }),
    configureCommerceIntegration: adminProcedure.input(z.object({
      integrationType: z.enum(["supplier", "payment"]),
      providerName: z.string().trim().min(2).max(120),
      apiBaseUrl: z.string().url().optional(),
      credentialReference: z.string().trim().max(120).optional(),
      publicKeyReference: z.string().trim().max(120).optional(),
      webhookSecretReference: z.string().trim().max(120).optional(),
      supportedCurrencies: z.array(z.enum(["USD", "EUR", "GBP", "NGN"])).max(4).optional(),
      syncStatus: z.enum(["not_configured", "ready", "paused", "error"]),
    })).mutation(({ input }) => configureCommerceIntegration(input)),
  }),
});

export type AppRouter = typeof appRouter;
