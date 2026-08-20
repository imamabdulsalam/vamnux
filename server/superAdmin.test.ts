import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("Super Admin authorization", () => {
  it("rejects an authenticated customer before the admin overview can return marketplace operations data", async () => {
    const caller = appRouter.createCaller({ user: { id: 91, openId: "customer-test", name: "Customer", email: "customer@example.test", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } } as TrpcContext);
    await expect(caller.admin.getOverview()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
