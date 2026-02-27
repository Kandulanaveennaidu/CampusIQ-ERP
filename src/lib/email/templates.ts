const APP_NAME = "CampusIQ";
const PRIMARY_COLOR = "#2563eb";
const BG_COLOR = "#f8fafc";

function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${APP_NAME}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BG_COLOR}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <!-- Header -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
          <tr>
            <td align="center">
              <div style="width: 56px; height: 56px; background-color: ${PRIMARY_COLOR}; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                <span style="font-size: 24px; color: white;">🎓</span>
              </div>
              <h1 style="margin: 0; color: #1e293b; font-size: 24px; font-weight: 700;">${APP_NAME}</h1>
            </td>
          </tr>
        </table>
        <!-- Content -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
          <tr>
            <td style="padding: 32px;">
              ${content}
            </td>
          </tr>
        </table>
        <!-- Footer -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 24px;">
          <tr>
            <td align="center">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                &copy; ${new Date().getFullYear()} ${APP_NAME}. Institution Management System.
              </p>
              <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px;">
                This is an automated email. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buttonHtml(
  text: string,
  url: string,
  color: string = PRIMARY_COLOR,
): string {
  return `
<table role="presentation" cellspacing="0" cellpadding="0" style="margin: 24px auto;">
  <tr>
    <td align="center" style="background-color: ${color}; border-radius: 8px;">
      <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; letter-spacing: 0.5px;">
        ${text}
      </a>
    </td>
  </tr>
</table>`;
}

// ──────────────────────────────────────────
// Template: Welcome Email
// ──────────────────────────────────────────
export function welcomeEmail(params: {
  name: string;
  schoolName: string;
  schoolId: string;
  email: string;
  role: string;
  loginUrl: string;
}): string {
  return baseLayout(`
    <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 22px;">Welcome to ${APP_NAME}! 🎉</h2>
    <p style="margin: 0 0 16px; color: #475569; font-size: 15px; line-height: 1.6;">
      Hi <strong>${params.name}</strong>, your account has been successfully created.
    </p>
    <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <p style="margin: 0 0 8px; color: #0369a1; font-size: 14px; font-weight: 600;">Your Account Details:</p>
      <table cellspacing="0" cellpadding="4" style="color: #0c4a6e; font-size: 14px;">
        <tr><td style="font-weight: 600;">Institution:</td><td>${params.schoolName}</td></tr>
        <tr><td style="font-weight: 600;">Institution ID:</td><td><code style="background: #e0f2fe; padding: 2px 6px; border-radius: 4px;">${params.schoolId}</code></td></tr>
        <tr><td style="font-weight: 600;">Email:</td><td>${params.email}</td></tr>
        <tr><td style="font-weight: 600;">Role:</td><td style="text-transform: capitalize;">${params.role}</td></tr>
      </table>
    </div>
    ${buttonHtml("Go to Dashboard", params.loginUrl)}
    <p style="margin: 16px 0 0; color: #94a3b8; font-size: 13px; text-align: center;">
      Keep your Institution ID safe — you'll need to share it with your staff.
    </p>
  `);
}

// ──────────────────────────────────────────
// Template: Email Verification
// ──────────────────────────────────────────
export function verificationEmail(params: {
  name: string;
  verifyUrl: string;
  expiresIn: string;
}): string {
  return baseLayout(`
    <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 22px;">Verify Your Email ✉️</h2>
    <p style="margin: 0 0 16px; color: #475569; font-size: 15px; line-height: 1.6;">
      Hi <strong>${params.name}</strong>, please verify your email address by clicking the button below.
    </p>
    ${buttonHtml("Verify Email Address", params.verifyUrl, "#16a34a")}
    <p style="margin: 16px 0 0; color: #94a3b8; font-size: 13px; text-align: center;">
      This link expires in <strong>${params.expiresIn}</strong>. If you didn't create an account, you can safely ignore this email.
    </p>
    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #94a3b8; font-size: 12px;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        <a href="${params.verifyUrl}" style="color: ${PRIMARY_COLOR}; word-break: break-all;">${params.verifyUrl}</a>
      </p>
    </div>
  `);
}

