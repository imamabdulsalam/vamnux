import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { ENV } from "./_core/env";
import {
  createPaystackWalletFundingIntent,
  getPaystackFundingIntentForUser,
  markPaystackFundingInitialized,
  markPaystackFundingInitializationFailed,
  recordPaymentWebhookEvent,
  settleVerifiedPaystackWalletFunding,
  type PaystackVerifiedFundingInput,
} from "./db";

const PAYSTACK_API_BASE_URL = "https://api.paystack.co";
const PAYSTACK_TEST_DOMAIN = "test";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(record: JsonRecord, key: string) {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

function providerIdAsSafeString(value: unknown) {
  if (typeof value === "string" && /^\d{1,20}$/.test(value)) return BigInt(value).toString();
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  throw new Error("Paystack returned an unsupported transaction identifier.");
}

function providerAmountAsSafeString(value: unknown) {
  if (typeof value === "string" && /^\d{1,15}$/.test(value)) return BigInt(value).toString();
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  throw new Error("Paystack returned an unsupported transaction amount.");
}

function mapPaystackStatus(value: string): PaystackVerifiedFundingInput["providerStatus"] {
  const status = value.toLowerCase();
  if (status === "success") return "successful";
  if (["pending", "ongoing", "processing", "queued", "initiated"].includes(status)) return "pending";
  if (status === "failed" || status === "abandoned") return "failed";
  if (status === "reversed") return "reversed";
  if (status === "refunded") return "refunded";
  return "unknown";
}

function statusForPaystackWebhookEvent(eventType: string): PaystackVerifiedFundingInput["providerStatus"] | null {
  const normalized = eventType.trim().toLowerCase();
  if (normalized === "charge.success") return null;
  if (normalized === "charge.failed") return "failed";
  if (normalized.startsWith("refund.")) return "refunded";
  if (normalized.includes("reversal") || normalized.includes("reverse")) return "reversed";
  return "unknown";
}

function configuredCallbackUrl() {
  const configured = ENV.paystackTestCallbackUrl.trim();
  if (!configured) return undefined;
  const url = new URL(configured);
  if (url.protocol !== "https:") throw new Error("Paystack TEST callback configuration must use HTTPS.");
  url.pathname = "/account";
  url.search = "tab=wallet";
  url.hash = "";
  return url.toString();
}

async function paystackRequest(path: string, init: RequestInit) {
  const secret = ENV.paystackTestSecretKey;
  if (!secret.startsWith("sk_test_")) throw new Error("Paystack TEST wallet funding is not configured.");
  const response = await fetch(`${PAYSTACK_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Paystack returned an unreadable response.");
  }
  if (!response.ok || !isRecord(payload) || payload.status !== true) throw new Error("Paystack could not complete the secure funding request.");
  return payload;
}

async function verifyPaystackReference(reference: string, eventType: string, payloadHash?: string | null): Promise<PaystackVerifiedFundingInput> {
  const payload = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`, { method: "GET" });
  const data = isRecord(payload.data) ? payload.data : null;
  if (!data) throw new Error("Paystack verification did not return a transaction.");
  const customer = isRecord(data.customer) ? data.customer : {};
  return {
    eventId: `${eventType.trim().slice(0, 120)}:${providerIdAsSafeString(data.id)}`,
    reference: readString(data, "reference"),
    providerTransactionId: providerIdAsSafeString(data.id),
    amountSubunit: providerAmountAsSafeString(data.amount),
    currency: readString(data, "currency"),
    providerStatus: mapPaystackStatus(readString(data, "status")),
    providerEnvironment: readString(data, "domain") === PAYSTACK_TEST_DOMAIN ? "test" : "unknown",
    customerEmail: readString(customer, "email") || null,
    metadata: data.metadata,
    eventType,
    payloadHash,
  };
}

export async function initializePaystackWalletFunding(input: { userId: number; walletAmountUsd: number }) {
  const intent = await createPaystackWalletFundingIntent(input);
  try {
    const body: JsonRecord = {
      email: intent.customerEmail,
      amount: Number(intent.expectedNgnAmountSubunit),
      currency: "NGN",
      reference: intent.reference,
      metadata: intent.callbackMetadata,
    };
    const callbackUrl = configuredCallbackUrl();
    if (callbackUrl) body.callback_url = callbackUrl;
    const payload = await paystackRequest("/transaction/initialize", { method: "POST", body: JSON.stringify(body) });
    const data = isRecord(payload.data) ? payload.data : null;
    const authorizationUrl = data ? readString(data, "authorization_url") : "";
    const responseReference = data ? readString(data, "reference") : "";
    if (!authorizationUrl || responseReference !== intent.reference) throw new Error("Paystack did not return the expected checkout authorization.");
    await markPaystackFundingInitialized({ reference: intent.reference, checkoutUrl: authorizationUrl });
    return {
      authorizationUrl,
      reference: intent.reference,
      walletAmountUsd: intent.walletAmountUsd,
      paymentAmountNgn: (Number(intent.expectedNgnAmountSubunit) / 100).toFixed(2),
      paymentCurrency: "NGN" as const,
    };
  } catch (error) {
    await markPaystackFundingInitializationFailed(intent.reference);
    throw error;
  }
}

export async function verifyPaystackWalletFundingForUser(input: { userId: number; reference: string }) {
  const reference = input.reference.trim();
  if (!/^vamnux-test-[a-f0-9]{32}$/.test(reference)) throw new Error("This Paystack reference is invalid.");
  const intent = await getPaystackFundingIntentForUser({ userId: input.userId, reference });
  if (!intent) throw new Error("This Paystack funding reference is unavailable for your account.");
  const verified = await verifyPaystackReference(reference, "transaction.verify");
  const outcome = await settleVerifiedPaystackWalletFunding(verified);
  return { reference, fundingCode: intent.fundingCode, status: outcome.status };
}

export function verifyPaystackWebhookSignature(rawBody: Buffer, signature: string | undefined) {
  const secret = ENV.paystackTestSecretKey;
  if (!secret.startsWith("sk_test_") || !signature || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
}

export async function processPaystackWebhook(input: { reference: string; eventType: string; rawBody: Buffer }) {
  const verified = await verifyPaystackReference(input.reference, input.eventType, createHash("sha256").update(input.rawBody).digest("hex"));
  const eventStatus = statusForPaystackWebhookEvent(input.eventType);
  return settleVerifiedPaystackWalletFunding({ ...verified, providerStatus: eventStatus ?? verified.providerStatus });
}

export async function recordInvalidPaystackWebhook(input: { payloadHash: string; eventType: string; signatureStatus: "verified" | "invalid"; errorMessage: string }) {
  return recordPaymentWebhookEvent({
    providerName: "Paystack",
    providerEventId: `${input.signatureStatus}:${input.payloadHash}`,
    eventType: input.eventType.slice(0, 120) || "unknown",
    signatureStatus: input.signatureStatus,
    providerStatus: "unknown",
    payloadHash: input.payloadHash,
    errorMessage: input.errorMessage,
  });
}
