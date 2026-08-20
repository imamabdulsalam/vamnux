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
