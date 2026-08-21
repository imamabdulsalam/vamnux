export const WALLET_FUNDING_MINIMUM_USD = 3;

export type SavedFundingRate = {
  baseCurrency: string;
  quoteCurrency: string;
  rate: string | number;
  bufferPercent?: string | number | null;
  active: boolean;
};

export function fundingMinimumForCurrency(currency: "USD" | "EUR" | "GBP" | "NGN", rates: SavedFundingRate[]) {
  if (currency === "USD") return WALLET_FUNDING_MINIMUM_USD;
  const rate = rates.find((item) => item.active && item.baseCurrency === "USD" && item.quoteCurrency === currency);
  if (!rate) return null;
  const baseRate = Number(rate.rate);
  const bufferPercent = Number(rate.bufferPercent ?? 0);
  if (!Number.isFinite(baseRate) || baseRate <= 0 || !Number.isFinite(bufferPercent) || bufferPercent < 0) return null;
  return WALLET_FUNDING_MINIMUM_USD * baseRate * (1 + bufferPercent / 100);
}

export function fundingQuoteFromUsd(usdAmount: number, currency: "USD" | "EUR" | "GBP" | "NGN", rates: SavedFundingRate[]) {
  if (!Number.isFinite(usdAmount) || usdAmount < WALLET_FUNDING_MINIMUM_USD) return null;
  const minimum = fundingMinimumForCurrency(currency, rates);
  if (minimum === null) return null;
  return currency === "USD" ? usdAmount : (usdAmount / WALLET_FUNDING_MINIMUM_USD) * minimum;
}
