/**
 * Quick Twilio Test — sends one SMS + one WhatsApp to verify credentials.
 * Run: node scripts/test-twilio.js
 */

require("dotenv").config({ path: ".env.local" });

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "your_twilio_account_sid_here";
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "your_twilio_auth_token_here";
const SMS_FROM = process.env.TWILIO_PHONE_NUMBER || "+14155238886";
const WA_FROM = process.env.TWILIO_WHATSAPP_NUMBER || "+14155238886";
const TO_NUMBER = "+919705627977";

const TWILIO_URL = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
const credentials = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64");

async function send(to, from, body, label) {
    console.log(`\n⏳ Sending ${label}...`);
    try {
        const params = new URLSearchParams({ To: to, From: from, Body: body });
        const res = await fetch(TWILIO_URL, {
            method: "POST",
            headers: {
                Authorization: `Basic ${credentials}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
        });
        const data = await res.json();
        if (res.ok) {
            console.log(`✅ ${label} SENT — SID: ${data.sid}, Status: ${data.status}`);
        } else {
            console.error(`❌ ${label} FAILED — Code: ${data.code}, Message: ${data.message}`);
        }
        return data;
    } catch (err) {
        console.error(`❌ ${label} ERROR:`, err.message);
    }
}

(async () => {
    console.log("═══════════════════════════════════════════════");
    console.log("  CampusIQ — Twilio Real-Time Notification Test");
    console.log("═══════════════════════════════════════════════");
    console.log(`  Account SID : ${ACCOUNT_SID}`);
    console.log(`  SMS From    : ${SMS_FROM}`);
    console.log(`  WA From     : whatsapp:${WA_FROM}`);
    console.log(`  To          : ${TO_NUMBER}`);
    console.log("═══════════════════════════════════════════════");

    // 1. SMS Test
    await send(
        TO_NUMBER,
        SMS_FROM,
        "Hi Naveen, this is a test SMS from CampusIQ. Your Twilio integration is working! 🎓",
        "SMS"
    );

    // 2. WhatsApp Test
    await send(
        `whatsapp:${TO_NUMBER}`,
        `whatsapp:${WA_FROM}`,
        "Hi Naveen, this is a test WhatsApp message from CampusIQ. Your Twilio integration is working! 🎓",
        "WhatsApp"
    );

    console.log("\n═══════════════════════════════════════════════");
    console.log("  Test complete ✔  Check your phone!");
    console.log("═══════════════════════════════════════════════\n");
})();