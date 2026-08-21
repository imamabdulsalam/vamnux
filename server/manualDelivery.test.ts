import { describe, expect, it } from "vitest";
import { formatManualDeliveryWindow, isManualDeliveryTransitionAllowed, manualDeliveryMinutesFromMetadata } from "../shared/manualDelivery";

describe("VAMNUX manual delivery helpers", () => {
  it("formats stored delivery estimates in customer-readable hours without claiming a guarantee", () => {
    expect(formatManualDeliveryWindow(120, 360)).toBe("2 hours–6 hours");
    expect(formatManualDeliveryWindow(null, 90)).toBe("Up to 1.5 hours");
    expect(formatManualDeliveryWindow(null, null)).toBe("Timing to be confirmed by VAMNUX");
  });

  it("accepts only the guarded owner-delivery state progression", () => {
    expect(isManualDeliveryTransitionAllowed("pending_payment", "pending_review")).toBe(true);
    expect(isManualDeliveryTransitionAllowed("pending_review", "in_progress")).toBe(true);
    expect(isManualDeliveryTransitionAllowed("in_progress", "completed")).toBe(true);
    expect(isManualDeliveryTransitionAllowed("completed", "in_progress")).toBe(false);
    expect(isManualDeliveryTransitionAllowed("cancelled", "pending_review")).toBe(false);
  });

  it("uses only valid positive whole-minute delivery values from Admin-managed product metadata", () => {
    expect(manualDeliveryMinutesFromMetadata({ deliveryMinimumMinutes: 60, deliveryMaximumMinutes: 240 })).toEqual({ minimumMinutes: 60, maximumMinutes: 240 });
    expect(manualDeliveryMinutesFromMetadata({ deliveryMinimumMinutes: "not-a-number", deliveryMaximumMinutes: 0 })).toEqual({ minimumMinutes: null, maximumMinutes: null });
  });
});
