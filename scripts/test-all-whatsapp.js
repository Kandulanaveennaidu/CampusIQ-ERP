/**
 * CampusIQ — Live WhatsApp Test for ALL 13 Notification Templates
 * ────────────────────────────────────────────────────────────────
 * Sends real WhatsApp messages to verify every notification service.
 * Run: node scripts/test-all-whatsapp.js
 */

const SID = process.env.TWILIO_ACCOUNT_SID || "your_twilio_account_sid_here";
const TOKEN = process.env.TWILIO_AUTH_TOKEN || "your_twilio_auth_token_here";
const WA_FROM = "+14155238886";
const TO = "+919705627977";
const API_URL = `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`;
const creds = Buffer.from(`${SID}:${TOKEN}`).toString("base64");

const templates = [
    {
        label: "1. Student Absence Alert",
        body: "Hi Mr. Kandula, Rahul Kandula was marked Absent from CampusIQ today. Please contact the office if this is an error.",
    },
    {
        label: "2. Admin Broadcast",
        body: "CampusIQ Alert: School will remain closed tomorrow (Feb 26) due to heavy rainfall. Stay safe!",
    },
    {
        label: "3. Teacher Schedule Update",
        body: "CampusIQ: Hello Mrs. Priya, a new schedule has been posted for your class. Login to CampusIQ for details.",
    },
    {
        label: "4. Exam Results Available",
        body: "Hi Rahul, your results for Mid-Term Mathematics Exam are now available on the CampusIQ portal.",
    },
    {
        label: "5. Leave Approved",
        body: "CampusIQ: Dear Mr. Kandula, your leave request has been approved. Login to CampusIQ for details.",
    },
    {
        label: "6. Low Attendance Warning",
        body: "CampusIQ Warning: Rahul's attendance is 62.5%, below the required 75%. Please ensure regular attendance.",
    },
    {
        label: "7. Salary Processed",
        body: "CampusIQ: Dear Mrs. Priya, your salary for February 2026 (\u20B945,000) has been paid. Login to CampusIQ for details.",
    },
    {
        label: "8. Student Registration",
        body: "CampusIQ: Dear Mr. Kandula, Rahul Kandula has been registered in Class 10-A (Roll No: 42). Welcome to CampusIQ!",
    },
    {
        label: "9. New Circular",
        body: 'CampusIQ Alert: A new circular has been published \u2014 "Annual Day Celebration on March 15, 2026". Login to CampusIQ to view details.',
    },
    {
        label: "10. Diary/Homework Entry",
        body: 'CampusIQ: New diary entry for Class 10-A (Mathematics) \u2014 "Complete Chapter 5 exercises, pages 102-110". Please check the CampusIQ portal for details.',
    },
    {
        label: "11. Emergency Alert",
        body: "\uD83D\uDEA8 CampusIQ EMERGENCY [HIGH]: Fire Drill Scheduled \u2014 All students and staff must evacuate to the ground floor assembly point at 11:00 AM. Please follow school instructions immediately.",
    },
    {
        label: "12. Fee Payment Confirmation",
        body: "CampusIQ: Payment of \u20B915,000 received for Rahul Kandula (Tuition Fee - Term 2). Receipt: REC-2026-0225. Thank you!",
    },
    {
        label: "13. Password Reset",
        body: "CampusIQ: Hi Naveen, a password reset was requested for your account. Reset here: https://campusiq.app/reset?token=abc123 (expires in 1 hour). Ignore if not you.",
    },
];

const sentSIDs = [];

async function sendWhatsApp(body, label) {
    const params = new URLSearchParams({
        To: `whatsapp:${TO}`,
        From: `whatsapp:${WA_FROM}`,
        Body: body,
    });

    const res = await fetch(API_URL, {
        method: "POST",
        headers: {
            Authorization: `Basic ${creds}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
    });

    const data = await res.json();
    if (res.ok) {
        console.log(`  \u2705 ${label}  \u2014  SID: ${data.sid}`);
        sentSIDs.push({ sid: data.sid, label });
    } else {
        console.log(`  \u274C ${label}  \u2014  Error ${data.code}: ${data.message}`);
    }
    return data;
}

async function checkStatus(sid) {
    const res = await fetch(`${API_URL.replace("Messages.json", `Messages/${sid}.json`)}`, {
        headers: { Authorization: `Basic ${creds}` },
    });
    return await res.json();
}

async function main() {
    console.log("");
    console.log("\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557");
    console.log("\u2551   CampusIQ \u2014 Live WhatsApp Test (All 13 Templates)        \u2551");
    console.log(`\u2551   Sending to: ${TO}                          \u2551`);
    console.log(`\u2551   Time: ${new Date().toLocaleString("en-IN")}                        \u2551`);
    console.log("\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D");
    console.log("");

    console.log("  Sending 13 WhatsApp messages (1.5s gap between each)...");
    console.log("");

    for (const msg of templates) {
        await sendWhatsApp(msg.body, msg.label);
        await new Promise((r) => setTimeout(r, 1500));
    }

    console.log("");
    console.log("  All 13 messages sent! Waiting 10s to check delivery status...");
    console.log("");
    await new Promise((r) => setTimeout(r, 10000));

    // Check delivery status
    console.log("  ============================================================");
    console.log("                    DELIVERY STATUS REPORT                     ");
    console.log("  ============================================================");
    console.log("");

    let delivered = 0;
    let failed = 0;
    let pending = 0;

    for (const item of sentSIDs) {
        const status = await checkStatus(item.sid);
        let icon;
        if (status.status === "delivered" || status.status === "read") {
            icon = "\u2705";
            delivered++;
        } else if (status.status === "failed" || status.status === "undelivered") {
            icon = "\u274C";
            failed++;
        } else {
            icon = "\u23F3";
            pending++;
        }
        const errInfo = status.error_code ? ` (err: ${status.error_code})` : "";
        console.log(`  ${icon}  ${item.label.padEnd(35)} \u2192 ${status.status}${errInfo}`);
    }

    console.log("");
    console.log("  ============================================================");
    console.log(`  Total: ${sentSIDs.length}  |  Delivered: ${delivered}  |  Failed: ${failed}  |  Pending: ${pending}`);
    console.log("  ============================================================");
    console.log("");
    console.log("  \uD83D\uDC49 Check WhatsApp on your phone \u2014 you should see all 13 messages!");
    console.log("     They come from the number: +1 (415) 523-8886");
    console.log("");
}

main().catch((e) => console.error("ERROR:", e));
