import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Student from "@/lib/models/Student";
import User from "@/lib/models/User";
import Attendance from "@/lib/models/Attendance";
import LeaveRequest from "@/lib/models/LeaveRequest";
import Visitor from "@/lib/models/Visitor";
import Holiday from "@/lib/models/Holiday";
import Exam from "@/lib/models/Exam";
import { FeePayment } from "@/lib/models/Fee";
import { HostelAllocation } from "@/lib/models/Hostel";
import LibraryBook from "@/lib/models/Library";
import Subject from "@/lib/models/Subject";
import Department from "@/lib/models/Department";
import Salary from "@/lib/models/Salary";
import Transport from "@/lib/models/Transport";
import { requireAuth } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { logError } from "@/lib/logger";

type EntityType =
  | "students"
  | "teachers"
  | "attendance"
  | "leaves"
  | "visitors"
  | "holidays"
  | "exams"
  | "fees"
  | "hostel"
  | "library"
  | "subjects"
  | "departments"
  | "salary"
  | "transport";

function toCSV(headers: string[], rows: Record<string, unknown>[]): string {
  const escape = (val: unknown): string => {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [headers.join(",")];
  for (const row of rows) {
    const values = headers.map((h) => escape(row[h]));
    lines.push(values.join(","));
  }
  return lines.join("\n");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> },
) {
  try {
    const { error, session } = await requireAuth("reports:read");
    if (error) return error;

    const { entity } = await params;
    const schoolId = session!.user.school_id;
    const { searchParams } = new URL(request.url);

    await connectDB();

    let csv = "";
    let filename = "";

    switch (entity as EntityType) {
      case "students": {
        const query: Record<string, unknown> = {
          school: schoolId,
          status: "active",
        };
        const className = searchParams.get("class_name");
        if (className) query.class_name = className;

        const students = await Student.find(query)
          .sort({ class_name: 1, roll_number: 1 })
          .lean();
        const headers = [
          "name",
          "class_name",
          "roll_number",
          "parent_name",
          "parent_phone",
          "email",
          "address",
          "admission_date",
          "status",
        ];
        const rows = students.map((s) => ({
          name: s.name,
          class_name: s.class_name,
          roll_number: s.roll_number,
          parent_name: s.parent_name || "",
          parent_phone: s.parent_phone || "",
          email: s.email || "",
          address: s.address || "",
          admission_date: s.admission_date || "",
          status: s.status,
        }));
        csv = toCSV(headers, rows);
        filename = `students_${className || "all"}_${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }

      case "teachers": {
        const teachers = await User.find({
          school: schoolId,
          role: "teacher",
        }).lean();
        const headers = [
          "name",
          "email",
          "phone",
          "subject",
          "classes",
          "salary_per_day",
          "joining_date",
          "status",
        ];
        const rows = teachers.map((t) => ({
          name: t.name,
          email: t.email,
          phone: t.phone || "",
          subject: t.subject || "",
          classes: t.classes?.join(", ") || "",
          salary_per_day: t.salaryPerDay || "",
          joining_date: t.joiningDate
            ? new Date(t.joiningDate).toISOString().split("T")[0]
            : "",
          status: t.isActive ? "active" : "inactive",
        }));
        csv = toCSV(headers, rows);
        filename = `teachers_${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }

      case "attendance": {
        const date = searchParams.get("date");
        const className = searchParams.get("class_name");
        if (!date) {
          return NextResponse.json(
            { error: "date query param is required" },
            { status: 400 },
          );
        }

        const query: Record<string, unknown> = { date, school: schoolId };
        if (className) query.class_name = className;

        const records = await Attendance.find(query).lean();
        const studentIds = records.map((r) => r.student);
        const students = await Student.find({
          _id: { $in: studentIds },
        }).lean();
        const studentMap = new Map(students.map((s) => [s._id.toString(), s]));

        const headers = [
          "date",
          "class_name",
          "student_name",
          "roll_number",
          "status",
          "marked_by",
          "marked_at",
          "notes",
        ];
        const rows = records.map((r) => {
          const student = studentMap.get(r.student.toString());
          return {
            date: r.date,
            class_name: r.class_name,
            student_name: student?.name || "",
            roll_number: student?.roll_number || "",
            status: r.status,
            marked_by: r.marked_by || "",
            marked_at: r.marked_at || "",
            notes: r.notes || "",
          };
        });
        csv = toCSV(headers, rows);
        filename = `attendance_${date}_${className || "all"}.csv`;
        break;
      }

      case "leaves": {
        const leaves = await LeaveRequest.find({ school: schoolId })
          .sort({ createdAt: -1 })
          .lean();
        const headers = [
          "student_name",
          "class_name",
          "from_date",
          "to_date",
          "reason",
          "status",
          "applied_at",
          "approved_by",
        ];
        const rows = leaves.map((l) => ({
          student_name: l.student_name || "",
          class_name: l.class_name || "",
          from_date: l.from_date,
          to_date: l.to_date,
          reason: l.reason,
          status: l.status,
          applied_at: l.applied_at || "",
          approved_by: l.approved_by || "",
        }));
        csv = toCSV(headers, rows);
        filename = `leaves_${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }

      case "visitors": {
        const visitors = await Visitor.find({ school: schoolId })
          .sort({ createdAt: -1 })
          .lean();
        const headers = [
          "visitor_name",
          "visitor_phone",
          "purpose",
          "host_name",
          "check_in",
          "check_out",
          "badge_number",
          "status",
        ];
        const rows = visitors.map((v) => ({
          visitor_name: v.visitor_name,
          visitor_phone: v.visitor_phone || "",
          purpose: v.purpose,
          host_name: v.host_name || "",
          check_in: v.check_in || "",
          check_out: v.check_out || "",
          badge_number: v.badge_number || "",
          status: v.status,
        }));
        csv = toCSV(headers, rows);
        filename = `visitors_${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }

      case "holidays": {
        const holidays = await Holiday.find({ school: schoolId })
          .sort({ date: 1 })
          .lean();
        const headers = ["date", "name", "description", "holiday_type"];
        const rows = holidays.map((h) => ({
          date: h.date,
          name: h.name,
          description: h.description || "",
          holiday_type: h.holiday_type,
        }));
        csv = toCSV(headers, rows);
        filename = `holidays_${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }

      case "exams": {
        const query: Record<string, unknown> = { school: schoolId };
        const status = searchParams.get("status");
        if (status) query.status = status;
        const className = searchParams.get("class_name");
        if (className) query.className = className;

        const exams = await Exam.find(query).sort({ date: 1 }).lean();
        const headers = [
          "name",
          "type",
          "class_name",
          "subject",
          "date",
          "start_time",
          "end_time",
          "total_marks",
          "passing_marks",
          "room",
          "invigilator",
          "status",
        ];
        const rows = exams.map((e) => ({
          name: e.name,
          type: e.type,
          class_name: e.className,
          subject: e.subject,
          date: e.date ? new Date(e.date).toISOString().split("T")[0] : "",
          start_time: e.startTime || "",
          end_time: e.endTime || "",
          total_marks: e.totalMarks,
          passing_marks: e.passingMarks,
          room: e.room || "",
          invigilator: e.invigilatorName || "",
          status: e.status,
        }));
        csv = toCSV(headers, rows);
        filename = `exams_${className || "all"}_${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }

      case "fees": {
        const query: Record<string, unknown> = { school: schoolId };
        const feeStatus = searchParams.get("status");
        if (feeStatus) query.status = feeStatus;

        const payments = await FeePayment.find(query)
          .sort({ paymentDate: -1 })
          .lean();
        const headers = [
          "student_name",
          "class_name",
          "fee_name",
          "amount",
          "late_fee",
          "discount",
          "total_paid",
          "balance_due",
          "payment_date",
          "payment_method",
          "transaction_id",
          "receipt_number",
          "status",
        ];
        const rows = payments.map((p) => ({
          student_name: p.studentName,
          class_name: p.className,
          fee_name: p.feeName,
          amount: p.amount,
          late_fee: p.lateFee || 0,
          discount: p.discount || 0,
          total_paid: p.totalPaid,
          balance_due: p.balanceDue || 0,
          payment_date: p.paymentDate
            ? new Date(p.paymentDate).toISOString().split("T")[0]
            : "",
          payment_method: p.paymentMethod || "",
          transaction_id: p.transactionId || "",
          receipt_number: p.receiptNumber || "",
          status: p.status,
        }));
        csv = toCSV(headers, rows);
        filename = `fee_payments_${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }

      case "hostel": {
        const allocations = await HostelAllocation.find({
          school: schoolId,
        })
          .sort({ hostelName: 1, roomNumber: 1 })
          .lean();
        const headers = [
          "hostel_name",
          "room_number",
          "bed_number",
          "student_name",
          "class_name",
          "check_in_date",
          "check_out_date",
          "monthly_fee",
          "status",
        ];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = allocations.map((a: any) => ({
          hostel_name: a.hostelName,
          room_number: a.roomNumber,
          bed_number: a.bedNumber,
          student_name: a.studentName,
          class_name: a.className,
          check_in_date: a.checkInDate
            ? new Date(a.checkInDate).toISOString().split("T")[0]
            : "",
          check_out_date: a.checkOutDate
            ? new Date(a.checkOutDate).toISOString().split("T")[0]
            : "",
          monthly_fee: a.monthlyFee,
          status: a.status,
        }));
        csv = toCSV(headers, rows);
        filename = `hostel_allocations_${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }

      case "library": {
        const books = await LibraryBook.find({ school: schoolId })
          .sort({ title: 1 })
          .lean();
        const headers = [
          "title",
          "author",
          "isbn",
          "category",
          "publisher",
          "publish_year",
          "edition",
          "copies",
          "available_copies",
          "location",
          "status",
        ];
        const rows = books.map((b) => ({
          title: b.title,
          author: b.author,
          isbn: b.isbn || "",
          category: b.category || "",
          publisher: b.publisher || "",
          publish_year: b.publishYear || "",
          edition: b.edition || "",
          copies: b.copies,
          available_copies: b.availableCopies,
          location: b.location || "",
          status: b.status,
        }));
        csv = toCSV(headers, rows);
        filename = `library_books_${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }

      case "subjects": {
        const subjects = await Subject.find({ school: schoolId })
          .sort({ className: 1, code: 1 })
          .lean();
        const headers = [
          "name",
          "code",
          "class_name",
          "type",
          "credits",
          "semester",
          "teacher",
          "max_students",
          "status",
        ];
        const rows = subjects.map((s) => ({
          name: s.name,
          code: s.code,
          class_name: s.className,
          type: s.type,
          credits: s.credits,
          semester: s.semester || "",
          teacher: s.teacherName || "",
          max_students: s.maxStudents || "",
          status: s.status,
        }));
        csv = toCSV(headers, rows);
        filename = `subjects_${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }

      case "departments": {
        const departments = await Department.find({ school: schoolId })
          .sort({ name: 1 })
          .lean();
        const headers = ["name", "code", "description", "hod", "status"];
        const rows = departments.map((d) => ({
          name: d.name,
          code: d.code,
          description: d.description || "",
          hod: d.hodName || "",
          status: d.status,
        }));
        csv = toCSV(headers, rows);
        filename = `departments_${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }

      case "salary": {
        const salaryQuery: Record<string, unknown> = { school: schoolId };
        const month = searchParams.get("month");
        const year = searchParams.get("year");
        if (month) salaryQuery.month = Number(month);
        if (year) salaryQuery.year = Number(year);

        const salaries = await Salary.find(salaryQuery)
          .sort({ year: -1, month: -1 })
          .lean();
        const headers = [
          "teacher_name",
          "month",
          "year",
          "total_days",
          "present_days",
          "absent_days",
          "leave_days",
          "salary_per_day",
          "gross_salary",
          "deductions",
          "bonus",
          "net_salary",
          "status",
          "paid_date",
          "payment_method",
        ];
        const rows = salaries.map((s) => ({
          teacher_name: s.teacherName,
          month: s.month,
          year: s.year,
          total_days: s.totalDays,
          present_days: s.presentDays,
          absent_days: s.absentDays,
          leave_days: s.leaveDays || 0,
          salary_per_day: s.salaryPerDay,
          gross_salary: s.grossSalary,
          deductions: s.deductions || 0,
          bonus: s.bonus || 0,
          net_salary: s.netSalary,
          status: s.status,
          paid_date: s.paidDate
            ? new Date(s.paidDate).toISOString().split("T")[0]
            : "",
          payment_method: s.paymentMethod || "",
        }));
        csv = toCSV(headers, rows);
        filename = `salary_${month || "all"}_${year || "all"}_${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }

      case "transport": {
        const vehicles = await Transport.find({ school: schoolId })
          .sort({ routeName: 1 })
          .lean();
        const headers = [
          "vehicle_number",
          "vehicle_type",
          "capacity",
          "driver_name",
          "driver_phone",
          "route_name",
          "stops",
          "assigned_students",
          "status",
        ];
        const rows = vehicles.map((v) => ({
          vehicle_number: v.vehicleNumber,
          vehicle_type: v.vehicleType,
          capacity: v.capacity,
          driver_name: v.driverName,
          driver_phone: v.driverPhone || "",
          route_name: v.routeName,
          stops:
            v.routeStops
              ?.map((s: { stopName: string }) => s.stopName)
              .join("; ") || "",
          assigned_students: v.assignedStudents?.length || 0,
          status: v.status,
        }));
        csv = toCSV(headers, rows);
        filename = `transport_${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }

      default:
        return NextResponse.json(
          {
            error:
              "Invalid entity. Supported: students, teachers, attendance, leaves, visitors, holidays, exams, fees, hostel, library, subjects, departments, salary, transport",
          },
          { status: 400 },
        );
    }

    await audit({
      action: "export",
      entity: entity,
      entityId: "csv",
      schoolId,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: { filename },
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logError("GET", "/api/export", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 },
    );
  }
}
