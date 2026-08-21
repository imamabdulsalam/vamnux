import { describe, expect, it } from "vitest";
import { fundingMinimumForCurrency, fundingQuoteFromUsd, WALLET_FUNDING_MINIMUM_USD } from "./walletFunding";

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
