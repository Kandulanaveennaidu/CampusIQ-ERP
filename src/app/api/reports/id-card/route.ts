import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Student from "@/lib/models/Student";
import User from "@/lib/models/User";
import School from "@/lib/models/School";
import { requireRole } from "@/lib/permissions";
import { logError } from "@/lib/logger";

function generateStudentCardHTML(
  student: Record<string, unknown>,
  school: Record<string, unknown>,
): string {
  return `
  <div class="id-card">
    <div class="card-front">
      <div class="school-header">
        <h2>${school.school_name || "School"}</h2>
        <p class="school-addr">${school.address || ""}</p>
      </div>
      <div class="card-body">
        <div class="photo-area">
          ${student.photo ? `<img src="${student.photo}" alt="Photo" />` : `<div class="photo-placeholder">PHOTO</div>`}
        </div>
        <div class="info">
          <h3 class="student-name">${student.name}</h3>
          <table>
            <tr><td>Class</td><td>${student.class_name || "—"}</td></tr>
            <tr><td>Roll No</td><td>${student.roll_number || "—"}</td></tr>
            <tr><td>DOB</td><td>${student.admission_date || "—"}</td></tr>
          </table>
        </div>
      </div>
      <div class="card-footer">
        <span>STUDENT</span>
      </div>
    </div>
    <div class="card-back">
      <div class="back-header">
        <h3>${school.school_name || "School"}</h3>
      </div>
      <div class="back-body">
        <table>
          <tr><td>Parent</td><td>${student.parent_name || "—"}</td></tr>
          <tr><td>Phone</td><td>${student.parent_phone || "—"}</td></tr>
          <tr><td>Address</td><td>${student.address || "—"}</td></tr>
        </table>
        <div class="barcode-area">
          <div class="barcode-placeholder">||||| ${String(student._id).slice(-8).toUpperCase()} |||||</div>
        </div>
      </div>
      <div class="back-footer">
        <p>${school.phone ? `Phone: ${school.phone}` : ""}${school.email ? ` | ${school.email}` : ""}</p>
      </div>
    </div>
  </div>`;
}

