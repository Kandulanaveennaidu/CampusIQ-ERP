import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import { FeePayment } from "@/lib/models/Fee";
import School from "@/lib/models/School";
import { logRequest, logError } from "@/lib/logger";

// GET - Generate printable fee receipt HTML
export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("fees:read");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("payment_id");

    if (!paymentId) {
      return NextResponse.json(
        { error: "payment_id is required" },
        { status: 400 },
      );
    }

    await connectDB();
    const schoolId = session!.user.school_id;
    logRequest("GET", "/api/reports/fee-receipt", session!.user.id, schoolId);

    // Fetch payment with student details
    const payment = await FeePayment.findOne({
      _id: paymentId,
      school: schoolId,
    }).populate(
      "student",
      "name roll_number class_name parent_name parent_phone address",
    );

    if (!payment) {
      return NextResponse.json(
        { error: "Payment record not found" },
        { status: 404 },
      );
    }

    const student = payment.student as unknown as {
      name: string;
      roll_number: string;
      class_name: string;
      parent_name: string;
      parent_phone: string;
      address: string;
    };

    const school = await School.findById(schoolId).select("school_name").lean();
    const schoolName =
      (school as { school_name?: string })?.school_name || "CampusIQ School";

    const paymentDate = new Date(payment.paymentDate).toLocaleDateString(
      "en-IN",
      { day: "2-digit", month: "short", year: "numeric" },
    );

    const methodLabels: Record<string, string> = {
      cash: "Cash",
      upi: "UPI",
      bank_transfer: "Bank Transfer",
      cheque: "Cheque",
      online: "Online Payment",
      other: "Other",
    };

    const statusColors: Record<string, string> = {
      paid: "#155724",
      partial: "#856404",
      pending: "#856404",
      overdue: "#721c24",
      refunded: "#0c5460",
    };

    const statusBg: Record<string, string> = {
      paid: "#d4edda",
      partial: "#fff3cd",
      pending: "#fff3cd",
      overdue: "#f8d7da",
      refunded: "#d1ecf1",
    };

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Fee Receipt - ${payment.receiptNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #1a1a2e;
      background: #f8f9fa;
      padding: 20px;
    }

    .receipt {
      max-width: 700px;
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

    .header h1 { font-size: 24px; margin-bottom: 4px; letter-spacing: 1px; }
    .header p { font-size: 13px; opacity: 0.85; }

    .receipt-title {
      text-align: center;
      padding: 16px;
      background: #f0f4ff;
      border-bottom: 1px solid #ddd;
    }

    .receipt-title h2 {
      font-size: 18px;
      color: #16213e;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .receipt-meta {
      display: flex;
      justify-content: space-between;
      padding: 16px 32px;
      background: #fafafa;
      border-bottom: 1px solid #ddd;
      font-size: 14px;
    }

    .receipt-meta .meta-item {
      display: flex;
      gap: 6px;
    }

    .receipt-meta .label { color: #666; }
    .receipt-meta .value { font-weight: 700; color: #1a1a2e; }

    .section {
      padding: 20px 32px;
      border-bottom: 1px solid #e8e8e8;
    }

    .section-title {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888;
      margin-bottom: 12px;
      font-weight: 600;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 24px;
    }

    .info-item {
      display: flex;
      gap: 8px;
      font-size: 14px;
    }

    .info-item .label { color: #555; min-width: 110px; }
    .info-item .value { font-weight: 600; color: #1a1a2e; }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    th, td {
      border: 1px solid #ddd;
      padding: 10px 12px;
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

    .amount-row td { font-weight: 600; }
    .total-row { background: #e8edf5; }
    .total-row td { font-weight: 700; font-size: 16px; }

    .right { text-align: right; }

    .status-badge {
      display: inline-block;
      padding: 3px 14px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      background: ${statusBg[payment.status] || "#eee"};
      color: ${statusColors[payment.status] || "#333"};
    }

    .payment-info {
      padding: 16px 32px;
      background: #f9fafb;
      border-bottom: 1px solid #e8e8e8;
      font-size: 13px;
      color: #666;
    }

    .signatures {
      display: flex;
      justify-content: space-between;
      padding: 30px 32px 20px;
    }

    .signature-block {
      text-align: center;
      width: 40%;
    }

    .signature-block .line {
      border-top: 1px solid #333;
      margin-top: 40px;
      padding-top: 6px;
      font-size: 13px;
      font-weight: 600;
    }

    .footer {
      padding: 16px 32px;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #999;
      border-top: 1px solid #ddd;
    }

    .watermark {
      text-align: center;
      font-size: 11px;
      color: #bbb;
      padding: 8px;
      font-style: italic;
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
      .receipt { border: none; border-radius: 0; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()">🖨️ Print Receipt</button>
    <button onclick="window.close()">✕ Close</button>
  </div>

  <div class="receipt">
    <div class="header">
      <h1>${schoolName}</h1>
      <p>School Management System</p>
    </div>

    <div class="receipt-title">
      <h2>Fee Receipt</h2>
    </div>

    <div class="receipt-meta">
      <div class="meta-item">
        <span class="label">Receipt No:</span>
        <span class="value">${payment.receiptNumber}</span>
      </div>
      <div class="meta-item">
        <span class="label">Date:</span>
        <span class="value">${paymentDate}</span>
      </div>
      <div class="meta-item">
        <span class="label">Status:</span>
        <span class="status-badge">${payment.status}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Student Information</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="label">Student Name:</span>
          <span class="value">${student?.name || payment.studentName}</span>
        </div>
        <div class="info-item">
          <span class="label">Roll Number:</span>
          <span class="value">${student?.roll_number || "-"}</span>
        </div>
        <div class="info-item">
          <span class="label">Class:</span>
          <span class="value">${student?.class_name || payment.className}</span>
        </div>
        <div class="info-item">
          <span class="label">Parent Name:</span>
          <span class="value">${student?.parent_name || "-"}</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Fee Details</div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr class="amount-row">
            <td>${payment.feeName}</td>
            <td class="right">₹${payment.amount.toLocaleString("en-IN")}</td>
          </tr>
          ${
            payment.lateFee > 0
              ? `<tr>
                  <td>Late Fee</td>
                  <td class="right">₹${payment.lateFee.toLocaleString("en-IN")}</td>
                </tr>`
              : ""
          }
          ${
            payment.discount > 0
              ? `<tr>
                  <td>Discount</td>
                  <td class="right">- ₹${payment.discount.toLocaleString("en-IN")}</td>
                </tr>`
              : ""
          }
          <tr class="total-row">
            <td>Total Paid</td>
            <td class="right">₹${payment.totalPaid.toLocaleString("en-IN")}</td>
          </tr>
          ${
            payment.balanceDue > 0
              ? `<tr>
                  <td style="color: #721c24;">Balance Due</td>
                  <td class="right" style="color: #721c24;">₹${payment.balanceDue.toLocaleString("en-IN")}</td>
                </tr>`
              : ""
          }
        </tbody>
      </table>
    </div>

    <div class="payment-info">
      <strong>Payment Method:</strong> ${methodLabels[payment.paymentMethod] || payment.paymentMethod}
      ${payment.transactionId ? ` &nbsp;|&nbsp; <strong>Transaction ID:</strong> ${payment.transactionId}` : ""}
      ${payment.paidBy ? ` &nbsp;|&nbsp; <strong>Paid By:</strong> ${payment.paidBy}` : ""}
      ${payment.notes ? `<br/><strong>Notes:</strong> ${payment.notes}` : ""}
    </div>

    <div class="signatures">
      <div class="signature-block">
        <div class="line">Received By</div>
      </div>
      <div class="signature-block">
        <div class="line">Parent / Guardian</div>
      </div>
    </div>

    <div class="watermark">This is a computer-generated receipt and does not require a physical signature.</div>

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
    logError("GET", "/api/reports/fee-receipt", err);
    return NextResponse.json(
      { error: "Failed to generate fee receipt" },
      { status: 500 },
    );
  }
}
