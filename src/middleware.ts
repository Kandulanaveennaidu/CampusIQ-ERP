import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { rateLimit } from "@/lib/rate-limit";
import { applyCorsHeaders, handlePreflight, isPreflight } from "@/lib/cors";
import { validateCSRF } from "@/lib/csrf";
import {
  PATH_MODULE_MAP,
  getAccessibleModules,
  type PlanId,
} from "@/lib/plans";

// Security headers applied to ALL responses
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none';",
};

// Rate limit configs by path pattern
const RATE_LIMITS: { pattern: RegExp; limit: number; windowMs: number }[] = [
  // NextAuth internal endpoints — generous (session checks, CSRF, etc.)
  {
    pattern: /^\/api\/auth\/(session|csrf|providers|callback)/,
    limit: 60,
    windowMs: 60_000,
  },
  // Registration: strict — 10 per 5 minutes
  { pattern: /^\/api\/auth\/register/, limit: 10, windowMs: 300_000 },
  // Login / password reset: moderate — 20 per minute
  { pattern: /^\/api\/auth\//, limit: 20, windowMs: 60_000 },
  // User management: moderate
  { pattern: /^\/api\/users/, limit: 60, windowMs: 60_000 },
  // General API: 120 requests per minute
  { pattern: /^\/api\//, limit: 120, windowMs: 60_000 },
];

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.ip ||
    "unknown"
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS preflight requests
  if (isPreflight(request)) {
    const preflightResponse = handlePreflight(request);
    for (const [key, value] of Object.entries(securityHeaders)) {
      preflightResponse.headers.set(key, value);
    }
    return preflightResponse;
  }

  // ── Plan-based route guard for dashboard pages ──
  // Check if authenticated user is trying to access a module not in their plan
  const isDashboardPage =
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/register") &&
    !pathname.startsWith("/plans") &&
    !pathname.startsWith("/forgot-password") &&
    !pathname.startsWith("/reset-password") &&
    pathname !== "/";

  if (isDashboardPage) {
    try {
      const token = await getToken({ req: request });
      
      // Enforce authentication
      if (!token) {
        const url = new URL("/login", request.url);
        url.searchParams.set("callbackUrl", encodeURI(request.url));
        return NextResponse.redirect(url);
      }

      if (token) {
        // Redirect expired/cancelled subscriptions to plans page
        const subStatus = token.subscriptionStatus as string;
        if (subStatus === "expired" || subStatus === "cancelled") {
          if (pathname !== "/plans") {
            return NextResponse.redirect(new URL("/plans", request.url));
          }
        }

        // Check module access for the current path
        const plan = (token.plan as PlanId) || "starter";
        const allowedModules = (token.allowedModules as string[]) || [];
        const accessibleModules = getAccessibleModules(plan, allowedModules);

        // Find which module this path requires
        const pathKey = Object.keys(PATH_MODULE_MAP).find((p) =>
          pathname.startsWith(p),
        );
        if (pathKey) {
          const requiredModule = PATH_MODULE_MAP[pathKey];
          if (!accessibleModules.includes(requiredModule)) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
          }
        }
      }
    } catch {
      // Token parsing failed — redirect to login
      const url = new URL("/login", request.url);
      url.searchParams.set("callbackUrl", encodeURI(request.url));
      return NextResponse.redirect(url);
    }
  }

  // Only apply rate limiting to API routes
  if (pathname.startsWith("/api")) {
    // CSRF protection for mutating API requests
    if (!pathname.startsWith("/api/auth/")) {
      const csrfError = validateCSRF(request);
      if (csrfError) return csrfError;
    }

    const ip = getClientIP(request);

    // Find matching rate limit config (first match wins, most specific first)
    for (const config of RATE_LIMITS) {
      if (config.pattern.test(pathname)) {
        const result = rateLimit(
          `${ip}:${config.pattern.source}`,
          config.limit,
          config.windowMs,
        );

        if (!result.success) {
          return new NextResponse(
            JSON.stringify({
              error: "Too many requests. Please try again later.",
            }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": String(
                  Math.ceil((result.resetAt - Date.now()) / 1000),
                ),
                "X-RateLimit-Limit": String(result.limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
                ...securityHeaders,
              },
            },
          );
        }

        // Add rate limit info to response headers
        const response = NextResponse.next();
        response.headers.set("X-RateLimit-Limit", String(result.limit));
        response.headers.set("X-RateLimit-Remaining", String(result.remaining));
        response.headers.set(
          "X-RateLimit-Reset",
          String(Math.ceil(result.resetAt / 1000)),
        );

        // Add security headers
        for (const [key, value] of Object.entries(securityHeaders)) {
          response.headers.set(key, value);
        }

        // Add CORS headers
        applyCorsHeaders(request, response);

        // Add API version header
        response.headers.set("X-API-Version", "v1");

        return response;
      }
    }
  }

  // Non-API routes: just add security headers
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }
  applyCorsHeaders(request, response);
  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files and _next
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
