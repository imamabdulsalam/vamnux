import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const anonymousContext = { user: null, req: { headers: {}, protocol: "https" }, res: { clearCookie: () => undefined, cookie: () => undefined } } as unknown as TrpcContext;

describe("native VAMNUX authentication router", () => {
  it("rejects mismatched registration passwords before any account operation", async () => {
    const caller = appRouter.createCaller(anonymousContext);
    await expect(caller.auth.nativeRegister({
      firstName: "Ada",
      lastName: "Stone",
      countryCode: "US",
      email: "ada@example.com",
      password: "Cedar!Clock7-Wind",
      confirmPassword: "Different!Clock7-Wind",
      termsAccepted: true,
      marketingConsent: false,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects malformed sign-in input before credential lookup", async () => {
    const caller = appRouter.createCaller(anonymousContext);
    await expect(caller.auth.nativeSignIn({ email: "not-an-email", password: "anything" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("requires an authenticated session before native logout-all can revoke sessions", async () => {
    const caller = appRouter.createCaller(anonymousContext);
    await expect(caller.auth.logoutAllNativeSessions()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
