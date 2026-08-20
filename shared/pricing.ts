export type ProductPricingRule = {
  supplierBasePrice: number;
  defaultMarkupPercent: number;
  markupPercentOverride?: number | null;
  displayPriceOverride?: number | null;
};

export function calculateCustomerDisplayPrice(rule: ProductPricingRule) {
  if (!Number.isFinite(rule.supplierBasePrice) || rule.supplierBasePrice < 0) throw new Error("Supplier base price must be a non-negative number");
  if (rule.displayPriceOverride !== null && rule.displayPriceOverride !== undefined) {
    if (!Number.isFinite(rule.displayPriceOverride) || rule.displayPriceOverride < 0) throw new Error("Display-price override must be a non-negative number");
    return Math.round((rule.displayPriceOverride + Number.EPSILON) * 100) / 100;
  }
  const markup = rule.markupPercentOverride ?? rule.defaultMarkupPercent;
  if (!Number.isFinite(markup) || markup < -100 || markup > 500) throw new Error("Markup percent must be between -100 and 500");
  return Math.round((rule.supplierBasePrice * (1 + markup / 100) + Number.EPSILON) * 100) / 100;
}

export function describePriceRule(rule: ProductPricingRule) {
  if (rule.displayPriceOverride !== null && rule.displayPriceOverride !== undefined) return "Fixed customer price";
  const markup = rule.markupPercentOverride ?? rule.defaultMarkupPercent;
  return `${markup.toFixed(2).replace(/\.00$/, "")}% markup`;
}