// ──────────────────────────────────────────
// Template: Password Reset
// ──────────────────────────────────────────
export function passwordResetEmail(params: {
  name: string;
  resetUrl: string;
  expiresIn: string;
}): string {
  return baseLayout(`
    <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 22px;">Reset Your Password 🔒</h2>
    <p style="margin: 0 0 16px; color: #475569; font-size: 15px; line-height: 1.6;">
      Hi <strong>${params.name}</strong>, we received a request to reset your password.
    </p>
    ${buttonHtml("Reset Password", params.resetUrl, "#dc2626")}
    <p style="margin: 16px 0 0; color: #94a3b8; font-size: 13px; text-align: center;">
      This link expires in <strong>${params.expiresIn}</strong>.
    </p>
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-top: 16px;">
      <p style="margin: 0; color: #991b1b; font-size: 13px;">
        ⚠️ If you didn't request a password reset, please ignore this email and ensure your account is secure.
      </p>
    </div>
    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #94a3b8; font-size: 12px;">
        If the button doesn't work, copy this link:<br/>
        <a href="${params.resetUrl}" style="color: ${PRIMARY_COLOR}; word-break: break-all;">${params.resetUrl}</a>
      </p>
    </div>
  `);
}

// ──────────────────────────────────────────
// Template: Late Arrival Alert
// ──────────────────────────────────────────
export function lateAlertEmail(params: {
  parentName: string;
  studentName: string;
  className: string;
  date: string;
  time: string;
}): string {
  return baseLayout(`
    <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 22px;">Late Arrival Notification ⏰</h2>
    <p style="margin: 0 0 16px; color: #475569; font-size: 15px; line-height: 1.6;">
      Dear <strong>${params.parentName}</strong>,
    </p>
    <p style="margin: 0 0 16px; color: #475569; font-size: 15px; line-height: 1.6;">
      This is to inform you that your child <strong>${params.studentName}</strong> arrived late today.
    </p>
    <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <table cellspacing="0" cellpadding="4" style="color: #92400e; font-size: 14px;">
        <tr><td style="font-weight: 600;">Student:</td><td>${params.studentName}</td></tr>
        <tr><td style="font-weight: 600;">Class:</td><td>${params.className}</td></tr>
        <tr><td style="font-weight: 600;">Date:</td><td>${params.date}</td></tr>
        <tr><td style="font-weight: 600;">Arrival Time:</td><td>${params.time}</td></tr>
      </table>
    </div>
    <p style="margin: 0; color: #475569; font-size: 14px;">
      Please ensure timely attendance to support your child's learning.
    </p>
  `);
}

// ──────────────────────────────────────────
// Template: Absent Alert
// ──────────────────────────────────────────
export function absentAlertEmail(params: {
  parentName: string;
  studentName: string;
  className: string;
  date: string;
}): string {
  return baseLayout(`
    <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 22px;">Absence Notification 📋</h2>
    <p style="margin: 0 0 16px; color: #475569; font-size: 15px; line-height: 1.6;">
      Dear <strong>${params.parentName}</strong>,
    </p>
    <p style="margin: 0 0 16px; color: #475569; font-size: 15px; line-height: 1.6;">
      Your child <strong>${params.studentName}</strong> was marked absent today.
    </p>
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <table cellspacing="0" cellpadding="4" style="color: #991b1b; font-size: 14px;">
        <tr><td style="font-weight: 600;">Student:</td><td>${params.studentName}</td></tr>
        <tr><td style="font-weight: 600;">Class:</td><td>${params.className}</td></tr>
        <tr><td style="font-weight: 600;">Date:</td><td>${params.date}</td></tr>
        <tr><td style="font-weight: 600;">Status:</td><td>Absent</td></tr>
      </table>
    </div>
    <p style="margin: 0; color: #475569; font-size: 14px;">
      If your child is unwell, please submit a leave application through the portal.
    </p>
  `);
}

