import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { FoxReloadClient } from "./integrations/foxreload";

describe("USD Steam Top-Up safety boundaries", () => {
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
    expect(dbSource).toContain('eq(products.category, "steam_top_up")');
    expect(dbSource).toContain('eq(products.baseCurrency, "USD")');
    expect(dbSource).toContain('eq(products.supplierCurrency, "USD")');
    expect(dbSource).toContain('createFulfillmentFieldKey(quote.productId, "login")');
    expect(dbSource).toContain('status: "prepared"');
    expect(dbSource).not.toContain('"/api/orders/"');
    expect(dbSource).not.toContain('"/api/orders/{order_id}/pay"');
    expect(routerSource).toContain("steamTopUpQuote: customerProcedure.query");
    expect(routerSource).toContain("prepareSteamTopUpWalletOrder");
    expect(pageSource).toContain("Steam account login");
    expect(pageSource).toContain("No wallet debit, supplier payment, or Steam top-up has been submitted");
    expect(catalogSource).toContain('if (product.id === 390015) return "/steam-top-up"');
  });
});
