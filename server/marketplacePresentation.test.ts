import { describe, expect, it } from "vitest";
import { groupLiveProductFamilies } from "../shared/marketplace";

describe("live marketplace product-family presentation", () => {
  it("groups multiple live denominations beneath one game identity without discarding individual services", () => {
    const groups = groupLiveProductFamilies([
      { id: 1, name: "Mobile Legends Global", image: "/ml.webp", category: "Top-up", denomination: "5 Diamonds" },
      { id: 2, name: "Mobile Legends Global", image: "/ml.webp", category: "Top-up", denomination: "85 Diamonds" },
      { id: 3, name: "PUBG Mobile", image: "/pubg.webp", category: "Top-up", denomination: "60 UC" },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ name: "Mobile Legends Global", image: "/ml.webp", category: "Top-up" });
    expect(groups[0]?.items.map((item) => item.denomination)).toEqual(["5 Diamonds", "85 Diamonds"]);
    expect(groups[1]?.items[0]?.denomination).toBe("60 UC");
  });
});
