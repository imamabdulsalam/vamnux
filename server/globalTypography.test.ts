import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globalStyles = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

describe("VAMNUX global typography", () => {
  it("uses the verified Bulnix-style Inter interface and Poppins heading families globally", () => {
    expect(globalStyles).toContain("family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700;800;900");
    expect(globalStyles).toContain('body,body * { font-family:"Inter",system-ui,sans-serif !important; }');
    expect(globalStyles).toContain('h1,h2,h3,h4,h5,h6 { font-family:"Poppins","Inter",sans-serif !important; }');
  });

  it("does not retain the prior Nunito Sans global font override", () => {
    expect(globalStyles).not.toContain('body,body * { font-family:"Nunito Sans",sans-serif !important; }');
  });
});
