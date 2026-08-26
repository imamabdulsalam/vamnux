import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { calculateCustomerDisplayPrice } from "../shared/pricing";
import { FoxReloadClient } from "./integrations/foxreload";

describe("USD Steam Top-Up safety boundaries", () => {
  it("recalculates a customer-only price whenever the global VAMNUX markup changes", () => {
    const baseRule = { supplierBasePrice: 0.95, markupPercentOverride: null, displayPriceOverride: null };
    expect(calculateCustomerDisplayPrice({ ...baseRule, defaultMarkupPercent: 25 })).toBe(1.19);
    expect(calculateCustomerDisplayPrice({ ...baseRule, defaultMarkupPercent: 10 })).toBe(1.05);
    expect(calculateCustomerDisplayPrice({ ...baseRule, defaultMarkupPercent: 40 })).toBe(1.33);
  });

  it("reads the verified FoxReload product through USD context without creating an order", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "product_01kjp6vtmjf8rbbxw88719wz3b",
      name: "$1 Steam top up",
      slug: "steam-steam-balance-top-up-steam-top-up-1",
      categoryId: "019cac6d-ea66-7683-bdf4-c88098cdeaa0",
      price: "0.9549",
      currency: "usd",
      quantity: 99,
      orderMinQuantity: 1,
      orderMaxQuantity: 300,
      requiredNoteFields: ["login"],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new FoxReloadClient({ apiKey: "test-key" });
    const product = await client.product("product_01kjp6vtmjf8rbbxw88719wz3b");
    expect(product.currency).toBe("usd");
    expect(product.requiredNoteFields).toEqual(["login"]);
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/products/product_01kjp6vtmjf8rbbxw88719wz3b");
    expect(request.method).toBeUndefined();
    expect(request.headers).toMatchObject({ "X-Currency": "usd" });
    vi.unstubAllGlobals();
  });

  it("keeps the wallet-preparation contract scoped to the verified source and blocks supplier payment/submission", async () => {
    const [dbSource, routerSource, pageSource, catalogSource] = await Promise.all([
      readFile(new URL("./db.ts", import.meta.url), "utf8"),
      readFile(new URL("./routers.ts", import.meta.url), "utf8"),
      readFile(new URL("../client/src/pages/SteamTopUp.tsx", import.meta.url), "utf8"),
      readFile(new URL("../client/src/pages/CatalogPage.tsx", import.meta.url), "utf8"),
    ]);
    expect(dbSource).toContain('const FOXRELOAD_USD_STEAM_TOP_UP_PRODUCT_ID = "product_01kjp6vtmjf8rbbxw88719wz3b"');
    expect(dbSource).toContain("const settings = await ensureMarketplacePricingSettings(db)");
    expect(dbSource).toContain("calculateCustomerDisplayPrice(priceRule)");
    expect(dbSource).toContain('orderId: null');
    expect(dbSource).toContain('productId: null');
    expect(dbSource).toContain('if (login.length < 2 || login.length > 160 || /[\\r\\n\\t]/.test(login))');
    expect(dbSource).toContain('eq(steamTopUpCheckoutSessions.idempotencyKey, idempotencyKey)');
    expect(dbSource).toContain('if (existing) return { orderCode: `STEAM-${existing.id}`');
    expect(dbSource).toContain('walletCanCoverOrder');
    expect(dbSource).toContain('status: "prepared"');
    expect(dbSource).not.toContain('"/api/orders/"');
    expect(dbSource).not.toContain('"/api/orders/{order_id}/pay"');
    expect(routerSource).toContain("steamTopUpQuote: customerProcedure.query");
    expect(routerSource).toContain("prepareSteamTopUpWalletOrder");
    expect(pageSource).toContain("Steam account login");
    expect(pageSource).toContain("No wallet debit, supplier payment, or Steam top-up has been submitted");
    expect(pageSource).toContain('<strong>USD</strong>');
    expect(pageSource).toContain("[5, 10, 25, 50, 100]");
    expect(pageSource).toContain('placeholder="account_name"');
    expect(pageSource).toContain("TOP-UP AMOUNT");
    expect(pageSource).not.toContain("FoxReload");
    expect(pageSource).not.toContain("FOXRELOAD");
    expect(pageSource).toContain('setLocation("/catalog")');
    expect(pageSource).toContain("All product catalogs");
    expect(catalogSource).toContain('if (next === "Steam Top-Up")');
    expect(catalogSource).toContain('setLocation("/steam-top-up")');
    expect(catalogSource).toContain('if (category === "Steam Top-Up") setLocation("/steam-top-up")');
  });
});
