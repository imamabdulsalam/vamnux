import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

describe("storefront trust section", () => {
  it("explains practical trust signals without claiming inactive payments or supplier fulfilment are live", () => {
    expect(homeSource).toContain('className="why-vamnux-section"');
    expect(homeSource).toContain("PAYMENT READINESS");
    expect(homeSource).toContain("DIGITAL ORDER FLOW");
    expect(homeSource).toContain("TRANSPARENT PRICING");
    expect(homeSource).toContain("ORDER VISIBILITY");
    expect(homeSource).toContain("CUSTOMER SUPPORT");
    expect(homeSource).toContain("only through configured supported providers");
    expect(homeSource).toContain("only after payment and supplier operations are approved");
  });
});
