import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { PRODUCT_TRACKING_INTERVAL_HOURS, PRODUCT_TRACKING_SUPPLIER_KEYS, isProductTrackingSupplierKey, productTrackingSupplierName } from "./db";

describe("Product Tracking safety boundaries", () => {
  it("allows only authorized catalog suppliers and the requested automatic intervals", () => {
    expect(PRODUCT_TRACKING_SUPPLIER_KEYS).toEqual(["flashtopup", "foxreload", "gamesdrop"]);
    expect(PRODUCT_TRACKING_INTERVAL_HOURS).toEqual([2, 10, 24]);
    expect(isProductTrackingSupplierKey("gamesdrop")).toBe(true);
    expect(isProductTrackingSupplierKey("untrusted-supplier")).toBe(false);
    expect(productTrackingSupplierName("foxreload")).toBe("FoxReload");
  });

  it("uses the authenticated persisted schedule identity and never an in-process timer", async () => {
    const [handler, runner, router] = await Promise.all([
      readFile(new URL("./productTrackingSchedule.ts", import.meta.url), "utf8"),
      readFile(new URL("./productTracking.ts", import.meta.url), "utf8"),
      readFile(new URL("./routers.ts", import.meta.url), "utf8"),
    ]);
    expect(handler).toContain('app.post("/api/scheduled/product-tracking"');
    expect(handler).toContain("user.isCron || !user.taskUid");
    expect(runner).toContain("getProductTrackingScheduleByTaskUid(taskUid)");
    expect(runner).toContain('trigger: "scheduled"');
    expect(runner).not.toContain("setInterval");
    expect(router).toContain('path: "/api/scheduled/product-tracking"');
  });

  it("keeps the requested discovery, recovery-badge, and recent-sync summary controls bound to real Product Tracking data", async () => {
    const [trackingWorkspace, adminWorkspace] = await Promise.all([
      readFile(new URL("../client/src/components/AdminProductTracking.tsx", import.meta.url), "utf8"),
      readFile(new URL("../client/src/pages/SuperAdmin.tsx", import.meta.url), "utf8"),
    ]);
    expect(trackingWorkspace).toContain("Search out-of-stock products");
    expect(trackingWorkspace).toContain("All categories");
    expect(trackingWorkspace).toContain("Synced product summary");
    expect(trackingWorkspace).toContain("dashboard.data.recentNewProducts");
    expect(adminWorkspace).toContain("product-tracking-nav-badge");
    expect(adminWorkspace).toContain("hiddenProducts.filter((product) => product.recovered)");
  });
});
