import { describe, expect, it } from "vitest";
import { suspensionEndFromPreset } from "../shared/customerControls";

describe("customer suspension control presets", () => {
  it("calculates bounded suspension end dates and preserves permanent review restrictions", () => {
    const start = new Date("2026-08-21T10:00:00.000Z");
    expect(suspensionEndFromPreset("7d", start)?.toISOString()).toBe("2026-08-28T10:00:00.000Z");
    expect(suspensionEndFromPreset("30d", start)?.toISOString()).toBe("2026-09-20T10:00:00.000Z");
    expect(suspensionEndFromPreset("1y", start)?.toISOString()).toBe("2027-08-21T10:00:00.000Z");
    expect(suspensionEndFromPreset("permanent", start)).toBeNull();
  });
});
