import { describe, expect, it } from "vitest";
import { getFlashTopUpClient } from "./integrations/flashtopup";

const describeLive = process.env.RUN_FLASHTOPUP_LIVE_TESTS === "true" ? describe : describe.skip;

describeLive("FlashTopUp reseller balance contract", () => {
  it("reads the authenticated reseller balance without exposing amount or account details", async () => {
    const response = await getFlashTopUpClient().balance();
    expect(response.status === true || response.success === true).toBe(true);
  }, 15_000);
});
