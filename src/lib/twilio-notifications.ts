/**
 * Twilio Multi-Channel Notification Controller
 * ─────────────────────────────────────────────
 * Sends real-time SMS + WhatsApp notifications for CampusIQ workflows:
 *   1. Student Attendance (Parent Notification)
 *   2. Admin Broadcast (Teachers/Students)
 *   3. Teacher Updates (Schedule/Assignment)
 *   4. Student Performance (Exam Results)
 *
 * All credentials are read from process.env — never hardcoded.
 */

import logger from "@/lib/logger";

// ── Types ────────────────────────────────────────────────────────────────────

export interface NotificationResult {
  success: boolean;
  channel: "sms" | "whatsapp";
  messageId?: string;
  error?: string;
}

export interface MultiChannelResult {
  sms: NotificationResult;
  whatsapp: NotificationResult;
}

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  smsFrom: string;
  whatsappFrom: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format a phone number to E.164 format (+91XXXXXXXXXX).
 * Handles common Indian number formats:
 *   - 9876543210        → +919876543210
 *   - 09876543210       → +919876543210
 *   - 919876543210      → +919876543210
 *   - +919876543210     → +919876543210 (already valid)
 *   - +14155238886      → +14155238886  (non-IN numbers preserved)
 */
export function formatToE164(phone: string, defaultCountryCode = "91"): string {
  // Strip all non-digit characters except leading '+'
  let cleaned = phone.replace(/[^\d+]/g, "");

  // Already in full E.164 format
  if (/^\+\d{10,15}$/.test(cleaned)) {
    return cleaned;
  }

  // Remove leading '+'
  cleaned = cleaned.replace(/^\+/, "");

  // Remove leading '0' (local trunk prefix in India)
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }

  // If it already starts with the country code and has enough digits
  if (cleaned.startsWith(defaultCountryCode) && cleaned.length >= 12) {
    return `+${cleaned}`;
  }

  // Bare 10-digit number — prepend country code
  if (cleaned.length === 10) {
    return `+${defaultCountryCode}${cleaned}`;
  }

  // Fallback: prepend '+' and hope for the best
  return `+${cleaned}`;
}

/**
 * Resolve Twilio credentials from environment. Returns null if not configured.
 */
function getTwilioConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const smsFrom = process.env.TWILIO_PHONE_NUMBER;
  const whatsappFrom =
    process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !smsFrom || !whatsappFrom) {
    logger.warn({
      type: "twilio_config_missing",
      hasAccountSid: !!accountSid,
      hasAuthToken: !!authToken,
      hasSmsFrom: !!smsFrom,
      hasWhatsappFrom: !!whatsappFrom,
    });
    return null;
  }

  return { accountSid, authToken, smsFrom, whatsappFrom };
}

// ── Core Senders ─────────────────────────────────────────────────────────────

/**
 * Send a single SMS via Twilio REST API.
 */
