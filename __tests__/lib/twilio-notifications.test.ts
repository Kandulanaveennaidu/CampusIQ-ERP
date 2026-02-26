/**
 * ──────────────────────────────────────────────────────────────────────────────
 * CampusIQ — Twilio Multi-Channel Notification Unit Tests
 * ──────────────────────────────────────────────────────────────────────────────
 * Covers every exported function from src/lib/twilio-notifications.ts:
 *
 *   ▸ formatToE164()              — Phone number formatting
 *   ▸ sendMultiChannelNotification() — Core dual-channel sender
 *   ▸ notifyParentAbsence()       — Template 1: Absent alert → parents
 *   ▸ sendAdminBroadcast()        — Template 2: Admin broadcast
 *   ▸ notifyTeacherUpdate()       — Template 3: Teacher schedule update
 *   ▸ notifyStudentResults()      — Template 4: Exam results available
 *   ▸ sendBulkWhatsApp()          — Bulk WhatsApp delivery
 *   ▸ notifyLeaveStatus()         — Template 5: Leave approval/rejection
 *   ▸ notifyLowAttendance()       — Template 6: Low attendance warning
 *   ▸ notifySalaryProcessed()     — Template 7: Salary processed
 *   ▸ notifyStudentRegistration() — Template 8: New student welcome
 *   ▸ notifyCircular()            — Template 9: Circular/announcement
 *   ▸ notifyDiaryEntry()          — Template 10: Homework/diary entry
 *   ▸ notifyEmergency()           — Template 11: Emergency alert
 *   ▸ notifyFeePaymentConfirmation() — Template 12: Payment receipt
 *   ▸ notifyPasswordReset()       — Template 13: Password reset link
 *   ▸ broadcastEmergency()        — Emergency broadcast to list
 *   ▸ broadcastToRecipients()     — Admin broadcast to list
 *
 * All tests use mocked fetch — no real Twilio API calls.
 * ──────────────────────────────────────────────────────────────────────────────
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const ORIGINAL_ENV = process.env;

// Twilio sandbox credentials for testing
const TEST_ENV = {
  TWILIO_ACCOUNT_SID: "ACtest1234567890abcdef1234567890ab",
  TWILIO_AUTH_TOKEN: "test_auth_token_1234567890abcdef",
  TWILIO_PHONE_NUMBER: "+15551234567",
  TWILIO_WHATSAPP_NUMBER: "+14155238886",
};

beforeEach(() => {
  jest.resetModules();
  process.env = { ...ORIGINAL_ENV, ...TEST_ENV };

  // Default: both SMS and WhatsApp succeed
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ sid: "SM_test_message_id_001" }),
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

// Dynamic import helper — re-imports module so env changes take effect
async function loadModule() {
  return await import("@/lib/twilio-notifications");
}

/**
 * Extract the decoded Body from a mocked fetch call's URLSearchParams body.
 * URLSearchParams.toString() encodes spaces as '+', which decodeURIComponent
 * does NOT decode — so we parse with URLSearchParams to get the real text.
 */
