import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const adminSource = fs.readFileSync(path.join(root, "client/src/pages/SuperAdmin.tsx"), "utf8");
const currencySource = fs.readFileSync(path.join(root, "client/src/components/AdminCurrencyManagement.tsx"), "utf8");

describe("VAMNUX Currency Management", () => {
  it("uses the approved Step 5 Currency Management workspace for the Exchange Rate Admin tab", () => {
    expect(adminSource).toContain('activeTab === "rates" ? <AdminCurrencyManagement />');
    expect(currencySource).toContain("VAMNUX_SUPPORTED_CURRENCIES");
    expect(currencySource).toContain("VAMNUX rate version");
    expect(currencySource).toContain("PREVIOUS EXCHANGE RATES");
  });

  it("uses protected currency procedures and keeps automatic repricing inactive", () => {
    expect(currencySource).toContain("trpc.admin.saveCurrencyRateVersion.useMutation");
    expect(currencySource).toContain("No automatic repricing");
    expect(currencySource).toContain("No external provider is contacted by this release.");
  });
});
