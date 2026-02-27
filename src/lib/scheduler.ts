/**
 * Cron Scheduler
 * Runs the 4 cron jobs on schedule using setInterval.
 * This scheduler is initialized on first /api/cron call
 * or can be started at app boot.
 *
 * Schedule:
 * - autoExpireTrials: every 6 hours
 * - sendFeeReminders: every day at check (every 12 hours)
 * - cleanExpiredTokens: every 24 hours
 * - dailyAttendanceReport: every 24 hours
 */

import {
  autoExpireTrials,
  sendFeeReminders,
  cleanExpiredTokens,
  dailyAttendanceReport,
  type CronResult,
} from "@/lib/cron";

let isSchedulerRunning = false;
const intervals: NodeJS.Timeout[] = [];
const jobLog: CronResult[] = [];

const SIX_HOURS = 6 * 60 * 60 * 1000;
const TWELVE_HOURS = 12 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

async function runJob(jobFn: () => Promise<CronResult>) {
  try {
    const result = await jobFn();
    jobLog.push(result);
    // Keep only last 100 entries
    if (jobLog.length > 100) jobLog.splice(0, jobLog.length - 100);
    console.log(`[Scheduler] ${result.job}: ${result.message}`);
  } catch (error) {
    console.error(`[Scheduler] Job error:`, error);
  }
}

/**
 * Start the built-in cron scheduler.
 * Safe to call multiple times — only starts once.
 */
export function startScheduler(): boolean {
  if (isSchedulerRunning) return false;
  isSchedulerRunning = true;

  console.log("[Scheduler] Starting cron scheduler...");

  // Run all jobs once immediately
  runJob(autoExpireTrials);
  runJob(cleanExpiredTokens);

  // Schedule recurring jobs
  intervals.push(setInterval(() => runJob(autoExpireTrials), SIX_HOURS));
  intervals.push(setInterval(() => runJob(sendFeeReminders), TWELVE_HOURS));
  intervals.push(
    setInterval(() => runJob(cleanExpiredTokens), TWENTY_FOUR_HOURS),
  );
  intervals.push(
    setInterval(() => runJob(dailyAttendanceReport), TWENTY_FOUR_HOURS),
  );

  console.log("[Scheduler] Cron scheduler started with 4 jobs");
  return true;
}

/**
 * Stop the scheduler (for testing/cleanup).
 */
export function stopScheduler(): void {
  for (const interval of intervals) {
    clearInterval(interval);
  }
  intervals.length = 0;
  isSchedulerRunning = false;
  console.log("[Scheduler] Cron scheduler stopped");
}

/**
 * Check if the scheduler is running.
 */
export function isSchedulerActive(): boolean {
  return isSchedulerRunning;
}

/**
 * Get recent job execution log.
 */
export function getJobLog(): CronResult[] {
  return [...jobLog];
}