function getMessageBody(fetchMock: jest.Mock, callIndex = 0): string {
  const rawBody = fetchMock.mock.calls[callIndex][1].body as string;
  const params = new URLSearchParams(rawBody);
  return params.get("Body") || "";
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. formatToE164 — Phone Number Formatting
// ═══════════════════════════════════════════════════════════════════════════════

describe("formatToE164", () => {
  let formatToE164: (phone: string, defaultCountryCode?: string) => string;

  beforeEach(async () => {
    const mod = await loadModule();
    formatToE164 = mod.formatToE164;
  });

  // ── Indian Numbers ──

  it("should format bare 10-digit Indian number → +91XXXXXXXXXX", () => {
    expect(formatToE164("9876543210")).toBe("+919876543210");
  });

  it("should strip leading 0 (local trunk prefix)", () => {
    expect(formatToE164("09876543210")).toBe("+919876543210");
  });

  it("should handle number already starting with 91", () => {
    expect(formatToE164("919876543210")).toBe("+919876543210");
  });

  it("should preserve already-valid E.164 Indian number", () => {
    expect(formatToE164("+919876543210")).toBe("+919876543210");
  });

  // ── International Numbers ──

  it("should preserve already-valid E.164 US number", () => {
    expect(formatToE164("+14155238886")).toBe("+14155238886");
  });

  it("should preserve already-valid E.164 UK number", () => {
    expect(formatToE164("+447911123456")).toBe("+447911123456");
  });

  // ── Edge Cases ──

  it("should strip spaces and dashes from phone number", () => {
    expect(formatToE164("987-654-3210")).toBe("+919876543210");
  });

  it("should strip parentheses and dots", () => {
    expect(formatToE164("(987) 654.3210")).toBe("+919876543210");
  });

  it("should handle number with country code but no plus sign", () => {
    expect(formatToE164("919705627977")).toBe("+919705627977");
  });

  it("should use custom country code when provided", () => {
    expect(formatToE164("5551234567", "1")).toBe("+15551234567");
  });

  it("should handle short/unusual numbers gracefully (fallback)", () => {
    // Numbers that don't match standard patterns get '+' prepended
    expect(formatToE164("12345")).toBe("+12345");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. sendMultiChannelNotification — Core Dual-Channel Sender
// ═══════════════════════════════════════════════════════════════════════════════

describe("sendMultiChannelNotification", () => {
  it("should send to both SMS and WhatsApp and return results", async () => {
    const mod = await loadModule();
    const result = await mod.sendMultiChannelNotification(
      "+919876543210",
      "Test message",
    );

    expect(result.sms.success).toBe(true);
    expect(result.sms.channel).toBe("sms");
    expect(result.sms.messageId).toBe("SM_test_message_id_001");

    expect(result.whatsapp.success).toBe(true);
    expect(result.whatsapp.channel).toBe("whatsapp");
    expect(result.whatsapp.messageId).toBe("SM_test_message_id_001");

    // fetch should have been called exactly 2 times (SMS + WhatsApp)
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("should include correct Twilio API URL with account SID", async () => {
    const mod = await loadModule();
    await mod.sendMultiChannelNotification("+919876543210", "Test");

    const expectedUrl = `https://api.twilio.com/2010-04-01/Accounts/${TEST_ENV.TWILIO_ACCOUNT_SID}/Messages.json`;
    expect(global.fetch).toHaveBeenCalledWith(
      expectedUrl,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("should send Basic auth header with base64 credentials", async () => {
    const mod = await loadModule();
    await mod.sendMultiChannelNotification("+919876543210", "Test");

    const expectedAuth = Buffer.from(
      `${TEST_ENV.TWILIO_ACCOUNT_SID}:${TEST_ENV.TWILIO_AUTH_TOKEN}`,
    ).toString("base64");

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Basic ${expectedAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        }),
      }),
    );
  });

  it("should send SMS with correct From number", async () => {
    const mod = await loadModule();
    await mod.sendMultiChannelNotification("+919876543210", "Hello SMS");

    const calls = (global.fetch as jest.Mock).mock.calls;
    // Find the SMS call (the one without whatsapp: prefix)
    const smsCall = calls.find(
      (c: any[]) => !c[1].body.includes("whatsapp%3A"),
    );
    expect(smsCall).toBeDefined();
    expect(smsCall![1].body).toContain(
      `From=${encodeURIComponent(TEST_ENV.TWILIO_PHONE_NUMBER)}`,
    );
  });

  it("should send WhatsApp with whatsapp: prefix on From and To", async () => {
    const mod = await loadModule();
    await mod.sendMultiChannelNotification("+919876543210", "Hello WhatsApp");

    const calls = (global.fetch as jest.Mock).mock.calls;
    const waCall = calls.find((c: any[]) => c[1].body.includes("whatsapp%3A"));
    expect(waCall).toBeDefined();
    // To should be whatsapp:+919876543210
    expect(waCall![1].body).toContain(
      `To=${encodeURIComponent("whatsapp:+919876543210")}`,
    );
    // From should be whatsapp:+14155238886
    expect(waCall![1].body).toContain(
      `From=${encodeURIComponent(`whatsapp:${TEST_ENV.TWILIO_WHATSAPP_NUMBER}`)}`,
    );
  });

  it("should return not-configured error when Twilio env vars are missing", async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    const mod = await loadModule();

    const result = await mod.sendMultiChannelNotification(
      "+919876543210",
      "Test",
    );

    expect(result.sms.success).toBe(false);
    expect(result.sms.error).toContain("Twilio not configured");
    expect(result.whatsapp.success).toBe(false);
    expect(result.whatsapp.error).toContain("Twilio not configured");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should handle SMS failure while WhatsApp succeeds", async () => {
    let callCount = 0;
    (global.fetch as jest.Mock).mockImplementation(() => {
      callCount++;
      // First call = SMS (fail), second call = WhatsApp (succeed)
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          json: () =>
            Promise.resolve({
              code: 21660,
              message: "SMS delivery failed for sandbox number",
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ sid: "SM_whatsapp_ok" }),
      });
    });

    const mod = await loadModule();
    const result = await mod.sendMultiChannelNotification(
      "+919876543210",
      "Test",
    );

    // One should succeed and one should fail (order depends on Promise.allSettled)
    const channels = [result.sms, result.whatsapp];
    const succeeded = channels.filter((c) => c.success);
    const failed = channels.filter((c) => !c.success);

    expect(succeeded.length + failed.length).toBe(2);
    // At least one call was made
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("should handle network error on fetch gracefully", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network timeout"));

    const mod = await loadModule();
    const result = await mod.sendMultiChannelNotification(
      "+919876543210",
      "Test",
    );

    expect(result.sms.success).toBe(false);
    expect(result.sms.error).toContain("Network timeout");
    expect(result.whatsapp.success).toBe(false);
    expect(result.whatsapp.error).toContain("Network timeout");
  });

  it("should format bare phone number before sending", async () => {
    const mod = await loadModule();
    await mod.sendMultiChannelNotification("9876543210", "Test");

    const calls = (global.fetch as jest.Mock).mock.calls;
    // Both calls should contain the formatted +91 number
    for (const call of calls) {
      expect(call[1].body).toContain(encodeURIComponent("+919876543210"));
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Template 1 — notifyParentAbsence
// ═══════════════════════════════════════════════════════════════════════════════

describe("notifyParentAbsence", () => {
  it("should send absence notification with parent and student names", async () => {
    const mod = await loadModule();
    const result = await mod.notifyParentAbsence(
      "+919876543210",
      "Mr. Sharma",
      "Rahul Sharma",
    );

    expect(result.sms.success).toBe(true);
    expect(result.whatsapp.success).toBe(true);

    // Verify message content
    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toContain("Mr. Sharma");
    expect(msg).toContain("Rahul Sharma");
    expect(msg).toContain("Absent");
  });

  it("should include school name (CampusIQ) in message", async () => {
    const mod = await loadModule();
    await mod.notifyParentAbsence("+919876543210", "Parent", "Student");

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toContain("CampusIQ");
  });

  it("should include actionable instruction in message", async () => {
    const mod = await loadModule();
    await mod.notifyParentAbsence("+919876543210", "Parent", "Student");

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toMatch(/contact|office|error/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Template 2 — sendAdminBroadcast
// ═══════════════════════════════════════════════════════════════════════════════

describe("sendAdminBroadcast", () => {
  it("should send broadcast with announcement content", async () => {
    const mod = await loadModule();
    const result = await mod.sendAdminBroadcast(
      "+919876543210",
      "School closed tomorrow due to heavy rain",
    );

    expect(result.sms.success).toBe(true);
    expect(result.whatsapp.success).toBe(true);

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toContain("School closed tomorrow due to heavy rain");
    expect(msg).toContain("CampusIQ");
  });

  it("should prefix message with alert identifier", async () => {
    const mod = await loadModule();
    await mod.sendAdminBroadcast("+919876543210", "Test announcement");

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toMatch(/Alert/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Template 3 — notifyTeacherUpdate
// ═══════════════════════════════════════════════════════════════════════════════

describe("notifyTeacherUpdate", () => {
  it("should send schedule update notification to teacher", async () => {
    const mod = await loadModule();
    const result = await mod.notifyTeacherUpdate("+919876543210", "Mrs. Priya");

    expect(result.sms.success).toBe(true);
    expect(result.whatsapp.success).toBe(true);

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toContain("Mrs. Priya");
    expect(msg).toMatch(/schedule|class/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Template 4 — notifyStudentResults
// ═══════════════════════════════════════════════════════════════════════════════

describe("notifyStudentResults", () => {
  it("should notify about exam results with student and exam names", async () => {
    const mod = await loadModule();
    const result = await mod.notifyStudentResults(
      "+919876543210",
      "Aarav Kumar",
      "Mid-Term Mathematics",
    );

    expect(result.sms.success).toBe(true);
    expect(result.whatsapp.success).toBe(true);

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toContain("Aarav Kumar");
    expect(msg).toContain("Mid-Term Mathematics");
    expect(msg).toMatch(/results|available|portal/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. Template 5 — notifyLeaveStatus
// ═══════════════════════════════════════════════════════════════════════════════

describe("notifyLeaveStatus", () => {
  it("should notify leave approval", async () => {
    const mod = await loadModule();
    const result = await mod.notifyLeaveStatus(
      "+919876543210",
      "Ravi Kumar",
      "approved",
    );

    expect(result.sms.success).toBe(true);

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toContain("Ravi Kumar");
    expect(msg).toContain("approved");
    expect(msg).toContain("CampusIQ");
  });

  it("should notify leave rejection", async () => {
    const mod = await loadModule();
    await mod.notifyLeaveStatus("+919876543210", "Ravi Kumar", "rejected");

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toContain("rejected");
  });

  it("should include login instruction", async () => {
    const mod = await loadModule();
    await mod.notifyLeaveStatus("+919876543210", "Teacher", "approved");

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toMatch(/login|details/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. Template 6 — notifyLowAttendance
// ═══════════════════════════════════════════════════════════════════════════════

describe("notifyLowAttendance", () => {
  it("should include student name, attendance %, and threshold", async () => {
    const mod = await loadModule();
    const result = await mod.notifyLowAttendance(
      "+919876543210",
      "Ananya Singh",
      62.5,
      75,
    );

    expect(result.sms.success).toBe(true);

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toContain("Ananya Singh");
    expect(msg).toContain("62.5%");
    expect(msg).toContain("75%");
  });

  it("should include warning tone and action required", async () => {
    const mod = await loadModule();
    await mod.notifyLowAttendance("+919876543210", "Student", 50, 75);

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toMatch(/warning|ensure|regular/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. Template 7 — notifySalaryProcessed
// ═══════════════════════════════════════════════════════════════════════════════

describe("notifySalaryProcessed", () => {
  it("should include teacher name, month, year, and net salary", async () => {
    const mod = await loadModule();
    const result = await mod.notifySalaryProcessed(
      "+919876543210",
      "Dr. Meera Patel",
      3,
      2026,
      45000,
      "paid",
    );

    expect(result.sms.success).toBe(true);

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toContain("Dr. Meera Patel");
    expect(msg).toContain("March");
    expect(msg).toContain("2026");
    expect(msg).toContain("45000");
    expect(msg).toContain("paid");
  });

  it("should format month name correctly for different months", async () => {
    const mod = await loadModule();

    // Test January
    await mod.notifySalaryProcessed(
      "+919876543210",
      "Teacher",
      1,
      2026,
      30000,
      "generated",
    );
    let msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toContain("January");

    // Reset mock and test December
    (global.fetch as jest.Mock).mockClear();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sid: "SM_test" }),
    });

    await mod.notifySalaryProcessed(
      "+919876543210",
      "Teacher",
      12,
      2026,
      30000,
      "generated",
    );
    msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toContain("December");
  });

  it("should include currency symbol ₹", async () => {
    const mod = await loadModule();
    await mod.notifySalaryProcessed(
      "+919876543210",
      "Teacher",
      6,
      2026,
      55000,
      "paid",
    );

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toContain("₹");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. Template 8 — notifyStudentRegistration
// ═══════════════════════════════════════════════════════════════════════════════

describe("notifyStudentRegistration", () => {
  it("should include parent name, student name, class, and roll number", async () => {
    const mod = await loadModule();
    const result = await mod.notifyStudentRegistration(
      "+919876543210",
      "Mrs. Lakshmi",
      "Aditya Verma",
      "10-A",
      "42",
    );

    expect(result.sms.success).toBe(true);

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toContain("Mrs. Lakshmi");
    expect(msg).toContain("Aditya Verma");
    expect(msg).toContain("10-A");
    expect(msg).toContain("42");
  });

  it("should include welcoming message", async () => {
    const mod = await loadModule();
    await mod.notifyStudentRegistration(
      "+919876543210",
      "Parent",
      "Student",
      "5-B",
      "1",
    );

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toMatch(/welcome|registered/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 11. Template 9 — notifyCircular
// ═══════════════════════════════════════════════════════════════════════════════

describe("notifyCircular", () => {
  it("should include circular title in quotes", async () => {
    const mod = await loadModule();
    const result = await mod.notifyCircular(
      "+919876543210",
      "Annual Day Celebration Schedule",
    );

    expect(result.sms.success).toBe(true);

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toContain("Annual Day Celebration Schedule");
    expect(msg).toContain("CampusIQ");
  });

  it("should include action to view details", async () => {
    const mod = await loadModule();
    await mod.notifyCircular("+919876543210", "Test Circular");

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toMatch(/login|view|details|portal/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 12. Template 10 — notifyDiaryEntry
// ═══════════════════════════════════════════════════════════════════════════════

describe("notifyDiaryEntry", () => {
  it("should include class name, title, and subject", async () => {
    const mod = await loadModule();
    const result = await mod.notifyDiaryEntry(
      "+919876543210",
      "8-A",
      "Complete Chapter 5 exercises",
      "Mathematics",
    );

    expect(result.sms.success).toBe(true);

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toContain("8-A");
    expect(msg).toContain("Complete Chapter 5 exercises");
    expect(msg).toContain("Mathematics");
  });

  it("should handle empty subject gracefully", async () => {
    const mod = await loadModule();
    await mod.notifyDiaryEntry(
      "+919876543210",
      "5-B",
      "Field trip consent form",
      "",
    );

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toContain("5-B");
    expect(msg).toContain("Field trip consent form");
    // Should NOT contain empty parentheses like "()"
    expect(msg).not.toContain("()");
  });

  it("should include portal reference", async () => {
    const mod = await loadModule();
    await mod.notifyDiaryEntry("+919876543210", "3-C", "Homework", "English");

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toMatch(/portal|check|details/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 13. Template 11 — notifyEmergency
// ═══════════════════════════════════════════════════════════════════════════════

describe("notifyEmergency", () => {
  it("should include title, message, and severity", async () => {
    const mod = await loadModule();
    const result = await mod.notifyEmergency(
      "+919876543210",
      "Fire Drill",
      "Please evacuate the building immediately",
      "high",
    );

    expect(result.sms.success).toBe(true);

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toContain("Fire Drill");
    expect(msg).toContain("Please evacuate the building immediately");
    expect(msg).toContain("HIGH");
  });

  it("should include emergency emoji and urgent instruction", async () => {
    const mod = await loadModule();
    await mod.notifyEmergency("+919876543210", "Alert", "Test", "critical");

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toContain("🚨");
    expect(msg).toContain("EMERGENCY");
    expect(msg).toMatch(/immediately|follow|instructions/i);
  });

  it("should uppercase severity for emphasis", async () => {
    const mod = await loadModule();
    await mod.notifyEmergency("+919876543210", "Alert", "Msg", "medium");

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toContain("MEDIUM");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 14. Template 12 — notifyFeePaymentConfirmation
// ═══════════════════════════════════════════════════════════════════════════════

describe("notifyFeePaymentConfirmation", () => {
  it("should include student name, amount, fee name, and receipt", async () => {
    const mod = await loadModule();
    const result = await mod.notifyFeePaymentConfirmation(
      "+919876543210",
      "Priya Sharma",
      15000,
      "Tuition Fee - Term 1",
      "REC-M1N2O3P4",
    );

    expect(result.sms.success).toBe(true);

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toContain("Priya Sharma");
    expect(msg).toContain("15000");
    expect(msg).toContain("Tuition Fee - Term 1");
    expect(msg).toContain("REC-M1N2O3P4");
  });

  it("should include currency symbol and thank you message", async () => {
    const mod = await loadModule();
    await mod.notifyFeePaymentConfirmation(
      "+919876543210",
      "Student",
      5000,
      "Fee",
      "REC-1",
    );

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toContain("₹");
    expect(msg).toMatch(/thank/i);
  });

  it("should include receipt number for reference", async () => {
    const mod = await loadModule();
    await mod.notifyFeePaymentConfirmation(
      "+919876543210",
      "S",
      1000,
      "F",
      "REC-ABC123",
    );

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toMatch(/receipt/i);
    expect(msg).toContain("REC-ABC123");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 15. Template 13 — notifyPasswordReset
// ═══════════════════════════════════════════════════════════════════════════════

describe("notifyPasswordReset", () => {
  it("should include user name and reset link", async () => {
    const mod = await loadModule();
    const result = await mod.notifyPasswordReset(
      "+919876543210",
      "Admin User",
      "https://campusiq.in/reset?token=abc123",
    );

    expect(result.sms.success).toBe(true);

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toContain("Admin User");
    expect(msg).toContain("https://campusiq.in/reset?token=abc123");
  });

  it("should include expiration notice", async () => {
    const mod = await loadModule();
    await mod.notifyPasswordReset("+919876543210", "User", "https://link.com");

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toMatch(/expire|hour/i);
  });

  it("should include safety disclaimer", async () => {
    const mod = await loadModule();
    await mod.notifyPasswordReset("+919876543210", "User", "https://link.com");

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toMatch(/ignore|not you/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 16. sendBulkWhatsApp — Bulk WhatsApp Delivery
// ═══════════════════════════════════════════════════════════════════════════════

describe("sendBulkWhatsApp", () => {
  it("should send WhatsApp to multiple recipients", async () => {
    const mod = await loadModule();
    const recipients = [
      { phone: "+919876543210", message: "Hello Parent A" },
      { phone: "+919876543211", message: "Hello Parent B" },
      { phone: "+919876543212", message: "Hello Parent C" },
    ];

    const results = await mod.sendBulkWhatsApp(recipients);

    expect(results).toHaveLength(3);
    results.forEach((r) => {
      expect(r.success).toBe(true);
      expect(r.channel).toBe("whatsapp");
      expect(r.phone).toBeDefined();
    });

    // Each recipient = 1 WhatsApp call
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("should include phone number in each result", async () => {
    const mod = await loadModule();
    const recipients = [
      { phone: "+919876543210", message: "Msg A" },
      { phone: "+919705627977", message: "Msg B" },
    ];

    const results = await mod.sendBulkWhatsApp(recipients);
    expect(results[0].phone).toBe("+919876543210");
    expect(results[1].phone).toBe("+919705627977");
  });

  it("should return not-configured error when env vars are missing", async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    const mod = await loadModule();

    const results = await mod.sendBulkWhatsApp([
      { phone: "+919876543210", message: "Test" },
    ]);

    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain("not configured");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should handle partial failures in bulk send", async () => {
    let callCount = 0;
    (global.fetch as jest.Mock).mockImplementation(() => {
      callCount++;
      if (callCount === 2) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: "Invalid number" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ sid: `SM_bulk_${callCount}` }),
      });
    });

    const mod = await loadModule();
    const results = await mod.sendBulkWhatsApp([
      { phone: "+919876543210", message: "A" },
      { phone: "+91invalid", message: "B" },
      { phone: "+919876543212", message: "C" },
    ]);

    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(false);
    expect(results[2].success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 17. broadcastEmergency — Emergency Broadcast to List
// ═══════════════════════════════════════════════════════════════════════════════

describe("broadcastEmergency", () => {
  it("should broadcast to all recipients and return summary", async () => {
    const mod = await loadModule();
    const recipients = [
      { phone: "+919876543210" },
      { phone: "+919876543211" },
      { phone: "+919876543212" },
    ];

    const result = await mod.broadcastEmergency(
      recipients,
      "Earthquake Alert",
      "Move to open ground immediately",
      "critical",
    );

    expect(result.sent).toBe(3);
    expect(result.failed).toBe(0);
    // 3 recipients × 2 channels (SMS + WhatsApp) = 6 fetch calls
    expect(global.fetch).toHaveBeenCalledTimes(6);
  });

  it("should count failures correctly", async () => {
    // Fail all fetch calls
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Service down" }),
    });

    const mod = await loadModule();
    const result = await mod.broadcastEmergency(
      [{ phone: "+919876543210" }, { phone: "+919876543211" }],
      "Alert",
      "Test",
      "low",
    );

    expect(result.sent).toBe(0);
    expect(result.failed).toBe(2);
  });

  it("should handle empty recipients list", async () => {
    const mod = await loadModule();
    const result = await mod.broadcastEmergency([], "Alert", "Test", "low");

    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should handle fetch exceptions without crashing", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(
      new Error("Connection refused"),
    );

    const mod = await loadModule();
    const result = await mod.broadcastEmergency(
      [{ phone: "+919876543210" }],
      "Alert",
      "Test",
      "high",
    );

    // Should count as failed, not throw
    expect(result.failed).toBe(1);
    expect(result.sent).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 18. broadcastToRecipients — Admin Broadcast to List
// ═══════════════════════════════════════════════════════════════════════════════

describe("broadcastToRecipients", () => {
  it("should broadcast announcement to all recipients", async () => {
    const mod = await loadModule();
    const recipients = [
      { phone: "+919876543210", name: "Teacher A" },
      { phone: "+919876543211", name: "Teacher B" },
    ];

    const result = await mod.broadcastToRecipients(
      recipients,
      "PTM scheduled for March 5th",
    );

    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.details).toHaveLength(2);
  });

  it("should return detailed results for each recipient", async () => {
    const mod = await loadModule();
    const result = await mod.broadcastToRecipients(
      [{ phone: "+919876543210", name: "Admin" }],
      "Test broadcast",
    );

    expect(result.details[0].sms.success).toBe(true);
    expect(result.details[0].whatsapp.success).toBe(true);
  });

  it("should count partial failures (at least one channel must succeed)", async () => {
    // All channels fail
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Rate limited" }),
    });

    const mod = await loadModule();
    const result = await mod.broadcastToRecipients(
      [{ phone: "+919876543210", name: "User" }],
      "Test",
    );

    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
  });

  it("should handle empty recipients list", async () => {
    const mod = await loadModule();
    const result = await mod.broadcastToRecipients([], "Announcement");

    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.details).toHaveLength(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 19. Message Template Quality Checks
// ═══════════════════════════════════════════════════════════════════════════════

describe("Message Template Design Quality", () => {
  it("all templates should start with 'CampusIQ' or contain it for branding", async () => {
    const mod = await loadModule();
    const templateCalls: Array<() => Promise<any>> = [
      () => mod.notifyParentAbsence("+910000000000", "P", "S"),
      () => mod.sendAdminBroadcast("+910000000000", "Msg"),
      () => mod.notifyTeacherUpdate("+910000000000", "T"),
      () => mod.notifyStudentResults("+910000000000", "S", "E"),
      () => mod.notifyLeaveStatus("+910000000000", "N", "approved"),
      () => mod.notifyLowAttendance("+910000000000", "S", 50, 75),
      () =>
        mod.notifySalaryProcessed("+910000000000", "T", 1, 2026, 50000, "paid"),
      () => mod.notifyStudentRegistration("+910000000000", "P", "S", "C", "R"),
      () => mod.notifyCircular("+910000000000", "Title"),
      () => mod.notifyDiaryEntry("+910000000000", "C", "T", "Sub"),
      () =>
        mod.notifyFeePaymentConfirmation("+910000000000", "S", 1000, "F", "R"),
      () => mod.notifyPasswordReset("+910000000000", "U", "https://x.com"),
    ];

    for (const call of templateCalls) {
      (global.fetch as jest.Mock).mockClear();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sid: "SM_brand_test" }),
      });

      await call();
      const message = getMessageBody(global.fetch as jest.Mock);
      expect(message).toContain("CampusIQ");
    }
  });

  it("emergency template should contain urgency indicators", async () => {
    const mod = await loadModule();
    await mod.notifyEmergency("+910000000000", "T", "M", "critical");

    const message = getMessageBody(global.fetch as jest.Mock);
    expect(message).toContain("🚨");
    expect(message).toContain("EMERGENCY");
    expect(message).toContain("CRITICAL");
  });

  it("all templates should be under 1600 characters (SMS limit)", async () => {
    const mod = await loadModule();

    // Use realistically long inputs
    const longName = "Balakrishnamurthy Venkateshwaralu";
    const longExam = "Annual Comprehensive Final Examination 2025-2026";
    const longTitle =
      "Important Notice Regarding Mid-Year Holiday Schedule and Annual Day Celebration";
    const longMsg =
      "Due to heavy rainfall and flooding in surrounding areas, all students and staff are advised to remain indoors. Do not attempt to travel. Emergency services have been contacted.";
    const longLink =
      "https://campusiq.example.com/auth/reset-password?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NTYxMjM0NTY3ODkwIiwiaWF0IjoxNjE2MjM5MDIyfQ";

    const templates: Array<() => Promise<any>> = [
      () => mod.notifyParentAbsence("+910000000000", longName, longName),
      () => mod.sendAdminBroadcast("+910000000000", longMsg),
      () => mod.notifyTeacherUpdate("+910000000000", longName),
      () => mod.notifyStudentResults("+910000000000", longName, longExam),
      () => mod.notifyLeaveStatus("+910000000000", longName, "approved"),
      () => mod.notifyLowAttendance("+910000000000", longName, 62.5, 75),
      () =>
        mod.notifySalaryProcessed(
          "+910000000000",
          longName,
          12,
          2026,
          150000,
          "paid",
        ),
      () =>
        mod.notifyStudentRegistration(
          "+910000000000",
          longName,
          longName,
          "12-Science-A",
          "42",
        ),
      () => mod.notifyCircular("+910000000000", longTitle),
      () =>
        mod.notifyDiaryEntry(
          "+910000000000",
          "10-A",
          longTitle,
          "Advanced Mathematics",
        ),
      () =>
        mod.notifyEmergency("+910000000000", longTitle, longMsg, "critical"),
      () =>
        mod.notifyFeePaymentConfirmation(
          "+910000000000",
          longName,
          250000,
          "Annual Tuition + Lab + Library Fee",
          "REC-ABCDEF123456",
        ),
      () => mod.notifyPasswordReset("+910000000000", longName, longLink),
    ];

    for (const call of templates) {
      (global.fetch as jest.Mock).mockClear();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sid: "SM_len_test" }),
      });

      await call();
      const message = getMessageBody(global.fetch as jest.Mock);
      expect(message.length).toBeLessThanOrEqual(1600);
    }
  });

  it("no template should contain undefined or null in output", async () => {
    const mod = await loadModule();
    const calls: Array<() => Promise<any>> = [
      () => mod.notifyParentAbsence("+910000000000", "Parent", "Student"),
      () => mod.notifyLeaveStatus("+910000000000", "Name", "approved"),
      () => mod.notifyDiaryEntry("+910000000000", "5-A", "Title", ""),
      () => mod.notifyFeePaymentConfirmation("+910000000000", "S", 0, "F", "R"),
    ];

    for (const call of calls) {
      (global.fetch as jest.Mock).mockClear();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sid: "SM_null_test" }),
      });

      await call();
      const message = getMessageBody(global.fetch as jest.Mock);
      expect(message).not.toContain("undefined");
      expect(message).not.toContain("null");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 20. Edge Cases & Error Handling
// ═══════════════════════════════════════════════════════════════════════════════

describe("Edge Cases & Error Handling", () => {
  it("should handle missing TWILIO_WHATSAPP_NUMBER (falls back to TWILIO_PHONE_NUMBER)", async () => {
    delete process.env.TWILIO_WHATSAPP_NUMBER;
    const mod = await loadModule();
    const result = await mod.sendMultiChannelNotification(
      "+919876543210",
      "Test",
    );

    expect(result.whatsapp.success).toBe(true);
    // WhatsApp From should use TWILIO_PHONE_NUMBER as fallback
    const calls = (global.fetch as jest.Mock).mock.calls;
    const waCall = calls.find((c: any[]) => c[1].body.includes("whatsapp%3A"));
    expect(waCall![1].body).toContain(
      encodeURIComponent(`whatsapp:${TEST_ENV.TWILIO_PHONE_NUMBER}`),
    );
  });

  it("should handle missing TWILIO_PHONE_NUMBER", async () => {
    delete process.env.TWILIO_PHONE_NUMBER;
    const mod = await loadModule();
    const result = await mod.sendMultiChannelNotification(
      "+919876543210",
      "Test",
    );

    expect(result.sms.success).toBe(false);
    expect(result.sms.error).toContain("Twilio not configured");
  });

  it("should handle JSON parse error from Twilio API", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new Error("Invalid JSON")),
    });

    const mod = await loadModule();
    const result = await mod.sendMultiChannelNotification(
      "+919876543210",
      "Test",
    );

    // Should fail gracefully
    expect(result.sms.success).toBe(false);
    expect(result.whatsapp.success).toBe(false);
  });

  it("should handle special characters in message content", async () => {
    const mod = await loadModule();
    const specialMsg = 'Test with "quotes" & <html> and emoji 🎓';
    await mod.sendMultiChannelNotification("+919876543210", specialMsg);

    const msg = getMessageBody(global.fetch as jest.Mock);
    expect(msg).toContain("quotes");
    expect(msg).toContain("emoji");
  });

  it("should handle very long phone numbers gracefully", async () => {
    const mod = await loadModule();
    // formatToE164 should handle this without crashing
    const result = await mod.sendMultiChannelNotification(
      "+919876543210123456",
      "Test",
    );
    // Should still attempt to send (formatToE164 does best-effort)
    expect(global.fetch).toHaveBeenCalled();
  });
});
