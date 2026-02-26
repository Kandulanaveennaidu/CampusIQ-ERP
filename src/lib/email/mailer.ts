import nodemailer from "nodemailer";
import logger from "@/lib/logger";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

function createTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendEmail({
  to,
  subject,
  html,
}: EmailOptions): Promise<boolean> {
  const transporter = createTransporter();

  if (!transporter) {
    logger.info({ to, subject }, "Email (dev mode - no SMTP configured)");
    return true;
  }

  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL || '"CampusIQ" <noreply@campusiq.com>',
      to,
      subject,
      html,
    });
    logger.info({ to, subject }, "Email sent successfully");
    return true;
  } catch (error) {
    logger.error({ to, subject, error }, "Failed to send email");
    return false;
  }
}
