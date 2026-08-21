import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const footerSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/components/FooterNavigation.tsx"), "utf8");
const appSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/App.tsx"), "utf8");

describe("VAMNUX storefront footer", () => {
  it("includes the requested marketplace columns and concrete VAMNUX destinations", () => {
    for (const heading of ["Company", "Products", "Support", "Legal", "Follow VAMNUX"]) {
      expect(footerSource).toContain(heading === "Follow VAMNUX" ? `>${heading}<` : `title="${heading}"`);
    }

    const routes = ["/about", "/contact", "/blog", "/reseller", "/affiliate", "/game-top-up", "/gift-cards", "/gaming-vouchers", "/game-keys", "/subscriptions", "/ai-tools", "/deals", "/products", "/help", "/faq", "/support", "/track-order", "/support/ticket", "/terms", "/privacy", "/cookies", "/refund-policy", "/payment-policy", "/delivery-policy", "/acceptable-use"];
    for (const route of routes) {
      expect(footerSource).toContain(route);
      expect(appSource).toContain(`path="${route}"`);
    }
  });

  it("does not misrepresent unconfigured payment providers as active checkout methods", () => {
    expect(footerSource).toContain("Payment readiness");
    expect(footerSource).toContain("only after their provider integration and verification are active");
    expect(footerSource).toContain("Paystack");
    expect(footerSource).toContain("Korapay");
    expect(footerSource).toContain("TRC20");
  });
});
