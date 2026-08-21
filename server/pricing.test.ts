import { describe, expect, it } from "vitest";
import { calculateCustomerDisplayPrice, describePriceRule } from "../shared/pricing";
import { calculateManualExchangeQuote } from "../shared/exchangeRates";

describe("customer display pricing", () => {
  it("applies the configured default markup without changing supplier cost", () => {
    expect(calculateCustomerDisplayPrice({ supplierBasePrice: 10, defaultMarkupPercent: 25 })).toBe(12.5);
    expect(describePriceRule({ supplierBasePrice: 10, defaultMarkupPercent: 25 })).toBe("25% markup");
  });

  it("uses a product-specific percentage before the default markup", () => {
    expect(calculateCustomerDisplayPrice({ supplierBasePrice: 10, defaultMarkupPercent: 25, markupPercentOverride: 30 })).toBe(13);
  });

  it("uses an explicit fixed customer price before any percentage rule", () => {
    expect(calculateCustomerDisplayPrice({ supplierBasePrice: 10, defaultMarkupPercent: 25, markupPercentOverride: 30, displayPriceOverride: 14.99 })).toBe(14.99);
    expect(describePriceRule({ supplierBasePrice: 10, defaultMarkupPercent: 25, displayPriceOverride: 14.99 })).toBe("Fixed customer price");
  });

  it("calculates a saved manual exchange quote with its configured buffer and rejects invalid rates", () => {
    expect(calculateManualExchangeQuote({ usdAmount: 2, rate: 1600, bufferPercent: 5 })).toBe(3360);
    expect(calculateManualExchangeQuote({ usdAmount: 2, rate: 0, bufferPercent: 0 })).toBeNull();
  });
});
