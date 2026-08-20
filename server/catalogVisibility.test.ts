import { describe, expect, it } from "vitest";
import { filterGameFamiliesForScope, filterPrimaryMarketProducts, isNigeriaPriorityFamily } from "../shared/catalogVisibility";

describe("Nigeria-priority catalog visibility", () => {
  it("prioritises real relevant or globally-labelled active families without making an eligibility claim", () => {
    expect(isNigeriaPriorityFamily("PUBG Mobile")).toBe(true);
    expect(isNigeriaPriorityFamily("Free Fire Global")).toBe(true);
    expect(isNigeriaPriorityFamily("Mobile Legends Global")).toBe(true);
    expect(isNigeriaPriorityFamily("Arena Breakout")).toBe(true);
  });

  it("hides explicitly other-market families from the Nigeria default while retaining them in the all-supplier view", () => {
    const families = [{ name: "PUBG Mobile" }, { name: "Free Fire Indonesia" }, { name: "Valorant Philippines" }];
    expect(filterGameFamiliesForScope(families, "curated")).toEqual([{ name: "PUBG Mobile" }]);
    expect(filterGameFamiliesForScope(families, "all")).toEqual(families);
  });

  it("keeps only verified curated top-up families in the primary public catalogue", () => {
    const products = [
      { category: "Top-up", name: "Free Fire Global" },
      { category: "Top-up", name: "Free Fire Indonesia" },
      { category: "Subscription", name: "Spotify Premium Brazil — 1 month" },
      { category: "Voucher", name: "Steam Wallet Top Up | CIS" },
    ];
    expect(filterPrimaryMarketProducts(products)).toEqual([{ category: "Top-up", name: "Free Fire Global" }]);
  });
});
