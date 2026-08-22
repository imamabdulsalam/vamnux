import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { walletCanCoverOrder } from "./db";
import { fundingMinimumForCurrency, fundingQuoteFromUsd, WALLET_FUNDING_MINIMUM_USD } from "../shared/walletFunding";

const dashboardSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/UserDashboard.tsx"), "utf8");
const adminSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/SuperAdmin.tsx"), "utf8");

describe("wallet funding authorization", () => {
  it("rejects an unauthenticated top-up request before any funding record can be created", async () => {
    const caller = appRouter.createCaller({ user: null } as TrpcContext);
    await expect(caller.marketplace.createWalletFundingRequest({ amount: 25, currency: "USD" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a customer attempting to settle a wallet funding request", async () => {
    const caller = appRouter.createCaller({ user: { id: 92, openId: "funding-customer", name: "Customer", email: "customer@example.test", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } } as TrpcContext);
    await expect(caller.admin.reviewWalletFundingRequest({ fundingCode: "WFTEST123", action: "settle", verificationReference: "verified-ref" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("wallet-only product order eligibility", () => {
  it("permits only a settled active wallet with matching currency and enough balance", () => {
    expect(walletCanCoverOrder({ walletStatus: "active", walletCurrency: "USD", orderCurrency: "USD", availableBalance: "25.00", total: 25 })).toBe(true);
    expect(walletCanCoverOrder({ walletStatus: "active", walletCurrency: "USD", orderCurrency: "USD", availableBalance: "24.99", total: 25 })).toBe(false);
    expect(walletCanCoverOrder({ walletStatus: "locked", walletCurrency: "USD", orderCurrency: "USD", availableBalance: "100.00", total: 25 })).toBe(false);
    expect(walletCanCoverOrder({ walletStatus: "active", walletCurrency: "NGN", orderCurrency: "USD", availableBalance: "100.00", total: 25 })).toBe(false);
  });
});

describe("wallet funding conversion readiness", () => {
  const rates = [{ baseCurrency: "USD", quoteCurrency: "NGN", rate: "1500", bufferPercent: "2", active: true }];

  it("uses the $3 USD minimum and Admin-set buffer for NGN estimates", () => {
    expect(WALLET_FUNDING_MINIMUM_USD).toBe(3);
    expect(fundingMinimumForCurrency("NGN", rates)).toBe(4590);
    expect(fundingQuoteFromUsd(3, "NGN", rates)).toBe(4590);
  });

  it("does not quote currencies without an active Admin-saved USD rate", () => {
    expect(fundingMinimumForCurrency("EUR", rates)).toBeNull();
    expect(fundingQuoteFromUsd(3, "EUR", rates)).toBeNull();
  });
});

describe("funding flow readiness copy", () => {
  it("does not make customers submit visible manual top-up requests and preserves verified provider crediting", () => {
    expect(dashboardSource).toContain("no funding request or Admin approval is required");
    expect(dashboardSource).toContain("verified payment webhook confirms the transaction");
    expect(dashboardSource).toContain("legacyHistory.style.display = \"none\"");
    expect(adminSource).toContain("Customer wallets credit automatically only after a configured payment gateway verifies a payment");
  });

  it("lists only source-verified supplier funding guidance for the configured suppliers", () => {
    expect(adminSource).toContain("supplierFundingGuides");
    expect(adminSource).toContain("Partner-enabled USDT balance top-up");
    expect(adminSource).toContain("Card, mobile payment, or crypto where enabled for the account region");
    expect(adminSource).toContain("SWIFT wire — $1,000 documented minimum");
    expect(adminSource).toContain("SEPA (EUR) — €500 documented minimum");
    expect(adminSource).toContain("VAMNUX does not collect supplier payment credentials, send funds");
  });
});
