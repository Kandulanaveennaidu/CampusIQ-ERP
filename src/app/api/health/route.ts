import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  const checks: Record<
    string,
    { status: string; latencyMs?: number; error?: string }
  > = {};

  // Check MongoDB
  try {
    const dbStart = Date.now();
    await connectDB();
    const state = mongoose.connection.readyState;
    // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    const stateNames = [
      "disconnected",
      "connected",
      "connecting",
      "disconnecting",
    ];
    checks.database = {
      status: state === 1 ? "healthy" : "unhealthy",
      latencyMs: Date.now() - dbStart,
    };
    if (state !== 1) {
      checks.database.error = `MongoDB state: ${stateNames[state]}`;
    }
  } catch (error) {
    checks.database = {
      status: "unhealthy",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Check environment variables
  const requiredEnvVars = ["MONGODB_URI", "NEXTAUTH_SECRET", "NEXTAUTH_URL"];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  checks.environment = {
    status: missingVars.length === 0 ? "healthy" : "warning",
    ...(missingVars.length > 0 && {
      error: `Missing: ${missingVars.join(", ")}`,
    }),
  };

  // Check SMTP (optional)
  checks.email = {
    status:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? "configured"
        : "not_configured",
  };

  // Overall status
  const isHealthy = checks.database.status === "healthy";
  const totalLatencyMs = Date.now() - start;

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "unhealthy",
      version: process.env.npm_package_version || "0.1.0",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      latencyMs: totalLatencyMs,
      checks,
    },
    { status: isHealthy ? 200 : 503 },
  );
}
