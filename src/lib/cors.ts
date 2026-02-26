import { NextRequest, NextResponse } from "next/server";

const DEFAULT_ALLOWED_ORIGINS: string[] = [];

function getAllowedOrigins(): string[] {
  const envOrigins = process.env.CORS_ORIGINS;
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL;
  const baseOrigins: string[] = [];

  // In development, allow localhost
  if (process.env.NODE_ENV !== "production") {
    baseOrigins.push("http://localhost:3000", "http://localhost:3001");
  }

  // Always add APP_URL if set
  if (appUrl) {
    baseOrigins.push(appUrl);
  }

  if (envOrigins) {
    return [
      ...baseOrigins,
      ...envOrigins
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    ];
  }
  return baseOrigins;
}

/**
 * Apply CORS headers to a response.
 */
export function applyCorsHeaders(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const origin = request.headers.get("origin");
  const allowedOrigins = getAllowedOrigins();

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  } else if (allowedOrigins.includes("*")) {
    // Wildcard cannot be used with credentials
    response.headers.set("Access-Control-Allow-Origin", "*");
  }

  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, X-API-Version",
  );
  // Only set credentials when we have a specific origin (not wildcard)
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }
  response.headers.set("Access-Control-Max-Age", "86400");

  return response;
}

/**
 * Handle CORS preflight (OPTIONS) requests.
 */
export function handlePreflight(request: NextRequest): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return applyCorsHeaders(request, response);
}

/**
 * Check if request is a CORS preflight
 */
export function isPreflight(request: NextRequest): boolean {
  return (
    request.method === "OPTIONS" &&
    request.headers.has("origin") &&
    request.headers.has("access-control-request-method")
  );
}
