import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const checkoutSources = [
  "client/src/pages/Home.tsx",
  "client/src/pages/DigitalProductDetail.tsx",
  "client/src/pages/GameFamilyDetail.tsx",
  "client/src/pages/SteamTopUp.tsx",
].map((path) => readFileSync(resolve(process.cwd(), path), "utf8"));

describe("customer checkout consent recovery", () => {
  it("routes every checkout surface to the existing Account settings acceptance control before a known missing-consent mutation error", () => {
    for (const source of checkoutSources) {
      expect(source).toContain("const redirectToTermsPrivacyAcceptance");
      expect(source).toContain('setLocation("/account?tab=settings")');
      expect(source).toContain("Accept the current Terms & Privacy to continue.");
      expect(source).toContain('error.message.includes("Accept the current VAMNUX Terms and Privacy")');
      expect(source).toContain("termsPrivacyAccepted");
    }
  });
});
