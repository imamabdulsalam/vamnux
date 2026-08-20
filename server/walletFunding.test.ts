import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("wallet funding authorization", () => {
  it("rejects an unauthenticated top-up request before any funding record can be created", async () => {
    const caller = appRouter.createCaller({ user: null } as TrpcContext);
    await expect(caller.marketplace.createWalletFundingRequest({ amount: 25, currency: "USD" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a customer attempting to settle a wallet funding request", async () => {
    const caller = appRouter.createCaller({ user: { id: 92, openId: "funding-customer", name: "Customer", email: "customer@example.test", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } } as TrpcContext);
    await expect(caller.admin.reviewWalletFundingRequest({ fundingCode: "WFTEST123", action: "settle", verificationReference: "verified-ref" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
