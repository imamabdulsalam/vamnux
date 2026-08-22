import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const adminSource = fs.readFileSync(path.join(root, "client/src/pages/SuperAdmin.tsx"), "utf8");
const settingsSource = fs.readFileSync(path.join(root, "client/src/components/AdminSettingsWorkspace.tsx"), "utf8");

describe("VAMNUX Admin Settings workspace", () => {
  it("renames the Admin navigation to Settings and keeps structured owner profile fields", () => {
    expect(adminSource).toContain('{ id: "auth_settings", label: "Settings"');
    expect(settingsSource).toContain("General profile");
    expect(settingsSource).toContain("First name");
    expect(settingsSource).toContain("Recovery contact phone");
    expect(settingsSource).toContain("provider-managed sign-in email");
  });

  it("provides password reset readiness without native password storage or simulated updates", () => {
    expect(settingsSource).toContain("Continue securely to reset password");
    expect(settingsSource).toContain("VAMNUX does not store passwords");
    expect(settingsSource).toContain("startLogin()");
    expect(settingsSource).toContain("Current password");
    expect(settingsSource).toContain("Confirm new password");
  });
});
