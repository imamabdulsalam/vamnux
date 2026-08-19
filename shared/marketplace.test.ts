import { describe, expect, it } from "vitest";
import { calculateOrderTotal, createOrderCode } from "./marketplace";

describe("marketplace pricing helpers", () => {
  it("calculates a server-side line total from quantities and unit prices", () => {
    expect(calculateOrderTotal([
      { productId: 1, quantity: 2, unitPrice: 3.5 },
      { productId: 2, quantity: 1, unitPrice: 20 },
    ])).toBe(27);
  });

  it("creates compact VAMNUX order references", () => {
    expect(createOrderCode(1_700_000_000_000, 0.5)).toMatch(/^VN-[A-Z0-9]{6}-[A-Z0-9]{4}$/);
  });
});
