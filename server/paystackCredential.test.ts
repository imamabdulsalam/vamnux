import { describe, expect, it } from "vitest";

const integrationTest = process.env.PAYSTACK_CREDENTIAL_TEST === "1" ? it : it.skip;

describe("Paystack TEST credential", () => {
  it("uses a server-side HTTPS callback that returns to the Wallet tab", () => {
    const callbackUrl = new URL(process.env.PAYSTACK_TEST_CALLBACK_URL || "");
    expect(callbackUrl.protocol).toBe("https:");
    expect(callbackUrl.pathname).toBe("/account");
    expect(callbackUrl.searchParams.get("tab")).toBe("wallet");
  });

  integrationTest("authenticates a non-mutating balance request with the server-only test secret", async () => {
    const secret = process.env.PAYSTACK_TEST_SECRET_KEY;
    expect(secret).toMatch(/^sk_test_/);

    const response = await fetch("https://api.paystack.co/balance", {
      headers: { Authorization: `Bearer ${secret}` },
    });

    expect(response.ok).toBe(true);
    const payload = (await response.json()) as { status?: boolean };
    expect(payload.status).toBe(true);
  }, 20_000);
});
