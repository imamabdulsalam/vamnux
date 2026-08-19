import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { getFlashTopUpClient } from "./integrations/flashtopup";

const describeSandbox = process.env.RUN_FLASHTOPUP_SANDBOX_TEST === "true" ? describe : describe.skip;

describeSandbox("FlashTopUp sandbox order", () => {
  it("creates and retrieves an isolated sandbox order without a payment, wallet debit, or live fulfilment request", async () => {
    const referenceId = `VAMNUX-SANDBOX-${randomUUID().slice(0, 12).toUpperCase()}`;
    const client = getFlashTopUpClient();
    const created = await client.createSandboxOrder({
      service_code: "TOPUP_MOBILE_LEGENDS_86_DIAMONDS",
      reference_id: referenceId,
      user_id: "123456789",
      server_id: "500001",
    });
    expect(created.status === true || created.success === true).toBe(true);
    const status = await client.orderStatus({ referenceId }, true);
    expect(status.status === true || status.success === true).toBe(true);
  }, 30_000);
});
