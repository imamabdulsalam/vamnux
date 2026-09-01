import { initTRPC, TRPCError } from "@trpc/server";
import { parse as parseCookieHeader } from "cookie";
import superjson from "superjson";
import { ADMIN_MFA_VERIFIED_COOKIE, NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { isAdminMfaEnrolled, verifyAdminMfaSessionToken } from "../adminMfa";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

/** Allows only authenticator enrollment/status until a Super Admin has enrolled MFA. */
export const adminMfaSetupProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    const user = ctx.user;
    if (!user || user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({ ctx: { ...ctx, user } });
  }),
);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    const user = ctx.user;
    if (!user || user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    if (!(await isAdminMfaEnrolled(user.id))) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Authenticator setup is required for Super Admin access (10003)" });
    }
    const mfaToken = parseCookieHeader(ctx.req.headers.cookie ?? "")[ADMIN_MFA_VERIFIED_COOKIE];
    if (!(await verifyAdminMfaSessionToken(mfaToken, user.id))) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Authenticator verification is required for Super Admin access (10003)" });
    }
    return next({ ctx: { ...ctx, user } });
  }),
);
