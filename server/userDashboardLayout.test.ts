import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/UserDashboard.tsx"), "utf8");
const textCaseCss = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/userDashboardTextCase.css"), "utf8");

describe("VAMNUX User Dashboard layout", () => {
  it("keeps the requested account-control navigation available", () => {
    for (const label of ["Dashboard", "Catalogs", "Wallet", "Favorites", "Order history", "Referral", "Subscribe", "Request", "Account settings", "Support"]) {
      expect(source).toContain(`label: "${label}"`);
    }

    for (const label of ["Profile", "Notifications", "Security", "Preferences", "Privacy"]) {
      expect(source).toContain(`"${label}"`);
    }
  });

  it("derives overview metrics from authenticated customer records rather than placeholders", () => {
    expect(source).toContain("data.wallet.availableBalance");
    expect(source).toContain("orderStats.total");
    expect(source).toContain("orderStats.completed");
    expect(source).toContain("data.tickets.filter");
    expect(source).toContain("Referral program not active");
    expect(source).toContain("data.subscription.status");
    expect(source).toContain("data.productRequests");
    expect(source).toContain("user-mobile-menu-trigger");
    expect(source).toContain("user-mobile-feature-menu");
    expect(source).toContain("selectDashboardTab");
    expect(source).toContain("mobileMenuOpen");
  });

  it("uses readable title and sentence case for dashboard navigation and Favorites content", () => {
    expect(source).toContain('import "./userDashboardTextCase.css";');
    expect(textCaseCss).toContain(".user-dashboard-shell .user-sidebar nav button");
    expect(textCaseCss).toContain(".user-dashboard-shell .user-panel-heading h2");
    expect(textCaseCss).toContain("text-transform: none;");
    expect(textCaseCss).toContain("text-transform: lowercase;");
    expect(textCaseCss).toContain("::first-letter");
  });
});
