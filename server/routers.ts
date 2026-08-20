import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { adminManagedCatalogProductInputSchema, authorizedCatalogSourceInputSchema } from "../shared/adminCatalog";
import { configureCommerceIntegration, createAdminManagedCatalogProduct, createAuthorizedCatalogSource, createMarketplaceOrder, getAccountCommerceSummary, listActiveCatalogProducts, listAdminManagedCatalogProducts, listAuthorizedCatalogSources, listCommerceIntegrations, setAdminManagedCatalogProductStatus } from "./db";
import { syncFlashTopUpCatalog } from "./flashtopupCatalog";
import { syncFoxReloadCatalog } from "./foxreloadCatalog";
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
    accountSummary: protectedProcedure.query(({ ctx }) => getAccountCommerceSummary(ctx.user.id)),
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
    })).mutation(({ input }) => setAdminManagedCatalogProductStatus(input)),
    syncFlashTopUpCatalog: adminProcedure.input(z.object({
      page: z.number().int().min(1).default(1),
      perPage: z.number().int().min(1).max(10).default(5),
    }).optional()).mutation(({ input }) => syncFlashTopUpCatalog(input)),
    syncFoxReloadCatalog: adminProcedure.input(z.object({
      cursor: z.string().trim().min(1).max(512).optional(),
      categoryLimit: z.number().int().min(1).max(10).default(5),
      productLimit: z.number().int().min(1).max(200).default(100),
      categorySlugs: z.array(z.string().trim().min(1).max(120)).max(10).optional(),
      searchQueries: z.array(z.string().trim().min(2).max(80)).max(10).optional(),
      searchLimit: z.number().int().min(1).max(25).default(10),
    }).optional()).mutation(({ input }) => syncFoxReloadCatalog(input)),
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
