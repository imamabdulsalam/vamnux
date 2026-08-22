import { describe, expect, it } from "vitest";
import { newsletterInterestSubscribers } from "../drizzle/schema";

describe("newsletter interest model", () => {
  it("records an email with explicit consent metadata and no delivery-provider fields", () => {
    expect(newsletterInterestSubscribers.email.notNull).toBe(true);
    expect(newsletterInterestSubscribers.consentedAt.notNull).toBe(true);
    expect(newsletterInterestSubscribers.status.notNull).toBe(true);
    expect(Object.keys(newsletterInterestSubscribers)).not.toContain("deliveryProvider");
    expect(Object.keys(newsletterInterestSubscribers)).not.toContain("sentAt");
  });
});
