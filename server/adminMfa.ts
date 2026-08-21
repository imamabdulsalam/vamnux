import crypto from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { adminMfaChallenges, adminMfaCredentials, adminMfaRecoveryCodes } from "../drizzle/schema";
import { getDb, recordCustomerSecurityEvent } from "./db";

const MFA_ISSUER = "VAMNUX";
const MFA_CHALLENGE_TTL_MS = 10 * 60 * 1000;
const MFA_SESSION_TTL_SECONDS = 60 * 60 * 12;

function getMfaKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("Secure MFA encryption key is unavailable");
  return crypto.createHash("sha256").update(`vamnux-admin-mfa:${secret}`).digest();
}

export function encryptMfaSecret(secret: string, key = getMfaKey()) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

export function decryptMfaSecret(encrypted: string, key = getMfaKey()) {
  const payload = Buffer.from(encrypted, "base64url");
  if (payload.length < 29) throw new Error("Stored MFA credential is invalid");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, payload.subarray(0, 12));
  decipher.setAuthTag(payload.subarray(12, 28));
  return Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]).toString("utf8");
}

function normaliseCode(value: string) {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

export function hashAdminMfaValue(value: string, key = getMfaKey()) {
  return crypto.createHmac("sha256", key).update(normaliseCode(value)).digest("hex");
}

function getMfaTokenKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Secure MFA signing key is unavailable");
  return new TextEncoder().encode(secret);
}

export async function createAdminMfaSessionToken(userId: number) {
  return new SignJWT({ kind: "vamnux_admin_mfa" }).setProtectedHeader({ alg: "HS256" }).setSubject(String(userId)).setIssuedAt().setExpirationTime(`${MFA_SESSION_TTL_SECONDS}s`).sign(getMfaTokenKey());
}

export async function verifyAdminMfaSessionToken(token: string | undefined, userId: number) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getMfaTokenKey(), { algorithms: ["HS256"] });
    return payload.kind === "vamnux_admin_mfa" && payload.sub === String(userId);
  } catch {
    return false;
  }
}

export function createRecoveryCodes(count = 8) {
  return Array.from({ length: count }, () => {
    const raw = crypto.randomBytes(6).toString("hex").toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
  });
}

function createTotp(secret: string, label: string) {
  return new OTPAuth.TOTP({ issuer: MFA_ISSUER, label, algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secret) });
}

export function isValidTotp(secret: string, label: string, code: string) {
  return createTotp(secret, label).validate({ token: normaliseCode(code), window: 1 }) !== null;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return db;
}

export async function getAdminMfaStatus(userId: number) {
  const db = await requireDb();
  const [credential] = await db.select({ enrolledAt: adminMfaCredentials.enrolledAt, lastVerifiedAt: adminMfaCredentials.lastVerifiedAt })
    .from(adminMfaCredentials).where(eq(adminMfaCredentials.userId, userId)).limit(1);
  const unused = await db.select({ id: adminMfaRecoveryCodes.id }).from(adminMfaRecoveryCodes)
    .where(and(eq(adminMfaRecoveryCodes.userId, userId), isNull(adminMfaRecoveryCodes.usedAt)));
  return { enrolled: Boolean(credential?.enrolledAt), enrolledAt: credential?.enrolledAt ?? null, lastVerifiedAt: credential?.lastVerifiedAt ?? null, recoveryCodesRemaining: unused.length };
}

export async function isAdminMfaEnrolled(userId: number) {
  return (await getAdminMfaStatus(userId)).enrolled;
}

export async function startAdminMfaEnrollment(input: { userId: number; label: string }) {
  const db = await requireDb();
  const [current] = await db.select({ enrolledAt: adminMfaCredentials.enrolledAt }).from(adminMfaCredentials).where(eq(adminMfaCredentials.userId, input.userId)).limit(1);
  if (current?.enrolledAt) throw new Error("Authenticator MFA is already active. Use recovery management instead.");
  const secret = new OTPAuth.Secret({ size: 20 }).base32;
  const totp = createTotp(secret, input.label);
  const secretEncrypted = encryptMfaSecret(secret);
  await db.insert(adminMfaCredentials).values({ userId: input.userId, secretEncrypted, enrolledAt: null, lastVerifiedAt: null })
    .onDuplicateKeyUpdate({ set: { secretEncrypted, enrolledAt: null, lastVerifiedAt: null } });
  const qrDataUrl = await QRCode.toDataURL(totp.toString(), { width: 240, margin: 1, errorCorrectionLevel: "M" });
  return { qrDataUrl, manualKey: secret, issuer: MFA_ISSUER, accountLabel: input.label };
}

