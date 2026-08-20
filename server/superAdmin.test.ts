import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("Super Admin authorization", () => {
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
});
