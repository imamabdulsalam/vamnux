export const TOP_UP_SUBCATEGORIES = [
  { code: "all", label: "All" },
  { code: "direct", label: "Direct Top Up" },
  { code: "activation", label: "Activation Codes" },
] as const;

export type TopUpSubcategoryCode = (typeof TOP_UP_SUBCATEGORIES)[number]["code"];
export type StoredTopUpSubcategoryCode = Exclude<TopUpSubcategoryCode, "all">;

export function topUpCatalogPath(subcategory: TopUpSubcategoryCode) {
  const parameters = new URLSearchParams({ category: "Top-up" });
  if (subcategory !== "all") parameters.set("topUpMode", subcategory);
  return `/catalog?${parameters.toString()}`;
}

export function topUpSubcategoryLabel(subcategory: string | null | undefined) {
  return TOP_UP_SUBCATEGORIES.find((option) => option.code === subcategory)?.label ?? "Unclassified";
}
