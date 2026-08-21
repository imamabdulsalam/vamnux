import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { ENV } from "./_core/env";

describe("Super Admin authorization", () => {
  it("allows the configured server-only owner email to call the lightweight system-health Admin endpoint", async () => {
    expect(ENV.adminEmail).toBe("thepeakvaulthq@gmail.com");
    const caller = appRouter.createCaller({ user: { id: 9630001, openId: "owner-test", name: "VAMNUX owner", email: ENV.adminEmail, loginMethod: "test", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } } as TrpcContext);
    await expect(caller.auth.adminAccess()).resolves.toEqual({ allowed: true });
    await expect(caller.admin.getSystemHealth()).resolves.toMatchObject({ database: expect.any(Object) });
  });

  it("blocks an Admin-role account whose email is not the configured VAMNUX owner email", async () => {
    const caller = appRouter.createCaller({ user: { id: 92, openId: "other-admin-test", name: "Other administrator", email: "other-admin@example.test", loginMethod: "test", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } } as TrpcContext);
    await expect(caller.auth.adminAccess()).resolves.toEqual({ allowed: false });
    await expect(caller.admin.getOverview()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects an authenticated customer before the admin overview can return marketplace operations data", async () => {
    const caller = appRouter.createCaller({ user: { id: 91, openId: "customer-test", name: "Customer", email: "customer@example.test", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } } as TrpcContext);
    await expect(caller.admin.getOverview()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects an authenticated customer before private support tickets can be inspected or replied to", async () => {
    const caller = appRouter.createCaller({ user: { id: 91, openId: "customer-test", name: "Customer", email: "customer@example.test", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } } as TrpcContext);
    await expect(caller.admin.listSupportTickets()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.replyToSupportTicket({ ticketCode: "VS123", message: "Private reply", status: "processing" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects an authenticated customer before expanded product, category, rate, content, and price-history operations can be read", async () => {
    const caller = appRouter.createCaller({ user: { id: 91, openId: "customer-test", name: "Customer", email: "customer@example.test", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } } as TrpcContext);
    await expect(caller.admin.listAdminProductOperations()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.listMarketplaceCategories()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.listExchangeRates()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.listSiteContentBlocks()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.listPriceChangeHistory({ limit: 10 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects an authenticated customer before finance, policy, monitoring, reseller, settings, or global-search data can be accessed", async () => {
    const caller = appRouter.createCaller({ user: { id: 91, openId: "customer-test", name: "Customer", email: "customer@example.test", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } } as TrpcContext);
    await expect(caller.admin.getFinanceAnalytics()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.getFinanceAnalytics({ start: new Date("2026-08-01T00:00:00.000Z"), end: new Date("2026-08-20T00:00:00.000Z") })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.listPromotions()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.getReferralSettings()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.getLoyaltySettings()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.listResellers()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.listSiteSettings()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.listNotificationTemplates()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.listApiRequestLogs({ limit: 10 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.listSupplierWebhookEvents({ limit: 10 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.recordCsvExport({ exportType: "products", rowCount: 0 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.search({ query: "PUBG" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
