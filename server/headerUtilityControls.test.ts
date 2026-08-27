import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("shared USD and cart header utilities", () => {
  it("keeps the USD arrow on the home header and reserves non-home routes for USD and cart controls", async () => {
    const [homeSource, appSource, utilitySource, cssSource, viteBridgeSource] = await Promise.all([
      readFile(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8"),
      readFile(new URL("../client/src/App.tsx", import.meta.url), "utf8"),
      readFile(new URL("../client/src/components/GlobalUtilityControls.tsx", import.meta.url), "utf8"),
      readFile(new URL("../client/src/index.css", import.meta.url), "utf8"),
      readFile(new URL("./_core/vite.ts", import.meta.url), "utf8"),
    ]);

    expect(homeSource).toContain('className="currency-switcher-chevron"');
    expect(appSource).toContain("GlobalUtilityControls");
    expect(appSource).toContain('className={isHomeRoute ? undefined : "vamnux-utility-shell"}');
    expect(utilitySource).toContain("ChevronDown");
    expect(utilitySource).toContain("ShoppingBag");
    expect(utilitySource).toContain('aria-label="Display currency"');
    expect(utilitySource).toContain('<option value="USD">USD</option>');
    expect(utilitySource).toContain('<option value="EUR">EUR</option>');
    expect(utilitySource).toContain('<option value="GBP">GBP</option>');
    expect(utilitySource).toContain('<option value="NGN">NGN</option>');
    expect(utilitySource).toContain('aria-label="Open cart"');
    expect(cssSource).toContain(".vamnux-utility-shell{min-height:100vh;padding-top:58px}");
    expect(cssSource).toContain(".vamnux-utility-bar{position:absolute");
    expect(cssSource).toContain(".vamnux-utility-currency select{min-width:34px;appearance:none");
    expect(homeSource).toContain('className="header-signin"');
    expect(homeSource).toContain('className="header-create-account"');
    expect(homeSource).toContain('aria-label="Open account"');
    expect(cssSource).toContain(".global-marketplace .header-actions>.header-icon,.global-marketplace .header-actions>.header-auth-actions{display:inline-flex!important}");
    expect(cssSource).toContain(".global-marketplace .favourite-button{display:inline-flex!important;width:37px;padding:0}");
    expect(cssSource).toContain(".header-cart{display:inline-flex!important;width:39px;padding:0}");
    expect(cssSource).toContain(".header-cart span{display:none}");
    expect(viteBridgeSource).toContain('hmr: { server, protocol: "wss" as const, clientPort: 443 }');
  });
});
