import { describe, expect, it } from "vitest";
import { categoryQuickLinks, interleaveTopUpFamilies } from "../shared/compactCatalog";

describe("compact catalog category links", () => {
  const items = [
    { category: "Gift cards", name: "FoxReload catalog", product: "Steam Wallet 25 USD" },
    { category: "Gift cards", name: "FoxReload catalog", product: "Steam Wallet 25 USD" },
    { category: "Subscription", name: "FoxReload catalog", product: "Netflix 25 EUR" },
    { category: "Top-up", name: "PUBG Mobile", product: "60 UC" },
  ];

  it("returns only unique labels from the selected synchronized category", () => {
    expect(categoryQuickLinks(items, "Gift cards")).toEqual(["Steam Wallet 25 USD"]);
    expect(categoryQuickLinks(items, "Subscription")).toEqual(["Netflix 25 EUR"]);
  });

  it("uses product families rather than denomination text for top-up menus", () => {
    expect(categoryQuickLinks(items, "Top-up")).toEqual(["PUBG Mobile"]);
  });

  it("shows one service per recognised game family before extra denominations", () => {
    const balanced = interleaveTopUpFamilies([
      { category: "Top-up", name: "Free Fire Global", product: "110 Diamonds" },
      { category: "Top-up", name: "Free Fire Global", product: "341 Diamonds" },
      { category: "Top-up", name: "PUBG Mobile", product: "60 UC" },
      { category: "Gift cards", name: "Steam", product: "Steam Wallet 10 USD" },
    ]);
    expect(balanced.map((item) => item.product)).toEqual(["110 Diamonds", "60 UC", "Steam Wallet 10 USD", "341 Diamonds"]);
  });
});
