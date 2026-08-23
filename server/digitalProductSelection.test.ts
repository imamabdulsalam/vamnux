import { describe, expect, it } from "vitest";

describe("digital product selection layout", () => {
  it("keeps non-game catalog listings in the same selected-item format used for denomination families", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../client/src/pages/DigitalProductDetail.tsx", import.meta.url), "utf8"));
    expect(source).toContain("family-denomination-grid");
    expect(source).toContain("family-selection-summary");
    expect(source).toContain("setSelectedServiceId");
    expect(source).toContain("Saved selection only. Payment, wallet funding, automatic ordering, and delivery remain inactive.");
  });
});
