/**
 * CSRF Protection for custom API routes.
 * Validates that mutating requests (POST, PUT, PATCH, DELETE) come from same origin.
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Validates CSRF by checking Origin/Referer header matches the app's URL.
 * Returns null if valid, or an error response if invalid.
 */
export function validateCSRF(request: NextRequest): NextResponse | null {
  const method = request.method.toUpperCase();

  // Only check mutating methods
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return null;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  // In production, require at least Origin or Referer for mutating requests.
  // In development, allow requests without either (Postman, curl, etc.)
  if (!origin && !referer) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "CSRF validation failed — missing Origin header" },
        { status: 403 },
      );
    }
    // Dev/test: allow server-to-server calls
    return null;
  }

  const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || "";
  const allowedHosts = new Set<string>();

  if (host) allowedHosts.add(host);
  if (appUrl) {
    try {
      allowedHosts.add(new URL(appUrl).host);
    } catch {
      // Invalid URL — skip
    }
  }

  // Check origin header
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (allowedHosts.has(originHost)) return null;
    } catch {
      // Invalid origin
    }
  }

  // Check referer header as fallback
  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      if (allowedHosts.has(refererHost)) return null;
    } catch {
      // Invalid referer
    }
  }

  return NextResponse.json(
    { error: "CSRF validation failed" },
    { status: 403 },
  );
}
