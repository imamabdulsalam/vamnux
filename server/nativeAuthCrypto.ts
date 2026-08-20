import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 32_768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

function deriveScryptKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, KEY_LENGTH, SCRYPT_OPTIONS, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}

export type PasswordCheck = { valid: true } | { valid: false; reason: string };

export function validateNativePassword(password: string, prohibitedValues: string[] = []): PasswordCheck {
  if (password.length < 12) return { valid: false, reason: "Use at least 12 characters." };
  if (!/[a-z]/.test(password)) return { valid: false, reason: "Add a lowercase letter." };
  if (!/[A-Z]/.test(password)) return { valid: false, reason: "Add an uppercase letter." };
  if (!/[0-9]/.test(password)) return { valid: false, reason: "Add a number." };
  if (!/[^A-Za-z0-9]/.test(password)) return { valid: false, reason: "Add a symbol." };
  const normalized = password.toLowerCase();
  if (["password", "vamnux", "qwerty", ...prohibitedValues.map((value) => value.toLowerCase())].some((value) => value.length >= 3 && normalized.includes(value))) {
    return { valid: false, reason: "Choose a password that does not contain your name, email, or common words." };
  }
  return { valid: true };
}

export async function hashNativePassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await deriveScryptKey(password, salt);
  return ["scrypt", "v1", salt.toString("base64url"), derived.toString("base64url")].join("$");
}

export async function verifyNativePassword(encodedHash: string, password: string): Promise<boolean> {
  const [algorithm, version, saltValue, hashValue] = encodedHash.split("$");
  if (algorithm !== "scrypt" || version !== "v1" || !saltValue || !hashValue) return false;
  try {
    const salt = Buffer.from(saltValue, "base64url");
    const expected = Buffer.from(hashValue, "base64url");
    if (expected.length !== KEY_LENGTH) return false;
    const derived = await deriveScryptKey(password, salt);
    return timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}
