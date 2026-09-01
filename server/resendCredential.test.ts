import { describe, expect, it } from "vitest";

const shouldRunCredentialCheck = process.env.RUN_RESEND_CREDENTIAL_CHECK === "true";

describe("Resend credential configuration", () => {
  it.runIf(shouldRunCredentialCheck)("authenticates to the non-mutating domains endpoint", async () => {
    const apiKey = process.env.RESEND_API_KEY;

    expect(apiKey, "RESEND_API_KEY must be configured server-side").toMatch(/^re_[A-Za-z0-9_]+$/);

    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    expect(response.ok, "Resend domains endpoint must accept the configured API key").toBe(true);
  });
});