function generateTeacherCardHTML(
  teacher: Record<string, unknown>,
  school: Record<string, unknown>,
): string {
  return `
  <div class="id-card">
    <div class="card-front teacher">
      <div class="school-header">
        <h2>${school.school_name || "School"}</h2>
        <p class="school-addr">${school.address || ""}</p>
      </div>
      <div class="card-body">
        <div class="photo-area">
          ${teacher.avatar ? `<img src="${teacher.avatar}" alt="Photo" />` : `<div class="photo-placeholder">PHOTO</div>`}
        </div>
        <div class="info">
          <h3 class="student-name">${teacher.name}</h3>
          <table>
            <tr><td>Designation</td><td>${teacher.role || "Teacher"}</td></tr>
            <tr><td>Subject</td><td>${teacher.subject || "—"}</td></tr>
            <tr><td>Emp ID</td><td>${String(teacher._id).slice(-6).toUpperCase()}</td></tr>
          </table>
        </div>
      </div>
      <div class="card-footer teacher-footer">
        <span>STAFF</span>
      </div>
    </div>
    <div class="card-back">
      <div class="back-header">
        <h3>${school.school_name || "School"}</h3>
      </div>
      <div class="back-body">
        <table>
          <tr><td>Phone</td><td>${teacher.phone || "—"}</td></tr>
          <tr><td>Email</td><td>${teacher.email || "—"}</td></tr>
          <tr><td>Joining</td><td>${teacher.joiningDate ? new Date(teacher.joiningDate as string).toLocaleDateString() : "—"}</td></tr>
        </table>
        <div class="barcode-area">
          <div class="barcode-placeholder">||||| ${String(teacher._id).slice(-8).toUpperCase()} |||||</div>
        </div>
      </div>
      <div class="back-footer">
        <p>${school.phone ? `Phone: ${school.phone}` : ""}${school.email ? ` | ${school.email}` : ""}</p>
      </div>
    </div>
  </div>`;
}

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireRole("admin");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");
    const teacherId = searchParams.get("teacher_id");
    // Support bulk: comma-separated IDs
    const studentIds = searchParams.get("student_ids");
    const teacherIds = searchParams.get("teacher_ids");

    if (!studentId && !teacherId && !studentIds && !teacherIds) {
      return NextResponse.json(
        {
          error:
            "student_id, teacher_id, student_ids, or teacher_ids is required",
        },
        { status: 400 },
      );
    }

    await connectDB();

    const school = await School.findById(session!.user.school_id).lean();
    const schoolData = school || {
      school_name: "School",
      address: "",
      phone: "",
      email: "",
    };

    const cards: string[] = [];

    // Single student
    if (studentId) {
      const student = await Student.findOne({
        _id: studentId,
        school: session!.user.school_id,
      }).lean();
      if (!student) {
        return NextResponse.json(
          { error: "Student not found" },
          { status: 404 },
        );
      }
      cards.push(
        generateStudentCardHTML(
          student as unknown as Record<string, unknown>,
          schoolData as unknown as Record<string, unknown>,
        ),
      );
    }

    // Single teacher
    if (teacherId) {
      const teacher = await User.findOne({
        _id: teacherId,
        school: session!.user.school_id,
        role: { $in: ["teacher", "admin"] },
      }).lean();
      if (!teacher) {
        return NextResponse.json(
          { error: "Teacher not found" },
          { status: 404 },
        );
      }
      cards.push(
        generateTeacherCardHTML(
          teacher as unknown as Record<string, unknown>,
          schoolData as unknown as Record<string, unknown>,
        ),
      );
    }

    // Bulk students
    if (studentIds) {
      const ids = studentIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      const students = await Student.find({
        _id: { $in: ids },
        school: session!.user.school_id,
      }).lean();
      for (const s of students) {
        cards.push(
          generateStudentCardHTML(
            s as unknown as Record<string, unknown>,
            schoolData as unknown as Record<string, unknown>,
          ),
        );
      }
    }

    // Bulk teachers
    if (teacherIds) {
      const ids = teacherIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      const teachers = await User.find({
        _id: { $in: ids },
        school: session!.user.school_id,
        role: { $in: ["teacher", "admin"] },
      }).lean();
      for (const t of teachers) {
        cards.push(
          generateTeacherCardHTML(
            t as unknown as Record<string, unknown>,
            schoolData as unknown as Record<string, unknown>,
          ),
        );
      }
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ID Card</title>
  <style>
    @media print {
      body { margin: 0; padding: 10mm; }
      .no-print { display: none !important; }
      .id-card { break-inside: avoid; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #e5e7eb;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 20px;
      padding: 20px;
    }
    .id-card {
      display: flex;
      gap: 15px;
    }
    .card-front, .card-back {
      width: 85.6mm;
      height: 53.98mm;
      border-radius: 8px;
      overflow: hidden;
      background: #fff;
      box-shadow: 0 2px 10px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      font-size: 9px;
    }
    .school-header {
      background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
      color: #fff;
      text-align: center;
      padding: 4px 8px;
    }
    .school-header h2 {
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .school-header .school-addr {
      font-size: 7px;
      opacity: 0.85;
      margin-top: 1px;
    }
    .card-body {
      display: flex;
      gap: 8px;
      padding: 6px 8px;
      flex: 1;
    }
    .photo-area {
      width: 28mm;
      height: 32mm;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .photo-area img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 4px;
      border: 1px solid #ddd;
    }
    .photo-placeholder {
      width: 100%;
      height: 100%;
      background: #f3f4f6;
      border: 1px dashed #ccc;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 8px;
      font-weight: bold;
    }
    .info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .student-name {
      font-size: 11px;
      font-weight: bold;
      color: #1e3a5f;
      margin-bottom: 4px;
    }
    .info table {
      width: 100%;
      font-size: 8px;
    }
    .info table td {
      padding: 1.5px 0;
    }
    .info table td:first-child {
      font-weight: bold;
      color: #555;
      width: 55px;
    }
    .card-footer {
      background: #1e3a5f;
      color: #fff;
      text-align: center;
      padding: 2px;
      font-size: 8px;
      font-weight: bold;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .teacher-footer {
      background: linear-gradient(135deg, #065f46 0%, #10b981 100%);
    }
    .card-front.teacher .school-header {
      background: linear-gradient(135deg, #065f46 0%, #10b981 100%);
    }
    /* Back */
    .back-header {
      background: #f3f4f6;
      text-align: center;
      padding: 4px;
      border-bottom: 1px solid #e5e7eb;
    }
    .back-header h3 {
      font-size: 9px;
      color: #333;
    }
    .back-body {
      flex: 1;
      padding: 6px 8px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .back-body table {
      width: 100%;
      font-size: 8px;
    }
    .back-body table td {
      padding: 1.5px 0;
    }
    .back-body table td:first-child {
      font-weight: bold;
      color: #555;
      width: 50px;
    }
    .barcode-area {
      text-align: center;
      margin-top: 4px;
    }
    .barcode-placeholder {
      font-family: monospace;
      font-size: 10px;
      letter-spacing: 2px;
      color: #333;
      padding: 4px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 3px;
    }
    .back-footer {
      background: #f3f4f6;
      text-align: center;
      padding: 3px;
      border-top: 1px solid #e5e7eb;
    }
    .back-footer p {
      font-size: 6.5px;
      color: #666;
    }
  </style>
</head>
<body>
  ${cards.join("\n")}
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    logError("GET", "/api/reports/id-card", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
