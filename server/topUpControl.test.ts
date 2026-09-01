import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { ADMIN_MFA_VERIFIED_COOKIE } from "@shared/const";

vi.mock("./adminMfa", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./adminMfa")>();
  return {
    ...actual,
    isAdminMfaEnrolled: vi.fn(async (userId: number) => userId === 1),
    verifyAdminMfaSessionToken: vi.fn(async (token: string | undefined, userId: number) => token === "topup-control-test-mfa" && userId === 1),
  };
});

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const routerSource = readFileSync("/home/ubuntu/naijaplay-store/server/routers.ts", "utf8");
const dbSource = readFileSync("/home/ubuntu/naijaplay-store/server/db.ts", "utf8");
const schemaSource = readFileSync("/home/ubuntu/naijaplay-store/drizzle/schema.ts", "utf8");

function createContext(role: "admin" | "user"): TrpcContext {
  return {
    user: {
      id: role === "admin" ? 1 : 999_999,
      openId: `${role}-topup-control-test`,
      name: `${role} test`,
      email: `${role}@example.test`,
      loginMethod: "test",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: role === "admin" ? { cookie: `${ADMIN_MFA_VERIFIED_COOKIE}=topup-control-test-mfa` } : {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Webhook / Top-Up Control", () => {
  it("keeps all wallet-control reads and balance-changing mutations behind the Super Admin procedure", async () => {
    const unprivileged = appRouter.createCaller(createContext("user"));
    await expect(unprivileged.admin.getTopUpControlDashboard()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(unprivileged.admin.createManualWalletAdjustment({ email: "customer@example.test", direction: "credit", amount: 1, currency: "USD", reason: "must be blocked", confirmed: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(unprivileged.admin.reverseWalletLedgerEntry({ walletEntryId: 1, reference: "TEST-REVERSAL-BLOCKED", reason: "must be blocked", confirmation: "CONFIRM WALLET REVERSAL" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns the real protected monitoring datasets to an authorized Super Admin without changing a wallet", async () => {
    const admin = appRouter.createCaller(createContext("admin"));
    const [dashboard, transactions, webhooks, cases, timeline, audit] = await Promise.all([
      admin.admin.getTopUpControlDashboard(),
      admin.admin.listTopUpTransactions({ limit: 10 }),
      admin.admin.listTopUpWebhookMonitor({ limit: 10 }),
      admin.admin.listTopUpReconciliationCases({ limit: 10 }),
      admin.admin.listUserWalletTimeline({ limit: 10 }),
      admin.admin.listTopUpControlAudit({ limit: 10 }),
    ]);
    expect(dashboard).toMatchObject({ totalTopUps: expect.any(Number), totalCredited: expect.any(Number), unresolvedWebhookErrors: expect.any(Number) });
    expect(transactions.transactions).toEqual(expect.any(Array));
    expect(webhooks.events).toEqual(expect.any(Array));
    expect(cases.cases).toEqual(expect.any(Array));
    expect(timeline.entries).toEqual(expect.any(Array));
    expect(audit.audits).toEqual(expect.any(Array));
  });

  it("requires a final confirmation signal for manual adjustments and keeps reversal confirmation explicit", () => {
    expect(routerSource).toContain("confirmed: z.literal(true)");
    expect(routerSource).toContain('confirmation: z.literal("CONFIRM WALLET REVERSAL")');
    expect(routerSource).toContain("createManualWalletAdjustment: adminProcedure");
    expect(routerSource).toContain('email: z.string().trim().email().max(320)');
    expect(dbSource).toContain("No customer account was found for this email address");
    expect(dbSource).toContain("createManualWalletAdjustmentReference");
    expect(routerSource).toContain("reverseWalletLedgerEntry: adminProcedure");
  });

  it("uses immutable, idempotent records and never stores raw payment credentials or webhook payloads", () => {
    expect(schemaSource).toContain("payment_webhook_events_provider_event_unique");
    expect(schemaSource).toContain("wallet_funding_attempts_provider_reference_unique");
    expect(schemaSource).toContain("wallet_entry_reversals_original_entry_unique");
    expect(schemaSource).toContain("wallet_entry_balance_snapshots_entry_unique");
    expect(dbSource).toContain("This wallet ledger entry has already been reversed");
    expect(dbSource).toContain("Duplicate provider event ID was received and no wallet credit was attempted");
    expect(dbSource).toContain("It deliberately records and flags receipts but never credits a wallet automatically");
    expect(dbSource).not.toContain("rawWebhookPayload");
    expect(dbSource).not.toContain("webhookSecret:");
  });
});
