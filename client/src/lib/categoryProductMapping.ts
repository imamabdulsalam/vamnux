/** Maps managed marketplace navigation slugs to the stored VAMNUX product categories. */
export const categorySlugProductTypes: Record<string, string[]> = {
  "game-top-up": ["top_up", "game_key"],
  games: ["top_up", "game_key"],
  gaming: ["top_up", "game_key"],
  "gift-cards": ["gift_card"],
  "gift-card": ["gift_card"],
  subscriptions: ["subscription"],
  subscription: ["subscription"],
  software: ["software"],
  "ai-tools": ["ai_tool"],
  "ai-tool": ["ai_tool"],
  steam: ["steam"],
  "telegram-stars": ["telegram_stars"],
};

export function categoryContainsProduct(slug: string, productCategory: string) {
  const normalizedSlug = slug.trim().toLowerCase().replaceAll("_", "-");
  return (categorySlugProductTypes[normalizedSlug] ?? [normalizedSlug.replaceAll("-", "_")]).includes(productCategory);
}
