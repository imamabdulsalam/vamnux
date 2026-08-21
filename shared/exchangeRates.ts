export function calculateManualExchangeQuote(input: { usdAmount: number; rate: number; bufferPercent?: number | null }) {
  const { usdAmount, rate } = input;
  const bufferPercent = input.bufferPercent ?? 0;
  if (![usdAmount, rate, bufferPercent].every(Number.isFinite) || usdAmount < 0 || rate <= 0 || bufferPercent < 0) return null;
  return usdAmount * rate * (1 + bufferPercent / 100);
}
