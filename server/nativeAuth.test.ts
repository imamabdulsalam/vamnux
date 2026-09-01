import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { NATIVE_AUTH_COOKIE_NAME, hashNativePassword, setNativeSessionCookie, verifyNativePassword } from "./nativeAuth";

describe("native MySQL account security", () => {
  it("uses a salted scrypt hash and rejects a wrong password", async () => {
    const hash = await hashNativePassword("VamnuxSecurePass2026!");

    expect(hash).toMatch(/^scrypt\$32768\$8\$1\$/);
    expect(hash).not.toContain("VamnuxSecurePass2026!");
    await expect(verifyNativePassword("VamnuxSecurePass2026!", hash)).resolves.toBe(true);
    await expect(verifyNativePassword("wrong-password", hash)).resolves.toBe(false);
    await expect(hashNativePassword("VamnuxSecurePass2026")).rejects.toMatchObject({ code: "invalid" });
  });

  it("writes only an opaque HttpOnly native session cookie", () => {
    const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
    const req = { protocol: "https", headers: {} } as never;
    const res = {
      cookie: (name: string, value: string, options: Record<string, unknown>) => cookies.push({ name, value, options }),
    } as never;

    setNativeSessionCookie(req, res, "opaque-session-token");

    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({
      name: NATIVE_AUTH_COOKIE_NAME,
      value: "opaque-session-token",
      options: { httpOnly: true, path: "/", sameSite: "lax", secure: true },
    });
  });

  it("keeps Resend and native-auth secrets server-only without a managed OAuth runtime fallback", () => {
    const envSource = readFileSync(resolve(process.cwd(), "server/_core/env.ts"), "utf8");
    const contextSource = readFileSync(resolve(process.cwd(), "server/_core/context.ts"), "utf8");
    const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

    expect(envSource).toContain("resendApiKey: process.env.RESEND_API_KEY");
    expect(envSource).not.toContain("VITE_RESEND_API_KEY");
    expect(contextSource).toContain("getNativeSessionUserFromRequest");
    expect(contextSource).not.toContain("sdk.authenticateRequest");
    expect(routerSource).toContain("nativeRequestPasswordReset");
    expect(routerSource).not.toMatch(/nativeRegister:[\s\S]{0,700}password:/);
    expect(routerSource).not.toContain("RESEND_API_KEY");
  });
});
