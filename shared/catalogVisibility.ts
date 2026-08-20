const NIGERIA_PRIORITY_FAMILIES = new Set([
  "arena breakout",
  "bigo live diamonds",
  "free fire global",
  "mobile legends global",
  "pubg mobile",
  "ragnarok origin",
]);

export type CatalogVisibilityScope = "curated" | "all";

export function isNigeriaPriorityFamily(name: string) {
  return NIGERIA_PRIORITY_FAMILIES.has(name.trim().toLowerCase());
}

export function filterGameFamiliesForScope<T extends { name: string }>(families: T[], scope: CatalogVisibilityScope) {
  if (scope === "all") return families;
  return families.filter((family) => isNigeriaPriorityFamily(family.name));
}

/**
 * Primary public catalogue policy: keep the storefront focused on verified game
 * families selected for the current market. Region-specific digital codes and
 * subscriptions stay in supplier records but are not shown as public VAMNUX offers.
 */
export function isPrimaryMarketProduct<T extends { category: string; name: string; region?: string }>(product: T) {
  const isTopUp = product.category === "Top-up" || product.category === "top_up";
  if (isTopUp) return isNigeriaPriorityFamily(product.name);
  if (product.category === "Telegram Stars" || product.category === "telegram_stars") return true;
  if (product.category === "Steam" || product.category === "steam") return /^(global|glb|worldwide|ww)$/i.test(product.region ?? "");
  return false;
}

export function filterPrimaryMarketProducts<T extends { category: string; name: string; region?: string }>(products: T[]) {
  return products.filter(isPrimaryMarketProduct);
}
