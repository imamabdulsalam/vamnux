import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const policySource = readFileSync(resolve(process.cwd(), "client/src/pages/PolicyPage.tsx"), "utf8");
const routeSource = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
const footerSource = readFileSync(resolve(process.cwd(), "client/src/components/FooterNavigation.tsx"), "utf8");
const adminSource = readFileSync(resolve(process.cwd(), "client/src/pages/SuperAdmin.tsx"), "utf8");
const policyManagerSource = readFileSync(resolve(process.cwd(), "client/src/components/AdminPolicyManager.tsx"), "utf8");

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
    expect(policySource).not.toContain("Owner-provided legal draft");
    expect(policySource).not.toContain("Draft · Legal review required");
  });

  it("provides an Admin-only final Policy workspace with editable content and audited saves", () => {
    expect(adminSource).toContain('{ id: "policy", label: "Policy", icon: FileText }');
    expect(adminSource).toContain('activeTab === "policy" ? <AdminPolicyManager />');
    expect(policyManagerSource).toContain("trpc.admin.listPolicyPages.useQuery");
    expect(policyManagerSource).toContain("trpc.admin.updatePolicyPage.useMutation");
    expect(policyManagerSource).toContain("Save policy");
    expect(policyManagerSource).toContain("Admin only");
  });
});
