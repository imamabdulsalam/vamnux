import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const authSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/CustomerAuth.tsx"), "utf8");
const homeSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
const footerSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/components/FooterNavigation.tsx"), "utf8");

describe("VAMNUX customer account access", () => {
  it("provides distinct secure sign-in, verified registration, and password completion views", () => {
    expect(authSource).toContain('get("mode")');
    expect(authSource).toContain('accountMode === "signup"');
    expect(authSource).toContain("SECURE SIGN IN");
    expect(authSource).toContain("CREATE SECURE ACCOUNT");
    expect(authSource).toContain("First name");
    expect(authSource).toContain("Last name");
    expect(authSource).toContain("Phone number · optional");
    expect(authSource).toContain("How did you hear about us?");
    expect(authSource).toContain("Set your VAMNUX password.");
    expect(authSource).toContain("Confirm password");
    expect(authSource).toContain('type={visible ? "text" : "password"}');
    expect(authSource).toContain("Send verification link");
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

  it("uses verified native account mutations and does not fabricate CAPTCHA verification", () => {
    expect(authSource).toContain("trpc.auth.nativeRegister.useMutation");
    expect(authSource).toContain("trpc.auth.nativeSignIn.useMutation");
    expect(authSource).toContain("trpc.auth.nativeRequestPasswordReset.useMutation");
    expect(authSource).toContain("trpc.auth.nativeCompleteEnrollment.useMutation");
    expect(authSource).toContain("does not imitate or bypass a CAPTCHA challenge");
    expect(authSource).toContain("server-side token verification");
    expect(authSource).not.toContain("trpc.auth.register");
    expect(authSource).not.toContain("trpc.auth.loginWithPassword");
    expect(authSource).not.toContain("configured secure identity provider");
  });

  it("provides editable native sign-in fields and routes only after server verification", () => {
    expect(authSource).toContain('autoComplete="current-password"');
    expect(authSource).toContain('placeholder="Enter your password"');
    expect(authSource).toContain("signIn.mutate({ email, password })");
    expect(authSource).toContain("window.location.assign(result.nextPath)");
    expect(authSource).toContain("Sign in securely");
  });

  it("keeps all account actions with accessible password visibility controls in the compact VAMNUX account-card layout", () => {
    expect(authSource).toContain("PasswordField");
    expect(authSource).toContain('aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}');
    expect(authSource).toContain("Forgot password?");
    expect(authSource).toContain("Protected by <strong>VAMNUX</strong> account security");
    expect(authSource).toContain("customer-auth-introduction");
  });

  it("restores the original VAMNUX account introduction and applies moderate readable form sizing", () => {
    expect(authSource).toContain("Your digital");
    expect(authSource).toContain("Account-scoped data");
    expect(authSource).toContain("Wallet-only purchase policy");
    expect(authSource).toContain("Server-authorised operations");
    expect(authSource).toContain('text-[11px]');
    expect(authSource).toContain('h-10 w-full');
  });

  it("provides clear destinations for sign-in, registration, and verified email recovery", () => {
    expect(authSource).toContain('const SIGN_IN_PATH = "/login"');
    expect(authSource).toContain('const SIGN_UP_PATH = "/login?mode=signup"');
    expect(authSource).toContain('const RECOVERY_PATH = "/login?mode=recovery"');
    expect(authSource).toContain('href={SIGN_IN_PATH}');
    expect(authSource).toContain('href={SIGN_UP_PATH}');
    expect(authSource).toContain('href={RECOVERY_PATH}');
    expect(authSource).not.toContain('openAccountRoute');
    expect(authSource).toContain("PASSWORD RECOVERY");
    expect(authSource).toContain("Send reset link");
    expect(authSource).toContain('accountMode === "recovery"');
  });

  it("routes Create Account actions to the registration-readiness view", () => {
    expect(homeSource).toContain('setLocation("/login?mode=signup")');
    expect(footerSource).toContain('["Sign Up", "/login?mode=signup"]');
  });
});
