import { ADMIN_MFA_CHALLENGE_COOKIE, COOKIE_NAME, ONE_YEAR_MS, OAUTH_STATE_COOKIE, decodeOAuthState } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { createAdminMfaChallenge, isAdminMfaEnrolled } from "../adminMfa";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    // CSRF guard: the nonce in `state` must match the one-time cookie that
    // startLogin set in the browser that began this login. An attacker can
    // forge `state`, but cannot plant this cookie in the victim's browser.
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const signedInUser = await db.getUserByOpenId(userInfo.openId);
      if (signedInUser) {
        try {
          await db.linkManusOAuthIdentity({
            userId: signedInUser.id,
            openId: userInfo.openId,
            email: userInfo.email ?? null,
          });
          await db.recordCustomerSecurityEvent({
            userId: signedInUser.id,
            eventType: "manus_oauth_sign_in",
            summary: "Signed in through the current VAMNUX secure sign-in provider.",
          });
        } catch (securityEventError) {
          console.warn("[OAuth] Security event could not be recorded", securityEventError);
        }
      }

      if (signedInUser?.role === "admin" && await isAdminMfaEnrolled(signedInUser.id)) {
        const challenge = await createAdminMfaChallenge(signedInUser.id);
        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(ADMIN_MFA_CHALLENGE_COOKIE, challenge, { ...cookieOptions, maxAge: 10 * 60 * 1000 });
        res.redirect(302, "/admin/login?mfa=required");
        return;
      }

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
