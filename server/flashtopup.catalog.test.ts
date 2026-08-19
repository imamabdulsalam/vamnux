import { describe, expect, it } from "vitest";
import { getFlashTopUpClient } from "./integrations/flashtopup";

const describeLive = process.env.RUN_FLASHTOPUP_LIVE_TESTS === "true" ? describe : describe.skip;

describeLive("FlashTopUp catalog contract", () => {
  it("retrieves one authenticated product page without creating a transaction", async () => {
    const response = await getFlashTopUpClient().products({ page: 1, perPage: 500 });
    expect(response.status === true || response.success === true).toBe(true);
    expect(Array.isArray(response.data)).toBe(true);
    console.info("[FlashTopUp catalog] products returned on first page:", response.data?.length ?? 0);
    const firstProduct = response.data?.[0] as Record<string, unknown> | undefined;
    expect(firstProduct).toBeDefined();
    console.info("[FlashTopUp catalog] first product fields:", Object.keys(firstProduct ?? {}).sort().join(","));
    const inputFields = firstProduct?.fields;
    const firstInput = Array.isArray(inputFields) ? inputFields[0] as Record<string, unknown> | undefined : undefined;
    console.info("[FlashTopUp catalog] product input-field shape:", firstInput ? Object.keys(firstInput).sort().join(",") : "none");

    const productCode = firstProduct?.product_code;
    const productType = firstProduct?.product_type;
    expect(typeof productCode).toBe("string");
    expect(typeof productType).toBe("string");
    const services = await getFlashTopUpClient().services({
      productCode: productCode as string,
      productType: productType as string,
      page: 1,
      perPage: 1,
    });
    expect(services.status === true || services.success === true).toBe(true);
    const servicePage = services.data;
    const servicePageKeys = servicePage && typeof servicePage === "object" && !Array.isArray(servicePage)
      ? Object.keys(servicePage as Record<string, unknown>).sort().join(",")
      : "array";
    console.info("[FlashTopUp catalog] service response fields:", servicePageKeys);
    const serviceItems = (servicePage as { service?: unknown[] } | undefined)?.service;
    expect(Array.isArray(serviceItems)).toBe(true);
    const firstService = serviceItems?.[0] as Record<string, unknown> | undefined;
    expect(firstService).toBeDefined();
    console.info("[FlashTopUp catalog] first service fields:", Object.keys(firstService ?? {}).sort().join(","));
    expect(servicePage).toBeDefined();
  }, 20_000);
});
