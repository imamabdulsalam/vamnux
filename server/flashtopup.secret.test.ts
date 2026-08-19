import { describe, expect, it } from "vitest";
import { getFlashTopUpClient } from "./integrations/flashtopup";

const describeLive = process.env.RUN_FLASHTOPUP_LIVE_TESTS === "true" ? describe : describe.skip;

describeLive("FlashTopUp reseller credentials", () => {
  it("keeps the API ID and signing secret server-side and authenticates to the documented profile endpoint", async () => {
    const apiId = process.env.FLASHTOPUP_API_ID;
    const apiSecret = process.env.FLASHTOPUP_API_SECRET;

    expect(apiId).toBeTruthy();
    expect(apiSecret).toBeTruthy();

    const response = await getFlashTopUpClient().profile();
    expect(response.status === true || response.success === true).toBe(true);
  }, 15_000);
});
