import { NextRequest, NextResponse } from "next/server";
import {
  autoExpireTrials,
  sendFeeReminders,
  cleanExpiredTokens,
  dailyAttendanceReport,
} from "@/lib/cron";
import { startScheduler, isSchedulerActive, getJobLog } from "@/lib/scheduler";
import { logError } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    const action = searchParams.get("action");

    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || secret !== cronSecret) {
      return NextResponse.json(
        { error: "Unauthorized — invalid CRON_SECRET" },
        { status: 401 },
      );
    }

    // Start the built-in scheduler if requested
    if (action === "start-scheduler") {
      const started = startScheduler();
      return NextResponse.json({
        success: true,
        schedulerActive: isSchedulerActive(),
        message: started
          ? "Scheduler started"
          : "Scheduler was already running",
        recentLog: getJobLog().slice(-10),
      });
    }

    // Check scheduler status
    if (action === "status") {
      return NextResponse.json({
        success: true,
        schedulerActive: isSchedulerActive(),
        recentLog: getJobLog().slice(-10),
      });
    }

    // Auto-start scheduler on first cron call
    startScheduler();

    const results = await Promise.allSettled([
      autoExpireTrials(),
      sendFeeReminders(),
      cleanExpiredTokens(),
      dailyAttendanceReport(),
    ]);

    const data = results.map((r) =>
      r.status === "fulfilled"
        ? r.value
        : { job: "unknown", success: false, message: String(r.reason) },
    );

    const allSucceeded = data.every((d) => d.success);

    return NextResponse.json({
      success: allSucceeded,
      timestamp: new Date().toISOString(),
      results: data,
    });
  } catch (error) {
    logError("GET", "/api/cron", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}