import { describe, expect, it, vi } from "vitest";
import { createResendTransactionalEmailClient } from "./resend";

const input = {
  to: "member@example.com",
  subject: "Confirm your VAMNUX account",
  html: "<p>Confirm your account.</p>",
  text: "Confirm your account.",
  idempotencyKey: "vamnux-enrollment-42",
};

describe("Resend transactional email client", () => {
  it("uses a server-only bearer key and a provider idempotency key without returning either", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), { status: 200 })
    );
    const send = createResendTransactionalEmailClient({
      apiKey: "re_test_server_only_key",
      from: "VAMNUX <no-reply@send.vamnux.com>",
      fetchImpl,
    });

    await expect(send(input)).resolves.toEqual({ providerMessageId: "email_123" });

    const [, request] = fetchImpl.mock.calls[0];
    expect(request?.headers).toMatchObject({
      Authorization: "Bearer re_test_server_only_key",
      "Idempotency-Key": "vamnux-enrollment-42",
    });
    expect(request?.body).not.toContain("re_test_server_only_key");
  });

  it("rejects invalid recipients and configuration before contacting Resend", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const send = createResendTransactionalEmailClient({
      apiKey: "re_test_server_only_key",
      from: "VAMNUX <no-reply@send.vamnux.com>",
      fetchImpl,
    });

    await expect(send({ ...input, to: "not-an-email" })).rejects.toThrow("recipient");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
