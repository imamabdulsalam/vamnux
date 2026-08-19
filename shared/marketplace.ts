export const supportedCurrencies = ["USD", "EUR", "GBP", "NGN"] as const;
export type SupportedCurrency = (typeof supportedCurrencies)[number];

export type CheckoutLine = {
  productId: number;
  quantity: number;
  unitPrice: number;
};

export function calculateOrderTotal(lines: CheckoutLine[]) {
  return lines.reduce((total, line) => total + line.quantity * line.unitPrice, 0);
}

export function createOrderCode(now = Date.now(), randomPart = Math.random()) {
  const timePart = now.toString(36).toUpperCase().slice(-6);
  const random = Math.floor(randomPart * 36 ** 4).toString(36).toUpperCase().padStart(4, "0");
  return `VN-${timePart}-${random}`;
}

/** Namespace supplier-required fields by catalog product to keep multi-item draft orders unambiguous. */
export function createFulfillmentFieldKey(productId: number, fieldName: string) {
  return `${productId}.${fieldName}`;
}

export type LiveMarketplaceProductFamilyMember = {
  name: string;
  image: string;
  category: string;
};

/** Keep individual live supplier services available while presenting repeated denominations beneath one game-family identity. */
export function groupLiveProductFamilies<T extends LiveMarketplaceProductFamilyMember>(products: readonly T[]) {
  const groups = new Map<string, { name: string; image: string; category: string; items: T[] }>();
  for (const product of products) {
    const existing = groups.get(product.name);
    if (existing) {
      existing.items.push(product);
    } else {
      groups.set(product.name, { name: product.name, image: product.image, category: product.category, items: [product] });
    }
  }
  return Array.from(groups.values());
}
