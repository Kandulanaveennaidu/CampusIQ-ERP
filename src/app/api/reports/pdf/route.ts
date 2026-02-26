import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import { connectDB } from "@/lib/db";
import { logError } from "@/lib/logger";
import { audit } from "@/lib/audit";
import Attendance from "@/lib/models/Attendance";
import Student from "@/lib/models/Student";
import School from "@/lib/models/School";
import { getMonthDays } from "@/lib/utils";
import { jsPDF } from "jspdf";

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("reports:read");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");
    const class_name = searchParams.get("class_name");
    const school_id = session!.user.school_id;

    const now = new Date();
    const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1;
    const year = yearParam ? parseInt(yearParam) : now.getFullYear();

    if (month < 1 || month > 12 || isNaN(month)) {
      return NextResponse.json(
        { error: "Invalid month (1-12)" },
        { status: 400 },
      );
    }
    if (year < 2000 || year > 2100 || isNaN(year)) {
      return NextResponse.json(
        { error: "Invalid year (2000-2100)" },
        { status: 400 },
      );
    }

    await connectDB();

    // Get school info
    const school = await School.findById(school_id).lean();
    const schoolName = school?.school_name || "School";

    // Build date range
    const daysInMonth = getMonthDays(month, year);
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    // Get students
    const studentQuery: Record<string, unknown> = {
      school: school_id,
      status: "active",
    };
    if (class_name) studentQuery.class_name = class_name;
    const students = await Student.find(studentQuery).lean();

    // Get attendance
    const attQuery: Record<string, unknown> = {
      school: school_id,
      date: { $gte: startDate, $lte: endDate },
    };
    if (class_name) attQuery.class_name = class_name;
    const attendance = await Attendance.find(attQuery).lean();

    // Per-student stats
    const studentStats = students.map((student) => {
      const sa = attendance.filter(
        (a) => a.student.toString() === student._id.toString(),
      );
      const present = sa.filter((a) => a.status === "present").length;
      const absent = sa.filter((a) => a.status === "absent").length;
      const late = sa.filter((a) => a.status === "late").length;
      const leave = sa.filter((a) => a.status === "leave").length;
      const total = sa.length;
      return {
        name: student.name,
        roll: student.roll_number,
        className: student.class_name,
        present,
        absent,
        late,
        leave,
        total,
        pct: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    });

    studentStats.sort((a, b) => {
      const cc = a.className.localeCompare(b.className);
      return cc !== 0 ? cc : a.roll.localeCompare(b.roll);
    });

    // Summary
    const totalPresent = studentStats.reduce((s, x) => s + x.present, 0);
    const totalAbsent = studentStats.reduce((s, x) => s + x.absent, 0);
    const totalLate = studentStats.reduce((s, x) => s + x.late, 0);
    const totalLeave = studentStats.reduce((s, x) => s + x.leave, 0);
    const avgPct =
      studentStats.length > 0
        ? Math.round(
            studentStats.reduce((s, x) => s + x.pct, 0) / studentStats.length,
          )
        : 0;

    // ─── Generate PDF ───
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const monthName = monthNames[month - 1];

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(schoolName, pageWidth / 2, y, { align: "center" });
    y += 8;

    doc.setFontSize(13);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Monthly Attendance Report - ${monthName} ${year}`,
      pageWidth / 2,
      y,
      { align: "center" },
    );
    y += 6;

    if (class_name) {
      doc.setFontSize(11);
      doc.text(`Class: ${class_name}`, pageWidth / 2, y, { align: "center" });
      y += 6;
    }

    // Separator line
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(15, y, pageWidth - 15, y);
    y += 8;

    // Summary section
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", 15, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const summaryItems = [
      `Total Students: ${students.length}`,
      `Average Attendance: ${avgPct}%`,
      `Total Present: ${totalPresent}`,
      `Total Absent: ${totalAbsent}`,
      `Total Late: ${totalLate}`,
      `Total Leave: ${totalLeave}`,
    ];
    const col1 = summaryItems.slice(0, 3);
    const col2 = summaryItems.slice(3);
    col1.forEach((item, i) => {
      doc.text(item, 15, y + i * 5);
    });
    col2.forEach((item, i) => {
      doc.text(item, pageWidth / 2, y + i * 5);
    });
    y += 20;

    // Table header
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(15, y, pageWidth - 15, y);
    y += 5;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const colX = [15, 28, 68, 93, 113, 128, 143, 158, 175];
    const headers = [
      "#",
      "Name",
      "Class",
      "Roll",
      "Present",
      "Absent",
      "Late",
      "Leave",
      "%",
    ];
    headers.forEach((h, i) => {
      doc.text(h, colX[i], y);
    });
    y += 2;
    doc.line(15, y, pageWidth - 15, y);
    y += 5;

    // Table rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    studentStats.forEach((s, idx) => {
      // Check page overflow
      if (y > 275) {
        doc.addPage();
        y = 15;
        // Re-draw header on new page
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        headers.forEach((h, i) => {
          doc.text(h, colX[i], y);
        });
        y += 2;
        doc.line(15, y, pageWidth - 15, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
      }

      const row = [
        String(idx + 1),
        s.name.length > 22 ? s.name.substring(0, 22) + ".." : s.name,
        s.className,
        s.roll,
        String(s.present),
        String(s.absent),
        String(s.late),
        String(s.leave),
        `${s.pct}%`,
      ];

      // Highlight low attendance
      if (s.pct < 75) {
        doc.setTextColor(220, 38, 38); // red
      }
      row.forEach((cell, i) => {
        doc.text(cell, colX[i], y);
      });
      doc.setTextColor(0); // reset
      y += 4.5;
    });

    // Low attendance section
    const lowAttendance = studentStats.filter((s) => s.pct < 75);
    if (lowAttendance.length > 0) {
      if (y > 250) {
        doc.addPage();
        y = 15;
      }
      y += 5;
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(0.5);
      doc.line(15, y, pageWidth - 15, y);
      y += 6;

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text(
        `⚠ Low Attendance Alert (${lowAttendance.length} students below 75%)`,
        15,
        y,
      );
      y += 6;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      lowAttendance.forEach((s) => {
        if (y > 280) {
          doc.addPage();
          y = 15;
        }
        doc.text(
          `• ${s.name} (${s.className}, Roll: ${s.roll}) - ${s.pct}%`,
          18,
          y,
        );
        y += 5;
      });
      doc.setTextColor(0);
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(128);
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
        pageWidth / 2,
        290,
        { align: "center" },
      );
      doc.text("CampusIQ Attendance Management System", pageWidth / 2, 294, {
        align: "center",
      });
      doc.setTextColor(0);
    }

    // Output
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const filename = `attendance-report-${monthName}-${year}${class_name ? `-${class_name}` : ""}.pdf`;

    await audit({
      schoolId: school_id,
      action: "export",
      entity: "report",
      entityId: `${month}-${year}`,
      userId: session!.user.id || "",
      userName: session!.user.name || session!.user.email || "",
      userRole: session!.user.role,
      metadata: {
        month,
        year,
        class_name,
        format: "pdf",
        studentCount: students.length,
      },
    });

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (err) {
    logError("GET", "/api/reports/pdf", err);
    return NextResponse.json(
      { error: "Failed to generate PDF report" },
      { status: 500 },
    );
  }
}
