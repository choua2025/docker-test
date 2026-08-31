/**
 * Reads and validates every environment variable the API needs.
 *
 * The app refuses to start if something is missing or obviously unsafe.
 * Failing loudly at boot is much better than discovering a missing
 * JWT_SECRET when the first student tries to log in.
 */
import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(9000),
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
  JWT_EXPIRES_IN: z.string().default("2h"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  // Empty string means "no code required".
  TEACHER_REGISTRATION_CODE: z.string().default(""),

  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  ADMIN_NAME: z.string().default("Administrator"),
  ADMIN_EMAIL: z.string().email().default("admin@laolearn.la"),
  ADMIN_PASSWORD: z.string().default(""),

  // Cloudinary holds lesson attachments (PDF / video / image).
  // Left empty the app still runs - only file upload is switched off.
  CLOUDINARY_CLOUD_NAME: z.string().default(""),
  CLOUDINARY_API_KEY: z.string().default(""),
  CLOUDINARY_API_SECRET: z.string().default(""),
  // Everything is uploaded under this folder, so the account stays tidy.
  CLOUDINARY_FOLDER: z.string().default("laolearn/lessons"),
  // Refuse anything larger than this before it reaches Cloudinary (MB).
  UPLOAD_MAX_MB: z.coerce.number().int().min(1).max(500).default(100),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("\n[env] Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  console.error("\nCopy backend/.env.example to backend/.env and fill it in.\n");
  process.exit(1);
}

const data = parsed.data;

export const env = {
  ...data,
  isProduction: data.NODE_ENV === "production",
  /** CORS_ORIGIN is a comma-separated list; turn it into an array. */
  corsOrigins: data.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  /** Teacher self-registration is gated only when a code is configured. */
  teacherCodeRequired: data.TEACHER_REGISTRATION_CODE.length > 0,
  /** File upload needs all three Cloudinary values; otherwise it stays off. */
  cloudinaryConfigured: Boolean(
    data.CLOUDINARY_CLOUD_NAME && data.CLOUDINARY_API_KEY && data.CLOUDINARY_API_SECRET,
  ),
};