export async function confirmAdminMfaEnrollment(input: { userId: number; label: string; code: string }) {
  const db = await requireDb();
  const [credential] = await db.select().from(adminMfaCredentials).where(eq(adminMfaCredentials.userId, input.userId)).limit(1);
  if (!credential || credential.enrolledAt) throw new Error("Start a new authenticator enrollment before confirming it");
  const secret = decryptMfaSecret(credential.secretEncrypted);
  if (!isValidTotp(secret, input.label, input.code)) throw new Error("Authenticator code is invalid or expired");
  const recoveryCodes = createRecoveryCodes();
  await db.transaction(async (tx) => {
    await tx.delete(adminMfaRecoveryCodes).where(eq(adminMfaRecoveryCodes.userId, input.userId));
    await tx.insert(adminMfaRecoveryCodes).values(recoveryCodes.map((code) => ({ userId: input.userId, codeHash: hashAdminMfaValue(code) })));
    await tx.update(adminMfaCredentials).set({ enrolledAt: new Date(), lastVerifiedAt: new Date() }).where(eq(adminMfaCredentials.id, credential.id));
  });
  await recordCustomerSecurityEvent({ userId: input.userId, eventType: "admin_mfa_enrolled", summary: "Authenticator MFA was enabled for Super Admin access." });
  return { recoveryCodes };
}

export async function regenerateAdminMfaRecoveryCodes(input: { userId: number; label: string; code: string }) {
  const db = await requireDb();
  const [credential] = await db.select().from(adminMfaCredentials).where(eq(adminMfaCredentials.userId, input.userId)).limit(1);
  if (!credential?.enrolledAt || !isValidTotp(decryptMfaSecret(credential.secretEncrypted), input.label, input.code)) throw new Error("Enter a current authenticator code to replace recovery codes");
  const recoveryCodes = createRecoveryCodes();
  await db.transaction(async (tx) => {
    await tx.delete(adminMfaRecoveryCodes).where(eq(adminMfaRecoveryCodes.userId, input.userId));
    await tx.insert(adminMfaRecoveryCodes).values(recoveryCodes.map((code) => ({ userId: input.userId, codeHash: hashAdminMfaValue(code) })));
    await tx.update(adminMfaCredentials).set({ lastVerifiedAt: new Date() }).where(eq(adminMfaCredentials.id, credential.id));
  });
  await recordCustomerSecurityEvent({ userId: input.userId, eventType: "admin_mfa_recovery_codes_replaced", summary: "Admin MFA recovery codes were replaced." });
  return { recoveryCodes };
}

export async function createAdminMfaChallenge(userId: number) {
  const db = await requireDb();
  const challenge = crypto.randomBytes(32).toString("base64url");
  await db.insert(adminMfaChallenges).values({ challengeHash: hashAdminMfaValue(challenge), userId, expiresAt: new Date(Date.now() + MFA_CHALLENGE_TTL_MS) });
  return challenge;
}

export async function completeAdminMfaChallenge(input: { challenge: string; label: string; code: string; method: "totp" | "recovery" }) {
  const db = await requireDb();
  const now = new Date();
  const [challenge] = await db.select().from(adminMfaChallenges).where(and(eq(adminMfaChallenges.challengeHash, hashAdminMfaValue(input.challenge)), isNull(adminMfaChallenges.consumedAt), gt(adminMfaChallenges.expiresAt, now))).limit(1);
  if (!challenge) throw new Error("Authenticator challenge is invalid or expired. Sign in again.");
  const [activeCredential] = await db.select().from(adminMfaCredentials).where(and(eq(adminMfaCredentials.userId, challenge.userId), gt(adminMfaCredentials.enrolledAt, new Date(0)))).limit(1);
  if (!activeCredential) throw new Error("Authenticator enrollment is incomplete. Sign in again after completing setup.");
  const usesRecoveryCode = input.method === "recovery";
  if (usesRecoveryCode) {
    const [recovery] = await db.select().from(adminMfaRecoveryCodes).where(and(eq(adminMfaRecoveryCodes.userId, challenge.userId), eq(adminMfaRecoveryCodes.codeHash, hashAdminMfaValue(input.code)), isNull(adminMfaRecoveryCodes.usedAt))).limit(1);
    if (!recovery) throw new Error("Recovery code is invalid or has already been used");
    await db.update(adminMfaRecoveryCodes).set({ usedAt: now }).where(eq(adminMfaRecoveryCodes.id, recovery.id));
  } else if (!isValidTotp(decryptMfaSecret(activeCredential.secretEncrypted), input.label, input.code)) throw new Error("Authenticator code is invalid or expired");
  await db.transaction(async (tx) => {
    await tx.update(adminMfaChallenges).set({ consumedAt: now }).where(eq(adminMfaChallenges.id, challenge.id));
    await tx.update(adminMfaCredentials).set({ lastVerifiedAt: now }).where(eq(adminMfaCredentials.id, activeCredential.id));
  });
  await recordCustomerSecurityEvent({ userId: challenge.userId, eventType: usesRecoveryCode ? "admin_mfa_recovery_used" : "admin_mfa_challenge_completed", summary: usesRecoveryCode ? "A recovery code was used for Super Admin sign-in." : "Authenticator verification completed for Super Admin sign-in." });
  return { userId: challenge.userId };
}
