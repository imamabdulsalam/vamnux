import { describe, expect, it } from "vitest";
import { calculateOrderTotal, createFulfillmentFieldKey, createOrderCode } from "../shared/marketplace";

describe("VAMNUX marketplace helpers", () => {
  it("calculates a server-side order total from quantity and unit price", () => {
    expect(calculateOrderTotal([
      { productId: 1, quantity: 2, unitPrice: 3.5 },
      { productId: 2, quantity: 1, unitPrice: 20 },
    ])).toBe(27);
  });

  it("creates a compact VAMNUX order code", () => {
    expect(createOrderCode(1_700_000_000_000, 0.5)).toMatch(/^VN-[A-Z0-9]{6}-[A-Z0-9]{4}$/);
  });

  it("namespaces supplier field values by product ID for multi-item draft orders", () => {
    expect(createFulfillmentFieldKey(42, "player_id")).toBe("42.player_id");
  });
});
