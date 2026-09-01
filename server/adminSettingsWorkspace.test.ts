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
    expect(settingsSource).toContain("VAMNUX sign-in email");
    expect(settingsSource).not.toContain("provider-managed sign-in email");
  });

  it("provides a verified native password-recovery route without collecting passwords in settings", () => {
    expect(settingsSource).toContain("Request a secure reset link");
    expect(settingsSource).toContain('href="/login?mode=recovery"');
    expect(settingsSource).toContain("one-time link will be sent only if the account email is verified");
    expect(settingsSource).not.toContain("Current password");
    expect(settingsSource).not.toContain("Confirm new password");
    expect(settingsSource).not.toContain("configured secure identity provider");
  });
});
