/**
 * SMS & WhatsApp Integration
 * Supports Twilio for SMS and WhatsApp Business API
 *
 * For the new multi-channel notification system with templated
 * messages, see @/lib/twilio-notifications.ts
 */

// Re-export the new multi-channel utilities so existing consumers
// can import from either module.
export {
  formatToE164,
  sendMultiChannelNotification,
  sendBulkWhatsApp,
  notifyParentAbsence,
  sendAdminBroadcast,
  notifyTeacherUpdate,
  notifyStudentResults,
  broadcastToRecipients,
  notifyLeaveStatus,
  notifyLowAttendance,
  notifySalaryProcessed,
  notifyStudentRegistration,
  notifyCircular,
  notifyDiaryEntry,
  notifyEmergency,
  broadcastEmergency,
  notifyFeePaymentConfirmation,
  notifyPasswordReset,
  notifyFeeReminder,
  notifyEvent,
  notifyHoliday,
  notifyOnlineExam,
  notifyTransportUpdate,
  notifyAssignment,
  notifyHostelAllocation,
  notifyPromotion,
  notifyLibraryBookIssue,
  notifyVisitorArrival,
  notifyTeacherAdded,
} from "@/lib/twilio-notifications";
export type {
  MultiChannelResult,
  NotificationResult,
} from "@/lib/twilio-notifications";

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send SMS via Twilio
 */
export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    // SMS not configured — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
    return { success: false, error: "SMS service not configured" };
  }

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString(
      "base64",
    );
    const body = new URLSearchParams({
      To: to,
      From: fromNumber,
      Body: message,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      },
    );

    const data = await response.json();

    if (response.ok) {
      return { success: true, messageId: data.sid };
    }
    return { success: false, error: data.message || "SMS send failed" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "SMS send failed",
    };
  }
}

/**
 * Send WhatsApp message via Twilio
 */
export async function sendWhatsApp(
  to: string,
  message: string,
): Promise<SMSResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    // WhatsApp not configured
    return { success: false, error: "WhatsApp service not configured" };
  }

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString(
      "base64",
    );
    const body = new URLSearchParams({
      To: `whatsapp:${to}`,
      From: `whatsapp:${fromNumber}`,
      Body: message,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      },
    );

    const data = await response.json();

    if (response.ok) {
      return { success: true, messageId: data.sid };
    }
    return { success: false, error: data.message || "WhatsApp send failed" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "WhatsApp send failed",
    };
  }
}

/**
 * Send bulk SMS
 */
export async function sendBulkSMS(
  recipients: Array<{ phone: string; message: string }>,
): Promise<Array<SMSResult & { phone: string }>> {
  const results = [];
  for (const recipient of recipients) {
    const result = await sendSMS(recipient.phone, recipient.message);
    results.push({ ...result, phone: recipient.phone });
    // Rate limit: wait 100ms between messages
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return results;
}
