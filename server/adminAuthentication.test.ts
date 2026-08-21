import { describe, expect, it } from "vitest";
import { ADMIN_AUTH_FACTOR_STATES, displayOwnerName } from "../shared/adminAuthentication";

describe("Admin authentication readiness", () => {
  it("does not represent unconfigured delivery or authenticator factors as active", () => {
    expect(ADMIN_AUTH_FACTOR_STATES.emailChallenge.status).toBe("unavailable");
    expect(ADMIN_AUTH_FACTOR_STATES.authenticator.status).toBe("unavailable");
    expect(ADMIN_AUTH_FACTOR_STATES.phone.status).toBe("unavailable");
  });

  it("prefers a saved owner profile name without requiring a provider-owned identity edit", () => {
    expect(displayOwnerName({ firstName: "Ada", lastName: "Okafor" }, "OAuth owner")).toBe("Ada Okafor");
    expect(displayOwnerName(null, "OAuth owner")).toBe("OAuth owner");
  });
});
