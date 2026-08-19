import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createFlashTopUpSignature, verifyFlashTopUpWebhook } from "./integrations/flashtopup";

describe("FlashTopUp v2 integration boundary", () => {
  it("signs a GET request from the documented method, canonical API path, timestamp, nonce, and empty-body hash", () => {
    const signed = createFlashTopUpSignature({
      method: "GET",
      path: "/api/reseller/v2/profile",
      timestamp: "1779211671",
      nonce: "nonce-100",
      body: "",
      apiSecret: "test-secret",
    });
    const bodyHash = createHash("sha256").update("").digest("hex");
    const expected = createHmac("sha256", "test-secret")
      .update(`GET\n/api/reseller/v2/profile\n1779211671\nnonce-100\n${bodyHash}`)
      .digest("hex");
    expect(signed.bodyHash).toBe(bodyHash);
    expect(signed.signature).toBe(expected);
  });

  it("verifies a timely raw-body supplier webhook and rejects replayed timestamps", () => {
    const rawBody = Buffer.from('{"event_id":"evt-1","reference_id":"VN-TEST"}');
    const timestamp = "1779211671";
    const secret = "test-secret";
    const signature = `sha256=${createHmac("sha256", secret).update(Buffer.concat([Buffer.from(`${timestamp}.`), rawBody])).digest("hex")}`;
    expect(verifyFlashTopUpWebhook({ rawBody, timestamp, signature, apiSecret: secret, now: 1_779_211_700_000 })).toBe(true);
    expect(verifyFlashTopUpWebhook({ rawBody, timestamp, signature, apiSecret: secret, now: 1_779_212_000_000 })).toBe(false);
  });
});
