import crypto from "node:crypto";
import * as OTPAuth from "otpauth";
import { describe, expect, it } from "vitest";
import { createRecoveryCodes, decryptMfaSecret, encryptMfaSecret, hashAdminMfaValue, isValidTotp } from "./adminMfa";

describe("Admin MFA secret primitives", () => {
  const key = crypto.createHash("sha256").update("test-key").digest();

  it("encrypts a TOTP seed without retaining plaintext in its stored representation", () => {
    const encrypted = encryptMfaSecret("JBSWY3DPEHPK3PXP", key);
    expect(encrypted).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptMfaSecret(encrypted, key)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("creates unique human-readable recovery codes and hashes them with server-held material", () => {
    const codes = createRecoveryCodes();
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((code) => /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code))).toBe(true);
    expect(hashAdminMfaValue(codes[0]!, key)).not.toBe(codes[0]);
  });

  it("accepts a current VAMNUX-compatible authenticator code and rejects an incorrect code", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const label = "owner@vamnux.example";
    const code = new OTPAuth.TOTP({ issuer: "VAMNUX", label, algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secret) }).generate();

    expect(isValidTotp(secret, label, code)).toBe(true);
    expect(isValidTotp(secret, label, "000000")).toBe(false);
  });
});