async function sendSMSviaTwilio(
  to: string,
  body: string,
  config: TwilioConfig,
): Promise<NotificationResult> {
  try {
    const credentials = Buffer.from(
      `${config.accountSid}:${config.authToken}`,
    ).toString("base64");

    const formattedTo = formatToE164(to);
    const params = new URLSearchParams({
      To: formattedTo,
      From: config.smsFrom,
      Body: body,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    );

    const data = await response.json();

    if (response.ok) {
      logger.info({
        type: "notification",
        channel: "sms",
        to: formattedTo,
        messageId: data.sid,
        status: "sent",
      });
      return { success: true, channel: "sms", messageId: data.sid };
    }

    logger.warn({
      type: "notification",
      channel: "sms",
      to: formattedTo,
      error: data.message,
      code: data.code,
    });
    return {
      success: false,
      channel: "sms",
      error: data.message || "SMS delivery failed",
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "SMS send failed";
    logger.error({ type: "notification", channel: "sms", error: msg });
    return { success: false, channel: "sms", error: msg };
  }
}

/**
 * Send a WhatsApp message via Twilio Sandbox / Business API.
 */
async function sendWhatsAppViaTwilio(
  to: string,
  body: string,
  config: TwilioConfig,
): Promise<NotificationResult> {
  try {
    const credentials = Buffer.from(
      `${config.accountSid}:${config.authToken}`,
    ).toString("base64");

    const formattedTo = formatToE164(to);
    const params = new URLSearchParams({
      To: `whatsapp:${formattedTo}`,
      From: `whatsapp:${config.whatsappFrom}`,
      Body: body,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    );

    const data = await response.json();

    if (response.ok) {
      logger.info({
        type: "notification",
        channel: "whatsapp",
        to: formattedTo,
        messageId: data.sid,
        status: "sent",
      });
      return { success: true, channel: "whatsapp", messageId: data.sid };
    }

    logger.warn({
      type: "notification",
      channel: "whatsapp",
      to: formattedTo,
      error: data.message,
      code: data.code,
    });
    return {
      success: false,
      channel: "whatsapp",
      error: data.message || "WhatsApp delivery failed",
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "WhatsApp send failed";
    logger.error({ type: "notification", channel: "whatsapp", error: msg });
    return { success: false, channel: "whatsapp", error: msg };
  }
}

// ── Dual-Channel Delivery ────────────────────────────────────────────────────

/**
 * Send a notification to BOTH SMS and WhatsApp simultaneously.
 * Failures on one channel do NOT block the other.
 */
export async function sendMultiChannelNotification(
  phone: string,
  message: string,
): Promise<MultiChannelResult> {
  const config = getTwilioConfig();

  if (!config) {
    logger.error({
      type: "twilio_not_configured",
      phone,
      message: "Twilio env vars missing — SMS/WhatsApp will NOT be sent",
    });
    const notConfigured = (ch: "sms" | "whatsapp"): NotificationResult => ({
      success: false,
      channel: ch,
      error:
        "Twilio not configured — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER",
    });
    return { sms: notConfigured("sms"), whatsapp: notConfigured("whatsapp") };
  }

  logger.info({
    type: "twilio_sending",
    phone: formatToE164(phone),
    messageLength: message.length,
  });

  const [sms, whatsapp] = await Promise.allSettled([
    sendSMSviaTwilio(phone, message, config),
    sendWhatsAppViaTwilio(phone, message, config),
  ]);

  const result: MultiChannelResult = {
    sms:
      sms.status === "fulfilled"
        ? sms.value
        : { success: false, channel: "sms", error: String(sms.reason) },
    whatsapp:
      whatsapp.status === "fulfilled"
        ? whatsapp.value
        : {
            success: false,
            channel: "whatsapp",
            error: String(whatsapp.reason),
          },
  };

  // Log delivery results
  logger.info({
    type: "twilio_result",
    phone: formatToE164(phone),
    sms: { success: result.sms.success, error: result.sms.error },
    whatsapp: { success: result.whatsapp.success, error: result.whatsapp.error },
  });

  return result;
}

// ── Template-Based Notification Functions ────────────────────────────────────

/**
 * 1. Student Attendance — Notify parent when student is marked Absent.
 */
export async function notifyParentAbsence(
  parentPhone: string,
  parentName: string,
  studentName: string,
): Promise<MultiChannelResult> {
  const message = `Hi ${parentName}, ${studentName} was marked Absent from CampusIQ today. Please contact the office if this is an error.`;
  return sendMultiChannelNotification(parentPhone, message);
}

/**
 * 2. Admin Broadcast — Urgent announcement to all Teachers/Students.
 */
export async function sendAdminBroadcast(
  phone: string,
  announcementContent: string,
): Promise<MultiChannelResult> {
  const message = `CampusIQ Alert: ${announcementContent}.`;
  return sendMultiChannelNotification(phone, message);
}

/**
 * 3. Teacher Update — New schedule or assignment posted by Admin.
 */
export async function notifyTeacherUpdate(
  teacherPhone: string,
  teacherName: string,
): Promise<MultiChannelResult> {
  const message = `CampusIQ: Hello ${teacherName}, a new schedule has been posted for your class. Login to CampusIQ for details.`;
  return sendMultiChannelNotification(teacherPhone, message);
}

/**
 * 4. Student Performance — Exam results available.
 */
export async function notifyStudentResults(
  studentPhone: string,
  studentName: string,
  examName: string,
): Promise<MultiChannelResult> {
  const message = `Hi ${studentName}, your results for ${examName} are now available on the CampusIQ portal.`;
  return sendMultiChannelNotification(studentPhone, message);
}

// ── Bulk Helpers ─────────────────────────────────────────────────────────────

/**
 * Send bulk WhatsApp messages (parallel to sendBulkSMS in sms.ts).
 */
export async function sendBulkWhatsApp(
  recipients: Array<{ phone: string; message: string }>,
): Promise<Array<NotificationResult & { phone: string }>> {
  const config = getTwilioConfig();
  if (!config)
    return recipients.map((r) => ({
      success: false,
      channel: "whatsapp" as const,
      phone: r.phone,
      error: "Twilio not configured",
    }));

  const results: Array<NotificationResult & { phone: string }> = [];
  for (const r of recipients) {
    const result = await sendWhatsAppViaTwilio(r.phone, r.message, config);
    results.push({ ...result, phone: r.phone });
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return results;
}

// ── Additional Template Functions ────────────────────────────────────────────

/**
 * 5. Leave Approval/Rejection — Notify parent/teacher via SMS + WhatsApp.
 */
export async function notifyLeaveStatus(
  phone: string,
  personName: string,
  status: string,
): Promise<MultiChannelResult> {
  const message = `CampusIQ: Dear ${personName}, your leave request has been ${status}. Login to CampusIQ for details.`;
  return sendMultiChannelNotification(phone, message);
}

/**
 * 6. Low Attendance Warning — Notify parent via SMS + WhatsApp.
 */
export async function notifyLowAttendance(
  parentPhone: string,
  studentName: string,
  percentage: number,
  threshold: number,
): Promise<MultiChannelResult> {
  const message = `CampusIQ Warning: ${studentName}'s attendance is ${percentage}%, below the required ${threshold}%. Please ensure regular attendance.`;
  return sendMultiChannelNotification(parentPhone, message);
}

/**
 * 7. Salary Processed — Notify teacher when salary is generated/paid.
 */
export async function notifySalaryProcessed(
  teacherPhone: string,
  teacherName: string,
  month: number,
  year: number,
  netSalary: number,
  status: string,
): Promise<MultiChannelResult> {
  const monthName = new Date(year, month - 1).toLocaleString("en-IN", {
    month: "long",
  });
  const message = `CampusIQ: Dear ${teacherName}, your salary for ${monthName} ${year} (₹${netSalary}) has been ${status}. Login to CampusIQ for details.`;
  return sendMultiChannelNotification(teacherPhone, message);
}

/**
 * 8. Student Registration — Notify parent when student is added.
 */
export async function notifyStudentRegistration(
  parentPhone: string,
  parentName: string,
  studentName: string,
  className: string,
  rollNumber: string,
): Promise<MultiChannelResult> {
  const message = `CampusIQ: Dear ${parentName}, ${studentName} has been registered in Class ${className} (Roll No: ${rollNumber}). Welcome to CampusIQ!`;
  return sendMultiChannelNotification(parentPhone, message);
}

/**
 * 9. Circular/Announcement — Notify recipients about new circular.
 */
export async function notifyCircular(
  phone: string,
  circularTitle: string,
): Promise<MultiChannelResult> {
  const message = `CampusIQ Alert: A new circular has been published — "${circularTitle}". Login to CampusIQ to view details.`;
  return sendMultiChannelNotification(phone, message);
}

/**
 * 10. Diary Entry — Notify parent about homework/diary update.
 */
export async function notifyDiaryEntry(
  parentPhone: string,
  className: string,
  title: string,
  subject: string,
): Promise<MultiChannelResult> {
  const subjectInfo = subject ? ` (${subject})` : "";
  const message = `CampusIQ: New diary entry for Class ${className}${subjectInfo} — "${title}". Please check the CampusIQ portal for details.`;
  return sendMultiChannelNotification(parentPhone, message);
}

/**
 * 11. Emergency Alert — Broadcast emergency to all via SMS + WhatsApp.
 */
export async function notifyEmergency(
  phone: string,
  title: string,
  emergencyMessage: string,
  severity: string,
): Promise<MultiChannelResult> {
  const message = `🚨 CampusIQ EMERGENCY [${severity.toUpperCase()}]: ${title} — ${emergencyMessage}. Please follow school instructions immediately.`;
  return sendMultiChannelNotification(phone, message);
}

/**
 * 12. Fee Payment Confirmation — Notify parent after successful payment.
 */
export async function notifyFeePaymentConfirmation(
  parentPhone: string,
  studentName: string,
  amount: number,
  feeName: string,
  receiptNumber: string,
): Promise<MultiChannelResult> {
  const message = `CampusIQ: Payment of ₹${amount} received for ${studentName} (${feeName}). Receipt: ${receiptNumber}. Thank you!`;
  return sendMultiChannelNotification(parentPhone, message);
}

/**
 * 13. Password Reset — Send reset link/notification via SMS + WhatsApp.
 */
export async function notifyPasswordReset(
  phone: string,
  userName: string,
  resetLink: string,
): Promise<MultiChannelResult> {
  const message = `CampusIQ: Hi ${userName}, a password reset was requested for your account. Reset here: ${resetLink} (expires in 1 hour). Ignore if not you.`;
  return sendMultiChannelNotification(phone, message);
}

/**
 * Broadcast emergency to a list of recipients.
 */
export async function broadcastEmergency(
  recipients: Array<{ phone: string }>,
  title: string,
  emergencyMessage: string,
  severity: string,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    try {
      const result = await notifyEmergency(
        recipient.phone,
        title,
        emergencyMessage,
        severity,
      );
      if (result.sms.success || result.whatsapp.success) sent++;
      else failed++;
    } catch {
      failed++;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  logger.info({
    type: "emergency_broadcast_summary",
    sent,
    failed,
    total: recipients.length,
  });
  return { sent, failed };
}

// ── NEW Template Functions (Phase 2) ─────────────────────────────────────────

/**
 * 14. Fee Reminder — Notify parent about upcoming/overdue fee.
 */
export async function notifyFeeReminder(
  parentPhone: string,
  studentName: string,
  amount: number,
  dueDate: string,
): Promise<MultiChannelResult> {
  const message = `CampusIQ Reminder: Fee of ₹${amount} for ${studentName} is due on ${dueDate}. Please make the payment to avoid late fees.`;
  return sendMultiChannelNotification(parentPhone, message);
}

/**
 * 15. Event Notification — Notify about a new school event.
 */
export async function notifyEvent(
  phone: string,
  eventTitle: string,
  eventDate: string,
  eventType: string,
): Promise<MultiChannelResult> {
  const message = `CampusIQ: New ${eventType} — "${eventTitle}" on ${eventDate}. Check the CampusIQ portal for details.`;
  return sendMultiChannelNotification(phone, message);
}

/**
 * 16. Holiday Notification — Notify about a new holiday declaration.
 */
export async function notifyHoliday(
  phone: string,
  holidayName: string,
  holidayDate: string,
): Promise<MultiChannelResult> {
  const message = `CampusIQ: Holiday declared — "${holidayName}" on ${holidayDate}. School will remain closed. Check CampusIQ for details.`;
  return sendMultiChannelNotification(phone, message);
}

/**
 * 17. Online Exam Published — Notify students/parents about upcoming online exam.
 */
export async function notifyOnlineExam(
  phone: string,
  examTitle: string,
  subject: string,
  startTime: string,
): Promise<MultiChannelResult> {
  const message = `CampusIQ: Online exam "${examTitle}" (${subject}) is scheduled for ${startTime}. Login to CampusIQ to attempt the exam.`;
  return sendMultiChannelNotification(phone, message);
}

/**
 * 18. Transport Update — Notify parent about transport route change or assignment.
 */
export async function notifyTransportUpdate(
  parentPhone: string,
  studentName: string,
  routeName: string,
  vehicleNumber: string,
  action: string,
): Promise<MultiChannelResult> {
  const message = `CampusIQ: ${studentName} has been ${action} transport route "${routeName}" (Vehicle: ${vehicleNumber}). Check CampusIQ for pickup/drop timings.`;
  return sendMultiChannelNotification(parentPhone, message);
}

/**
 * 19. Assignment Notification — Notify about a new assignment.
 */
export async function notifyAssignment(
  phone: string,
  className: string,
  subject: string,
  title: string,
  dueDate: string,
): Promise<MultiChannelResult> {
  const message = `CampusIQ: New assignment for Class ${className} (${subject}) — "${title}". Due: ${dueDate}. Check CampusIQ for details.`;
  return sendMultiChannelNotification(phone, message);
}

/**
 * 20. Hostel Allocation — Notify parent about hostel room allocation.
 */
export async function notifyHostelAllocation(
  parentPhone: string,
  studentName: string,
  hostelName: string,
  roomNumber: string,
  bedNumber: string,
): Promise<MultiChannelResult> {
  const message = `CampusIQ: ${studentName} has been allocated to ${hostelName}, Room ${roomNumber}, Bed ${bedNumber}. Check CampusIQ for details.`;
  return sendMultiChannelNotification(parentPhone, message);
}

/**
 * 21. Student Promotion — Notify parent about student class promotion.
 */
export async function notifyPromotion(
  parentPhone: string,
  studentName: string,
  fromClass: string,
  toClass: string,
  status: string,
): Promise<MultiChannelResult> {
  const statusText =
    status === "graduated"
      ? "graduated"
      : `promoted from Class ${fromClass} to Class ${toClass}`;
  const message = `CampusIQ: ${studentName} has been ${statusText}. Congratulations! Login to CampusIQ for details.`;
  return sendMultiChannelNotification(parentPhone, message);
}

/**
 * 22. Library Book Due — Notify borrower about overdue library book.
 */
export async function notifyLibraryBookIssue(
  phone: string,
  borrowerName: string,
  bookTitle: string,
  dueDate: string,
): Promise<MultiChannelResult> {
  const message = `CampusIQ Library: Dear ${borrowerName}, "${bookTitle}" has been issued to you. Due date: ${dueDate}. Please return on time.`;
  return sendMultiChannelNotification(phone, message);
}

/**
 * 23. Visitor Arrival — Notify host/parent about visitor check-in.
 */
export async function notifyVisitorArrival(
  phone: string,
  visitorName: string,
  purpose: string,
): Promise<MultiChannelResult> {
  const message = `CampusIQ: Visitor "${visitorName}" has arrived — Purpose: ${purpose}. Please check the front desk.`;
  return sendMultiChannelNotification(phone, message);
}

/**
 * 24. Teacher Added — Notify new teacher about account creation.
 */
export async function notifyTeacherAdded(
  teacherPhone: string,
  teacherName: string,
  schoolName: string,
): Promise<MultiChannelResult> {
  const message = `CampusIQ: Welcome ${teacherName}! Your teacher account at ${schoolName} has been created. Login to CampusIQ to get started.`;
  return sendMultiChannelNotification(teacherPhone, message);
}

/**
 * Send an admin broadcast to a list of recipients (fire-and-forget, rate-limited).
 * Returns a summary of successes / failures.
 */
export async function broadcastToRecipients(
  recipients: Array<{ phone: string; name: string }>,
  announcementContent: string,
): Promise<{ sent: number; failed: number; details: MultiChannelResult[] }> {
  const results: MultiChannelResult[] = [];
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    try {
      const result = await sendAdminBroadcast(
        recipient.phone,
        announcementContent,
      );
      results.push(result);
      if (result.sms.success || result.whatsapp.success) {
        sent++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
    // Twilio rate-limit: ~100ms between messages
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  logger.info({
    type: "broadcast_summary",
    totalRecipients: recipients.length,
    sent,
    failed,
  });

  return { sent, failed, details: results };
}
