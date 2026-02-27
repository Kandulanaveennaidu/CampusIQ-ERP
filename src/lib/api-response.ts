// ─── Standardized API Response Helpers ───────────────────────────────────────
// Use these helpers in all API routes for consistent response format.
//
// Success: { success: true, data: { ... }, message?: "..." }
// Error:   { success: false, error: "Human-readable message", code?: "ERROR_CODE" }
// List:    { success: true, data: [...], pagination: { page, limit, total, pages } }

import { NextResponse } from "next/server";

/**
 * Standard success response
 */
export function apiSuccess<T>(data: T, status = 200, message?: string) {
  return NextResponse.json(
    { success: true, data, ...(message ? { message } : {}) },
    { status },
  );
}

/**
 * Standard created response (201)
 */
export function apiCreated<T>(data: T, message?: string) {
  return apiSuccess(data, 201, message);
}

/**
 * Standard error response
 */
export function apiError(message: string, status = 400, code?: string) {
  return NextResponse.json(
    { success: false, error: message, ...(code ? { code } : {}) },
    { status },
  );
}

/**
 * Standard list response with pagination
 */
export function apiList<T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  },
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: Math.ceil(pagination.total / pagination.limit),
    },
    ...extra,
  });
}

/**
 * Common error codes for consistent error handling
 */
export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  DUPLICATE_EMAIL: "DUPLICATE_EMAIL",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  PLAN_LIMIT_REACHED: "PLAN_LIMIT_REACHED",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  SELF_ACTION_DENIED: "SELF_ACTION_DENIED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
} as const;

/**
 * Pre-built common error responses
 */
export const CommonErrors = {
  notFound: (entity = "Resource") =>
    apiError(`${entity} not found`, 404, ErrorCodes.NOT_FOUND),

  duplicateEmail: () =>
    apiError(
      "A user with this email already exists",
      409,
      ErrorCodes.DUPLICATE_EMAIL,
    ),

  unauthorized: () =>
    apiError("Authentication required", 401, ErrorCodes.UNAUTHORIZED),

  forbidden: (message = "You do not have permission to perform this action") =>
    apiError(message, 403, ErrorCodes.FORBIDDEN),

  selfActionDenied: (action = "perform this action on") =>
    apiError(
      `You cannot ${action} your own account`,
      400,
      ErrorCodes.SELF_ACTION_DENIED,
    ),

  internalError: (entity = "resource") =>
    apiError(`Failed to process ${entity}`, 500, ErrorCodes.INTERNAL_ERROR),

  planLimitReached: (role: string, limit: number, planName: string) =>
    apiError(
      `${role} limit (${limit}) reached for the ${planName} plan. Please upgrade to add more.`,
      403,
      ErrorCodes.PLAN_LIMIT_REACHED,
    ),
} as const;
