import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const helpSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/lib/helpCenter.ts"), "utf8");
const publicInfoSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/PublicInformationPage.tsx"), "utf8");
const searchSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/components/UniversalMarketplaceSearch.tsx"), "utf8");

describe("VAMNUX Help Centre", () => {
  it("covers the owner-requested help topics with capability-accurate guidance", () => {
    ["Orders & Products", "Payments & Wallet", "Gift Cards & Game Keys", "Game Top-Up", "Account & Security", "Subscriptions & Software"].forEach((section) => expect(helpSource).toContain(section));
    const normalizedHelpSource = helpSource.toLowerCase();
    ["pubg uc", "gift card", "refund", "player id", "reset my password", "activate software"].forEach((keyword) => expect(normalizedHelpSource).toContain(keyword));
    expect(helpSource).toContain("only after a provider has been integrated, verified, and activated");
    expect(helpSource).toContain("password-recovery email is not available until transactional email is configured");
  });

  it("keeps help escalation inside private VAMNUX support and order views", () => {
    expect(publicInfoSource).toContain("Can’t find the answer you’re looking for?");
    expect(publicInfoSource).toContain('href="/support"');
    expect(publicInfoSource).toContain('href="/track-order"');
    expect(publicInfoSource).toContain("SupportAction ticket={true}");
  });

  it("adds matching Help Centre answers to universal search", () => {
    expect(searchSource).toContain('import { helpArticles } from "@/lib/helpCenter"');
    expect(searchSource).toContain('group: "Help Centre" as const');
    expect(searchSource).toContain('onNavigate(`/help?q=${encodeURIComponent(article.keywords[0] || article.question)}`)');
    expect(searchSource).toContain('const groups = ["Products", "Categories", "Help Centre", "Help & pages"]');
  });
});
