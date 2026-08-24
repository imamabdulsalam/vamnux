export const FINANCIAL_ALERT_TYPES = ["negative_margin", "supplier_cost_exceeds_selling_price", "very_low_margin", "missing_supplier_cost", "missing_exchange_rate", "missing_payment_fee", "unusual_price_change"] as const;
export type FinancialAlertType = (typeof FINANCIAL_ALERT_TYPES)[number];

export type FinancialSnapshotInput = {
  customerSellingPrice: number;
  supplierCost: number | null;
  exchangeRate: number | null;
  supplierCostInCustomerCurrency: number | null;
  paymentProcessingFee: number;
  otherApplicableFees: number;
  refundAmount?: number;
};

export function calculateFinancialSnapshot(input: FinancialSnapshotInput) {
  const grossRevenue = input.customerSellingPrice;
  const supplierCost = input.supplierCostInCustomerCurrency ?? 0;
  const grossProfit = grossRevenue - supplierCost;
  const refundAmount = input.refundAmount ?? 0;
  const netRevenue = grossRevenue - refundAmount;
  const netProfit = grossProfit - input.paymentProcessingFee - input.otherApplicableFees - refundAmount;
  const profitMarginPercent = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;
  return { grossRevenue, supplierCost, grossProfit, paymentProcessingFee: input.paymentProcessingFee, otherApplicableFees: input.otherApplicableFees, refundAmount, netRevenue, netProfit, profitMarginPercent };
}

export function financialAlertsForSnapshot(input: FinancialSnapshotInput & { profitMarginPercent: number; paymentFeeConfigured: boolean; unusualPriceChange?: boolean }) {
  const alerts: FinancialAlertType[] = [];
  const supplierCost = input.supplierCostInCustomerCurrency;
  if (supplierCost === null || input.supplierCost === null) alerts.push("missing_supplier_cost");
  if (input.supplierCost !== null && input.exchangeRate === null) alerts.push("missing_exchange_rate");
  if (!input.paymentFeeConfigured) alerts.push("missing_payment_fee");
  if (supplierCost !== null && supplierCost > input.customerSellingPrice) alerts.push("supplier_cost_exceeds_selling_price");
  if (input.profitMarginPercent < 0) alerts.push("negative_margin");
  else if (input.profitMarginPercent >= 0 && input.profitMarginPercent < 5) alerts.push("very_low_margin");
  if (input.unusualPriceChange) alerts.push("unusual_price_change");
  return alerts;
}
