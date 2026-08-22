import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const publicInfoSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/PublicInformationPage.tsx"), "utf8");
const dashboardSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/UserDashboard.tsx"), "utf8");
const homeSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
const appSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/App.tsx"), "utf8");

describe("VAMNUX catalog navigation", () => {
  it("routes public Browse, Explore, and View All product actions to the focused catalog", () => {
    expect(publicInfoSource).toContain('const CATALOG_HREF = "/?category=All#products"');
    expect(publicInfoSource).toContain('<Link href={CATALOG_HREF}>Browse products</Link>');
    expect(publicInfoSource).toContain('href={CATALOG_HREF}>Browse all active products');
    expect(publicInfoSource).toContain('href={CATALOG_HREF}>View all products');
    expect(publicInfoSource).toContain('href={CATALOG_HREF} className="info-primary-action">Explore products');
  });

  it("routes dashboard catalog actions and legacy product routes to the same searchable catalog", () => {
    expect(dashboardSource).toContain('"/?category=All#products"');
    expect(dashboardSource).toContain('"/?category=Top-up#products"');
    expect(dashboardSource).toContain('"/?category=Subscription#products"');
    expect(appSource).toContain("function CatalogRedirect()");
    expect(appSource).toContain('setLocation("/?category=All#products", { replace: true })');
    expect(appSource).toContain('<Route path="/products" component={CatalogRedirect} />');
  });

  it("reveals the in-page catalog and focuses its search for storefront browsing actions", () => {
    expect(homeSource).toContain("const revealCatalog = (focusSearch = false)");
    expect(homeSource).toContain('setActiveCategory("All"); setQuery(""); revealCatalog(true);');
    expect(homeSource).toContain('window.requestAnimationFrame(() => revealCatalog(true))');
    expect(homeSource).toContain('catalogSearchRef.current?.focus({ preventScroll: true })');
  });
});
