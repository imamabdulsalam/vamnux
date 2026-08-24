import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const uiSource = readFileSync(resolve(root, "client/src/components/AdminSupplierManagement.tsx"), "utf8");

describe("Supplier Management foundation", () => {
  it("keeps supplier management additive and avoids catalog routing or credential exposure", () => {
    expect(dbSource).toContain("supplierManagementProfiles");
    expect(dbSource).toContain("supplierHealthChecks");
    expect(dbSource).toContain("No live supplier request or commercial operation was made.");
    expect(dbSource).not.toContain("supplier_api_secret");
    expect(uiSource).toContain("Configured server-side");
    expect(uiSource).toContain("Supported categories");
    expect(uiSource).not.toContain("Success rate");
    expect(uiSource).not.toContain("Supplier balance");
    expect(uiSource).toContain("does not route orders");
    expect(routerSource).toContain("listSupplierManagement");
    expect(routerSource).toContain("testSupplierManagementConnection");
  });
});
