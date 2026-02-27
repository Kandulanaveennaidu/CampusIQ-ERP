import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Student from "@/lib/models/Student";
import Attendance from "@/lib/models/Attendance";
import { FeePayment } from "@/lib/models/Fee";
import { Exam, Grade } from "@/lib/models/Exam";
import School from "@/lib/models/School";
import { sendWhatsApp } from "@/lib/sms";
import { logError, logRequest } from "@/lib/logger";
import crypto from "crypto";

/**
 * Validate Twilio webhook request signature.
 * See: https://www.twilio.com/docs/usage/security#validating-requests
 */
function validateTwilioSignature(
  request: Request,
  body: URLSearchParams,
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    // If no auth token configured, skip validation (dev mode)
    return process.env.NODE_ENV !== "production";
  }

  const signature = request.headers.get("x-twilio-signature");
  if (!signature) return false;

  const url = process.env.NEXTAUTH_URL
    ? `${process.env.NEXTAUTH_URL}/api/whatsapp-bot`
    : request.url;

  // Build the data string: URL + sorted POST params
  const sortedKeys = Array.from(body.keys()).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + body.get(key);
  }

  const expected = crypto
    .createHmac("sha1", authToken)
    .update(data)
    .digest("base64");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * POST /api/whatsapp-bot — Twilio WhatsApp Webhook
 * Parses incoming messages and responds with student data.
 * Commands:
 *   ATTENDANCE <roll> — Today's attendance status
 *   FEES <roll> — Pending fee summary
 *   RESULTS <roll> — Latest exam results
 *   HELP — Show available commands
 */
