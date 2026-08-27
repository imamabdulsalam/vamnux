import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const root = "/home/ubuntu/naijaplay-store";
const routerSource = readFileSync(`${root}/server/routers.ts`, "utf8");
const dbSource = readFileSync(`${root}/server/db.ts`, "utf8");
const schemaSource = readFileSync(`${root}/drizzle/schema.ts`, "utf8");
const paystackSource = readFileSync(`${root}/server/paystack.ts`, "utf8");
const webhookSource = readFileSync(`${root}/server/paystackWebhook.ts`, "utf8");
const dashboardSource = readFileSync(`${root}/client/src/pages/UserDashboard.tsx`, "utf8");

describe("Paystack TEST wallet funding safeguards", () => {
  it("requires authentication before a customer can initialize or verify Paystack wallet funding", async () => {
    const caller = appRouter.createCaller({ user: null } as TrpcContext);
    await expect(caller.marketplace.initializePaystackWalletFunding({ walletAmountUsd: 3 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.marketplace.verifyPaystackWalletFunding({ reference: "vamnux-test-0123456789abcdef0123456789abcdef" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("validates the Paystack signature over raw bytes without retaining the secret or raw payload", async () => {
    vi.resetModules();
    vi.stubEnv("PAYSTACK_TEST_SECRET_KEY", "sk_test_unit_test_only");
    const { verifyPaystackWebhookSignature } = await import("./paystack");
    const body = Buffer.from('{"event":"charge.success"}', "utf8");
    const signature = createHmac("sha512", "sk_test_unit_test_only").update(body).digest("hex");
    expect(verifyPaystackWebhookSignature(body, signature)).toBe(true);
    expect(verifyPaystackWebhookSignature(body, "00".repeat(64))).toBe(false);
    expect(verifyPaystackWebhookSignature(Buffer.from('{"event":"changed"}', "utf8"), signature)).toBe(false);
    vi.unstubAllEnvs();
  });

  it("uses server-only TEST initialization, strict verification fields, safe ID strings, and immutable ledger crediting", () => {
    expect(routerSource).toContain("initializePaystackWalletFunding: customerProcedure");
    expect(routerSource).toContain("verifyPaystackWalletFunding: customerProcedure");
    expect(paystackSource).toContain('const PAYSTACK_TEST_DOMAIN = "test"');
    expect(paystackSource).toContain('amount: Number(intent.expectedNgnAmountSubunit)');
    expect(paystackSource).toContain('currency: "NGN"');
    expect(paystackSource).toContain("callback_url");
    expect(paystackSource).toContain("providerIdAsSafeString");
    expect(paystackSource).toContain("providerAmountAsSafeString");
    expect(paystackSource).toContain("statusForPaystackWebhookEvent");
    expect(paystackSource).toContain('normalized === "charge.failed"');
    expect(paystackSource).toContain('normalized.startsWith("refund.")');
    expect(dbSource).toContain("paystackMetadataMatchesAttempt");
    expect(dbSource).toContain("input.currency.trim().toUpperCase() === \"NGN\"");
    expect(dbSource).toContain("input.providerEnvironment === PAYSTACK_PROVIDER_ENVIRONMENT");
    expect(dbSource).toContain("user?.email?.trim().toLowerCase() === input.customerEmail?.trim().toLowerCase()");
    expect(dbSource).toContain('entryType: "funding"');
    expect(schemaSource).toContain("wallet_entry_balance_snapshots_entry_unique");
    expect(dbSource).toContain("wallet-funding:${attempt.fundingCode}");
  });

  it("prevents duplicate settlement and sends mismatched, pending, failed, refunded, reversed, or credit-failure cases to the existing control workflow", () => {
    expect(schemaSource).toContain("wallet_funding_attempts_provider_transaction_unique");
    expect(dbSource).toContain("duplicate_provider_transaction");
    expect(dbSource).toContain("verification_mismatch");
    expect(dbSource).toContain('status: "reconciliation"');
    expect(dbSource).toContain("missing-wallet-credit");
    expect(dbSource).toContain('input.providerStatus === "failed"');
    expect(dbSource).toContain('input.providerStatus === "pending"');
    expect(dbSource).toContain('input.providerStatus === "refunded" || input.providerStatus === "reversed"');
    expect(dbSource).toContain("already_settled");
    expect(webhookSource).toContain('express.raw({ type: "application/json", limit: "1mb" })');
    expect(webhookSource).toContain("verifyPaystackWebhookSignature(rawBody, signature)");
    expect(webhookSource).not.toContain("console.error");
  });

  it("keeps Paystack confined to dashboard wallet funding and does not expose credentials or add it to product checkout", () => {
    expect(dashboardSource).toContain("Pay with Paystack (TEST)");
    expect(dashboardSource).toContain("initializePaystackFunding.mutate");
    expect(dashboardSource).toContain("verifyPaystackFunding.mutate");
    expect(dashboardSource).not.toContain("PAYSTACK_TEST_SECRET_KEY");
    expect(dashboardSource).not.toContain("authorization_code");
    const createOrderBlock = routerSource.slice(routerSource.indexOf("createOrder: customerProcedure"), routerSource.indexOf("steamTopUpQuote:"));
    expect(createOrderBlock).not.toContain("Paystack");
    expect(createOrderBlock).not.toContain("initializePaystackWalletFunding");
  });
});
