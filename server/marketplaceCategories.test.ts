import { describe, expect, it } from "vitest";
import { DEFAULT_MARKETPLACE_CATEGORIES } from "./db";

describe("VAMNUX storefront category defaults", () => {
  it("keeps the Admin taxonomy aligned with the configured marketplace navigation", () => {
    expect(DEFAULT_MARKETPLACE_CATEGORIES).toEqual([
      { slug: "game-top-up", name: "Game top-up", sortOrder: 1 },
      { slug: "gift-cards", name: "Gift cards", sortOrder: 2 },
      { slug: "subscriptions", name: "Subscriptions", sortOrder: 3 },
      { slug: "software", name: "Software", sortOrder: 4 },
      { slug: "ai-tools", name: "AI tools", sortOrder: 5 },
      { slug: "games", name: "Games", sortOrder: 6 },
      { slug: "steam-top-up", name: "Steam Top-Up", sortOrder: 7 },
      { slug: "telegram-stars", name: "Telegram Stars", sortOrder: 8 },
    ]);
  });
});
