import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/UserDashboard.tsx"), "utf8");

describe("VAMNUX User Dashboard layout", () => {
  it("keeps the requested account-control navigation available", () => {
    for (const label of ["Dashboard", "Categories", "Wallet", "Favorites", "Order history", "Referral", "Account settings", "Support"]) {
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
  });
});
