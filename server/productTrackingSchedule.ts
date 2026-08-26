import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { runProductTrackingScheduledSync } from "./productTracking";

export function registerProductTrackingSchedule(app: Express) {
  app.post("/api/scheduled/product-tracking", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const result = await runProductTrackingScheduledSync(user.taskUid);
      return res.status(result.ok ? 200 : 422).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Product Tracking scheduled sync failed";
      return res.status(500).json({ error: message, timestamp: new Date().toISOString(), context: { path: "/api/scheduled/product-tracking" } });
    }
  });
}
