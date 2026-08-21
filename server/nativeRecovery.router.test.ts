import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const anonymousContext = { user: null, req: { headers: {}, protocol: "https" }, res: { clearCookie: () => undefined, cookie: () => undefined } } as unknown as TrpcContext;

describe("native VAMNUX recovery router", () => {
  it("fails closed without a transactional-email credential while preserving generic reset-request feedback", async () => {
    const caller = appRouter.createCaller(anonymousContext);
    await expect(caller.auth.forgotPassword({ email: "customer@example.com" })).resolves.toEqual({ success: true, deliveryAvailable: false });
  });

  it("rejects mismatched reset passwords before looking up any recovery token", async () => {
    const caller = appRouter.createCaller(anonymousContext);
    await expect(caller.auth.resetPassword({ token: "x".repeat(43), password: "Strong!Reset9Pass", confirmPassword: "Other!Reset9Pass" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
