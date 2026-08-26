import {
  beginProductTrackingRun,
  canRunSupplierCatalogSync,
  completeProductTrackingRun,
  failProductTrackingRun,
  getProductTrackingScheduleByTaskUid,
  getSupplierSyncStatus,
  markProductTrackingScheduledRun,
  productTrackingSupplierName,
  recordCompletedSupplierCatalogSync,
  recordSuperAdminAuditEvent,
  updateProductTrackingScheduleState,
  type ProductTrackingSupplierKey,
} from "./db";
import { syncFlashTopUpCatalog } from "./flashtopupCatalog";
import { syncFoxReloadCatalog } from "./foxreloadCatalog";
import { syncGamesDropCatalog } from "./gamesdropCatalog";

export type ProductTrackingTrigger = "manual" | "scheduled";

type SupplierSyncResult = {
  productCount: number;
  failures: Array<unknown>;
  summary: string;
};

async function runAuthorizedSupplierCatalogSync(supplierKey: ProductTrackingSupplierKey): Promise<SupplierSyncResult> {
  if (supplierKey === "flashtopup") {
    const syncStatus = await getSupplierSyncStatus("FlashTopUp");
    if (!canRunSupplierCatalogSync(syncStatus)) throw new Error("FlashTopUp catalog sync is paused by its supplier integration policy.");
    const result = await syncFlashTopUpCatalog({ page: 1, perPage: 10 });
    return { productCount: result.productCount, failures: result.failures, summary: `Authorized FlashTopUp catalog page 1 checked ${result.productCount} supplier records across ${result.serviceCount} services.` };
  }
  if (supplierKey === "foxreload") {
    const result = await syncFoxReloadCatalog({ categoryLimit: 5, productLimit: 100, searchLimit: 10 });
    return { productCount: result.productCount, failures: result.failures, summary: `Authorized FoxReload catalog scan checked ${result.productCount} supplier records across ${result.categoryCount} categories.` };
  }
  const result = await syncGamesDropCatalog({ page: 1, limit: 50, countryCode: "NG" });
  return { productCount: result.productCount, failures: result.failures, summary: `Authorized GamesDrop catalog scan checked ${result.productCount} supplier records across ${result.searches.length} supported searches.` };
}

/**
 * Executes a bounded, read-only supplier catalog refresh using existing server-side
 * credentials. It observes supplier availability and catalog additions only; it
 * never places an order, reroutes an order, charges a wallet, or exposes secrets.
 */
export async function runProductTrackingSupplierSync(input: { supplierKey: ProductTrackingSupplierKey; trigger: ProductTrackingTrigger; adminUserId?: number | null }) {
  const run = await beginProductTrackingRun({ supplierKey: input.supplierKey, trigger: input.trigger, adminUserId: input.adminUserId });
  const supplierName = productTrackingSupplierName(input.supplierKey);
  try {
    const result = await runAuthorizedSupplierCatalogSync(input.supplierKey);
    const failedRecords = result.failures.length;
    const supplierSyncRunId = await recordCompletedSupplierCatalogSync({
      supplierKey: input.supplierKey,
      providerName: supplierName,
      adminUserId: input.adminUserId ?? 0,
      productsUpdated: result.productCount,
      productsFailed: failedRecords,
      summary: `Product Tracking ${input.trigger} run. ${result.summary}`,
    });
    const completion = await completeProductTrackingRun({
      runId: run.id,
      supplierKey: input.supplierKey,
      startedAt: run.startedAt,
      supplierSyncRunId,
      productsObserved: result.productCount,
      productsFailed: failedRecords,
      summary: failedRecords ? `${result.summary} ${failedRecords} supplier lookup(s) failed; availability is shown only for successfully observed records.` : result.summary,
    });
    if (input.adminUserId) {
      await recordSuperAdminAuditEvent({
        adminUserId: input.adminUserId,
        action: "product_tracking.sync_completed",
        targetType: "supplier",
        targetId: input.supplierKey,
        summary: `Completed Product Tracking ${input.trigger} sync for ${supplierName}`,
        metadata: { productsObserved: result.productCount, productsFailed: failedRecords, newlySyncedProducts: completion.newlySyncedProducts, outOfStockProducts: completion.outOfStockProducts },
      });
    }
    return { supplierKey: input.supplierKey, supplierName, failedRecords, ...completion, summary: result.summary };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Supplier tracking sync failed";
    await failProductTrackingRun({ runId: run.id, supplierKey: input.supplierKey, message });
    if (input.adminUserId) {
      await recordSuperAdminAuditEvent({ adminUserId: input.adminUserId, action: "product_tracking.sync_failed", targetType: "supplier", targetId: input.supplierKey, summary: `Product Tracking ${input.trigger} sync failed for ${supplierName}`, metadata: { message } });
    }
    throw new Error(message);
  }
}

function nextScheduledRun(now: Date, intervalHours: number) {
  return new Date(now.getTime() + intervalHours * 60 * 60 * 1000).toISOString();
}

/** Called only by the authenticated platform scheduler. The persisted task UID is authoritative; request bodies are ignored. */
export async function runProductTrackingScheduledSync(taskUid: string) {
  const schedule = await getProductTrackingScheduleByTaskUid(taskUid);
  if (!schedule) return { ok: true, skipped: "orphan" as const };
  if (schedule.status !== "active") return { ok: true, skipped: "paused" as const };
  if (!schedule.supplierKey || !["flashtopup", "foxreload", "gamesdrop"].includes(schedule.supplierKey)) {
    await updateProductTrackingScheduleState({ id: schedule.id, status: "error", lastError: "Stored supplier key is not supported by Product Tracking." });
    return { ok: false, skipped: "unsupported_supplier" as const };
  }
  const supplierKey = schedule.supplierKey as ProductTrackingSupplierKey;
  const intervalHours = Number(schedule.intervalHours);
  const now = new Date();
  if (schedule.lastRunAt && now.getTime() - schedule.lastRunAt.getTime() < intervalHours * 60 * 60 * 1000 - 60_000) {
    return { ok: true, skipped: "not_due" as const };
  }
  try {
    const result = await runProductTrackingSupplierSync({ supplierKey, trigger: "scheduled", adminUserId: schedule.configuredByAdminId });
    await markProductTrackingScheduledRun({ id: schedule.id, lastRunAt: now, nextRunAt: nextScheduledRun(now, intervalHours) });
    return { ok: true, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scheduled supplier sync failed";
    // Preserve the active schedule after a transient supplier failure; the next platform callback retries the due run.
    await updateProductTrackingScheduleState({ id: schedule.id, status: "active", lastError: message, nextRunAt: nextScheduledRun(now, intervalHours) });
    throw error;
  }
}
