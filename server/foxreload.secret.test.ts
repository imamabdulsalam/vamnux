import { describe, expect, it } from "vitest";
import { getFoxReloadClient } from "./integrations/foxreload";

describe("FoxReload configured API key", () => {
  it("authenticates the server-only key against the official access profile endpoint", async () => {
    const client = getFoxReloadClient();
    const profile = await client.profile();
    expect(profile).toBeTruthy();
    expect(typeof profile).toBe("object");
  }, 20_000);
});
