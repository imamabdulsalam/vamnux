import { describe, expect, it } from "vitest";
import { decodeManualProductImage } from "../shared/manualProductImage";

describe("manual product image validation", () => {
  it("accepts a PNG payload with the expected image signature", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(decodeManualProductImage({ contentType: "image/png", dataBase64: png.toString("base64") }).extension).toBe("png");
  });

  it("rejects a mismatched media type and image signature", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
    expect(() => decodeManualProductImage({ contentType: "image/png", dataBase64: jpeg.toString("base64") })).toThrow("valid PNG, JPEG, or WebP");
  });
});
