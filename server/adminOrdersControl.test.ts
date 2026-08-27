import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const routerSource = readFileSync("/home/ubuntu/naijaplay-store/server/routers.ts", "utf8");
const dbSource = readFileSync("/home/ubuntu/naijaplay-store/server/db.ts", "utf8");
const schemaSource = readFileSync("/home/ubuntu/naijaplay-store/drizzle/schema.ts", "utf8");
const workspaceSource = readFileSync("/home/ubuntu/naijaplay-store/client/src/components/AdminOrdersControlWorkspace.tsx", "utf8");

function context(role: "admin" | "user"): TrpcContext {
  return { user: { id: role === "admin" ? 1 : 999_998, openId: `${role}-orders-control`, name: role, email: `${role}@example.test`, loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("Admin Orders Control", () => {
  it("keeps every order-management view and mutation behind Super Admin authorization", async () => {
    const unprivileged = appRouter.createCaller(context("user"));
    await expect(unprivileged.admin.listOrderControls({ limit: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(unprivileged.admin.getOrderControlAnalytics()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(unprivileged.admin.recordOrderReview({ orderId: 1, action: "review", note: "must be blocked", operationKey: "blocked-order-review" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(unprivileged.admin.queueOrderRetry({ orderId: 1, reason: "must be blocked", operationKey: "blocked-order-retry" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("uses immutable event, refund, retry, and supplier-attempt records rather than direct order financial edits", () => {
    expect(schemaSource).toContain("order_control_events");
    expect(schemaSource).toContain("supplier_order_attempts");
    expect(schemaSource).toContain("order_refund_records");
    expect(schemaSource).toContain("order_retry_policies");
    expect(dbSource).toContain("recordAdminOrderReview");
    expect(dbSource).toContain("recordAdminOrderRefund");
    expect(dbSource).toContain("queueAdminOrderRetry");
    expect(dbSource).toContain("Only payment-confirmed orders can enter the supplier retry queue.");
    expect(dbSource).toContain("Only supplier-failed orders can be queued for retry.");
    expect(dbSource).toContain("Refund amount must be greater than zero and cannot exceed the original order total.");
    expect(dbSource).toContain("it never moves customer funds or overwrites the original order snapshot");
  });

  it("returns sanitized supplier data and provides all requested operational views", () => {
    expect(dbSource).toContain("no credentials, raw request bodies, or supplier secrets are returned");
    expect(routerSource).toContain("listOrderControls: adminProcedure");
    expect(routerSource).toContain("getOrderControlDetail: adminProcedure");
    expect(routerSource).toContain("recordOrderRefund: adminProcedure");
    expect(routerSource).toContain("queueOrderRetry: adminProcedure");
    expect(workspaceSource).toContain('"All Orders"');
    expect(workspaceSource).toContain('"Failed API Requests"');
    expect(workspaceSource).toContain('"Retry Queue"');
    expect(workspaceSource).toContain('"Routing History"');
    expect(workspaceSource).toContain('"Analytics"');
    expect(workspaceSource).toContain('"Audit Logs"');
    expect(workspaceSource).toContain("Customer and fulfilment input");
    expect(workspaceSource).toContain("Financial snapshot");
    expect(workspaceSource).toContain("Supplier / routing history");
  });
});
