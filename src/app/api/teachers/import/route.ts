import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { requireRole } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { logError } from "@/lib/logger";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import ExcelJS from "exceljs";

/**
 * Generate a secure random password for imported teachers.
 * Format: 3 random words-like segments + 2 digits + 1 symbol
 * Example: "Kxm7Bq#2pR"
 */
function generateSecurePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "@#$%&*!";
  let pwd = "";
  const bytes = crypto.randomBytes(12);
  for (let i = 0; i < 7; i++) pwd += chars[bytes[i] % chars.length];
  pwd += digits[bytes[7] % digits.length];
  pwd += symbols[bytes[8] % symbols.length];
  pwd += digits[bytes[9] % digits.length];
  return pwd;
}

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireRole("admin");
    if (error) return error;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    if (
      !validTypes.includes(file.type) &&
      !file.name.match(/\.(xlsx|xls|csv)$/i)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only .xlsx, .xls, and .csv files are supported",
        },
        { status: 400 },
      );
    }

    // Max file size: 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 },
      );
    }

    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) {
      return NextResponse.json(
        { error: "File is empty or has no data rows" },
        { status: 400 },
      );
    }

    // Convert exceljs rows to array of objects using first row as headers
    const headerRow = sheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value || "")
        .trim()
        .toLowerCase();
    });

    const rawData: Record<string, string>[] = [];
    for (let rowIdx = 2; rowIdx <= sheet.rowCount; rowIdx++) {
      const row = sheet.getRow(rowIdx);
      const obj: Record<string, string> = {};
      let hasData = false;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const key = headers[colNumber - 1] || `col${colNumber}`;
        const val = String(cell.value || "").trim();
        obj[key] = val;
        if (val) hasData = true;
      });
      if (hasData) rawData.push(obj);
    }

    if (rawData.length === 0) {
      return NextResponse.json(
        { error: "File is empty or has no data rows" },
        { status: 400 },
      );
    }

    // Max 200 teachers per import
    if (rawData.length > 200) {
      return NextResponse.json(
        {
          error:
            "Maximum 200 teachers per import. Please split into smaller files.",
        },
        { status: 400 },
      );
    }

    // Column mapping (flexible: supports various header names)
    const columnMap: Record<string, string[]> = {
      name: ["name", "teacher_name", "teacher name", "full name", "fullname"],
      email: ["email", "teacher_email", "mail", "email address"],
      phone: ["phone", "mobile", "contact", "phone_number", "phone number"],
      subject: [
        "subject",
        "department",
        "specialization",
        "subject_name",
        "subject name",
      ],
      qualification: ["qualification", "degree", "education", "qualifications"],
    };

    const findColumn = (
      row: Record<string, string>,
      candidates: string[],
    ): string => {
      for (const key of Object.keys(row)) {
        if (candidates.includes(key.toLowerCase().trim())) {
          return key;
        }
      }
      return "";
    };

    const firstRow = rawData[0];
    const mappedColumns: Record<string, string> = {};
    for (const [field, candidates] of Object.entries(columnMap)) {
      mappedColumns[field] = findColumn(firstRow, candidates);
    }

    // Validate required columns
    if (!mappedColumns.name || !mappedColumns.email) {
      return NextResponse.json(
        {
          error:
            "File must have columns: name (or teacher_name), email. Found columns: " +
            Object.keys(firstRow).join(", "),
        },
        { status: 400 },
      );
    }

    await connectDB();

    const school_id = session!.user.school_id;
    const results = { imported: 0, skipped: 0, errors: [] as string[] };
    const importedCredentials: {
      name: string;
      email: string;
      password: string;
    }[] = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const name = String(row[mappedColumns.name] || "").trim();
      const email = String(row[mappedColumns.email] || "")
        .trim()
        .toLowerCase();

      if (!name || !email) {
        results.errors.push(
          `Row ${i + 2}: Missing required field (name or email)`,
        );
        results.skipped++;
        continue;
      }

      // Basic email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        results.errors.push(`Row ${i + 2}: Invalid email format (${email})`);
        results.skipped++;
        continue;
      }

      // Check for duplicate email
      const existing = await User.findOne({ email });
      if (existing) {
        results.errors.push(`Row ${i + 2}: Email ${email} already exists`);
        results.skipped++;
        continue;
      }

      try {
        // Generate unique password per teacher
        const rawPassword = generateSecurePassword();
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        await User.create({
          name,
          email,
          password: hashedPassword,
          role: "teacher",
          school: school_id,
          phone: mappedColumns.phone
            ? String(row[mappedColumns.phone] || "").trim()
            : "",
          subject: mappedColumns.subject
            ? String(row[mappedColumns.subject] || "").trim()
            : "",
          emailVerified: false,
          isActive: true,
        });
        importedCredentials.push({ name, email, password: rawPassword });
        results.imported++;
      } catch (err) {
        results.errors.push(
          `Row ${i + 2}: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
        results.skipped++;
      }
    }

    await audit({
      action: "import",
      entity: "teacher",
      entityId: "bulk",
      schoolId: school_id,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: {
        fileName: file.name,
        totalRows: rawData.length,
        imported: results.imported,
        skipped: results.skipped,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Import complete: ${results.imported} added, ${results.skipped} skipped`,
      data: results,
      // Return credentials so admin can share them with teachers.
      // These passwords are NOT stored in plaintext anywhere.
      credentials: importedCredentials.map((c) => ({
        name: c.name,
        email: c.email,
        tempPassword: c.password,
      })),
    });
  } catch (error) {
    logError("POST", "/api/teachers/import", error);
    return NextResponse.json(
      { error: "Failed to import teachers" },
      { status: 500 },
    );
  }
}