// ──────────────────────────────────────────
// Template: Leave Status Update
// ──────────────────────────────────────────
export function leaveStatusEmail(params: {
  name: string;
  studentName: string;
  status: "approved" | "rejected";
  fromDate: string;
  toDate: string;
  approvedBy: string;
}): string {
  const isApproved = params.status === "approved";
  const statusColor = isApproved ? "#16a34a" : "#dc2626";
  const bgColor = isApproved ? "#f0fdf4" : "#fef2f2";
  const borderColor = isApproved ? "#bbf7d0" : "#fecaca";

  return baseLayout(`
    <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 22px;">Leave Request ${isApproved ? "Approved ✅" : "Rejected ❌"}</h2>
    <p style="margin: 0 0 16px; color: #475569; font-size: 15px; line-height: 1.6;">
      Dear <strong>${params.name}</strong>,
    </p>
    <p style="margin: 0 0 16px; color: #475569; font-size: 15px; line-height: 1.6;">
      The leave request for <strong>${params.studentName}</strong> has been
      <span style="color: ${statusColor}; font-weight: 600;">${params.status}</span>.
    </p>
    <div style="background-color: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 8px; padding: 16px;">
      <table cellspacing="0" cellpadding="4" style="font-size: 14px;">
        <tr><td style="font-weight: 600;">Student:</td><td>${params.studentName}</td></tr>
        <tr><td style="font-weight: 600;">From:</td><td>${params.fromDate}</td></tr>
        <tr><td style="font-weight: 600;">To:</td><td>${params.toDate}</td></tr>
        <tr><td style="font-weight: 600;">Status:</td><td style="color: ${statusColor}; font-weight: 600; text-transform: capitalize;">${params.status}</td></tr>
        <tr><td style="font-weight: 600;">Processed by:</td><td>${params.approvedBy}</td></tr>
      </table>
    </div>
  `);
}

