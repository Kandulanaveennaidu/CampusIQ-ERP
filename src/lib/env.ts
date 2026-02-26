import { z } from "zod";

/**
 * Environment variable validation schema.
 * Validates ALL required env vars at startup to fail fast.
 */
const envSchema = z.object({
  // Required
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL").optional(),

  // Optional with defaults
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),

  // CORS
  CORS_ORIGINS: z.string().optional().default(""),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // File Upload (S3/Cloudinary)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_S3_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  // SMS/WhatsApp (Twilio)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().optional(),
  WHATSAPP_API_KEY: z.string().optional(),

  // Error Tracking
  SENTRY_DSN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),

  // Redis
  REDIS_URL: z.string().optional(),

  // Web Push (VAPID)
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),

  // AI (Gemini)
  GEMINI_API_KEY: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let cachedEnv: EnvConfig | null = null;

/**
 * Validate environment variables. Call at startup to fail fast.
 */
export function validateEnv(): EnvConfig {
  if (cachedEnv) return cachedEnv;

  try {
    cachedEnv = envSchema.parse(process.env);
    // Environment variables validated successfully
    return cachedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.issues
        .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
        .join("\n");

      // In production, block startup
      if (process.env.NODE_ENV === "production") {
        throw new Error(`Missing required environment variables:\n${missing}`);
      }
    }
    // In dev, return partial config with defaults
    cachedEnv = {
      MONGODB_URI: process.env.MONGODB_URI || "",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "",
      NODE_ENV:
        (process.env.NODE_ENV as "development" | "production" | "test") ||
        "development",
      LOG_LEVEL: "debug",
      CORS_ORIGINS: "",
    } as EnvConfig;
    return cachedEnv;
  }
}

/**
 * Get validated env config (cached)
 */
export function getEnv(): EnvConfig {
  return cachedEnv || validateEnv();
}
