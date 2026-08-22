import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/PublicInformationPage.tsx"), "utf8");

describe("VAMNUX About Us page", () => {
  it("presents the owner-requested marketplace story and product categories", () => {
    [
      "Digital Products. Simple. Secure. Accessible.",
      "Everything Digital, In One Place",
      "Fast Digital Fulfillment",
      "Security You Can Rely On",
      "Built for the Digital Generation",
      "Our Vision",
      "Why VAMNUX?",
      "game top-ups and gaming vouchers",
      "gift cards, game keys, subscriptions, software, and AI tools",
    ].forEach((content) => expect(pageSource).toContain(content));
  });

  it("keeps fulfillment and payment language aligned with active capability boundaries", () => {
    expect(pageSource).toContain("When the relevant payment and supplier operations are verified and active");
    expect(pageSource).toContain("shown only after their integrations have been verified and activated");
    expect(pageSource).toContain("Funding methods appear only after their supported provider integration is active.");
  });

  it("uses internal Explore Products and Create Account calls to action", () => {
    expect(pageSource).toContain('if (definition.kind === "about")');
    expect(pageSource).toContain('href={CATALOG_HREF} className="info-primary-action">Explore products');
    expect(pageSource).toContain('href="/login?mode=signup" className="info-secondary-action">Create account');
  });
});
