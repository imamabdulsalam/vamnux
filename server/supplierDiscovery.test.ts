import { describe, expect, it } from "vitest";
import { findPublicSupplierDiscoveryMatches, PUBLIC_FLASHTOPUP_DISCOVERY } from "../shared/supplierDiscovery";

describe("public FlashTopUp discovery records", () => {
  it("returns real Free Fire and PUBG Mobile catalogue families as awaiting synchronisation only", () => {
    const freeFire = findPublicSupplierDiscoveryMatches("free fire");
    const pubg = findPublicSupplierDiscoveryMatches("PUBG mobile");

    expect(freeFire.map((item) => item.name)).toEqual(["Free Fire LATAM", "Free Fire Global"]);
    expect(pubg.map((item) => item.name)).toEqual(["PUBG Mobile"]);
    expect([...freeFire, ...pubg].every((item) => item.availability === "awaiting_sync")).toBe(true);
  });

  it("keeps discovery references separate from catalog pricing and product identifiers", () => {
    expect(PUBLIC_FLASHTOPUP_DISCOVERY).toHaveLength(7);
    expect(PUBLIC_FLASHTOPUP_DISCOVERY.every((item) => item.href.startsWith("https://flashtopup.com/topup/"))).toBe(true);
    expect(PUBLIC_FLASHTOPUP_DISCOVERY.every((item) => !("price" in item) && !("productId" in item))).toBe(true);
  });
});
