import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import SubjectAttendance from "@/lib/models/SubjectAttendance";
import Subject from "@/lib/models/Subject";
import Student from "@/lib/models/Student";
import { subjectAttendanceSchema, validationError } from "@/lib/validators";
import { logRequest, logError } from "@/lib/logger";
import { notifyLowAttendance } from "@/lib/twilio-notifications";
import { emitActivity } from "@/lib/socket-io";

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("attendance:read");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "daily";
    const subjectId = searchParams.get("subject_id");
    const studentId = searchParams.get("student_id");
    const className = searchParams.get("class_name");
    const date = searchParams.get("date");
    const fromDate = searchParams.get("from_date");
    const toDate = searchParams.get("to_date");

    await connectDB();
    const schoolId = session!.user.school_id;
    logRequest("GET", "/api/subject-attendance", session!.user.id, schoolId);

    if (type === "daily") {
      const query: Record<string, unknown> = {
        school: schoolId,
        date: date || new Date().toISOString().split("T")[0],
      };
      if (subjectId) query.subject = subjectId;
      if (className) query.className = className;

      const records = await SubjectAttendance.find(query)
        .populate("student", "name roll_number")
        .populate("subject", "name code")
        .sort({ period: 1 });

      return NextResponse.json({ success: true, data: records });
    }

    // Student subject-wise attendance summary
    if (type === "student-summary" && studentId) {
      const dateQuery: Record<string, unknown> = {};
      if (fromDate) dateQuery.$gte = fromDate;
      if (toDate) dateQuery.$lte = toDate;

      const query: Record<string, unknown> = {
        school: schoolId,
        student: studentId,
      };
      if (Object.keys(dateQuery).length) query.date = dateQuery;

      const records = await SubjectAttendance.find(query);

      // Group by subject
      const subjectMap: Record<
        string,
        {
          total: number;
          present: number;
          absent: number;
          late: number;
          leave: number;
          name: string;
          code: string;
        }
      > = {};
      records.forEach((r) => {
        const key = r.subject.toString();
        if (!subjectMap[key]) {
          subjectMap[key] = {
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            leave: 0,
            name: r.subjectName,
            code: r.subjectCode,
          };
        }
        subjectMap[key].total++;
        subjectMap[key][r.status]++;
      });

      const summary = Object.entries(subjectMap).map(([subjectId, data]) => ({
        subject_id: subjectId,
        subject_name: data.name,
        subject_code: data.code,
        total_classes: data.total,
        present: data.present,
        absent: data.absent,
        late: data.late,
        leave: data.leave,
        percentage:
          data.total > 0
            ? Math.round(((data.present + data.late) / data.total) * 100)
            : 0,
        eligible:
          data.total > 0
            ? ((data.present + data.late) / data.total) * 100 >= 75
            : true,
      }));

      return NextResponse.json({ success: true, data: summary });
    }

    // 75% eligibility check
    if (type === "eligibility") {
      const query: Record<string, unknown> = { school: schoolId };
      if (className) query.className = className;

      const students = await Student.find({
        school: schoolId,
        class_name: className,
        status: "active",
      });

      const eligibilityReport = [];
      for (const student of students) {
        const records = await SubjectAttendance.find({
          school: schoolId,
          student: student._id,
        });
        const total = records.length;
        const present = records.filter((r) =>
          ["present", "late"].includes(r.status),
        ).length;
        const percentage =
          total > 0 ? Math.round((present / total) * 100) : 100;

        eligibilityReport.push({
          student_id: student._id,
          name: student.name,
          roll_number: student.roll_number,
          class_name: student.class_name,
          total_classes: total,
          attended: present,
          percentage,
          eligible: percentage >= 75,
          status: percentage >= 75 ? "eligible" : "not-eligible",
        });
      }

      // Sort by percentage ascending (worst first)
      eligibilityReport.sort((a, b) => a.percentage - b.percentage);

      return NextResponse.json({
        success: true,
        data: eligibilityReport,
        summary: {
          total_students: eligibilityReport.length,
          eligible: eligibilityReport.filter((s) => s.eligible).length,
          not_eligible: eligibilityReport.filter((s) => !s.eligible).length,
        },
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    logError("GET", "/api/subject-attendance", err);
    return NextResponse.json(
      { error: "Failed to fetch subject attendance" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("attendance:write");
    if (error) return error;

    const body = await request.json();
    const parsed = subjectAttendanceSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await connectDB();
    const schoolId = session!.user.school_id;
    logRequest("POST", "/api/subject-attendance", session!.user.id, schoolId);

    const subject = await Subject.findOne({
      _id: parsed.data.subject_id,
      school: schoolId,
    });
    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    const results = [];
    for (const record of parsed.data.records) {
      const existing = await SubjectAttendance.findOne({
        school: schoolId,
        date: parsed.data.date,
        subject: parsed.data.subject_id,
        student: record.student_id,
        period: parsed.data.period,
      });

      if (existing) {
        existing.status = record.status;
        existing.notes = record.notes;
        await existing.save();
        results.push(existing);
      } else {
        const newRecord = await SubjectAttendance.create({
          date: parsed.data.date,
          school: schoolId,
          subject: parsed.data.subject_id,
          subjectCode: subject.code,
          subjectName: subject.name,
          className: parsed.data.class_name,
          department: subject.department,
          semester: subject.semester,
          period: parsed.data.period,
          startTime: parsed.data.start_time,
          endTime: parsed.data.end_time,
          type: parsed.data.type,
          student: record.student_id,
          status: record.status,
          markedBy: session!.user.id,
          notes: record.notes,
        });
        results.push(newRecord);
      }

      // Check if student is below 75% and send alert
      if (record.status === "absent") {
        const studentRecords = await SubjectAttendance.find({
          school: schoolId,
          student: record.student_id,
          subject: parsed.data.subject_id,
        });

        const total = studentRecords.length;
        const present = studentRecords.filter((r) =>
          ["present", "late"].includes(r.status),
        ).length;
        const pct = total > 0 ? (present / total) * 100 : 100;

        if (pct < 75 && total >= 5) {
          const student = await Student.findById(record.student_id);
          if (student?.parent_phone) {
            // Dual-channel: SMS + WhatsApp low attendance warning
            notifyLowAttendance(
              student.parent_phone,
              student.name,
              Math.round(pct),
              75,
            ).catch(() => {}); // Don't fail on notification error
          }
        }
      }
    }

    emitActivity({
      type: "attendance:subject_marked",
      title: "Subject Attendance Marked",
      message: `Subject attendance marked for ${results.length} student(s)`,
      module: "subject-attendance",
      actionUrl: "/subject-attendance",
      session: session!,
    });

    return NextResponse.json({
      success: true,
      message: `Subject attendance marked for ${results.length} student(s)`,
      data: results,
    });
  } catch (err) {
    logError("POST", "/api/subject-attendance", err);
    return NextResponse.json(
      { error: "Failed to mark subject attendance" },
      { status: 500 },
    );
  }
}
