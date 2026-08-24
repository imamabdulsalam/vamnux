export const PRICING_RULE_SCOPES = ["global", "category", "product", "supplier"] as const;
export type PricingRuleScope = (typeof PRICING_RULE_SCOPES)[number];

export const PRICING_ROUNDING_RULES = ["none", "nearest_0_01", "nearest_1", "nearest_5", "nearest_10", "nearest_50", "nearest_100"] as const;
export type PricingRoundingRule = (typeof PRICING_ROUNDING_RULES)[number];

export type PricingPreviewInput = {
  supplierCost: number;
  exchangeRate: number;
  percentageMarkup: number;
  fixedMarkup: number;
  fixedFee: number;
  minimumSellingPrice?: number | null;
  maximumDiscountPercent?: number | null;
  roundingRule: PricingRoundingRule;
  manualPriceOverride?: number | null;
};

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function roundUsingRule(value: number, rule: PricingRoundingRule) {
  if (rule === "none" || rule === "nearest_0_01") return roundCurrency(value);
  const increment = Number(rule.replace("nearest_", ""));
  return roundCurrency(Math.round(value / increment) * increment);
}

/**
 * Admin-only deterministic price calculation. This never reads or updates a
 * product row; callers must explicitly choose whether to apply a preview.
 */
export function calculatePricingPreview(input: PricingPreviewInput) {
  const numericFields = [input.supplierCost, input.exchangeRate, input.percentageMarkup, input.fixedMarkup, input.fixedFee];
  if (numericFields.some((value) => !Number.isFinite(value))) throw new Error("Pricing inputs must be finite numbers");
  if (input.supplierCost < 0 || input.exchangeRate <= 0) throw new Error("Supplier cost must be non-negative and exchange rate must be greater than zero");
  if (input.percentageMarkup < -100 || input.percentageMarkup > 500) throw new Error("Percentage markup must be between -100% and 500%");
  if (input.fixedMarkup < 0 || input.fixedFee < 0) throw new Error("Fixed markup and fixed fee must be non-negative");
  if (input.minimumSellingPrice !== null && input.minimumSellingPrice !== undefined && (!Number.isFinite(input.minimumSellingPrice) || input.minimumSellingPrice < 0)) throw new Error("Minimum selling price must be non-negative");
  if (input.maximumDiscountPercent !== null && input.maximumDiscountPercent !== undefined && (!Number.isFinite(input.maximumDiscountPercent) || input.maximumDiscountPercent < 0 || input.maximumDiscountPercent > 100)) throw new Error("Maximum discount must be between 0% and 100%");
  if (input.manualPriceOverride !== null && input.manualPriceOverride !== undefined && (!Number.isFinite(input.manualPriceOverride) || input.manualPriceOverride < 0)) throw new Error("Manual price override must be non-negative");

  const convertedCost = input.supplierCost * input.exchangeRate;
  const percentageMarkupAmount = convertedCost * (input.percentageMarkup / 100);
  const standardSellingPrice = convertedCost + percentageMarkupAmount + input.fixedMarkup + input.fixedFee;
  const minimumByDiscount = input.maximumDiscountPercent === null || input.maximumDiscountPercent === undefined ? 0 : standardSellingPrice * (1 - input.maximumDiscountPercent / 100);
  const minimumAllowedPrice = Math.max(input.minimumSellingPrice ?? 0, minimumByDiscount);
  const requestedPrice = input.manualPriceOverride ?? standardSellingPrice;
  if (requestedPrice + Number.EPSILON < minimumAllowedPrice) throw new Error("The manual price is below the configured minimum selling price or maximum-discount limit");
  const finalSellingPrice = roundUsingRule(Math.max(requestedPrice, minimumAllowedPrice), input.roundingRule);
  const expectedProfit = roundCurrency(finalSellingPrice - convertedCost);
  const expectedProfitPercent = convertedCost === 0 ? null : roundCurrency((expectedProfit / convertedCost) * 100);

  return {
    supplierCost: roundCurrency(input.supplierCost),
    exchangeRate: input.exchangeRate,
    convertedCost: roundCurrency(convertedCost),
    percentageMarkup: input.percentageMarkup,
    percentageMarkupAmount: roundCurrency(percentageMarkupAmount),
    fixedMarkup: roundCurrency(input.fixedMarkup),
    fixedFee: roundCurrency(input.fixedFee),
    minimumAllowedPrice: roundCurrency(minimumAllowedPrice),
    roundingRule: input.roundingRule,
    finalSellingPrice,
    expectedProfit,
    expectedProfitPercent,
  };
}
