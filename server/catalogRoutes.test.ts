import { describe, expect, it } from "vitest";
import { decodeGameFamilySegment, gameFamilyPath } from "../shared/catalogRoutes";

describe("supplier game family routes", () => {
  it("encodes and decodes real game-family names for detail pages", () => {
    const name = "Free Fire Middle East";
    expect(gameFamilyPath(name)).toBe("/games/Free%20Fire%20Middle%20East");
    expect(decodeGameFamilySegment("Free%20Fire%20Middle%20East")).toBe(name);
  });

  it("rejects missing or malformed family route segments", () => {
    expect(decodeGameFamilySegment(undefined)).toBeNull();
    expect(decodeGameFamilySegment("%E0%A4%A")).toBeNull();
  });
});
