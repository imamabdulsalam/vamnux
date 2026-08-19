import { createHash } from "node:crypto";
import type { Express, Request, Response } from "express";
import express from "express";
import { processFlashTopUpWebhook } from "./db";
import { verifyFlashTopUpWebhook } from "./integrations/flashtopup";

type FlashTopUpWebhookPayload = {
  event?: string;
  event_id?: string;
  order_id?: string;
  reference_id?: string;
  order_status?: string;
};

function header(request: Request, name: string) {
  const value = request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

export function registerFlashTopUpWebhook(app: Express) {
  app.post("/api/webhooks/flashtopup", express.raw({ type: "application/json", limit: "1mb" }), async (request: Request, response: Response) => {
    const apiSecret = process.env.FLASHTOPUP_API_SECRET;
    const rawBody = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);
    const timestamp = header(request, "x-ft-webhook-timestamp");
    const signature = header(request, "x-ft-webhook-signature");

    if (!apiSecret || !verifyFlashTopUpWebhook({ rawBody, timestamp, signature, apiSecret })) {
      response.status(401).json({ status: "invalid signature" });
      return;
    }

    let payload: FlashTopUpWebhookPayload;
    try {
      payload = JSON.parse(rawBody.toString("utf8")) as FlashTopUpWebhookPayload;
    } catch {
      response.status(400).json({ status: "invalid JSON" });
      return;
    }
    if (!payload.event_id || !payload.event || !payload.reference_id) {
      response.status(400).json({ status: "missing event fields" });
      return;
    }

    try {
      await processFlashTopUpWebhook({
        eventId: payload.event_id,
        eventType: payload.event,
        referenceId: payload.reference_id,
        supplierOrderId: payload.order_id,
        orderStatus: payload.order_status,
        payloadHash: createHash("sha256").update(rawBody).digest("hex"),
      });
      response.status(200).json({ status: "ok" });
    } catch (error) {
      console.error("[FlashTopUp] Webhook processing failed", error);
      response.status(500).json({ status: "error" });
    }
  });
}
