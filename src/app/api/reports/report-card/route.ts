import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import { Grade } from "@/lib/models/Exam";
import Student from "@/lib/models/Student";
import School from "@/lib/models/School";
import { logRequest, logError } from "@/lib/logger";

// GET - Generate printable report card HTML
export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("reports:read");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");
    const examId = searchParams.get("exam_id");

    if (!studentId) {
      return NextResponse.json(
        { error: "student_id is required" },
        { status: 400 },
      );
    }

    await connectDB();
    const schoolId = session!.user.school_id;
    logRequest("GET", "/api/reports/report-card", session!.user.id, schoolId);

    // Fetch student
    const student = await Student.findOne({
      _id: studentId,
      school: schoolId,
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Fetch grades
    const gradeQuery: Record<string, unknown> = {
      school: schoolId,
      student: studentId,
    };
    if (examId) gradeQuery.exam = examId;

    const grades = await Grade.find(gradeQuery).populate(
      "exam",
      "name type className subject totalMarks passingMarks date",
    );

    if (grades.length === 0) {
      return NextResponse.json(
        { error: "No grades found for this student" },
        { status: 404 },
      );
    }

    // Group grades by exam
    const grouped: Record<
      string,
      {
        examName: string;
        examType: string;
        examDate: string;
        grades: typeof grades;
      }
    > = {};

    grades.forEach((g) => {
      const exam = g.exam as unknown as {
        _id: string;
        name: string;
        type: string;
        date: string;
        totalMarks: number;
        passingMarks: number;
      };
      const key = exam?._id?.toString() || "unknown";
      if (!grouped[key]) {
        grouped[key] = {
          examName: exam?.name || "Unknown Exam",
          examType: exam?.type || "",
          examDate: exam?.date
            ? new Date(exam.date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "",
          grades: [],
        };
      }
      grouped[key].grades.push(g);
    });

    // Calculate ranks per exam (based on total marks across subjects)
    const examEntries = Object.entries(grouped);

    // Fetch school name from DB
    const school = await School.findById(schoolId).select("school_name").lean();
    const schoolName =
      (school as { school_name?: string })?.school_name || "CampusIQ School";

    // Generate HTML
    const examSections = examEntries
      .map(([, examData]) => {
        const totalObtained = examData.grades.reduce(
          (s, g) => s + g.marksObtained,
          0,
        );
        const totalMax = examData.grades.reduce((s, g) => s + g.totalMarks, 0);
        const overallPercentage =
          totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : "0";
        const overallGrade = getGrade(parseFloat(overallPercentage));

        const subjectRows = examData.grades
          .map(
            (g) => `
          <tr>
            <td>${g.subject}</td>
            <td class="center">${g.marksObtained}</td>
            <td class="center">${g.totalMarks}</td>
            <td class="center">${g.percentage.toFixed(1)}%</td>
            <td class="center"><span class="grade-badge grade-${g.grade.replace("+", "plus")}">${g.grade}</span></td>
            <td class="center">${g.rank > 0 ? g.rank : "-"}</td>
            <td class="center">${g.remarks || "-"}</td>
          </tr>`,
          )
          .join("");

        return `
        <div class="exam-section">
          <div class="exam-header">
            <h3>${examData.examName}</h3>
            <div class="exam-meta">
              <span>Type: <strong>${examData.examType.replace("-", " ").toUpperCase()}</strong></span>
              <span>Date: <strong>${examData.examDate}</strong></span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th class="center">Marks Obtained</th>
                <th class="center">Total Marks</th>
                <th class="center">Percentage</th>
                <th class="center">Grade</th>
                <th class="center">Rank</th>
                <th class="center">Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${subjectRows}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td><strong>Total</strong></td>
                <td class="center"><strong>${totalObtained}</strong></td>
                <td class="center"><strong>${totalMax}</strong></td>
                <td class="center"><strong>${overallPercentage}%</strong></td>
                <td class="center"><span class="grade-badge grade-${overallGrade.replace("+", "plus")}">${overallGrade}</span></td>
                <td class="center">-</td>
                <td class="center">-</td>
              </tr>
            </tfoot>
          </table>
        </div>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Report Card - ${student.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #1a1a2e;
      background: #f8f9fa;
      padding: 20px;
    }

    .report-card {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
      border: 2px solid #1a1a2e;
      border-radius: 8px;
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #fff;
      padding: 24px 32px;
      text-align: center;
    }

    .header h1 { font-size: 26px; margin-bottom: 4px; letter-spacing: 1px; }
    .header p { font-size: 13px; opacity: 0.85; }
    .header .subtitle { font-size: 18px; margin-top: 12px; font-weight: 600; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 10px; }

    .student-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 24px;
      padding: 20px 32px;
      background: #f0f4ff;
      border-bottom: 1px solid #ddd;
    }

    .student-info .info-item {
      display: flex;
      gap: 8px;
      font-size: 14px;
    }

    .student-info .info-item .label {
      color: #555;
      min-width: 100px;
    }

    .student-info .info-item .value {
      font-weight: 600;
      color: #1a1a2e;
    }

    .exam-section {
      padding: 20px 32px;
      border-bottom: 1px solid #e0e0e0;
    }

    .exam-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      flex-wrap: wrap;
      gap: 8px;
    }

    .exam-header h3 {
      font-size: 17px;
      color: #16213e;
    }

    .exam-meta {
      display: flex;
      gap: 16px;
      font-size: 13px;
      color: #555;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    th, td {
      border: 1px solid #ddd;
      padding: 8px 10px;
      text-align: left;
    }

    th {
      background: #1a1a2e;
      color: #fff;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    tbody tr:nth-child(even) { background: #fafafa; }
    tbody tr:hover { background: #f0f4ff; }

    .center { text-align: center; }

    .total-row {
      background: #e8edf5 !important;
    }

    .grade-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
    }

    .grade-Aplus, .grade-A { background: #d4edda; color: #155724; }
    .grade-Bplus, .grade-B { background: #d1ecf1; color: #0c5460; }
    .grade-C { background: #fff3cd; color: #856404; }
    .grade-D { background: #fce4c0; color: #7d4e00; }
    .grade-F { background: #f8d7da; color: #721c24; }

    .footer {
      padding: 20px 32px;
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #888;
      border-top: 1px solid #ddd;
    }

    .signatures {
      display: flex;
      justify-content: space-between;
      padding: 30px 32px 20px;
    }

    .signature-block {
      text-align: center;
      width: 30%;
    }

    .signature-block .line {
      border-top: 1px solid #333;
      margin-top: 40px;
      padding-top: 6px;
      font-size: 13px;
      font-weight: 600;
    }

    .no-print { margin: 20px auto; text-align: center; }

    .no-print button {
      background: #1a1a2e;
      color: #fff;
      border: none;
      padding: 10px 32px;
      font-size: 15px;
      border-radius: 6px;
      cursor: pointer;
      margin: 0 8px;
    }

    .no-print button:hover { background: #16213e; }

    @media print {
      body { padding: 0; background: #fff; }
      .no-print { display: none !important; }
      .report-card { border: none; border-radius: 0; }
      .exam-section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()">🖨️ Print Report Card</button>
    <button onclick="window.close()">✕ Close</button>
  </div>

  <div class="report-card">
    <div class="header">
      <h1>${schoolName}</h1>
      <p>Academic Report Card</p>
      <div class="subtitle">${student.name}</div>
    </div>

    <div class="student-info">
      <div class="info-item">
        <span class="label">Student Name:</span>
        <span class="value">${student.name}</span>
      </div>
      <div class="info-item">
        <span class="label">Roll Number:</span>
        <span class="value">${student.roll_number}</span>
      </div>
      <div class="info-item">
        <span class="label">Class:</span>
        <span class="value">${student.class_name}</span>
      </div>
      <div class="info-item">
        <span class="label">Parent Name:</span>
        <span class="value">${student.parent_name || "-"}</span>
      </div>
      <div class="info-item">
        <span class="label">Admission Date:</span>
        <span class="value">${student.admission_date || "-"}</span>
      </div>
      <div class="info-item">
        <span class="label">Status:</span>
        <span class="value">${student.status}</span>
      </div>
    </div>

    ${examSections}

    <div class="signatures">
      <div class="signature-block">
        <div class="line">Class Teacher</div>
      </div>
      <div class="signature-block">
        <div class="line">Parent / Guardian</div>
      </div>
      <div class="signature-block">
        <div class="line">Principal</div>
      </div>
    </div>

    <div class="footer">
      <span>Generated on: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
      <span>CampusIQ School Management System</span>
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    logError("GET", "/api/reports/report-card", err);
    return NextResponse.json(
      { error: "Failed to generate report card" },
      { status: 500 },
    );
  }
}

function getGrade(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}
