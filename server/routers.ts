import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { adminManagedCatalogProductInputSchema, authorizedCatalogSourceInputSchema } from "../shared/adminCatalog";
import { canRunSupplierCatalogSync, configureCommerceIntegration, createAdminManagedCatalogProduct, createAuthorizedCatalogSource, createCustomerPrivacyRequest, createCustomerSupportTicket, createCustomerWalletFundingRequest, createMarketplaceOrder, getAccountCommerceSummary, getCustomerDashboard, getCustomerSupportTicket, getMarketplacePricingSettings, getPublicPolicyPage, getSuperAdminOverview, getSuperAdminSupportTicket, getSuperAdminSystemHealth, getSupplierSyncStatus, listActiveCatalogProducts, listAdminManagedCatalogProducts, listAuthorizedCatalogSources, listCatalogPricing, listCommerceIntegrations, listSuperAdminAuditEvents, listSuperAdminCustomers, listSuperAdminOrders, listSuperAdminSupportTickets, listSuperAdminWalletFundingRequests, markCustomerNotificationRead, recordSuperAdminAuditEvent, replyToCustomerSupportTicket, replyToSuperAdminSupportTicket, reviewCustomerWalletFundingRequest, setAdminManagedCatalogProductStatus, toggleCustomerSavedProduct, updateCatalogProductPricing, updateCustomerDashboardPreferences, updateCustomerNotificationPreferences, updateCustomerProfile, updateMarketplacePricingSettings } from "./db";
import { syncFlashTopUpCatalog } from "./flashtopupCatalog";
import { syncFoxReloadCatalog } from "./foxreloadCatalog";
import { syncGamesDropCatalog } from "./gamesdropCatalog";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  marketplace: router({
    catalog: publicProcedure.query(() => listActiveCatalogProducts()),
    policyPage: publicProcedure.input(z.object({ slug: z.enum(["terms-of-service", "privacy-policy", "refund-policy", "cookie-policy"]) })).query(({ input }) => getPublicPolicyPage(input.slug)),
    accountSummary: protectedProcedure.query(({ ctx }) => getAccountCommerceSummary(ctx.user.id)),
    customerDashboard: protectedProcedure.query(({ ctx }) => getCustomerDashboard(ctx.user.id)),
    updateCustomerPreferences: protectedProcedure.input(z.object({
      preferredCurrency: z.enum(["USD", "EUR", "GBP", "NGN"]),
      countryCode: z.string().trim().length(2).toUpperCase().nullable().optional(),
    })).mutation(({ ctx, input }) => updateCustomerDashboardPreferences({ userId: ctx.user.id, ...input })),
    toggleSavedProduct: protectedProcedure.input(z.object({ productId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => toggleCustomerSavedProduct({ userId: ctx.user.id, productId: input.productId })),
    updateCustomerProfile: protectedProcedure.input(z.object({
      firstName: z.string().trim().max(80).nullable().optional(),
      lastName: z.string().trim().max(80).nullable().optional(),
      username: z.string().trim().max(30).nullable().optional(),
      phone: z.string().trim().max(32).nullable().optional(),
      countryCode: z.string().trim().length(2).toUpperCase().nullable().optional(),
      registrationSource: z.enum(["Google", "Facebook", "Instagram", "TikTok", "X", "YouTube", "WhatsApp", "Friend", "Referral", "Advertisement", "Other"]).nullable().optional(),
    })).mutation(({ ctx, input }) => updateCustomerProfile({ userId: ctx.user.id, ...input })),
    updateNotificationPreferences: protectedProcedure.input(z.object({
      orderUpdates: z.boolean(),
      paymentUpdates: z.boolean(),
      walletUpdates: z.boolean(),
      marketingUpdates: z.boolean(),
      productAnnouncements: z.boolean(),
    })).mutation(({ ctx, input }) => updateCustomerNotificationPreferences({ userId: ctx.user.id, ...input })),
    markNotificationRead: protectedProcedure.input(z.object({ notificationId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => markCustomerNotificationRead({ userId: ctx.user.id, ...input })),
    createSupportTicket: protectedProcedure.input(z.object({
      category: z.enum(["payment", "order", "game_top_up", "gift_card", "subscription", "software", "wallet", "account", "refund", "other"]),
      subject: z.string().trim().min(3).max(180),
      message: z.string().trim().min(3).max(5000),
      orderCode: z.string().trim().min(3).max(32).optional(),
    })).mutation(({ ctx, input }) => createCustomerSupportTicket({ userId: ctx.user.id, ...input })),
    getSupportTicket: protectedProcedure.input(z.object({ ticketCode: z.string().trim().min(3).max(32) }))
      .query(({ ctx, input }) => getCustomerSupportTicket({ userId: ctx.user.id, ...input })),
    replyToSupportTicket: protectedProcedure.input(z.object({ ticketCode: z.string().trim().min(3).max(32), message: z.string().trim().min(3).max(5000) }))
      .mutation(({ ctx, input }) => replyToCustomerSupportTicket({ userId: ctx.user.id, ...input })),
    createPrivacyRequest: protectedProcedure.input(z.object({ requestType: z.enum(["data_access", "data_correction", "account_deletion"]), note: z.string().trim().max(500).optional() }))
      .mutation(({ ctx, input }) => createCustomerPrivacyRequest({ userId: ctx.user.id, ...input })),
    createWalletFundingRequest: protectedProcedure.input(z.object({
      amount: z.number().positive().max(1_000_000),
      currency: z.enum(["USD", "EUR", "GBP", "NGN"]),
      customerNote: z.string().trim().max(500).optional(),
    })).mutation(({ ctx, input }) => createCustomerWalletFundingRequest({ userId: ctx.user.id, ...input })),
    createOrder: protectedProcedure.input(z.object({
      currency: z.enum(["USD", "EUR", "GBP", "NGN"]),
      items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(25) })).min(1).max(25),
      fulfillmentDetails: z.record(z.string(), z.string()).optional(),
    })).mutation(({ ctx, input }) => createMarketplaceOrder({
      userId: ctx.user.id,
      currency: input.currency,
      items: input.items,
      fulfillmentDetails: input.fulfillmentDetails,
    })),
  }),
  admin: router({
    getOverview: adminProcedure.query(() => getSuperAdminOverview()),
    getSystemHealth: adminProcedure.query(() => getSuperAdminSystemHealth()),
    listCustomers: adminProcedure.query(() => listSuperAdminCustomers()),
    listOrders: adminProcedure.query(() => listSuperAdminOrders()),
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
    getMarketplacePricingSettings: adminProcedure.query(() => getMarketplacePricingSettings()),
    listCatalogPricing: adminProcedure.query(() => listCatalogPricing()),
    updateMarketplacePricingSettings: adminProcedure.input(z.object({ defaultMarkupPercent: z.number().min(-100).max(500) })).mutation(({ ctx, input }) => updateMarketplacePricingSettings({ ...input, adminUserId: ctx.user.id })),
    updateCatalogProductPricing: adminProcedure.input(z.object({
      productId: z.number().int().positive(),
      markupPercentOverride: z.number().min(-100).max(500).nullable().optional(),
      displayPriceOverride: z.number().min(0).max(1_000_000).nullable().optional(),
    }).refine((input) => !(input.markupPercentOverride !== null && input.markupPercentOverride !== undefined && input.displayPriceOverride !== null && input.displayPriceOverride !== undefined), { message: "Use either a percentage markup or a fixed customer price" })).mutation(({ ctx, input }) => updateCatalogProductPricing({ ...input, adminUserId: ctx.user.id })),
    listCommerceIntegrations: adminProcedure.query(() => listCommerceIntegrations()),
    listAdminManagedCatalog: adminProcedure.query(() => listAdminManagedCatalogProducts()),
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
