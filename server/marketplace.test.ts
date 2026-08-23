import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { calculateOrderTotal, createFulfillmentFieldKey, createOrderCode } from "../shared/marketplace";

const homeSource = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/Home.tsx"), "utf8");

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

  it("uses customer-friendly storefront trust copy without exposing technical supplier operations", () => {
    expect(homeSource).toContain("SHOP WITH CONFIDENCE:");
    expect(homeSource).toContain("clear product details, requirements and transparent pricing");
    expect(homeSource).not.toContain("VAMNUX SUPPLIER NOTE:");
  });
});
