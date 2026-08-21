import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const homeSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

describe("VAMNUX storefront footer", () => {
  it("includes the requested marketplace columns and real published legal policy routes", () => {
    for (const heading of ["Company", "Products", "Support", "Legal", "Follow VAMNUX"]) {
      expect(homeSource).toContain(`>${heading}<`);
    }

    for (const route of ["/policies/terms-of-service", "/policies/privacy-policy", "/policies/cookie-policy", "/policies/refund-policy"]) {
      expect(homeSource).toContain(route);
    }
  });

  it("does not misrepresent unconfigured payment providers as active checkout methods", () => {
    expect(homeSource).toContain("Wallet funding readiness");
    expect(homeSource).toContain("does not present any as an active checkout method");
    expect(homeSource).toContain("Paystack");
    expect(homeSource).toContain("Korapay");
    expect(homeSource).toContain("TRC20");
  });
});
