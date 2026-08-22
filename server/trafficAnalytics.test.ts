import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const dbSource = fs.readFileSync(path.join(root, "server/db.ts"), "utf8");
const routerSource = fs.readFileSync(path.join(root, "server/routers.ts"), "utf8");
const adminSource = fs.readFileSync(path.join(root, "client/src/pages/SuperAdmin.tsx"), "utf8");
const componentSource = fs.readFileSync(path.join(root, "client/src/components/AdminTrafficAnalytics.tsx"), "utf8");

describe("VAMNUX Traffic Analytics", () => {
  it("uses protected persisted registration attribution and paid orders without inventing visitor data", () => {
    expect(dbSource).toContain("getSuperAdminTrafficAnalytics");
    expect(dbSource).toContain("customerProfiles.registrationSource");
    expect(dbSource).toContain('eq(orders.paymentStatus, "paid")');
    expect(dbSource).toContain("Visitor counts, external referrers, Google ranking");
    expect(routerSource).toContain("getTrafficAnalytics: adminProcedure");
  });

  it("keeps every requested Traffic Analytics period and source performance field in the Admin workspace", () => {
    expect(adminSource).toContain('label: "Traffic Analytics"');
    for (const period of ["1d", "3d", "7d", "14d", "1m", "3m", "1y"]) expect(componentSource).toContain(`value: "${period}"`);
    expect(componentSource).toContain("SIGNUPS BY TRAFFIC SOURCE");
    expect(componentSource).toContain("TOTAL SIGNUPS");
    expect(componentSource).toContain("RECORDED REVENUE");
    expect(componentSource).toContain("ChevronLeft");
    expect(componentSource).toContain("ChevronRight");
  });
});
