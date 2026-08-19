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
