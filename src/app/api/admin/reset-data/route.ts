import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import {
  Student,
  Attendance,
  LeaveRequest,
  Notification,
  Visitor,
  Room,
  RoomBooking,
  Holiday,
  Timetable,
  QRToken,
  EmergencyAlert,
  Setting,
  Department,
  Semester,
  Subject,
  SubjectAttendance,
  TeacherAttendance,
  Salary,
  FeeStructure,
  FeePayment,
  Exam,
  Grade,
  AcademicYear,
  Transport,
  LibraryBook,
  BookIssue,
  Hostel,
  HostelAllocation,
  Promotion,
  FacultyWorkload,
  Backup,
  Role,
  Payment,
  Assignment,
  OnlineExam,
  Event,
  Message,
  Conversation,
  Circular,
  PushSubscription,
  StudentDocument,
  DiaryEntry,
  TeacherEvaluation,
  AuditLog,
  Inventory,
  Alumni,
  AcademicCalendar,
  SchoolBranding,
  User,
} from "@/lib/models";
import { logError } from "@/lib/logger";
import logger from "@/lib/logger";

/**
 * POST /api/admin/reset-data — Wipe ALL school data (admin only)
 * Deletes all data for the current school except the admin user + school doc.
 * This is irreversible.
 * Body: { confirmPhrase: "DELETE ALL DATA" }
 */
export async function POST(request: Request) {
  try {
    const { error, session } = await requireAuth("users:delete");
    if (error) return error;

    if (session!.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only school admins can reset data" },
        { status: 403 },
      );
    }

    const body = await request.json();
    if (body.confirmPhrase !== "DELETE ALL DATA") {
      return NextResponse.json(
        {
          success: false,
          error:
            'You must send { "confirmPhrase": "DELETE ALL DATA" } to confirm',
        },
        { status: 400 },
      );
    }

    await connectDB();
    const schoolId = session!.user.school_id;
    const adminUserId = session!.user.id;

    // All collections to clear (scoped to this school)
    const schoolFilter = { school: schoolId };

    const results = await Promise.allSettled([
      Student.deleteMany(schoolFilter),
      Attendance.deleteMany(schoolFilter),
      LeaveRequest.deleteMany(schoolFilter),
      Notification.deleteMany(schoolFilter),
      Visitor.deleteMany(schoolFilter),
      Room.deleteMany(schoolFilter),
      RoomBooking.deleteMany(schoolFilter),
      Holiday.deleteMany(schoolFilter),
      Timetable.deleteMany(schoolFilter),
      QRToken.deleteMany(schoolFilter),
      EmergencyAlert.deleteMany(schoolFilter),
      Setting.deleteMany(schoolFilter),
      Department.deleteMany(schoolFilter),
      Semester.deleteMany(schoolFilter),
      Subject.deleteMany(schoolFilter),
      SubjectAttendance.deleteMany(schoolFilter),
      TeacherAttendance.deleteMany(schoolFilter),
      Salary.deleteMany(schoolFilter),
      FeeStructure.deleteMany(schoolFilter),
      FeePayment.deleteMany(schoolFilter),
      Exam.deleteMany(schoolFilter),
      Grade.deleteMany(schoolFilter),
      AcademicYear.deleteMany(schoolFilter),
      Transport.deleteMany(schoolFilter),
      LibraryBook.deleteMany(schoolFilter),
      BookIssue.deleteMany(schoolFilter),
      Hostel.deleteMany(schoolFilter),
      HostelAllocation.deleteMany(schoolFilter),
      Promotion.deleteMany(schoolFilter),
      FacultyWorkload.deleteMany(schoolFilter),
      Backup.deleteMany(schoolFilter),
      Role.deleteMany(schoolFilter),
      Payment.deleteMany(schoolFilter),
      Assignment.deleteMany(schoolFilter),
      OnlineExam.deleteMany(schoolFilter),
      Event.deleteMany(schoolFilter),
      Message.deleteMany(schoolFilter),
      Conversation.deleteMany(schoolFilter),
      Circular.deleteMany(schoolFilter),
      PushSubscription.deleteMany(schoolFilter),
      StudentDocument.deleteMany(schoolFilter),
      DiaryEntry.deleteMany(schoolFilter),
      TeacherEvaluation.deleteMany(schoolFilter),
      Inventory.deleteMany(schoolFilter),
      Alumni.deleteMany(schoolFilter),
      AcademicCalendar.deleteMany(schoolFilter),
      SchoolBranding.deleteMany(schoolFilter),
      // Delete non-admin users
      User.deleteMany({ school: schoolId, _id: { $ne: adminUserId } }),
      // Clear audit logs
      AuditLog.deleteMany(schoolFilter),
    ]);

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    let totalDeleted = 0;
    for (const r of results) {
      if (r.status === "fulfilled" && r.value?.deletedCount) {
        totalDeleted += r.value.deletedCount;
      }
    }

    logger.info({
      type: "data_reset",
      schoolId,
      adminUserId,
      totalDeleted,
      succeeded,
      failed,
    });

    return NextResponse.json({
      success: true,
      message: `Data reset complete. ${totalDeleted} records deleted across ${succeeded} collections.`,
      data: {
        totalDeleted,
        collectionsCleared: succeeded,
        collectionsFailed: failed,
      },
    });
  } catch (err) {
    logError("POST", "/api/admin/reset-data", err);
    return NextResponse.json(
      { success: false, error: "Data reset failed. Please try again." },
      { status: 500 },
    );
  }
}
