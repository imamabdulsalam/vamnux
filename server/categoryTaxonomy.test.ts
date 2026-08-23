import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_MARKETPLACE_CATEGORIES } from "./db";

const homeSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
const dashboardSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/UserDashboard.tsx"), "utf8");
const adminSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/components/ManualDeliveryProductSetup.tsx"), "utf8");

describe("VAMNUX Games and Steam Top-Up taxonomy", () => {
  it("uses Games and Steam Top-Up across the shared storefront, dashboard, and Admin category surfaces", () => {
    expect(DEFAULT_MARKETPLACE_CATEGORIES).toEqual(expect.arrayContaining([
      expect.objectContaining({ slug: "games", name: "Games" }),
      expect.objectContaining({ slug: "steam-top-up", name: "Steam Top-Up" }),
    ]));
    expect(homeSource).toContain('label: "Games"');
    expect(homeSource).toContain('label: "Steam Top-Up"');
    expect(dashboardSource).toContain('games: "/?category=Games#products"');
    expect(dashboardSource).toContain('"steam-top-up": "/?category=Steam%20Top-Up#products"');
    expect(adminSource).toContain('<option value="steam">Games</option>');
    expect(adminSource).toContain('<option value="steam_top_up">Steam Top-Up</option>');
  });

  it("does not keep Voucher as an active storefront category choice", () => {
    expect(homeSource).not.toContain('"Voucher" as ProductCategory');
    expect(homeSource).toContain('requestedCategory === "Voucher" ? "Gift cards"');
  });
});
