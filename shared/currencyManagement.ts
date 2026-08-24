export const VAMNUX_SUPPORTED_CURRENCIES = ["USD", "NGN", "EUR", "GBP"] as const;
export type VamnuxSupportedCurrency = (typeof VAMNUX_SUPPORTED_CURRENCIES)[number];

export const CURRENCY_RATE_UPDATE_FREQUENCIES = ["manual", "hourly", "daily", "weekly"] as const;
export type CurrencyRateUpdateFrequency = (typeof CURRENCY_RATE_UPDATE_FREQUENCIES)[number];

export const CURRENCY_RATE_SOURCES = ["manual", "approved_external"] as const;
export type CurrencyRateSource = (typeof CURRENCY_RATE_SOURCES)[number];

export const CURRENCY_DEFINITIONS: Record<VamnuxSupportedCurrency, { name: string; symbol: string }> = {
  USD: { name: "US Dollar", symbol: "$" },
  NGN: { name: "Nigerian Naira", symbol: "₦" },
  EUR: { name: "Euro", symbol: "€" },
  GBP: { name: "British Pound", symbol: "£" },
};

export const MATERIAL_RATE_CHANGE_PERCENT = 5;
