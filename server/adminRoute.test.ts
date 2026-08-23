import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const appSource = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/App.tsx"), "utf8");

describe("VAMNUX Admin entry routing", () => {
  it("redirects the shorthand Admin route to the protected Admin sign-in entry", () => {
    expect(appSource).toContain('<Route path="/admin" component={AdminEntryRedirect} />');
    expect(appSource).toContain('setLocation("/admin/login", { replace: true })');
  });

  it("retains explicit protected Admin dashboard and login routes", () => {
    expect(appSource).toContain('<Route path="/admin/login" component={AdminLogin} />');
    expect(appSource).toContain('<Route path="/admin/dashboard" component={SuperAdmin} />');
  });
});
