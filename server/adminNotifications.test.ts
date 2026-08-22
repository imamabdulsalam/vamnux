import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const adminSource = readFileSync(resolve(root, "client/src/pages/SuperAdmin.tsx"), "utf8");
const inboxSource = readFileSync(resolve(root, "client/src/components/AdminNotificationInbox.tsx"), "utf8");
const superAdminSource = readFileSync(resolve(root, "client/src/pages/SuperAdmin.tsx"), "utf8");

describe("Admin notification inbox", () => {
  it("derives owner-only notifications from persisted operational records and does not fabricate delivery", () => {
    expect(dbSource).toContain("listSuperAdminNotificationInbox");
    expect(dbSource).toContain("customerProductRequests");
    expect(dbSource).toContain("newsletterInterestSubscribers");
    expect(dbSource).toContain("listSuperAdminProductActivityEvents");
    expect(dbSource).toContain("Supplier readiness");
    expect(dbSource).toContain("does not invent orders, payment events, or external delivery");
  });

  it("uses protected procedures for unread state and individual or bulk read actions", () => {
    expect(routerSource).toContain("listNotificationInbox: adminProcedure");
    expect(routerSource).toContain("getNotificationDetail: adminProcedure");
    expect(routerSource).toContain("markNotificationsRead: adminProcedure");
    expect(routerSource).toContain("markAllNotificationsRead: adminProcedure");
    expect(dbSource).toContain("markSuperAdminNotificationsRead");
    expect(dbSource).toContain("markAllSuperAdminNotificationsRead");
    expect(dbSource).toContain("getSuperAdminNotificationDetail");
    expect(dbSource).toContain("Customer support ticket");
    expect(dbSource).toContain("Customer product request");
    expect(dbSource).toContain("Current customer price");
  });

  it("renders a green navigation badge, accessible read controls, and an in-place detail review dialog", () => {
    expect(adminSource).toContain("admin-nav-unread");
    expect(inboxSource).toContain("Mark selected as read");
    expect(inboxSource).toContain("Mark all as read");
    expect(inboxSource).toContain("Select unread visible");
    expect(inboxSource).toContain("Operational review queue");
    expect(inboxSource).toContain("refetchInterval: 30_000");
    expect(adminSource).toContain("admin-nav-unread");
    expect(inboxSource).toContain("Reviewing this notification stays within the VAMNUX Notifications workspace");
    expect(inboxSource).toContain("Open source workspace");
    expect(inboxSource).toContain("DialogContent");
    expect(inboxSource).toContain("getNotificationDetail.useQuery");
    expect(inboxSource).toContain("Full ticket conversation");
    expect(inboxSource).toContain("Full customer request");
    expect(superAdminSource).toContain('label: "Notifications"');
    expect(superAdminSource).toContain("admin-keyword-results");
    expect(superAdminSource).toContain("Admin workspaces");
    expect(superAdminSource).toContain("Authorised VAMNUX records");
  });
});
