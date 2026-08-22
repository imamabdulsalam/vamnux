import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const adminSource = fs.readFileSync(path.join(root, "client/src/pages/SuperAdmin.tsx"), "utf8");
const cardSource = fs.readFileSync(path.join(root, "client/src/components/ExchangeRateQuickCards.tsx"), "utf8");

describe("VAMNUX Exchange Rate quick cards", () => {
  it("appends USD rate cards to the existing Exchange Rate workspace without replacing it", () => {
    expect(adminSource).toContain("{renderExchangeRateOperations()}<ExchangeRateQuickCards />");
    expect(cardSource).toContain('quoteCurrency: "NGN"');
    expect(cardSource).toContain('quoteCurrency: "EUR"');
    expect(cardSource).toContain('quoteCurrency: "GBP"');
  });

  it("uses the existing protected upsert procedure and keeps automatic conversion inactive", () => {
    expect(cardSource).toContain("trpc.admin.upsertExchangeRate.useMutation");
    expect(cardSource).toContain("baseCurrency: \"USD\"");
    expect(cardSource).toContain("does not automatically change storefront pricing");
  });
});
