import { describe, expect, it } from "vitest";
import { customerProductActivityEvents } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

describe("customer product activity", () => {
  it("stores only the customer, product, activity type, and timestamp required for a protected Admin inbox", () => {
    expect(customerProductActivityEvents.userId.notNull).toBe(true);
    expect(customerProductActivityEvents.productId.notNull).toBe(true);
    expect(customerProductActivityEvents.activityType.enumValues).toEqual(["favorite_added", "cart_added"]);
    expect(customerProductActivityEvents.createdAt.notNull).toBe(true);
  });

  it("blocks unauthenticated favorite-cart activity recording and Admin inbox reads", async () => {
    const caller = appRouter.createCaller({ user: null } as TrpcContext);
    await expect(caller.marketplace.recordCartAddition({ productId: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.admin.listProductActivityEvents({ limit: 10 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
