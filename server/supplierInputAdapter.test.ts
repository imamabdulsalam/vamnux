import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MOBILE_LEGENDS_ADAPTER_PROFILES, normalizeSupplierStatus, simulateSupplierInputAdapter, SUPPLIER_INPUT_ADAPTER_MODE } from "../shared/supplierInputAdapter";

const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const adapterSource = readFileSync(new URL("../shared/supplierInputAdapter.ts", import.meta.url), "utf8");
const uiSource = readFileSync(new URL("../client/src/components/AdminSupplierInputAdapter.tsx", import.meta.url), "utf8");

describe("Step 10C supplier input adapter simulation", () => {
  it("covers exactly the twenty reviewed Mobile Legends pairs without creating mappings", () => {
    expect(MOBILE_LEGENDS_ADAPTER_PROFILES).toHaveLength(20);
    expect(new Set(MOBILE_LEGENDS_ADAPTER_PROFILES.map((profile) => profile.market))).toEqual(new Set(["GLOBAL", "RUSSIA"]));
    expect(adapterSource).toContain('SUPPLIER_INPUT_ADAPTER_MODE = "SIMULATION_ONLY"');
    expect(adapterSource).not.toContain("fetch(");
    expect(adapterSource).not.toContain("axios.");
    expect(adapterSource).not.toContain("db.insert(");
  });

  it("maps canonical player and server inputs to distinct supplier-native preview fields only", () => {
    const profile = MOBILE_LEGENDS_ADAPTER_PROFILES[0]!;
    const preview = simulateSupplierInputAdapter({
      pairId: profile.pairId,
      canonicalInput: { gameUserId: "Player_123", serverId: "Zone-9", region: profile.market, productId: profile.canonicalProductId, denomination: profile.denomination },
    });
    expect(preview.mode).toBe(SUPPLIER_INPUT_ADAPTER_MODE);
    expect(preview.liveRequestBlocked).toBe(true);
    expect(preview.canProceedToFuturePreflight).toBe(true);
    expect(preview.requestPreviews.flashtopup.body).toMatchObject({ user_id: "Player_123", server_id: "Zone-9", validation_code: profile.flashTopUp.validationCode });
    expect(preview.requestPreviews.gamesdrop.body).toMatchObject({ offerId: profile.gamesDrop.offerId, customer: { gameUserId: "Player_123", gameServerId: "Zone-9" } });
    expect(preview.requestPreviews.gamesdrop.body).toMatchObject({ transactionId: "SIMULATION_ONLY" });
  });

  it("blocks mismatched pilot product and market inputs before any future preflight", () => {
    const profile = MOBILE_LEGENDS_ADAPTER_PROFILES[0]!;
    const preview = simulateSupplierInputAdapter({
      pairId: profile.pairId,
      canonicalInput: { gameUserId: "x", serverId: "", region: "RUSSIA", productId: "wrong-product", denomination: "999" },
    });
    expect(preview.canProceedToFuturePreflight).toBe(false);
    expect(preview.validationIssues.filter((issue) => issue.severity === "error").map((issue) => issue.field)).toEqual(expect.arrayContaining(["gameUserId", "serverId", "region", "productId", "denomination"]));
  });

  it("preserves supplier-native status semantics in explicit VAMNUX lifecycle mappings", () => {
    expect(normalizeSupplierStatus("flashtopup", "SUCCESS")).toBe("COMPLETED");
    expect(normalizeSupplierStatus("flashtopup", "PROCESSING")).toBe("SUPPLIER_PROCESSING");
    expect(normalizeSupplierStatus("gamesdrop", "SUBMITTED")).toBe("SUPPLIER_SUBMITTED");
    expect(normalizeSupplierStatus("gamesdrop", "REFUND")).toBe("REFUNDED");
    expect(normalizeSupplierStatus("gamesdrop", "CANCELED")).toBe("CANCELLED");
  });

  it("exposes simulation functions only to owner-protected Admin procedures and visibly blocks live action", () => {
    expect(routerSource).toContain("listSupplierInputAdapterProfiles: adminProcedure");
    expect(routerSource).toContain("previewSupplierInputAdapter: adminProcedure.input");
    expect(routerSource).toContain("supplierAdapterCanonicalInputSchema");
    expect(uiSource).toContain("SIMULATION ONLY · LIVE ACTIONS BLOCKED");
    expect(uiSource).toContain("previewSupplierInputAdapter.useMutation");
    expect(uiSource).not.toContain("fetch(");
  });
});
