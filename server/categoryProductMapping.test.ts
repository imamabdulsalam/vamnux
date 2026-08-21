import { describe, expect, it } from "vitest";
import { categoryContainsProduct } from "../client/src/lib/categoryProductMapping";

describe("VAMNUX Admin category product mapping", () => {
  it("groups conventional marketplace category slugs with their stored product types", () => {
    expect(categoryContainsProduct("game-top-up", "top_up")).toBe(true);
    expect(categoryContainsProduct("gift-cards", "gift_card")).toBe(true);
    expect(categoryContainsProduct("subscriptions", "subscription")).toBe(true);
    expect(categoryContainsProduct("ai-tools", "ai_tool")).toBe(true);
    expect(categoryContainsProduct("telegram-stars", "telegram_stars")).toBe(true);
  });

  it("keeps unrelated catalog products out of a category drill-down", () => {
    expect(categoryContainsProduct("gift-cards", "top_up")).toBe(false);
    expect(categoryContainsProduct("steam", "subscription")).toBe(false);
  });

  it("normalizes custom slug punctuation without broadening its product scope", () => {
    expect(categoryContainsProduct("telegram_stars", "telegram_stars")).toBe(true);
    expect(categoryContainsProduct("custom-service", "custom_service")).toBe(true);
    expect(categoryContainsProduct("custom-service", "gift_card")).toBe(false);
  });
});
