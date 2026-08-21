export const manualProductImageContentTypes = ["image/png", "image/jpeg", "image/webp"] as const;

export type ManualProductImageContentType = (typeof manualProductImageContentTypes)[number];

const MAX_MANUAL_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

function hasExpectedImageSignature(bytes: Buffer, contentType: ManualProductImageContentType) {
  if (contentType === "image/png") {
    return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  return bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
}

export function decodeManualProductImage(input: { contentType: ManualProductImageContentType; dataBase64: string }) {
  const compactBase64 = input.dataBase64.replace(/\s/g, "");
  if (!compactBase64 || compactBase64.length > 7_000_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(compactBase64)) {
    throw new Error("Upload a valid PNG, JPEG, or WebP image no larger than 5 MB");
  }

  const bytes = Buffer.from(compactBase64, "base64");
  if (!bytes.length || bytes.length > MAX_MANUAL_PRODUCT_IMAGE_BYTES || !hasExpectedImageSignature(bytes, input.contentType)) {
    throw new Error("Upload a valid PNG, JPEG, or WebP image no larger than 5 MB");
  }

  const extension = input.contentType === "image/png" ? "png" : input.contentType === "image/jpeg" ? "jpg" : "webp";
  return { bytes, extension };
}
