import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { walletCanCoverOrder } from "./db";
import { fundingMinimumForCurrency, fundingQuoteFromUsd, WALLET_FUNDING_MINIMUM_USD } from "../shared/walletFunding";

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
