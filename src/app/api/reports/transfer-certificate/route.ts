import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Student from "@/lib/models/Student";
import School from "@/lib/models/School";
import { requireRole } from "@/lib/permissions";
import { logError } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireRole("admin");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");
    const leavingDate =
      searchParams.get("leaving_date") ||
      new Date().toISOString().split("T")[0];
    const reason = searchParams.get("reason") || "Parent's request";
    const conduct = searchParams.get("conduct") || "Good";
    const serialNo = searchParams.get("serial_no") || `TC-${Date.now()}`;

    if (!studentId) {
      return NextResponse.json(
        { error: "student_id is required" },
        { status: 400 },
      );
    }

    await connectDB();

    const student = await Student.findOne({
      _id: studentId,
      school: session!.user.school_id,
    }).lean();

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const school = await School.findById(session!.user.school_id).lean();
    const schoolName = school?.school_name || "School";
    const schoolAddress = school?.address || "";
    const schoolPhone = school?.phone || "";
    const schoolEmail = school?.email || "";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Transfer Certificate — ${student.name}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', Times, serif;
      background: #f5f5f5;
      display: flex;
      justify-content: center;
      padding: 20px;
    }
    .tc-page {
      width: 210mm;
      min-height: 297mm;
      background: #fff;
      padding: 20mm;
      border: 3px double #333;
      position: relative;
    }
    .tc-page::before {
      content: '';
      position: absolute;
      top: 5mm;
      left: 5mm;
      right: 5mm;
      bottom: 5mm;
      border: 1px solid #999;
      pointer-events: none;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 2px solid #333;
    }
    .header h1 {
      font-size: 24px;
      text-transform: uppercase;
      letter-spacing: 3px;
      margin-bottom: 5px;
      color: #1a1a1a;
    }
    .header .address {
      font-size: 12px;
      color: #555;
      margin-bottom: 15px;
    }
    .header .tc-title {
      font-size: 20px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 5px;
      background: #333;
      color: #fff;
      display: inline-block;
      padding: 6px 25px;
      margin-top: 10px;
    }
    .serial-row {
      display: flex;
      justify-content: space-between;
      margin: 20px 0;
      font-size: 13px;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .details-table tr {
      border-bottom: 1px dotted #ccc;
    }
    .details-table td {
      padding: 10px 8px;
      vertical-align: top;
      font-size: 14px;
    }
    .details-table td:first-child {
      width: 45%;
      font-weight: bold;
      color: #333;
    }
    .details-table td:last-child {
      color: #1a1a1a;
    }
    .sl-no {
      width: 30px;
      text-align: center;
      color: #888;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 80px;
      padding-top: 15px;
    }
    .sig-block {
      text-align: center;
      width: 200px;
    }
    .sig-block .line {
      border-top: 1px solid #333;
      margin-bottom: 5px;
    }
    .sig-block p {
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .footer-note {
      text-align: center;
      margin-top: 40px;
      font-size: 11px;
      color: #888;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="tc-page">
    <div class="header">
      <h1>${schoolName}</h1>
      <div class="address">${schoolAddress}${schoolPhone ? ` | Phone: ${schoolPhone}` : ""}${schoolEmail ? ` | Email: ${schoolEmail}` : ""}</div>
      <div class="tc-title">Transfer Certificate</div>
    </div>

    <div class="serial-row">
      <span><strong>Serial No:</strong> ${serialNo}</span>
      <span><strong>Date:</strong> ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</span>
    </div>

    <table class="details-table">
      <tr>
        <td><span class="sl-no">1.</span> Name of the Student</td>
        <td>${student.name}</td>
      </tr>
      <tr>
        <td><span class="sl-no">2.</span> Father's / Guardian's Name</td>
        <td>${student.parent_name || "—"}</td>
      </tr>
      <tr>
        <td><span class="sl-no">3.</span> Date of Birth</td>
        <td>${student.admission_date || "—"}</td>
      </tr>
      <tr>
        <td><span class="sl-no">4.</span> Class at the time of Leaving</td>
        <td>${student.class_name}</td>
      </tr>
      <tr>
        <td><span class="sl-no">5.</span> Roll Number</td>
        <td>${student.roll_number}</td>
      </tr>
      <tr>
        <td><span class="sl-no">6.</span> Date of Admission</td>
        <td>${student.admission_date || "—"}</td>
      </tr>
      <tr>
        <td><span class="sl-no">7.</span> Date of Leaving</td>
        <td>${leavingDate ? new Date(leavingDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—"}</td>
      </tr>
      <tr>
        <td><span class="sl-no">8.</span> Reason for Leaving</td>
        <td>${reason}</td>
      </tr>
      <tr>
        <td><span class="sl-no">9.</span> General Conduct</td>
        <td>${conduct}</td>
      </tr>
      <tr>
        <td><span class="sl-no">10.</span> Whether qualified for promotion</td>
        <td>Yes</td>
      </tr>
      <tr>
        <td><span class="sl-no">11.</span> Total Working Days</td>
        <td>—</td>
      </tr>
      <tr>
        <td><span class="sl-no">12.</span> Total Days Present</td>
        <td>—</td>
      </tr>
      <tr>
        <td><span class="sl-no">13.</span> Whether fees have been paid</td>
        <td>Yes</td>
      </tr>
    </table>

    <div class="signatures">
      <div class="sig-block">
        <div class="line"></div>
        <p>Class Teacher</p>
      </div>
      <div class="sig-block">
        <div class="line"></div>
        <p>Principal</p>
      </div>
    </div>

    <div class="footer-note">
      This is a computer-generated Transfer Certificate issued by ${schoolName}.<br />
      No signature is required for digital copies.
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    logError("GET", "/api/reports/transfer-certificate", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
