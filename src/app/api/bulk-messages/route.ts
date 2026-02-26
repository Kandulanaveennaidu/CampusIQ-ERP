import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { emitActivity } from "@/lib/socket-io";
import { sendBulkSMS, formatToE164 } from "@/lib/sms";
import { sendBulkWhatsApp } from "@/lib/twilio-notifications";
import { sendEmail } from "@/lib/email/mailer";
import Student from "@/lib/models/Student";
import User from "@/lib/models/User";

const bulkMessageSchema = z
  .object({
    channel: z.enum(["sms", "email", "both"]),
    target_type: z.enum(["all_students", "all_teachers", "class", "custom"]),
    target_value: z.string().optional(),
    subject: z.string().min(1).max(200).optional(),
    message: z.string().min(1).max(5000),
  })
  .refine(
    (d) => !(d.channel === "email" || d.channel === "both") || !!d.subject,
    { message: "subject is required for email", path: ["subject"] },
  )
  .refine((d) => d.target_type !== "class" || !!d.target_value, {
    message: "target_value (class name) is required when target_type is class",
    path: ["target_value"],
  });

interface Recipient {
  name: string;
  email?: string;
  phone?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireRole("admin");
    if (error) return error;

    const body = await request.json();
    const parsed = bulkMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { channel, target_type, target_value, subject, message } =
      parsed.data;

    await connectDB();
    const schoolId = session!.user.school_id;
    const recipients: Recipient[] = [];

    // Build recipient list based on target
    if (target_type === "all_students") {
      const students = await Student.find({
        school: schoolId,
        status: "active",
      })
        .select("name parent_email parent_phone email")
        .lean();
      for (const s of students) {
        recipients.push({
          name: s.name,
          email: s.parent_email || s.email || "",
          phone: s.parent_phone || "",
        });
      }
    } else if (target_type === "all_teachers") {
      const teachers = await User.find({
        school: schoolId,
        role: "teacher",
        isActive: true,
      })
        .select("name email phone")
        .lean();
      for (const t of teachers) {
        recipients.push({
          name: t.name,
          email: t.email || "",
          phone: t.phone || "",
        });
      }
    } else if (target_type === "class" && target_value) {
      const students = await Student.find({
        school: schoolId,
        class_name: target_value,
        status: "active",
      })
        .select("name parent_email parent_phone email")
        .lean();
      for (const s of students) {
        recipients.push({
          name: s.name,
          email: s.parent_email || s.email || "",
          phone: s.parent_phone || "",
        });
      }
    } else if (target_type === "custom") {
      // Custom recipients passed via target_value as JSON array
      try {
        const custom = JSON.parse(target_value || "[]") as Array<{
          name?: string;
          email?: string;
          phone?: string;
        }>;
        for (const c of custom) {
          recipients.push({
            name: c.name || "User",
            email: c.email || "",
            phone: c.phone || "",
          });
        }
      } catch {
        return NextResponse.json(
          { error: "Invalid custom recipients format" },
          { status: 400 },
        );
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "No recipients found for the selected target" },
        { status: 400 },
      );
    }

    const results = {
      sms_sent: 0,
      sms_failed: 0,
      whatsapp_sent: 0,
      whatsapp_failed: 0,
      email_sent: 0,
      email_failed: 0,
    };

    // Send SMS
    if (channel === "sms" || channel === "both") {
      const smsRecipients = recipients
        .filter((r) => r.phone)
        .map((r) => ({
          phone: formatToE164(r.phone!),
          message: message.replace("{name}", r.name),
        }));
      if (smsRecipients.length > 0) {
        const smsResults = await sendBulkSMS(smsRecipients);
        for (const r of smsResults) {
          if (r.success) results.sms_sent++;
          else results.sms_failed++;
        }
        // Also send via WhatsApp (dual-channel)
        const waResults = await sendBulkWhatsApp(smsRecipients);
        for (const r of waResults) {
          if (r.success) results.whatsapp_sent++;
          else results.whatsapp_failed++;
        }
      }
    }

    // Send emails
    if (channel === "email" || channel === "both") {
      const emailRecipients = recipients.filter((r) => r.email);
      for (const r of emailRecipients) {
        try {
          const personalizedMessage = message.replace("{name}", r.name);
          const html = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <h2 style="color:#1a56db;">${subject}</h2>
              <div style="padding:20px 0;line-height:1.6;white-space:pre-wrap;">${personalizedMessage}</div>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
              <p style="color:#6b7280;font-size:12px;">This is an automated message from your school management system.</p>
            </div>
          `;
          const sent = await sendEmail({
            to: r.email!,
            subject: subject!,
            html,
          });
          if (sent) results.email_sent++;
          else results.email_failed++;
        } catch {
          results.email_failed++;
        }
      }
    }

    await audit({
      action: "create",
      entity: "bulk_message",
      entityId: "broadcast",
      schoolId,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: {
        channel,
        target_type,
        target_value,
        total_recipients: recipients.length,
        ...results,
      },
    });

    emitActivity({
      type: "bulk_message:sent",
      title: "Bulk Message Sent",
      message: `${channel} message sent to ${recipients.length} recipients`,
      module: "bulk-messages",
      actionUrl: "/bulk-messages",
      session: session!,
    });

    return NextResponse.json({
      success: true,
      message: "Bulk message dispatched",
      data: {
        total_recipients: recipients.length,
        ...results,
      },
    });
  } catch (error) {
    logError("POST", "/api/bulk-messages", error);
    return NextResponse.json(
      { error: "Failed to send bulk messages" },
      { status: 500 },
    );
  }
}
