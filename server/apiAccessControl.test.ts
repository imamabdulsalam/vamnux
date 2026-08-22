import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SUPPLIER_API_ACCESS_METADATA } from "../shared/supplierApiAccess";
import { getSafeSupplierApiAccessStatus } from "./apiAccessControl";

const root = path.resolve(import.meta.dirname, "..");
const componentSource = fs.readFileSync(path.join(root, "client/src/components/AdminApiAccessControl.tsx"), "utf8");
const serverSource = fs.readFileSync(path.join(root, "server/apiAccessControl.ts"), "utf8");
const routerSource = fs.readFileSync(path.join(root, "server/routers.ts"), "utf8");

describe("VAMNUX API Access Control", () => {
  it("contains only verified public supplier metadata and safe credential references", () => {
    expect(SUPPLIER_API_ACCESS_METADATA.map((supplier) => supplier.name)).toEqual(["GamesDrop", "FlashTopUp", "FoxReload"]);
    expect(SUPPLIER_API_ACCESS_METADATA.find((supplier) => supplier.key === "gamesdrop")?.documentationUrl).toBe("https://gamesdrop.io/en/docs/partner-api");
    expect(SUPPLIER_API_ACCESS_METADATA.find((supplier) => supplier.key === "flashtopup")?.documentationUrl).toBe("https://flashtopup.com/reseller/api-docs");
    expect(SUPPLIER_API_ACCESS_METADATA.find((supplier) => supplier.key === "foxreload")?.documentationUrl).toBe("https://public-api.foxreload.com/docs");
    expect(SUPPLIER_API_ACCESS_METADATA.find((supplier) => supplier.key === "gamesdrop")?.contacts).toContainEqual({ label: "Telegram", value: "@igoryan34", href: "https://t.me/igoryan34" });
  });

  it("returns only configuration booleans and never raw credential values", () => {
    const result = getSafeSupplierApiAccessStatus();
    expect(result).toHaveLength(3);
    expect(result.flatMap((supplier) => supplier.credentials).every((credential) => typeof credential.configured === "boolean" && credential.reference.length > 0)).toBe(true);
    expect(serverSource).toContain("Boolean(process.env[key])");
    expect(serverSource).not.toContain("value: process.env");
    expect(componentSource).not.toContain("process.env");
  });

  it("uses the protected Admin procedure and never presents a secret-copy action", () => {
    expect(routerSource).toContain("apiAccessControlStatus: adminProcedure.query");
    expect(componentSource).toContain("Secure configuration reference for");
    expect(componentSource).toContain("configuration reference");
    expect(componentSource).not.toContain("Copy API secret");
  });
});
