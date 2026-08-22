import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const authSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/CustomerAuth.tsx"), "utf8");
const homeSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
const footerSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/components/FooterNavigation.tsx"), "utf8");

describe("VAMNUX customer account access", () => {
  it("provides distinct secure sign-in and interactive registration views", () => {
    expect(authSource).toContain('get("mode") === "signup"');
    expect(authSource).toContain("SECURE SIGN IN");
    expect(authSource).toContain("CREATE SECURE ACCOUNT");
    expect(authSource).toContain("First name");
    expect(authSource).toContain("Last name");
    expect(authSource).toContain("Phone number · optional");
    expect(authSource).toContain("How did you hear about us?");
    expect(authSource).toContain("Password requirements");
    expect(authSource).toContain("Confirm password");
    expect(authSource).toContain("Passwords match");
    expect(authSource).toContain("Weak");
    expect(authSource).toContain("Excellent");
    expect(authSource).toContain('type="password"');
    expect(authSource).toContain("Create secure account");
  });

  it("preserves the configured secure identity flow and does not fabricate password, CAPTCHA, or email verification", () => {
    expect(authSource).toContain("startLogin()");
    expect(authSource).toContain("not collected by this page");
    expect(authSource).toContain("does not imitate or bypass a CAPTCHA challenge");
    expect(authSource).toContain("server-side token verification");
    expect(authSource).not.toContain("trpc.auth.register");
    expect(authSource).not.toContain("trpc.auth.loginWithPassword");
  });

  it("routes Create Account actions to the registration-readiness view", () => {
    expect(homeSource).toContain('setLocation("/login?mode=signup")');
    expect(footerSource).toContain('["Sign Up", "/login?mode=signup"]');
  });
});
