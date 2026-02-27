/**
 * Socket.IO initialization via Next.js API route.
 * This endpoint is needed for Socket.IO's initial handshake
 * when the custom server is not used (development fallback).
 *
 * In production, the custom server.js handles Socket.IO directly.
 * This route ensures compatibility in both modes.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  // Socket.IO connections are handled by server.js
  // This endpoint exists so Next.js doesn't 404 on /api/socketio
  return NextResponse.json({
    success: true,
    message: "Socket.IO endpoint — connect via WebSocket client",
    path: "/api/socketio",
  });
}
