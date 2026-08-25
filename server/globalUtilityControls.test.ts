import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync("/home/ubuntu/naijaplay-store/client/src/App.tsx", "utf8");
const controlsSource = readFileSync("/home/ubuntu/naijaplay-store/client/src/components/GlobalUtilityControls.tsx", "utf8");
const themeSource = readFileSync("/home/ubuntu/naijaplay-store/client/src/contexts/ThemeContext.tsx", "utf8");

describe("persistent VAMNUX utility controls", () => {
  it("mounts theme, currency, and cart controls above every routed page", () => {
    expect(appSource).toContain("<GlobalUtilityControls />");
    expect(controlsSource).toContain("vamnux-global-utilities");
    expect(controlsSource).toContain("vamnux-utility-currency");
    expect(controlsSource).toContain("vamnux-utility-cart");
  });

  it("keeps the global theme control functional", () => {
    expect(themeSource).toContain("switchable = true");
    expect(controlsSource).toContain("toggleTheme");
  });
});
