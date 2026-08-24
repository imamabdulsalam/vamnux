export const GAMES_PLATFORM_SUBCATEGORIES = [
  { code: "all", label: "All" },
  { code: "steam", label: "Steam" },
  { code: "xbox", label: "Xbox" },
  { code: "playstation", label: "PlayStation" },
  { code: "nintendo", label: "Nintendo" },
  { code: "battlenet", label: "Battle.net" },
  { code: "ea", label: "EA App" },
  { code: "ubisoft", label: "Ubisoft" },
  { code: "mobile", label: "Mobile" },
  { code: "quest", label: "Meta Quest" },
] as const;

export type GamesPlatformCode = (typeof GAMES_PLATFORM_SUBCATEGORIES)[number]["code"];
export type StoredGamesPlatformCode = Exclude<GamesPlatformCode, "all">;

export function gamesPlatformCatalogPath(platform: GamesPlatformCode) {
  const parameters = new URLSearchParams({ category: "Games" });
  if (platform !== "all") parameters.set("platform", platform);
  return `/catalog?${parameters.toString()}`;
}

export function gamesPlatformLabel(platform: string | null | undefined) {
  return GAMES_PLATFORM_SUBCATEGORIES.find((option) => option.code === platform)?.label ?? "Unclassified";
}
