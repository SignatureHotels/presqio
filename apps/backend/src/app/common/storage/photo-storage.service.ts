import { randomUUID } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * Check-in selfies in a private Backblaze B2 bucket (S3 API). Objects are never public: admins
 * view them through the API, which checks access. The bucket's lifecycle rule deletes objects
 * under `selfies/` after the retention period. When B2 isn't configured, `enabled` is false and
 * callers keep the photo in the database instead.
 */
@Injectable()
export class PhotoStorageService {
  private readonly logger = new Logger("PhotoStorage");
  private readonly client: S3Client | null;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    const endpoint = config.get<string>("B2_ENDPOINT");
    this.bucket = config.get<string>("B2_BUCKET") ?? "";
    this.client = endpoint
      ? new S3Client({
          endpoint,
          region: config.get<string>("B2_REGION"),
          credentials: {
            accessKeyId: config.getOrThrow<string>("B2_KEY_ID"),
            secretAccessKey: config.getOrThrow<string>("B2_APPLICATION_KEY"),
          },
          // B2 does not accept the SDK's default extra checksum headers.
          requestChecksumCalculation: "WHEN_REQUIRED",
          responseChecksumValidation: "WHEN_REQUIRED",
        })
      : null;
    if (!this.client) this.logger.warn("B2 is not configured; selfies are stored in the database.");
  }

  get enabled() {
    return this.client !== null;
  }

  /** `selfies/<business>/<YYYY-MM-DD>/<attempt>-<upload>.<ext>`; the prefix is what the lifecycle rule targets. */
  keyFor(businessId: string, attemptId: string, contentType: string) {
    const day = new Date().toISOString().slice(0, 10);
    // Each submission owns its object. A rejected retry must never overwrite or delete
    // the original selfie already attached to a successful attempt.
    return `selfies/${businessId}/${day}/${attemptId}-${randomUUID()}.${contentType === "image/webp" ? "webp" : "jpg"}`;
  }

  async put(key: string, data: Buffer, contentType: string) {
    await this.s3().send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data, ContentType: contentType }),
    );
  }

  /** The photo bytes, or null once the lifecycle rule has deleted it. */
  async get(key: string): Promise<Buffer | null> {
    try {
      const object = await this.s3().send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      return Buffer.from(await object.Body!.transformToByteArray());
    } catch (error) {
      if (error instanceof NoSuchKey) return null;
      throw error;
    }
  }

  /** Best effort: an orphaned object is removed by the lifecycle rule anyway. */
  async remove(key: string) {
    try {
      await this.s3().send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (error) {
      this.logger.warn(`Could not delete ${key}: ${(error as Error).name}`);
    }
  }

  private s3() {
    if (!this.client) throw new Error("B2 is not configured");
    return this.client;
  }
}
