import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const footerSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/components/FooterNavigation.tsx"), "utf8");
const appSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/App.tsx"), "utf8");
const homeSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

describe("VAMNUX storefront footer", () => {
  it("includes the requested marketplace columns and concrete VAMNUX destinations", () => {
    for (const heading of ["Company", "Products", "Support", "Legal", "Follow VAMNUX"]) {
      expect(footerSource).toContain(heading === "Follow VAMNUX" ? `>${heading}<` : `title="${heading}"`);
    }
    const routes = ["/about", "/contact", "/help", "/faq", "/support", "/track-order", "/support/ticket", "/terms", "/privacy", "/cookies", "/refund-policy", "/payment-policy", "/delivery-policy", "/acceptable-use"];
    for (const route of routes) {
      expect(footerSource).toContain(route);
      expect(appSource).toContain(`path="${route}"`);
    }
    expect(footerSource).toContain('["Why Us", "/#why-us"]');
    expect(footerSource).toContain('["Sign Up", "/login?mode=signup"]');
    expect(footerSource).not.toContain('["Blog", "/blog"]');
    expect(footerSource).not.toContain('["Become a Reseller", "/reseller"]');
    expect(footerSource).not.toContain('["Affiliate Program", "/affiliate"]');
  });

  it("returns every footer product link to the matching filtered catalog section", () => {
    ["/?category=Top-up#products", "/?category=Voucher#products", "/?category=Subscription#products", "/?category=AI%20tools#products", "/?category=All#products"].forEach((href) => expect(footerSource).toContain(href));
    expect(footerSource).toContain("key={`${title}-${label}`}");
    expect(footerSource).not.toContain("key={href}");
    expect(footerSource).toContain('new CustomEvent("vamnux:catalog-filter"');
    expect(footerSource).toContain("window.history.replaceState(null, \"\", `${catalogPath.pathname}${catalogPath.search}`)");
    expect(footerSource).toContain('window.location.hash = "products"');
    expect(homeSource).toContain('const routeParams = new URLSearchParams(window.location.search)');
    expect(homeSource).toContain('const requestedCategory = routeParams.get("category")');
    expect(homeSource).toContain("useLayoutEffect(() =>");
    expect(homeSource).toContain("const revealCatalog = (focusSearch = false)");
    expect(homeSource).toContain("window.scrollTo({ top: targetTop, behavior: \"auto\" })");
    expect(homeSource).toContain('window.addEventListener("vamnux:catalog-filter"');
    expect(homeSource).toContain("catalogSearchRef.current?.focus");
    expect(homeSource).toContain("if (!publicCategories.data) return;");
  });

  it("opens every non-catalog internal footer route at the top of its destination page", () => {
    expect(appSource).toContain("function RoutePositionReset()");
    expect(appSource).toContain('if (location === "/" && ["products", "why-us"].includes(window.location.hash)) return;');
    expect(appSource).toContain('window.scrollTo({ top: 0, left: 0, behavior: "auto" })');
    expect(appSource).toContain("<RoutePositionReset />");
  });

  it("reveals Why Us immediately and routes Sign Up to normal registration", () => {
    expect(footerSource).toContain('new Event("vamnux:why-us")');
    expect(footerSource).toContain('window.history.replaceState(null, "", "/#why-us")');
    expect(homeSource).toContain('routeParams.get("section") === "why-us" || window.location.hash === "#why-us"');
    expect(homeSource).toContain('window.addEventListener("vamnux:why-us", revealWhyUs)');
    expect(homeSource).toContain('<section id="why-us" className="why-vamnux-section"');
  });

  it("does not misrepresent unconfigured payment providers as active checkout methods", () => {
    expect(footerSource).toContain("Payment readiness");
    expect(footerSource).toContain("only after their provider integration and verification are active");
    expect(footerSource).toContain("Paystack");
    expect(footerSource).toContain("Korapay");
    expect(footerSource).toContain("TRC20");
  });
});
