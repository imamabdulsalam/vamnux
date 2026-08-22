import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const policySource = readFileSync(resolve(process.cwd(), "client/src/pages/PolicyPage.tsx"), "utf8");
const routeSource = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
const footerSource = readFileSync(resolve(process.cwd(), "client/src/components/FooterNavigation.tsx"), "utf8");

describe("dedicated legal policy pages", () => {
  it("provides every requested policy as an internal dedicated route with a support-ticket action", () => {
    ["terms-of-service", "privacy-policy", "cookie-policy", "refund-policy", "payment-policy", "delivery-policy", "acceptable-use-policy"].forEach((slug) => expect(policySource).toContain(`slug: "${slug}"`));
    ["/terms", "/privacy", "/cookies", "/refund-policy", "/payment-policy", "/delivery-policy", "/acceptable-use"].forEach((path) => {
      expect(routeSource).toContain(`<Route path="${path}" component={PolicyPage} />`);
      expect(footerSource).toContain(`"${path}"`);
    });
    expect(policySource).toContain("Submit a ticket");
    expect(policySource).not.toContain("@YOURDOMAIN.com");
    expect(policySource).toContain("/account?tab=support");
  });
});
