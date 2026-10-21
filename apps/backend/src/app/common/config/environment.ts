import { z } from "zod";
const DEV_JWT_SECRET = "presqio-dev-only-access-secret-change-me";
/** Blank values in .env (e.g. `SMTP_HOST=`) count as unset. */
const optional = <T extends z.ZodType>(type: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), type.optional());
const schema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(8080),
    UI_ORIGIN: z.url().default("http://localhost:300"),
    /** Public frontend URL used in emailed links; defaults to UI_ORIGIN. */
    APP_URL: optional(z.url()),
    DATABASE_URL: z
      .string()
      .regex(/^postgres(ql)?:\/\//)
      .default(
        "postgresql://presqio:presqio_local@localhost:5432/presqio?schema=public&connect_timeout=3",
      ),
    REDIS_URL: z.url().default("redis://localhost:6379"),
    AWS_REGION: z.string().default("ap-south-1"),
    JWT_SECRET: optional(z.string().min(32, "JWT_SECRET must be at least 32 characters")),
    /** Older name for JWT_SECRET, still accepted. */
    JWT_ACCESS_SECRET: optional(z.string().min(32)),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).default(30),
    SMTP_HOST: optional(z.string()),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_USER: optional(z.string()),
    SMTP_PASS: optional(z.string()),
    /** Sender shown to recipients, e.g. `Presqio <no-reply@presqio.com>`. Defaults to SMTP_USER. */
    MAIL_FROM: optional(z.string()),
    /** Selfie storage (Backblaze B2, S3-compatible). All unset = selfies stay in the database. */
    B2_ENDPOINT: optional(z.url()),
    B2_REGION: optional(z.string()),
    B2_BUCKET: optional(z.string()),
    B2_KEY_ID: optional(z.string()),
    B2_APPLICATION_KEY: optional(z.string()),
  })
  .transform((env) => ({
    ...env,
    APP_URL: env.APP_URL ?? env.UI_ORIGIN,
    JWT_SECRET: env.JWT_SECRET ?? env.JWT_ACCESS_SECRET ?? DEV_JWT_SECRET,
    // Gmail shows app passwords in groups of four; the spaces are not part of it.
    SMTP_PASS: env.SMTP_PASS?.replace(/\s+/g, ""),
  }))
  .refine((env) => env.NODE_ENV !== "production" || env.JWT_SECRET !== DEV_JWT_SECRET, {
    path: ["JWT_SECRET"],
    message: "Set JWT_SECRET in production",
  })
  .refine(
    (env) => {
      const b2 = [env.B2_ENDPOINT, env.B2_REGION, env.B2_BUCKET, env.B2_KEY_ID, env.B2_APPLICATION_KEY];
      return b2.every(Boolean) || !b2.some(Boolean);
    },
    { path: ["B2_KEY_ID"], message: "Set all of B2_ENDPOINT, B2_REGION, B2_BUCKET, B2_KEY_ID and B2_APPLICATION_KEY, or none" },
  )
  .refine((env) => !env.SMTP_HOST || (env.SMTP_USER && env.SMTP_PASS), {
    path: ["SMTP_USER"],
    message: "SMTP_HOST is set, so SMTP_USER and SMTP_PASS are required",
  });
export type Environment = z.infer<typeof schema>;
export const validateEnvironment = (env: Record<string, unknown>) =>
  schema.parse(env);
