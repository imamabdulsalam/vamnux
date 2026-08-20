import { describe, expect, it } from "vitest";
import { categoryQuickLinks } from "../shared/compactCatalog";

describe("compact catalog category links", () => {
  const items = [
    { category: "Voucher", name: "FoxReload catalog", product: "Steam Wallet 25 USD" },
    { category: "Voucher", name: "FoxReload catalog", product: "Steam Wallet 25 USD" },
    { category: "Subscription", name: "FoxReload catalog", product: "Netflix 25 EUR" },
    { category: "Top-up", name: "PUBG Mobile", product: "60 UC" },
  ];

  it("returns only unique labels from the selected synchronized category", () => {
    expect(categoryQuickLinks(items, "Voucher")).toEqual(["Steam Wallet 25 USD"]);
    expect(categoryQuickLinks(items, "Subscription")).toEqual(["Netflix 25 EUR"]);
  });

  it("uses product families rather than denomination text for top-up menus", () => {
    expect(categoryQuickLinks(items, "Top-up")).toEqual(["PUBG Mobile"]);
  });
});
