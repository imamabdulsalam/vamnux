import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { createRecoveryCodes, decryptMfaSecret, encryptMfaSecret, hashAdminMfaValue } from "./adminMfa";

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
});
