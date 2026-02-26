// ─── CampusIQ Application Configuration ──────────────────────────────────────
// Centralized config for magic numbers and constants used across the codebase.
// Move values here instead of hardcoding them in individual files.

// ── Authentication ──
export const AUTH_CONFIG = {
  /** Number of bcrypt hashing rounds for password storage */
  BCRYPT_ROUNDS: 12,

  /** Maximum failed login attempts before account lockout */
  MAX_LOGIN_ATTEMPTS: 5,

  /** Account lockout duration in milliseconds (15 minutes) */
  LOCKOUT_DURATION_MS: 15 * 60 * 1000,

  /** JWT session max age in seconds (24 hours) */
  SESSION_MAX_AGE: 24 * 60 * 60,

  /** Password reset token expiry in hours */
  PASSWORD_RESET_EXPIRY_HOURS: 1,

  /** Email verification token expiry in hours */
  EMAIL_VERIFICATION_EXPIRY_HOURS: 24,

  /** Invitation token expiry in hours (72 hours = 3 days) */
  INVITATION_EXPIRY_HOURS: 72,
} as const;

// ── Subscription & Billing ──
export const SUBSCRIPTION_CONFIG = {
  /** Default trial duration in days */
  TRIAL_DAYS: 7,

  /** Default plan for new schools */
  DEFAULT_PLAN: "starter" as const,

  /** Default subscription status for new schools */
  DEFAULT_STATUS: "trial" as const,
} as const;

// ── Rate Limiting ──
export const RATE_LIMIT_CONFIG = {
  /** NextAuth internal endpoints — generous (session checks, CSRF, etc.) */
  NEXTAUTH_INTERNAL: { limit: 60, windowMs: 60_000 },

  /** Registration: strict */
  REGISTRATION: { limit: 10, windowMs: 300_000 },

  /** Login / password reset: moderate */
  AUTH_ROUTES: { limit: 20, windowMs: 60_000 },

  /** User management: moderate */
  USER_MANAGEMENT: { limit: 60, windowMs: 60_000 },

  /** General API */
  GENERAL_API: { limit: 120, windowMs: 60_000 },
} as const;

// ── Pagination ──
export const PAGINATION_CONFIG = {
  /** Default page size for list endpoints */
  DEFAULT_PAGE_SIZE: 20,

  /** Maximum page size for list endpoints */
  MAX_PAGE_SIZE: 100,

  /** Default page size for admin user listing */
  ADMIN_DEFAULT_PAGE_SIZE: 50,
} as const;

// ── Security ──
export const SECURITY_CONFIG = {
  /** Minimum password length */
  MIN_PASSWORD_LENGTH: 6,

  /** Maximum password length */
  MAX_PASSWORD_LENGTH: 128,

  /** Token byte length for generating random tokens */
  TOKEN_BYTE_LENGTH: 32,
} as const;