// ──────────────────────────────────────────
// Template: Emergency Broadcast
// ──────────────────────────────────────────
export function emergencyAlertEmail(params: {
  schoolName: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  sentBy: string;
  sentAt: string;
}): string {
  const severityColors: Record<
    string,
    { bg: string; border: string; text: string }
  > = {
    critical: { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b" },
    high: { bg: "#fff7ed", border: "#fdba74", text: "#9a3412" },
    medium: { bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
    low: { bg: "#f0f9ff", border: "#bae6fd", text: "#0369a1" },
  };
  const colors = severityColors[params.severity] || severityColors.medium;

  return baseLayout(`
    <h2 style="margin: 0 0 16px; color: #dc2626; font-size: 22px;">🚨 Emergency Alert</h2>
    <div style="background-color: ${colors.bg}; border: 2px solid ${colors.border}; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
      <p style="margin: 0 0 4px; color: ${colors.text}; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">
        ${params.severity} SEVERITY — ${params.type}
      </p>
      <h3 style="margin: 8px 0; color: ${colors.text}; font-size: 20px;">${params.title}</h3>
      <p style="margin: 0; color: ${colors.text}; font-size: 15px; line-height: 1.6;">${params.message}</p>
    </div>
    <div style="padding: 12px; background-color: #f1f5f9; border-radius: 8px;">
      <table cellspacing="0" cellpadding="4" style="font-size: 13px; color: #475569;">
        <tr><td style="font-weight: 600;">Institution:</td><td>${params.schoolName}</td></tr>
        <tr><td style="font-weight: 600;">Sent by:</td><td>${params.sentBy}</td></tr>
        <tr><td style="font-weight: 600;">Time:</td><td>${params.sentAt}</td></tr>
      </table>
    </div>
  `);
}

// ──────────────────────────────────────────
// Template: Visitor Notification
// ──────────────────────────────────────────
export function visitorNotificationEmail(params: {
  hostName: string;
  visitorName: string;
  purpose: string;
  checkInTime: string;
  badgeNumber: string;
}): string {
  return baseLayout(`
    <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 22px;">Visitor Arrival 🏫</h2>
    <p style="margin: 0 0 16px; color: #475569; font-size: 15px; line-height: 1.6;">
      Hi <strong>${params.hostName}</strong>, a visitor has arrived to meet you.
    </p>
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px;">
      <table cellspacing="0" cellpadding="4" style="color: #166534; font-size: 14px;">
        <tr><td style="font-weight: 600;">Visitor:</td><td>${params.visitorName}</td></tr>
        <tr><td style="font-weight: 600;">Purpose:</td><td>${params.purpose}</td></tr>
        <tr><td style="font-weight: 600;">Check-in:</td><td>${params.checkInTime}</td></tr>
        <tr><td style="font-weight: 600;">Badge #:</td><td><code style="background: #dcfce7; padding: 2px 6px; border-radius: 4px;">${params.badgeNumber}</code></td></tr>
      </table>
    </div>
  `);
}

// ──────────────────────────────────────────
// Template: Leave Status Notification
// ──────────────────────────────────────────
export function leaveApprovalEmail(params: {
  employeeName: string;
  status: "approved" | "rejected";
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  approverName: string;
  remarks?: string;
}): string {
  const isApproved = params.status === "approved";
  const statusColor = isApproved ? "#16a34a" : "#dc2626";
  const statusBg = isApproved ? "#f0fdf4" : "#fef2f2";
  const statusBorder = isApproved ? "#bbf7d0" : "#fecaca";
  const statusIcon = isApproved ? "✅" : "❌";

  return baseLayout(`
    <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 22px;">Leave Request ${isApproved ? "Approved" : "Rejected"} ${statusIcon}</h2>
    <p style="margin: 0 0 16px; color: #475569; font-size: 15px; line-height: 1.6;">
      Hi <strong>${params.employeeName}</strong>, your leave request has been <strong style="color: ${statusColor};">${params.status}</strong>.
    </p>
    <div style="background-color: ${statusBg}; border: 1px solid ${statusBorder}; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <table cellspacing="0" cellpadding="4" style="font-size: 14px; color: #374151;">
        <tr><td style="font-weight: 600;">Leave Type:</td><td>${params.leaveType}</td></tr>
        <tr><td style="font-weight: 600;">From:</td><td>${params.startDate}</td></tr>
        <tr><td style="font-weight: 600;">To:</td><td>${params.endDate}</td></tr>
        <tr><td style="font-weight: 600;">Reason:</td><td>${params.reason}</td></tr>
        <tr><td style="font-weight: 600;">${isApproved ? "Approved" : "Rejected"} by:</td><td>${params.approverName}</td></tr>
        ${params.remarks ? `<tr><td style="font-weight: 600;">Remarks:</td><td>${params.remarks}</td></tr>` : ""}
      </table>
    </div>
  `);
}

// ──────────────────────────────────────────
// Template: Fee Reminder
// ──────────────────────────────────────────
export function feeReminderEmail(params: {
  parentName: string;
  studentName: string;
  className: string;
  feeName: string;
  amount: number;
  dueDate: string;
  currency?: string;
  schoolName: string;
  isOverdue?: boolean;
}): string {
  const currency = params.currency || "INR";
  const isOverdue = params.isOverdue;
  const alertBg = isOverdue ? "#fef2f2" : "#fffbeb";
  const alertBorder = isOverdue ? "#fecaca" : "#fde68a";
  const alertColor = isOverdue ? "#991b1b" : "#92400e";

  return baseLayout(`
    <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 22px;">${isOverdue ? "⚠️ Fee Overdue" : "📋 Fee Reminder"}</h2>
    <p style="margin: 0 0 16px; color: #475569; font-size: 15px; line-height: 1.6;">
      Dear <strong>${params.parentName}</strong>, this is a ${isOverdue ? "reminder that the following fee is overdue" : "friendly reminder about an upcoming fee payment"} for your ward.
    </p>
    <div style="background-color: ${alertBg}; border: 1px solid ${alertBorder}; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <table cellspacing="0" cellpadding="4" style="font-size: 14px; color: ${alertColor};">
        <tr><td style="font-weight: 600;">Student:</td><td>${params.studentName} (${params.className})</td></tr>
        <tr><td style="font-weight: 600;">Fee:</td><td>${params.feeName}</td></tr>
        <tr><td style="font-weight: 600;">Amount:</td><td style="font-size: 18px; font-weight: 700;">${currency} ${params.amount.toLocaleString()}</td></tr>
        <tr><td style="font-weight: 600;">Due Date:</td><td>${params.dueDate}</td></tr>
      </table>
    </div>
    <p style="margin: 0; color: #475569; font-size: 13px;">
      Please ensure timely payment to avoid late fees. Contact the administration for any queries.
    </p>
    <p style="margin: 16px 0 0; color: #94a3b8; font-size: 12px;">— ${params.schoolName}</p>
  `);
}

// ──────────────────────────────────────────
// Template: Fee Payment Confirmation
// ──────────────────────────────────────────
export function feePaymentConfirmationEmail(params: {
  parentName: string;
  studentName: string;
  className: string;
  feeName: string;
  amountPaid: number;
  receiptNumber: string;
  paymentDate: string;
  paymentMethod: string;
  currency?: string;
  schoolName: string;
}): string {
  const currency = params.currency || "INR";

  return baseLayout(`
    <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 22px;">Payment Received ✅</h2>
    <p style="margin: 0 0 16px; color: #475569; font-size: 15px; line-height: 1.6;">
      Dear <strong>${params.parentName}</strong>, we have received the fee payment for your ward.
    </p>
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <table cellspacing="0" cellpadding="4" style="font-size: 14px; color: #166534;">
        <tr><td style="font-weight: 600;">Student:</td><td>${params.studentName} (${params.className})</td></tr>
        <tr><td style="font-weight: 600;">Fee:</td><td>${params.feeName}</td></tr>
        <tr><td style="font-weight: 600;">Amount Paid:</td><td style="font-size: 18px; font-weight: 700;">${currency} ${params.amountPaid.toLocaleString()}</td></tr>
        <tr><td style="font-weight: 600;">Receipt #:</td><td><code style="background: #dcfce7; padding: 2px 6px; border-radius: 4px;">${params.receiptNumber}</code></td></tr>
        <tr><td style="font-weight: 600;">Payment Method:</td><td>${params.paymentMethod}</td></tr>
        <tr><td style="font-weight: 600;">Date:</td><td>${params.paymentDate}</td></tr>
      </table>
    </div>
    <p style="margin: 0; color: #94a3b8; font-size: 12px;">— ${params.schoolName}</p>
  `);
}

// ──────────────────────────────────────────
// Template: Subscription Payment Receipt
// ──────────────────────────────────────────
export function paymentReceiptEmail(params: {
  customerName: string;
  institutionName: string;
  planName: string;
  billingCycle: "monthly" | "yearly";
  amount: number;
  currency: string;
  transactionId: string;
  authCode: string;
  invoiceNumber: string;
  cardType: string;
  cardLast4: string;
  paymentDate: string;
  periodStart: string;
  periodEnd: string;
  features: string[];
  dashboardUrl: string;
}): string {
  const currencySymbol =
    params.currency === "USD"
      ? "$"
      : params.currency === "INR"
        ? "₹"
        : params.currency;

  return baseLayout(`
    <!-- Success Banner -->
    <div style="background: linear-gradient(135deg, #059669, #10b981); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
        <span style="font-size: 32px;">✅</span>
      </div>
      <h2 style="margin: 0; color: white; font-size: 22px; font-weight: 700;">Payment Successful!</h2>
      <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Your subscription has been activated</p>
    </div>

    <p style="margin: 0 0 20px; color: #475569; font-size: 15px; line-height: 1.6;">
      Hi <strong>${params.customerName}</strong>, thank you for subscribing to CampusIQ! Here's your payment receipt.
    </p>

    <!-- Invoice Details Card -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
      <div style="background-color: #1e293b; padding: 16px 20px;">
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <p style="margin: 0; color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Invoice</p>
              <p style="margin: 4px 0 0; color: white; font-size: 15px; font-weight: 600;">${params.invoiceNumber}</p>
            </td>
            <td align="right">
              <p style="margin: 0; color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Date</p>
              <p style="margin: 4px 0 0; color: white; font-size: 15px; font-weight: 600;">${params.paymentDate}</p>
            </td>
          </tr>
        </table>
      </div>
      <div style="padding: 20px;">
        <table width="100%" cellspacing="0" cellpadding="8" style="font-size: 14px; color: #334155;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="font-weight: 600; color: #64748b; width: 140px;">Institution</td>
            <td style="font-weight: 600;">${params.institutionName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="font-weight: 600; color: #64748b;">Plan</td>
            <td>
              <span style="background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 3px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">${params.planName}</span>
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="font-weight: 600; color: #64748b;">Billing Cycle</td>
            <td style="text-transform: capitalize;">${params.billingCycle}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="font-weight: 600; color: #64748b;">Period</td>
            <td>${params.periodStart} — ${params.periodEnd}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="font-weight: 600; color: #64748b;">Payment Method</td>
            <td>💳 ${params.cardType} ending in ${params.cardLast4}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="font-weight: 600; color: #64748b;">Transaction ID</td>
            <td><code style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 13px;">${params.transactionId}</code></td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="font-weight: 600; color: #64748b;">Auth Code</td>
            <td><code style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 13px;">${params.authCode}</code></td>
          </tr>
        </table>

        <!-- Amount Box -->
        <div style="background: linear-gradient(135deg, #eff6ff, #f0fdf4); border: 2px solid #bfdbfe; border-radius: 10px; padding: 16px; margin-top: 16px; text-align: center;">
          <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Amount Paid</p>
          <p style="margin: 6px 0 0; color: #059669; font-size: 32px; font-weight: 800;">${currencySymbol}${params.amount.toFixed(2)}</p>
        </div>
      </div>
    </div>

    <!-- Plan Features -->
    <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px; color: #0369a1; font-size: 15px; font-weight: 700;">🎯 Your ${params.planName} Plan Includes:</h3>
      <table cellspacing="0" cellpadding="0" style="width: 100%;">
        ${params.features
          .map(
            (f) => `
        <tr>
          <td style="padding: 4px 0; color: #0c4a6e; font-size: 13px;">
            <span style="color: #10b981; margin-right: 8px;">✓</span> ${f}
          </td>
        </tr>`,
          )
          .join("")}
      </table>
    </div>

    <!-- CTA Button -->
    ${buttonHtml("Go to Dashboard", params.dashboardUrl)}

    <!-- Security Note -->
    <div style="background-color: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 14px; margin-top: 20px;">
      <p style="margin: 0; color: #92400e; font-size: 12px; line-height: 1.5;">
        🔒 <strong>Secure Payment:</strong> This transaction was processed securely via Authorize.net. 
        Your card details are encrypted and never stored on our servers. 
        If you have any questions about this charge, contact our support team.
      </p>
    </div>

    <p style="margin: 20px 0 0; color: #94a3b8; font-size: 12px; text-align: center;">
      Thank you for choosing CampusIQ for <strong>${params.institutionName}</strong>!
    </p>
  `);
}
