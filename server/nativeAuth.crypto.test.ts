import { describe, expect, it } from "vitest";
import { hashNativePassword, validateNativePassword, verifyNativePassword } from "./nativeAuthCrypto";

describe("native VAMNUX credential crypto", () => {
  it("hashes and verifies a password without retaining the plaintext value", async () => {
    const plaintext = "Vamnux!Secure-Password-2026";
    const hash = await hashNativePassword(plaintext);

    expect(hash).toMatch(/^scrypt\$v1\$/);
    expect(hash).not.toContain(plaintext);
    await expect(verifyNativePassword(hash, plaintext)).resolves.toBe(true);
    await expect(verifyNativePassword(hash, "incorrect-password")).resolves.toBe(false);
  });

  it("requires the VAMNUX password-strength rules before credentials can be created", () => {
    expect(validateNativePassword("short")).toMatchObject({ valid: false });
    expect(validateNativePassword("alllowercasepassword1!")).toMatchObject({ valid: false });
    expect(validateNativePassword("Vamnux!Secure-Password-2026", ["vamnux"])).toMatchObject({ valid: false });
    expect(validateNativePassword("Cedar!Clock7-Wind")).toEqual({ valid: true });
  });
});
