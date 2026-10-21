import { BadRequestException } from "@nestjs/common";

export const MAX_PHOTO_BYTES = 600_000;

/** Decodes a `data:image/jpeg;base64,…` selfie and checks it really is a JPEG/WebP image. */
export function parsePhotoDataUrl(dataUrl: string) {
  const match = /^data:(image\/(?:jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new BadRequestException("The photo must be a JPEG or WebP image.");
  const data = Buffer.from(match[2], "base64");
  if (data.length === 0 || data.length > MAX_PHOTO_BYTES)
    throw new BadRequestException("The photo is too large. Please try again.");
  const isJpeg = data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  const isWebp = data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP";
  if ((match[1] === "image/jpeg" && !isJpeg) || (match[1] === "image/webp" && !isWebp))
    throw new BadRequestException("The photo could not be read. Please try again.");
  return { contentType: match[1], data };
}
