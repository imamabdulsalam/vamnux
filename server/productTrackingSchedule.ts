import type { Express, Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { ENV } from "./_core/env";
import { runDueProductTrackingScheduledSyncs } from "./productTracking";

function suppliedCronSecret(req: Request) {
  const authorization = req.get("authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  return req.get("x-vamnux-cron-key") ?? bearer ?? "";
}

export function isValidProductTrackingCronSecret(expected: string, supplied: string) {
  if (expected.length < 32 || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export function isAuthorizedProductTrackingCronRequest(req: Request) {
  return isValidProductTrackingCronSecret(ENV.productTrackingCronSecret, suppliedCronSecret(req));
}

export function registerProductTrackingSchedule(app: Express) {
  app.post("/api/scheduled/product-tracking", async (req: Request, res: Response) => {
    try {
      if (!isAuthorizedProductTrackingCronRequest(req)) return res.status(403).json({ error: "forbidden" });
      const result = await runDueProductTrackingScheduledSyncs();
      return res.status(result.ok ? 200 : 422).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Product Tracking scheduled sync failed";
      return res.status(500).json({ error: message, timestamp: new Date().toISOString(), context: { path: "/api/scheduled/product-tracking" } });
    }
  });
}
