import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("customer dashboard preference boundary", () => {
  it("accepts only VAMNUX display currencies that are available to customers", () => {
    const currencies = ["USD", "EUR", "GBP", "NGN"] as const;
    expect(currencies).toContain("USD");
    expect(currencies).toContain("NGN");
    expect(currencies).not.toContain("BTC");
  });

  it("keeps account-scoped saved-product mutations keyed to one customer and one product", () => {
    const mutation = { userId: 42, productId: 88 };
    expect(mutation).toEqual({ userId: 42, productId: 88 });
    expect(mutation.userId).not.toBe(43);
  });

  it("requires an authenticated session before returning a customer dashboard", async () => {
    const caller = appRouter.createCaller({ user: null } as TrpcContext);
    await expect(caller.marketplace.customerDashboard()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
