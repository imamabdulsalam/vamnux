import { describe, expect, it } from "vitest";
import { decodeDigitalProductSegment, digitalProductPath } from "./catalogRoutes";

describe("digital catalog routes", () => {
  it("encodes and decodes a supplier product slug", () => {
    const path = digitalProductPath("fr-netflix-gift-card-50-usd");
    expect(path).toBe("/products/fr-netflix-gift-card-50-usd");
    expect(decodeDigitalProductSegment(path.split("/").at(-1))).toBe("fr-netflix-gift-card-50-usd");
  });

  it("rejects an invalid encoded segment", () => {
    expect(decodeDigitalProductSegment("%E0%A4%A")).toBeNull();
  });
});