export async function POST(request: Request) {
  try {
    await connectDB();

    // Clone the request so we can read the body twice (for validation + parsing)
    const clonedRequest = request.clone();
    const rawBody = await clonedRequest.text();
    const bodyParams = new URLSearchParams(rawBody);

    // Validate Twilio signature in production
    if (process.env.NODE_ENV === "production") {
      if (!validateTwilioSignature(request, bodyParams)) {
        logError(
          "POST",
          "/api/whatsapp-bot",
          new Error("Invalid Twilio signature — rejected"),
        );
        return new NextResponse(
          "<Response><Message>Unauthorized</Message></Response>",
          { status: 403, headers: { "Content-Type": "text/xml" } },
        );
      }
    }

    const body = (bodyParams.get("Body") || "").trim();
    const from = (bodyParams.get("From") || "").replace("whatsapp:", "");
    const to = bodyParams.get("To") || "";

    logRequest("POST", "/api/whatsapp-bot", undefined, undefined, {
      from,
      body,
    });

    if (!body) {
      return twimlResponse("Please send a command. Type HELP for options.");
    }

    const parts = body.toUpperCase().split(/\s+/);
    const command = parts[0];
    const rollNumber = parts[1] || "";

    // Find school from the "to" number or default to first school
    const school = (await School.findOne({}).lean()) as Record<
      string,
      unknown
    > | null;
    if (!school) {
      return twimlResponse("School not configured. Contact admin.");
    }
    const schoolId = String(school._id);

    switch (command) {
      case "HELP":
        return twimlResponse(
          "📚 *CampusIQ WhatsApp Bot*\n\n" +
            "Commands:\n" +
            "• ATTENDANCE <roll_number>\n" +
            "• FEES <roll_number>\n" +
            "• RESULTS <roll_number>\n" +
            "• HELP\n\n" +
            "Example: ATTENDANCE 101",
        );

      case "ATTENDANCE": {
        if (!rollNumber)
          return twimlResponse("Usage: ATTENDANCE <roll_number>");
        const student = (await Student.findOne({
          school: schoolId,
          rollNumber,
          isActive: true,
        }).lean()) as Record<string, unknown> | null;
        if (!student)
          return twimlResponse(
            `❌ Student with roll number ${rollNumber} not found.`,
          );

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayRecord = (await Attendance.findOne({
          school: schoolId,
          student: student._id,
          date: { $gte: today, $lt: tomorrow },
        }).lean()) as Record<string, unknown> | null;

        // Last 30 days summary
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const monthRecords = (await Attendance.find({
          school: schoolId,
          student: student._id,
          date: { $gte: thirtyDaysAgo },
        }).lean()) as Record<string, unknown>[];

        const present = monthRecords.filter(
          (r) => r.status === "present",
        ).length;
        const total = monthRecords.length;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;

        const statusEmoji = todayRecord
          ? todayRecord.status === "present"
            ? "✅ Present"
            : todayRecord.status === "late"
              ? "⏰ Late"
              : "❌ Absent"
          : "📝 Not marked yet";

        return twimlResponse(
          `📊 *Attendance — ${student.name}*\n` +
            `Roll: ${rollNumber}\n\n` +
            `Today: ${statusEmoji}\n` +
            `Last 30 days: ${present}/${total} (${rate}%)\n` +
            `${rate < 75 ? "⚠️ Below 75% — needs attention!" : "👍 Good attendance!"}`,
        );
      }

      case "FEES": {
        if (!rollNumber) return twimlResponse("Usage: FEES <roll_number>");
        const student = (await Student.findOne({
          school: schoolId,
          rollNumber,
          isActive: true,
        }).lean()) as Record<string, unknown> | null;
        if (!student)
          return twimlResponse(
            `❌ Student with roll number ${rollNumber} not found.`,
          );

        const payments = (await FeePayment.find({
          school: schoolId,
          student: student._id,
        })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean()) as Record<string, unknown>[];

        const pending = payments.filter((p) => p.status === "pending");
        const totalPending = pending.reduce(
          (s, p) => s + (Number(p.amount) || 0),
          0,
        );

        let msg =
          `💰 *Fee Summary — ${student.name}*\n` + `Roll: ${rollNumber}\n\n`;

        if (pending.length > 0) {
          msg += `⚠️ Pending: ₹${totalPending.toLocaleString("en-IN")}\n`;
          for (const p of pending) {
            msg += `  • ${p.feeType || "Fee"}: ₹${Number(p.amount || 0).toLocaleString("en-IN")}\n`;
          }
        } else {
          msg += "✅ No pending fees!\n";
        }

        const paid = payments.filter((p) => p.status === "paid");
        if (paid.length > 0) {
          msg += `\nRecent payments:\n`;
          for (const p of paid.slice(0, 3)) {
            msg += `  ✅ ₹${Number(p.amount || 0).toLocaleString("en-IN")} on ${new Date(p.createdAt as Date).toLocaleDateString("en-IN")}\n`;
          }
        }

        return twimlResponse(msg);
      }

      case "RESULTS": {
        if (!rollNumber) return twimlResponse("Usage: RESULTS <roll_number>");
        const student = (await Student.findOne({
          school: schoolId,
          rollNumber,
          isActive: true,
        }).lean()) as Record<string, unknown> | null;
        if (!student)
          return twimlResponse(
            `❌ Student with roll number ${rollNumber} not found.`,
          );

        const grades = (await Grade.find({
          school: schoolId,
          student: student._id,
        })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate("exam", "title examDate")
          .lean()) as Record<string, unknown>[];

        if (grades.length === 0)
          return twimlResponse(
            `📝 No exam results found for ${student.name} (Roll: ${rollNumber}).`,
          );

        let msg =
          `📝 *Exam Results — ${student.name}*\n` + `Roll: ${rollNumber}\n\n`;

        for (const g of grades.slice(0, 5)) {
          const exam = g.exam as Record<string, unknown> | null;
          msg += `📖 ${exam?.title || "Exam"}\n`;
          msg += `   Marks: ${g.marksObtained}/${g.totalMarks}`;
          if (g.grade) msg += ` (${g.grade})`;
          msg += "\n";
        }

        const totalObt = grades.reduce(
          (s, g) => s + (Number(g.marksObtained) || 0),
          0,
        );
        const totalMax = grades.reduce(
          (s, g) => s + (Number(g.totalMarks) || 0),
          0,
        );
        if (totalMax > 0) {
          msg += `\n📊 Overall: ${Math.round((totalObt / totalMax) * 100)}%`;
        }

        return twimlResponse(msg);
      }

      default:
        return twimlResponse(
          "❓ Unknown command.\n\n" +
            "Available commands:\n" +
            "• ATTENDANCE <roll>\n" +
            "• FEES <roll>\n" +
            "• RESULTS <roll>\n" +
            "• HELP",
        );
    }
  } catch (err) {
    logError("POST", "/api/whatsapp-bot", err);
    return twimlResponse("⚠️ An error occurred. Please try again later.");
  }
}

/** Build TwiML response for WhatsApp */
function twimlResponse(message: string) {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
  return new Response(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
