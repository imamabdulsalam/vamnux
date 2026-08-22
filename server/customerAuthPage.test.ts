import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const authSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/CustomerAuth.tsx"), "utf8");
const homeSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
const footerSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/components/FooterNavigation.tsx"), "utf8");

describe("VAMNUX customer account access", () => {
  it("provides distinct secure sign-in and interactive registration views", () => {
    expect(authSource).toContain('get("mode")');
    expect(authSource).toContain('accountMode === "signup"');
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

  it("provides searchable country selection, automatic calling codes, and structured discovery sources", () => {
    expect(authSource).toContain('list="vamnux-country-options"');
    expect(authSource).toContain("getCountries()");
    expect(authSource).toContain("getCountryCallingCode(code)");
    expect(authSource).toContain("Calling code");
    expect(authSource).toContain("Choose country first");
    expect(authSource).toContain("Google Search");
    expect(authSource).toContain("Instagram");
    expect(authSource).toContain("Referral link");
    expect(authSource).toContain("VAMNUX Blog");
    expect(authSource.indexOf('label="Country"')).toBeLessThan(authSource.indexOf('label="Phone number · optional"'));
  });

  it("preserves the configured secure identity flow and does not fabricate password, CAPTCHA, or email verification", () => {
    expect(authSource).toContain("startLogin()");
    expect(authSource).toContain("not collected by this page");
    expect(authSource).toContain("does not imitate or bypass a CAPTCHA challenge");
    expect(authSource).toContain("server-side token verification");
    expect(authSource).not.toContain("trpc.auth.register");
    expect(authSource).not.toContain("trpc.auth.loginWithPassword");
  });

  it("provides clear standard destinations for sign-in, registration, and unavailable recovery", () => {
    expect(authSource).toContain('const SIGN_IN_PATH = "/login"');
    expect(authSource).toContain('const SIGN_UP_PATH = "/login?mode=signup"');
    expect(authSource).toContain('const RECOVERY_PATH = "/login?mode=recovery"');
    expect(authSource).toContain('<Link href={SIGN_IN_PATH} className="user-secondary-action"><ArrowLeft size={15} /> Back to sign in</Link>');
    expect(authSource).toContain('<Link href={SIGN_IN_PATH} className="user-primary-action">Back to sign in');
    expect(authSource).toContain("PASSWORD RECOVERY");
    expect(authSource).toContain("Recovery status: unavailable");
    expect(authSource).toContain('accountMode === "recovery"');
  });

  it("routes Create Account actions to the registration-readiness view", () => {
    expect(homeSource).toContain('setLocation("/login?mode=signup")');
    expect(footerSource).toContain('["Sign Up", "/login?mode=signup"]');
  });
});
