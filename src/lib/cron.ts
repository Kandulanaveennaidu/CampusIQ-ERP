/**
 * CRON Job Handlers
 * Called via /api/cron route or external cron services.
 */

import { connectDB } from "@/lib/db";
import School from "@/lib/models/School";
import Student from "@/lib/models/Student";
import Token from "@/lib/models/Token";
import Attendance from "@/lib/models/Attendance";
import Notification from "@/lib/models/Notification";
import { FeePayment } from "@/lib/models/Fee";
import { notifyFeeReminder } from "@/lib/twilio-notifications";

export interface CronResult {
  job: string;
  success: boolean;
  message: string;
  affected?: number;
}

/**
 * Auto-expire trial subscriptions.
 * Finds schools where subscriptionStatus === "trialing" and currentPeriodEnd < now,
 * sets status to "expired".
 */
export async function autoExpireTrials(): Promise<CronResult> {
  try {
    await connectDB();
    const now = new Date();

    // Check both "trialing" (if used) and "trial" with expired trialEndsAt
    const result = await School.updateMany(
      {
        $or: [
          {
            subscriptionStatus: "trial",
            trialEndsAt: { $lt: now, $ne: null },
          },
          {
            subscriptionStatus: "trial",
            currentPeriodEnd: { $lt: now, $ne: null },
          },
        ],
      },
      { $set: { subscriptionStatus: "expired" } },
    );

    return {
      job: "autoExpireTrials",
      success: true,
      message: `Expired ${result.modifiedCount} trial(s)`,
      affected: result.modifiedCount,
    };
  } catch (error) {
    return {
      job: "autoExpireTrials",
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send fee reminders for overdue payments.
 * Finds students with overdue fees and sends SMS reminders.
 */
export async function sendFeeReminders(): Promise<CronResult> {
  try {
    await connectDB();

    const overduePayments = await FeePayment.find({
      status: { $in: ["pending", "overdue"] },
    })
      .populate("student", "name parent_phone")
      .lean();

    let sentCount = 0;

    for (const payment of overduePayments) {
      const student = payment.student as unknown as {
        name: string;
        parent_phone: string;
      };

      if (student?.parent_phone) {
        notifyFeeReminder(
          student.parent_phone,
          payment.studentName || student.name,
          payment.balanceDue || payment.amount,
          payment.paymentDate
            ? new Date(payment.paymentDate).toLocaleDateString()
            : "N/A",
        ).catch(() => {});
        sentCount++;
      }

      // Mark as overdue if still pending
      if (payment.status === "pending") {
        await FeePayment.updateOne(
          { _id: payment._id },
          { $set: { status: "overdue" } },
        );
      }
    }

    return {
      job: "sendFeeReminders",
      success: true,
      message: `Sent ${sentCount} fee reminder(s)`,
      affected: sentCount,
    };
  } catch (error) {
    return {
      job: "sendFeeReminders",
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Clean expired tokens (email verification, password reset).
 */
export async function cleanExpiredTokens(): Promise<CronResult> {
  try {
    await connectDB();
    const now = new Date();

    const result = await Token.deleteMany({
      expires_at: { $lt: now },
    });

    return {
      job: "cleanExpiredTokens",
      success: true,
      message: `Deleted ${result.deletedCount} expired token(s)`,
      affected: result.deletedCount,
    };
  } catch (error) {
    return {
      job: "cleanExpiredTokens",
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate daily attendance report notification for each school admin.
 */
export async function dailyAttendanceReport(): Promise<CronResult> {
  try {
    await connectDB();

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const schools = await School.find({ status: "active" }).lean();

    let notificationsCreated = 0;

    for (const school of schools) {
      const schoolId = school._id.toString();

      // Get attendance counts for today
      const totalStudents = await Student.countDocuments({
        school: school._id,
        status: "active",
      });

      const attendanceRecords = await Attendance.find({
        school: school._id,
        date: today,
      }).lean();

      const present = attendanceRecords.filter(
        (a) => a.status === "present",
      ).length;
      const absent = attendanceRecords.filter(
        (a) => a.status === "absent",
      ).length;
      const late = attendanceRecords.filter((a) => a.status === "late").length;
      const leave = attendanceRecords.filter(
        (a) => a.status === "leave",
      ).length;
      const unmarked = totalStudents - attendanceRecords.length;

      const attendanceRate =
        totalStudents > 0
          ? (((present + late) / totalStudents) * 100).toFixed(1)
          : "0";

      await Notification.create({
        school: schoolId,
        type: "attendance_report",
        title: `Daily Attendance Report — ${today}`,
        message: `Total: ${totalStudents} | Present: ${present} | Absent: ${absent} | Late: ${late} | Leave: ${leave} | Unmarked: ${unmarked} | Rate: ${attendanceRate}%`,
        target_role: "admin",
        status: "unread",
      });

      notificationsCreated++;
    }

    return {
      job: "dailyAttendanceReport",
      success: true,
      message: `Created ${notificationsCreated} attendance report(s)`,
      affected: notificationsCreated,
    };
  } catch (error) {
    return {
      job: "dailyAttendanceReport",
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
