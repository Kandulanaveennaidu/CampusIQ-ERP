import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import LeaveRequest from "@/lib/models/LeaveRequest";
import Notification from "@/lib/models/Notification";
import Student from "@/lib/models/Student";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/permissions";
import {
  leaveRequestSchema,
  leaveActionSchema,
  validationError,
} from "@/lib/validators";
import { audit } from "@/lib/audit";
import { logError } from "@/lib/logger";
import { notifyLeaveStatus } from "@/lib/twilio-notifications";
import { emitActivity } from "@/lib/socket-io";
import { sendEmail } from "@/lib/email/mailer";
import { leaveApprovalEmail } from "@/lib/email/templates";

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("leaves:read");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50")),
    );
    const schoolId = session!.user.school_id;

    await connectDB();

    const query: Record<string, unknown> = { school: schoolId };
    if (status) query.status = status;

    const total = await LeaveRequest.countDocuments(query);
    const leaves = await LeaveRequest.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const data = leaves.map((l) => ({
      leave_id: l._id.toString(),
      student_id: l.student ? l.student.toString() : "",
      student_name: l.student_name || "",
      class_name: l.class_name || "",
      from_date: l.from_date,
      to_date: l.to_date,
      reason: l.reason,
      status: l.status,
      applied_at: l.applied_at || l.createdAt?.toISOString() || "",
      approved_by: l.approved_by || "",
    }));

    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logError("GET", "/api/leaves", error);
    return NextResponse.json(
      { error: "Failed to fetch leave requests" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("leaves:write");
    if (error) return error;

    const body = await request.json();
    const parsed = leaveRequestSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const { student_id, from_date, to_date, reason } = parsed.data;

    await connectDB();

    const student = await Student.findOne({
      _id: student_id,
      school: session!.user.school_id,
    }).lean();

    const leave = await LeaveRequest.create({
      school: session!.user.school_id,
      student: student_id,
      student_name: student?.name || "",
      class_name: student?.class_name || "",
      from_date,
      to_date,
      reason,
      status: "pending",
      applied_at: new Date().toISOString(),
    });

    await Notification.create({
      school: session!.user.school_id,
      type: "leave_request",
      title: "New Leave Request",
      message: `Leave request submitted for ${student?.name || student_id} from ${from_date} to ${to_date}`,
      target_role: "admin",
      status: "unread",
      module: "leaves",
      entityId: leave._id.toString(),
      actionUrl: "/leaves",
      actorName: session!.user.name || "System",
      actorRole: session!.user.role || "",
    });

    await audit({
      action: "create",
      entity: "leave",
      entityId: leave._id.toString(),
      schoolId: session!.user.school_id,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
    });

    emitActivity({
      type: "leave:requested",
      title: "New Leave Request",
      message: `Leave requested for ${student?.name || "student"} from ${from_date} to ${to_date}`,
      module: "leaves",
      entityId: leave._id.toString(),
      actionUrl: "/leaves",
      targetRole: "admin",
      session: session!,
      skipPersist: true,
    });

    return NextResponse.json({
      success: true,
      leave_id: leave._id.toString(),
      message: "Leave request submitted successfully",
    });
  } catch (error) {
    logError("POST", "/api/leaves", error);
    return NextResponse.json(
      { error: "Failed to create leave request" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("leaves:approve");
    if (error) return error;

    const body = await request.json();
    const parsed = leaveActionSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const { leave_id, status } = parsed.data;

    await connectDB();

    const leave = await LeaveRequest.findOneAndUpdate(
      { _id: leave_id, school: session!.user.school_id },
      { status, approved_by: session!.user.name },
      { new: true },
    );

    if (!leave) {
      return NextResponse.json(
        { error: "Leave request not found" },
        { status: 404 },
      );
    }

    await Notification.create({
      school: session!.user.school_id,
      type: "leave_" + status,
      title: `Leave ${status}`,
      message: `Leave request for ${leave.student_name || "student"} has been ${status}`,
      target_role: "teacher",
      status: "unread",
      module: "leaves",
      entityId: leave_id,
      actionUrl: "/leaves",
      actorName: session!.user.name || "System",
      actorRole: session!.user.role || "",
    });

    // SMS + WhatsApp alert for leave approval/rejection (fire-and-forget)
    if (leave.student) {
      try {
        const student = await Student.findById(leave.student).lean();
        if (student?.parent_phone) {
          // Dual-channel: SMS + WhatsApp
          notifyLeaveStatus(
            student.parent_phone,
            leave.student_name || student.name,
            status,
          ).catch(() => {});
        }
        // Email notification to parent (fire-and-forget)
        const parentEmail = student?.parent_email || student?.email;
        if (parentEmail) {
          const html = leaveApprovalEmail({
            employeeName: student?.parent_name || "Parent",
            status: status as "approved" | "rejected",
            leaveType: "Student Leave",
            startDate: leave.from_date
              ? new Date(leave.from_date).toLocaleDateString("en-IN")
              : "",
            endDate: leave.to_date
              ? new Date(leave.to_date).toLocaleDateString("en-IN")
              : "",
            reason: leave.reason || "",
            approverName: session!.user.name || "Admin",
          });
          sendEmail({
            to: parentEmail,
            subject: `Leave ${status} — ${leave.student_name || student?.name}`,
            html,
          }).catch(() => {});
        }
        // Also email the teacher/applicant if it's staff leave
        if (!student) {
          const applicant = await User.findById(leave.student).lean();
          if (applicant?.email) {
            const html = leaveApprovalEmail({
              employeeName: applicant.name || "Staff",
              status: status as "approved" | "rejected",
              leaveType: "Staff Leave",
              startDate: leave.from_date
                ? new Date(leave.from_date).toLocaleDateString("en-IN")
                : "",
              endDate: leave.to_date
                ? new Date(leave.to_date).toLocaleDateString("en-IN")
                : "",
              reason: leave.reason || "",
              approverName: session!.user.name || "Admin",
            });
            sendEmail({
              to: applicant.email,
              subject: `Leave ${status}`,
              html,
            }).catch(() => {});
          }
        }
      } catch (_) {
        // SMS/Email is best-effort, don't block the response
      }
    }

    await audit({
      action: "update",
      entity: "leave",
      entityId: leave_id,
      schoolId: session!.user.school_id,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: { newStatus: status },
    });

    emitActivity({
      type: status === "approved" ? "leave:approved" : "leave:rejected",
      title: `Leave ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `${leave.student_name || "Student"}'s leave was ${status}`,
      module: "leaves",
      entityId: leave_id,
      actionUrl: "/leaves",
      session: session!,
      skipPersist: true,
    });

    return NextResponse.json({
      success: true,
      message: `Leave request ${status} successfully`,
    });
  } catch (error) {
    logError("PUT", "/api/leaves", error);
    return NextResponse.json(
      { error: "Failed to update leave request" },
      { status: 500 },
    );
  }
}
