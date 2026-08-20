import { describe, expect, it } from "vitest";

describe("GamesDrop Shop API credential", () => {
  it("authorizes the documented read-only catalog-sync endpoint", async () => {
    const token = process.env.GAMESDROP_API_TOKEN;
    expect(token, "GAMESDROP_API_TOKEN must be configured for GamesDrop catalog sync").toBeTruthy();

    const response = await fetch("https://partner.gamesdrop.io/api/v1/offers/sync", {
      method: "POST",
      headers: { Authorization: token!, "Content-Type": "application/json" },
      body: JSON.stringify({ page: 1, limit: 1, countryCode: "NG" }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await response.text();
    expect(response.status, body.slice(0, 300)).toBe(200);
    const payload = JSON.parse(body) as { count?: number; rows?: unknown[] };
    expect(typeof payload.count).toBe("number");
    expect(Array.isArray(payload.rows)).toBe(true);
  }, 20_000);
});
