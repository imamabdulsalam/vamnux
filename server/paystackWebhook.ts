import { createHash } from "node:crypto";
import type { Express, Request, Response } from "express";
import express from "express";
import { processPaystackWebhook, recordInvalidPaystackWebhook, verifyPaystackWebhookSignature } from "./paystack";

type PaystackWebhookPayload = { event?: unknown; data?: { reference?: unknown } };

function firstHeader(request: Request, name: string) {
  const value = request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

/** Registers the public TEST-mode Paystack endpoint before JSON parsing. Raw callback bodies are never stored or logged. */
export function registerPaystackWebhook(app: Express) {
  app.post("/api/webhooks/paystack", express.raw({ type: "application/json", limit: "1mb" }), async (request: Request, response: Response) => {
    const rawBody = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);
    const payloadHash = createHash("sha256").update(rawBody).digest("hex");
    const signature = firstHeader(request, "x-paystack-signature");
    if (!verifyPaystackWebhookSignature(rawBody, signature)) {
      await recordInvalidPaystackWebhook({ payloadHash, eventType: "invalid_signature", signatureStatus: "invalid", errorMessage: "Invalid Paystack webhook signature." }).catch(() => undefined);
      response.status(401).json({ status: "invalid signature" });
      return;
    }
    let payload: PaystackWebhookPayload;
    try {
      payload = JSON.parse(rawBody.toString("utf8")) as PaystackWebhookPayload;
    } catch {
      await recordInvalidPaystackWebhook({ payloadHash, eventType: "malformed", signatureStatus: "verified", errorMessage: "Malformed Paystack webhook JSON." }).catch(() => undefined);
      response.status(400).json({ status: "invalid payload" });
      return;
    }
    const eventType = typeof payload.event === "string" ? payload.event : "unknown";
    const reference = typeof payload.data?.reference === "string" ? payload.data.reference.trim() : "";
    if (!reference) {
      await recordInvalidPaystackWebhook({ payloadHash, eventType, signatureStatus: "verified", errorMessage: "Paystack webhook did not include a funding reference." }).catch(() => undefined);
      response.status(400).json({ status: "invalid payload" });
      return;
    }
    try {
      await processPaystackWebhook({ reference, eventType, rawBody });
      response.status(200).json({ status: "ok" });
    } catch {
      response.status(500).json({ status: "retry" });
    }
  });
}
