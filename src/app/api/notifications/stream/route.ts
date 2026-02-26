import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import Notification from "@/lib/models/Notification";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { error, session } = await requireAuth("notifications:read");
  if (error) return error;

  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: Record<string, unknown>) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          if (intervalId) clearInterval(intervalId);
        }
      };

      sendEvent({ type: "connected", timestamp: new Date().toISOString() });
      let lastCheck = new Date();

      intervalId = setInterval(async () => {
        try {
          await connectDB();

          const query: Record<string, unknown> = {
            school: session.user.school_id,
            createdAt: { $gt: lastCheck },
          };

          const userRole = session.user.role;
          query.$or = [{ target_role: "all" }, { target_role: userRole }];

          const newNotifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

          if (newNotifications.length > 0) {
            lastCheck = new Date();
            const notifications = newNotifications.map((n) => ({
              notification_id: n._id.toString(),
              type: n.type,
              title: n.title,
              message: n.message,
              isRead:
                n.readBy?.some(
                  (id: { toString: () => string }) =>
                    id.toString() === session.user.id,
                ) || false,
              created_at: n.createdAt?.toISOString() || "",
            }));

            sendEvent({ type: "notifications", data: notifications });
          }

          sendEvent({ type: "heartbeat", timestamp: new Date().toISOString() });
        } catch (err) {
          logError("GET", "/api/notifications/stream", err);
        }
      }, 5000);

      request.signal.addEventListener("abort", () => {
        if (intervalId) clearInterval(intervalId);
        controller.close();
      });
    },
    cancel() {
      if (intervalId) clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
