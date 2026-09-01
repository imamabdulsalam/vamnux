import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import {
  customerIdentityLinks,
  customerNotificationPreferences,
  nativeAuthPendingRegistrations,
  customerProfiles,
  nativeAuthCredentials,
  nativeAuthSessions,
  nativeAuthTokens,
  users,
  wallets,
  type User,
} from "../drizzle/schema";
import { getDb, recordCustomerSecurityEvent } from "./db";
import { ENV } from "./_core/env";
import { sendTransactionalEmail } from "./resend";

const PASSWORD_KEY_LENGTH = 64;
const SCRYPT_N = 1 << 15;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const TOKEN_LIFETIME_MS = 30 * 60 * 1000;
const LOCKOUT_AFTER_FAILURES = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function deriveNativePasswordKey(password: string, salt: string, input: { N: number; r: number; p: number }) {
  return new Promise<Buffer>((resolve, reject) => {
    const invokeScrypt = scryptCallback as unknown as (
      password: string,
      salt: string,
      keyLength: number,
      options: { N: number; r: number; p: number; maxmem: number },
      callback: (error: Error | null, derivedKey: Buffer) => void,
    ) => void;
    invokeScrypt(password, salt, PASSWORD_KEY_LENGTH, {
      ...input,
      maxmem: 64 * 1024 * 1024,
    }, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export const NATIVE_AUTH_COOKIE_NAME = ENV.isProduction
  ? "__Host-vamnux_native_session"
  : "vamnux_native_session";

export class NativeAuthError extends Error {
  constructor(public readonly code: "invalid" | "unavailable" | "origin" | "admin_transition") {
    super(code);
  }
}

function assertNativeAuthEnabled() {
  if (!ENV.nativeAuthEnabled) throw new NativeAuthError("unavailable");
}

type TokenType = "email_verification" | "password_reset";

function normaliseEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email) || email.length > 320) throw new NativeAuthError("invalid");
  return email;
}

function passwordPolicy(password: string) {
  if (
    password.length < 12 ||
    password.length > 256 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new NativeAuthError("invalid");
  }
}

function hashOpaqueValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function hashNativePassword(password: string) {
  passwordPolicy(password);
  const salt = randomBytes(16).toString("base64url");
  const derived = await deriveNativePasswordKey(password, salt, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${Buffer.from(derived).toString("base64url")}`;
}

export async function verifyNativePassword(password: string, storedHash: string) {
  const [algorithm, n, r, p, salt, expected] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  const N = Number.parseInt(n ?? "", 10);
  const R = Number.parseInt(r ?? "", 10);
  const P = Number.parseInt(p ?? "", 10);
  if (N !== SCRYPT_N || R !== SCRYPT_R || P !== SCRYPT_P) return false;
  try {
    const derived = await deriveNativePasswordKey(password, salt, {
      N,
      r: R,
      p: P,
    });
    const expectedBuffer = Buffer.from(expected, "base64url");
    const derivedBuffer = Buffer.from(derived);
    return expectedBuffer.length === derivedBuffer.length && timingSafeEqual(expectedBuffer, derivedBuffer);
  } catch {
    return false;
  }
}

function nativeDb() {
  return getDb().then(db => {
    if (!db) throw new NativeAuthError("unavailable");
    return db;
  });
}

function applicationOrigin() {
  try {
    return new URL(ENV.nativeAuthPublicUrl).origin;
  } catch {
    return "";
  }
}

export function assertNativeMutationOrigin(req: Request) {
  if (!ENV.isProduction) return;
  const expectedOrigin = applicationOrigin();
  const origin = req.get("origin");
  if (!expectedOrigin || !origin || origin !== expectedOrigin) throw new NativeAuthError("origin");
}

function cookieOptions(req: Request) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] ?? "").toLowerCase();
  const secure = ENV.isProduction || req.protocol === "https" || forwardedProto.split(",").some(value => value.trim() === "https");
  return { httpOnly: true, path: "/", sameSite: "lax" as const, secure };
}

export function setNativeSessionCookie(req: Request, res: Response, rawSession: string) {
  res.cookie(NATIVE_AUTH_COOKIE_NAME, rawSession, { ...cookieOptions(req), maxAge: SESSION_LIFETIME_MS });
}

export function clearNativeSessionCookie(req: Request, res: Response) {
  res.clearCookie(NATIVE_AUTH_COOKIE_NAME, { ...cookieOptions(req), maxAge: -1 });
}

function readNativeSessionToken(req: Request) {
  return parseCookieHeader(req.headers.cookie ?? "")[NATIVE_AUTH_COOKIE_NAME] ?? null;
}

async function createNativeSession(userId: number) {
  const db = await nativeDb();
  const rawSession = randomBytes(32).toString("base64url");
  const now = new Date();
  await db.insert(nativeAuthSessions).values({
    userId,
    sessionHash: hashOpaqueValue(rawSession),
    expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS),
    lastSeenAt: now,
  });
  return rawSession;
}

async function revokeNativeSessions(userId: number) {
  const db = await nativeDb();
  await db.update(nativeAuthSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(nativeAuthSessions.userId, userId), isNull(nativeAuthSessions.revokedAt)));
}

export async function getNativeSessionUserFromRequest(req: Request): Promise<User | null> {
  const rawSession = readNativeSessionToken(req);
  if (!rawSession) return null;
  const db = await getDb();
  if (!db) return null;
  const now = new Date();
  const [result] = await db.select({ user: users })
    .from(nativeAuthSessions)
    .innerJoin(users, eq(nativeAuthSessions.userId, users.id))
    .where(and(
      eq(nativeAuthSessions.sessionHash, hashOpaqueValue(rawSession)),
      isNull(nativeAuthSessions.revokedAt),
      gt(nativeAuthSessions.expiresAt, now),
    ))
    .limit(1);
  if (!result?.user) return null;
  await db.update(nativeAuthSessions)
    .set({ lastSeenAt: now })
    .where(eq(nativeAuthSessions.sessionHash, hashOpaqueValue(rawSession)));
  return result.user;
}

export async function signOutNativeSession(req: Request) {
  const rawSession = readNativeSessionToken(req);
  if (!rawSession) return;
  const db = await getDb();
  if (!db) return;
  await db.update(nativeAuthSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(nativeAuthSessions.sessionHash, hashOpaqueValue(rawSession)), isNull(nativeAuthSessions.revokedAt)));
}

async function ensureNativeCustomerRows(db: Awaited<ReturnType<typeof nativeDb>>, userId: number, status: "active" | "pending_email_verification") {
  await db.insert(customerProfiles).values({ userId, accountStatus: status, registrationSource: "native_email" })
    .onDuplicateKeyUpdate({ set: { userId } });
  await db.insert(wallets).values({ userId }).onDuplicateKeyUpdate({ set: { userId } });
  await db.insert(customerNotificationPreferences).values({ userId }).onDuplicateKeyUpdate({ set: { userId } });
}

async function getUserAndCredentialByEmail(email: string) {
  const db = await nativeDb();
  const [result] = await db.select({
    user: users,
    credential: nativeAuthCredentials,
    accountStatus: customerProfiles.accountStatus,
  })
    .from(nativeAuthCredentials)
    .innerJoin(users, eq(nativeAuthCredentials.userId, users.id))
    .leftJoin(customerProfiles, eq(customerProfiles.userId, users.id))
    .where(eq(nativeAuthCredentials.email, email))
    .limit(1);
  return result ?? null;
}

async function createToken(input: { userId: number; tokenType: TokenType }) {
  const db = await nativeDb();
  const rawToken = randomBytes(32).toString("base64url");
  const now = new Date();
  await db.update(nativeAuthTokens)
    .set({ usedAt: now })
    .where(and(eq(nativeAuthTokens.userId, input.userId), eq(nativeAuthTokens.tokenType, input.tokenType), isNull(nativeAuthTokens.usedAt)));
  const [created] = await db.insert(nativeAuthTokens).values({
    userId: input.userId,
    tokenHash: hashOpaqueValue(rawToken),
    tokenType: input.tokenType,
    expiresAt: new Date(now.getTime() + TOKEN_LIFETIME_MS),
  }).$returningId();
  return { rawToken, tokenId: created.id };
}

async function consumeToken(rawToken: string, tokenType: TokenType) {
  const db = await nativeDb();
  const now = new Date();
  const [token] = await db.select()
    .from(nativeAuthTokens)
    .where(and(
      eq(nativeAuthTokens.tokenHash, hashOpaqueValue(rawToken)),
      eq(nativeAuthTokens.tokenType, tokenType),
      isNull(nativeAuthTokens.usedAt),
      gt(nativeAuthTokens.expiresAt, now),
    ))
    .limit(1);
  if (!token) throw new NativeAuthError("invalid");
  const result = await db.update(nativeAuthTokens)
    .set({ usedAt: now })
    .where(and(eq(nativeAuthTokens.id, token.id), isNull(nativeAuthTokens.usedAt)));
  const header = Array.isArray(result) ? result[0] : result;
  if (typeof (header as { affectedRows?: unknown })?.affectedRows === "number" && (header as { affectedRows: number }).affectedRows !== 1) {
    throw new NativeAuthError("invalid");
  }
  return token;
}

function nativeActionLink(kind: "enroll" | "reset", token: string) {
  const base = new URL(ENV.nativeAuthPublicUrl);
  base.pathname = "/login";
  base.hash = `native-${kind}=${encodeURIComponent(token)}`;
  return base.toString();
}

async function sendNativeActionEmail(input: { userId: number; email: string; kind: "enroll" | "reset" }) {
  const tokenType: TokenType = input.kind === "enroll" ? "email_verification" : "password_reset";
  const { rawToken, tokenId } = await createToken({ userId: input.userId, tokenType });
  const link = nativeActionLink(input.kind, rawToken);
  const isEnrollment = input.kind === "enroll";
  const subject = isEnrollment ? "Complete your VAMNUX account setup" : "Reset your VAMNUX password";
  const action = isEnrollment ? "complete your account setup" : "reset your password";
  try {
    await sendTransactionalEmail({
      to: input.email,
      subject,
      idempotencyKey: `native-auth-${input.kind}-${tokenId}`,
      text: `Use this secure VAMNUX link to ${action}. It expires in 30 minutes: ${link}`,
      html: `<p>Use this secure VAMNUX link to ${action}. It expires in 30 minutes.</p><p><a href="${link}">${isEnrollment ? "Complete account setup" : "Reset password"}</a></p><p>If you did not request this, you can ignore this email.</p>`,
    });
  } catch {
    throw new NativeAuthError("unavailable");
  }
}

async function createPendingRegistration(input: {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  countryCode?: string;
  referralSource?: string;
}) {
  const db = await nativeDb();
  const rawToken = randomBytes(32).toString("base64url");
  const dispatchId = randomUUID();
  const expiresAt = new Date(Date.now() + TOKEN_LIFETIME_MS);
  const values = {
    email: input.email,
    firstName: input.firstName?.trim().slice(0, 80) || null,
    lastName: input.lastName?.trim().slice(0, 80) || null,
    phone: input.phone?.trim().slice(0, 32) || null,
    countryCode: input.countryCode?.trim().slice(0, 2).toUpperCase() || null,
    referralSource: input.referralSource?.trim().slice(0, 48) || null,
    tokenHash: hashOpaqueValue(rawToken),
    dispatchId,
    expiresAt,
    usedAt: null,
  };
  await db.insert(nativeAuthPendingRegistrations).values(values).onDuplicateKeyUpdate({ set: values });
  return { rawToken, dispatchId };
}

async function consumePendingRegistration(rawToken: string) {
  const db = await nativeDb();
  const now = new Date();
  const [pending] = await db.select().from(nativeAuthPendingRegistrations).where(and(
    eq(nativeAuthPendingRegistrations.tokenHash, hashOpaqueValue(rawToken)),
    isNull(nativeAuthPendingRegistrations.usedAt),
    gt(nativeAuthPendingRegistrations.expiresAt, now),
  )).limit(1);
  if (!pending) return null;
  const result = await db.update(nativeAuthPendingRegistrations).set({ usedAt: now }).where(and(
    eq(nativeAuthPendingRegistrations.id, pending.id),
    isNull(nativeAuthPendingRegistrations.usedAt),
  ));
  const header = Array.isArray(result) ? result[0] : result;
  if (typeof (header as { affectedRows?: unknown })?.affectedRows === "number" && (header as { affectedRows: number }).affectedRows !== 1) {
    throw new NativeAuthError("invalid");
  }
  return pending;
}

async function sendPendingRegistrationEmail(input: { email: string; rawToken: string; dispatchId: string }) {
  const link = nativeActionLink("enroll", input.rawToken);
  try {
    await sendTransactionalEmail({
      to: input.email,
      subject: "Complete your VAMNUX account setup",
      idempotencyKey: `native-registration-${input.dispatchId}`,
      text: `Use this secure VAMNUX link to complete your account setup. It expires in 30 minutes: ${link}`,
      html: `<p>Use this secure VAMNUX link to complete your account setup. It expires in 30 minutes.</p><p><a href="${link}">Complete account setup</a></p><p>If you did not request this, you can ignore this email.</p>`,
    });
  } catch {
    throw new NativeAuthError("unavailable");
  }
}

async function findExistingUserByEmail(email: string) {
  const db = await nativeDb();
  const [existing] = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
  return existing ?? null;
}

export async function beginNativeRegistration(input: {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  countryCode?: string;
  referralSource?: string;
}) {
  assertNativeAuthEnabled();
  const email = normaliseEmail(input.email);
  const db = await nativeDb();
  const existingUser = await findExistingUserByEmail(email);
  if (existingUser?.role === "admin") return { accepted: true } as const;

  if (existingUser) {
    const [credential] = await db.select().from(nativeAuthCredentials).where(eq(nativeAuthCredentials.userId, existingUser.id)).limit(1);
    if (credential?.emailVerifiedAt && !credential.enrollmentRequired) return { accepted: true } as const;
    await db.insert(nativeAuthCredentials).values({ userId: existingUser.id, email, passwordHash: null, enrollmentRequired: true })
      .onDuplicateKeyUpdate({ set: { email } });
    await sendNativeActionEmail({ userId: existingUser.id, email, kind: "enroll" });
    await recordCustomerSecurityEvent({ userId: existingUser.id, eventType: "native_registration_requested", summary: "Native email account verification requested." });
    return { accepted: true } as const;
  }

  const pending = await createPendingRegistration({ ...input, email });
  await sendPendingRegistrationEmail({ email, ...pending });
  return { accepted: true } as const;
}

export async function completeNativeEnrollment(input: { token: string; password: string }) {
  assertNativeAuthEnabled();
  passwordPolicy(input.password);
  const pending = await consumePendingRegistration(input.token);
  if (pending) {
    const db = await nativeDb();
    if (await findExistingUserByEmail(pending.email)) throw new NativeAuthError("invalid");
    const now = new Date();
    const [created] = await db.insert(users).values({
      openId: `native_${randomUUID().replace(/-/g, "")}`,
      email: pending.email,
      loginMethod: "native_email",
      role: "user",
      lastSignedIn: now,
    }).$returningId();
    const userId = created.id;
    await ensureNativeCustomerRows(db, userId, "active");
    await db.update(customerProfiles).set({
      firstName: pending.firstName,
      lastName: pending.lastName,
      phone: pending.phone,
      countryCode: pending.countryCode,
      referralCode: pending.referralSource,
      accountStatus: "active",
    }).where(eq(customerProfiles.userId, userId));
    await db.insert(nativeAuthCredentials).values({
      userId,
      email: pending.email,
      passwordHash: await hashNativePassword(input.password),
      emailVerifiedAt: now,
      enrollmentRequired: false,
      passwordChangedAt: now,
    });
    await db.insert(customerIdentityLinks).values({
      userId,
      provider: "native_email",
      providerSubject: pending.email,
      providerEmail: pending.email,
      emailVerifiedAt: now,
      lastAuthenticatedAt: now,
    });
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NativeAuthError("unavailable");
    const rawSession = await createNativeSession(userId);
    await recordCustomerSecurityEvent({ userId, eventType: "native_email_verified", summary: "Native email account enrollment completed." });
    return { rawSession, user };
  }
  const token = await consumeToken(input.token, "email_verification");
  const db = await nativeDb();
  const [user] = await db.select().from(users).where(eq(users.id, token.userId)).limit(1);
  if (!user || user.role === "admin") throw new NativeAuthError(user?.role === "admin" ? "admin_transition" : "invalid");
  const [credential] = await db.select().from(nativeAuthCredentials).where(eq(nativeAuthCredentials.userId, user.id)).limit(1);
  if (!credential) throw new NativeAuthError("invalid");
  const now = new Date();
  await db.update(nativeAuthCredentials).set({
    passwordHash: await hashNativePassword(input.password),
    emailVerifiedAt: now,
    enrollmentRequired: false,
    passwordChangedAt: now,
    failedLoginCount: 0,
    lockedUntil: null,
  }).where(eq(nativeAuthCredentials.id, credential.id));
  await db.update(customerProfiles).set({ accountStatus: "active" }).where(eq(customerProfiles.userId, user.id));
  await db.insert(customerIdentityLinks).values({
    userId: user.id,
    provider: "native_email",
    providerSubject: credential.email,
    providerEmail: credential.email,
    emailVerifiedAt: now,
    lastAuthenticatedAt: now,
  }).onDuplicateKeyUpdate({ set: { providerEmail: credential.email, emailVerifiedAt: now, lastAuthenticatedAt: now } });
  const rawSession = await createNativeSession(user.id);
  await recordCustomerSecurityEvent({ userId: user.id, eventType: "native_email_verified", summary: "Native email account enrollment completed." });
  return { rawSession, user };
}

export async function signInNativeAccount(input: { email: string; password: string }) {
  assertNativeAuthEnabled();
  const email = normaliseEmail(input.email);
  const result = await getUserAndCredentialByEmail(email);
  if (!result?.credential || !result.user || result.user.role === "admin") {
    if (result?.user?.role === "admin") throw new NativeAuthError("admin_transition");
    throw new NativeAuthError("invalid");
  }
  const now = new Date();
  if (result.credential.lockedUntil && result.credential.lockedUntil > now) throw new NativeAuthError("invalid");
  if (!result.credential.passwordHash || result.credential.enrollmentRequired || !result.credential.emailVerifiedAt || result.accountStatus !== "active") {
    throw new NativeAuthError("invalid");
  }
  if (!(await verifyNativePassword(input.password, result.credential.passwordHash))) {
    const failures = result.credential.failedLoginCount + 1;
    const lockedUntil = failures >= LOCKOUT_AFTER_FAILURES ? new Date(now.getTime() + LOCKOUT_DURATION_MS) : null;
    const db = await nativeDb();
    await db.update(nativeAuthCredentials).set({ failedLoginCount: failures, lockedUntil }).where(eq(nativeAuthCredentials.id, result.credential.id));
    await recordCustomerSecurityEvent({ userId: result.user.id, eventType: "native_login_failed", summary: "Native sign-in was rejected." });
    throw new NativeAuthError("invalid");
  }
  const db = await nativeDb();
  await db.update(nativeAuthCredentials).set({ failedLoginCount: 0, lockedUntil: null }).where(eq(nativeAuthCredentials.id, result.credential.id));
  await db.update(customerIdentityLinks).set({ lastAuthenticatedAt: now }).where(and(eq(customerIdentityLinks.userId, result.user.id), eq(customerIdentityLinks.provider, "native_email")));
  const rawSession = await createNativeSession(result.user.id);
  await recordCustomerSecurityEvent({ userId: result.user.id, eventType: "native_login_succeeded", summary: "Native email sign-in completed." });
  return { rawSession, user: result.user };
}

export async function requestNativePasswordReset(input: { email: string }) {
  assertNativeAuthEnabled();
  const email = normaliseEmail(input.email);
  const result = await getUserAndCredentialByEmail(email);
  if (!result?.credential || !result.user || result.user.role === "admin" || result.credential.enrollmentRequired || !result.credential.emailVerifiedAt) {
    return { accepted: true } as const;
  }
  await sendNativeActionEmail({ userId: result.user.id, email: result.credential.email, kind: "reset" });
  await recordCustomerSecurityEvent({ userId: result.user.id, eventType: "native_password_reset_requested", summary: "Native password reset requested." });
  return { accepted: true } as const;
}

export async function resetNativePassword(input: { token: string; password: string }) {
  assertNativeAuthEnabled();
  passwordPolicy(input.password);
  const token = await consumeToken(input.token, "password_reset");
  const db = await nativeDb();
  const [user] = await db.select().from(users).where(eq(users.id, token.userId)).limit(1);
  if (!user || user.role === "admin") throw new NativeAuthError(user?.role === "admin" ? "admin_transition" : "invalid");
  const now = new Date();
  await db.update(nativeAuthCredentials).set({ passwordHash: await hashNativePassword(input.password), passwordChangedAt: now, failedLoginCount: 0, lockedUntil: null })
    .where(eq(nativeAuthCredentials.userId, user.id));
  await revokeNativeSessions(user.id);
  const rawSession = await createNativeSession(user.id);
  await recordCustomerSecurityEvent({ userId: user.id, eventType: "native_password_reset_completed", summary: "Native password reset completed." });
  return { rawSession, user };
}
