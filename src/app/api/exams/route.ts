import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import { Exam, Grade } from "@/lib/models/Exam";
import Student from "@/lib/models/Student";
import {
  examSchema,
  gradeEntrySchema,
  updateExamSchema,
  validationError,
} from "@/lib/validators";
import { logRequest, logError } from "@/lib/logger";
import { createAuditLog, buildChanges } from "@/lib/audit";
import { emitActivity } from "@/lib/socket-io";
import { notifyStudentResults } from "@/lib/twilio-notifications";

// GET - Fetch exams and grades
export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("exams:read");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "exams";
    const className = searchParams.get("class_name");
    const examId = searchParams.get("exam_id");
    const studentId = searchParams.get("student_id");
    const status = searchParams.get("status");

    await connectDB();
    const schoolId = session!.user.school_id;
    logRequest("GET", "/api/exams", session!.user.id, schoolId);

    if (type === "exams") {
      const query: Record<string, unknown> = { school: schoolId };
      if (className) query.className = className;
      if (status) query.status = status;

      const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
      const limit = Math.min(
        100,
        Math.max(1, parseInt(searchParams.get("limit") || "50")),
      );

      const [exams, total] = await Promise.all([
        Exam.find(query)
          .sort({ date: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
        Exam.countDocuments(query),
      ]);
      return NextResponse.json({
        success: true,
        data: exams,
        total,
        page,
        limit,
      });
    }

    if (type === "grades") {
      const query: Record<string, unknown> = { school: schoolId };
      if (examId) query.exam = examId;
      if (studentId) query.student = studentId;
      if (className) query.className = className;

      const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
      const limit = Math.min(
        100,
        Math.max(1, parseInt(searchParams.get("limit") || "50")),
      );

      const [grades, total] = await Promise.all([
        Grade.find(query)
          .populate("exam", "name type className subject totalMarks")
          .populate("student", "name roll_number class_name")
          .sort({ className: 1, studentName: 1 })
          .skip((page - 1) * limit)
          .limit(limit),
        Grade.countDocuments(query),
      ]);

      return NextResponse.json({
        success: true,
        data: grades,
        total,
        page,
        limit,
      });
    }

    // Report card for a student
    if (type === "report-card" && studentId) {
      const grades = await Grade.find({
        school: schoolId,
        student: studentId,
      }).populate(
        "exam",
        "name type className subject totalMarks passingMarks",
      );

      const grouped: Record<string, typeof grades> = {};
      grades.forEach((g) => {
        const examName =
          (g.exam as unknown as { name: string })?.name || "Unknown";
        if (!grouped[examName]) grouped[examName] = [];
        grouped[examName].push(g);
      });

      const reportCard = Object.entries(grouped).map(
        ([examName, examGrades]) => ({
          exam_name: examName,
          subjects: examGrades.map((g) => ({
            subject: g.subject,
            marks_obtained: g.marksObtained,
            total_marks: g.totalMarks,
            percentage: g.percentage,
            grade: g.grade,
          })),
          total_marks: examGrades.reduce((s, g) => s + g.marksObtained, 0),
          total_possible: examGrades.reduce((s, g) => s + g.totalMarks, 0),
          overall_percentage:
            examGrades.length > 0
              ? Math.round(
                  (examGrades.reduce((s, g) => s + g.marksObtained, 0) /
                    examGrades.reduce((s, g) => s + g.totalMarks, 0)) *
                    100,
                )
              : 0,
        }),
      );

      return NextResponse.json({ success: true, data: reportCard });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    logError("GET", "/api/exams", err);
    return NextResponse.json(
      { error: "Failed to fetch exams" },
      { status: 500 },
    );
  }
}

// POST - Create exam or enter grades
export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("exams:write");
    if (error) return error;

    const body = await request.json();
    const action = body.action || "create_exam";

    await connectDB();
    const schoolId = session!.user.school_id;
    logRequest("POST", "/api/exams", session!.user.id, schoolId);

    if (action === "create_exam") {
      const parsed = examSchema.safeParse(body);
      if (!parsed.success) {
        return validationError(parsed.error);
      }

      const exam = await Exam.create({
        school: schoolId,
        name: parsed.data.name,
        type: parsed.data.type,
        className: parsed.data.class_name,
        subject: parsed.data.subject,
        subjectCode: parsed.data.subject_code,
        date: new Date(parsed.data.date),
        startTime: parsed.data.start_time,
        endTime: parsed.data.end_time,
        totalMarks: parsed.data.total_marks,
        passingMarks: parsed.data.passing_marks,
        room: parsed.data.room,
      });

      createAuditLog({
        school: schoolId,
        action: "create",
        entity: "exam",
        entityId: exam._id.toString(),
        userId: session!.user.id,
        userName: session!.user.name,
        userRole: session!.user.role,
      });

      emitActivity({
        type: "exam:created",
        title: "New Exam Scheduled",
        message: `${parsed.data.name} exam for ${parsed.data.class_name} (${parsed.data.subject})`,
        module: "exams",
        entityId: exam._id.toString(),
        actionUrl: "/exams",
        session: session!,
      });

      return NextResponse.json({ success: true, data: exam }, { status: 201 });
    }

    if (action === "enter_grades") {
      const parsed = gradeEntrySchema.safeParse(body);
      if (!parsed.success) {
        return validationError(parsed.error);
      }

      // CRITICAL: Scope by school for multi-tenant isolation
      const exam = await Exam.findOne({
        _id: parsed.data.exam_id,
        school: schoolId,
      });
      if (!exam) {
        return NextResponse.json({ error: "Exam not found" }, { status: 404 });
      }

      const results = [];
      for (const entry of parsed.data.grades) {
        // Scope student by school
        const student = await Student.findOne({
          _id: entry.student_id,
          school: schoolId,
        });
        if (!student) continue;

        const existing = await Grade.findOne({
          school: schoolId,
          exam: exam._id,
          student: entry.student_id,
        });

        if (existing) {
          existing.marksObtained = entry.marks_obtained;
          existing.remarks = entry.remarks;
          await existing.save();
          results.push(existing);
        } else {
          const grade = await Grade.create({
            school: schoolId,
            exam: exam._id,
            student: entry.student_id,
            studentName: student.name,
            className: exam.className,
            subject: exam.subject,
            marksObtained: entry.marks_obtained,
            totalMarks: exam.totalMarks,
            remarks: entry.remarks,
            enteredBy: session!.user.id,
          });
          results.push(grade);
        }
      }

      // Update exam status
      exam.status = "completed";
      await exam.save();

      // Fire-and-forget: SMS + WhatsApp notification to students/parents
      try {
        const studentIds = parsed.data.grades.map((g) => g.student_id);
        const studentsForNotify = await Student.find({
          _id: { $in: studentIds },
          school: schoolId,
        }).lean();
        for (const s of studentsForNotify) {
          const phone = s.parent_phone || s.email;
          if (phone && s.parent_phone) {
            notifyStudentResults(s.parent_phone, s.name, exam.name).catch(
              () => {},
            );
          }
        }
      } catch (_) {
        // Notifications are best-effort
      }

      createAuditLog({
        school: schoolId,
        action: "update",
        entity: "exam_grades",
        entityId: parsed.data.exam_id,
        userId: session!.user.id,
        userName: session!.user.name,
        userRole: session!.user.role,
        metadata: { gradesEntered: results.length },
      });

      emitActivity({
        type: "exam:updated",
        title: "Grades Entered",
        message: `Grades entered for ${results.length} student(s)`,
        module: "exams",
        entityId: parsed.data.exam_id,
        actionUrl: "/exams",
        session: session!,
      });

      return NextResponse.json({
        success: true,
        message: `Grades entered for ${results.length} student(s)`,
        data: results,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    logError("POST", "/api/exams", err);
    return NextResponse.json(
      { error: "Failed to process exam" },
      { status: 500 },
    );
  }
}

// PUT - Update exam details
export async function PUT(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("exams:write");
    if (error) return error;

    const body = await request.json();
    const parsed = updateExamSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    const exam = await Exam.findOne({
      _id: parsed.data.exam_id,
      school: schoolId,
    });
    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const oldObj = exam.toObject();

    if (parsed.data.name !== undefined) exam.name = parsed.data.name;
    if (parsed.data.type !== undefined) exam.type = parsed.data.type;
    if (parsed.data.class_name !== undefined)
      exam.className = parsed.data.class_name;
    if (parsed.data.subject !== undefined) exam.subject = parsed.data.subject;
    if (parsed.data.subject_code !== undefined)
      exam.subjectCode = parsed.data.subject_code;
    if (parsed.data.date !== undefined) exam.date = new Date(parsed.data.date);
    if (parsed.data.start_time !== undefined)
      exam.startTime = parsed.data.start_time;
    if (parsed.data.end_time !== undefined) exam.endTime = parsed.data.end_time;
    if (parsed.data.total_marks !== undefined)
      exam.totalMarks = parsed.data.total_marks;
    if (parsed.data.passing_marks !== undefined)
      exam.passingMarks = parsed.data.passing_marks;
    if (parsed.data.room !== undefined) exam.room = parsed.data.room;
    if (parsed.data.status !== undefined) exam.status = parsed.data.status;
    if (parsed.data.invigilator !== undefined)
      exam.invigilator = parsed.data
        .invigilator as unknown as typeof exam.invigilator;

    await exam.save();

    const changes = buildChanges(oldObj, exam.toObject(), [
      "name",
      "type",
      "className",
      "subject",
      "date",
      "totalMarks",
      "status",
    ]);

    createAuditLog({
      school: schoolId,
      action: "update",
      entity: "exam",
      entityId: parsed.data.exam_id,
      userId: session!.user.id,
      userName: session!.user.name,
      userRole: session!.user.role,
      changes,
    });

    emitActivity({
      type: "exam:updated",
      title: "Exam Updated",
      message: `${exam.name} exam was updated`,
      module: "exams",
      entityId: parsed.data.exam_id,
      actionUrl: "/exams",
      session: session!,
    });

    logRequest("PUT", "/api/exams", session!.user.id, schoolId);
    return NextResponse.json({ success: true, data: exam });
  } catch (err) {
    logError("PUT", "/api/exams", err);
    return NextResponse.json(
      { error: "Failed to update exam" },
      { status: 500 },
    );
  }
}

// DELETE - Cancel/delete an exam
export async function DELETE(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("exams:manage");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const examId = searchParams.get("exam_id");
    if (!examId) {
      return NextResponse.json(
        { error: "exam_id is required" },
        { status: 400 },
      );
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    const exam = await Exam.findOne({ _id: examId, school: schoolId });
    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Check if grades exist — soft delete (cancel) instead of hard delete
    const gradeCount = await Grade.countDocuments({
      exam: examId,
      school: schoolId,
    });
    if (gradeCount > 0) {
      exam.status = "cancelled";
      await exam.save();

      createAuditLog({
        school: schoolId,
        action: "update",
        entity: "exam",
        entityId: examId,
        userId: session!.user.id,
        userName: session!.user.name,
        userRole: session!.user.role,
        metadata: { reason: "cancelled_with_grades", gradeCount },
      });

      emitActivity({
        type: "exam:deleted",
        title: "Exam Cancelled",
        message: `${exam.name} was cancelled (${gradeCount} grades preserved)`,
        module: "exams",
        entityId: examId,
        actionUrl: "/exams",
        session: session!,
      });

      return NextResponse.json({
        success: true,
        message: `Exam cancelled (${gradeCount} grade records preserved)`,
      });
    }

    await Exam.deleteOne({ _id: examId, school: schoolId });

    createAuditLog({
      school: schoolId,
      action: "delete",
      entity: "exam",
      entityId: examId,
      userId: session!.user.id,
      userName: session!.user.name,
      userRole: session!.user.role,
    });

    emitActivity({
      type: "exam:deleted",
      title: "Exam Deleted",
      message: `${exam.name} exam was deleted`,
      module: "exams",
      entityId: examId,
      actionUrl: "/exams",
      session: session!,
    });

    logRequest("DELETE", "/api/exams", session!.user.id, schoolId);
    return NextResponse.json({
      success: true,
      message: "Exam deleted successfully",
    });
  } catch (err) {
    logError("DELETE", "/api/exams", err);
    return NextResponse.json(
      { error: "Failed to delete exam" },
      { status: 500 },
    );
  }
}
