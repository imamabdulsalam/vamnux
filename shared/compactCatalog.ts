export type CompactCatalogItem = {
  category: string;
  name: string;
  product: string;
};

/** Builds small category menus from synchronized catalog rows only; no suggested inventory is invented. */
export function categoryQuickLinks(items: CompactCatalogItem[], category: string, limit = 6) {
  const labels = items
    .filter((item) => item.category === category)
    .map((item) => category === "Top-up" ? item.name : item.product)
    .map((label) => label.trim())
    .filter(Boolean);
  return Array.from(new Set(labels)).slice(0, Math.max(0, limit));
}

/** Keeps the first marketplace page recognisable by showing one top-up per game family before extra denominations. */
export function interleaveTopUpFamilies<T extends CompactCatalogItem>(items: T[]) {
  const topUps = items.filter((item) => item.category === "Top-up");
  const otherProducts = items.filter((item) => item.category !== "Top-up");
  const byFamily = new Map<string, T[]>();
  for (const item of topUps) {
    const family = item.name.trim().toLowerCase();
    const group = byFamily.get(family) ?? [];
    group.push(item);
    byFamily.set(family, group);
  }
  const representatives = Array.from(byFamily.values()).map((group) => group[0]);
  const remainingDenominations = Array.from(byFamily.values()).flatMap((group) => group.slice(1));
  return [...representatives, ...otherProducts, ...remainingDenominations];
}
