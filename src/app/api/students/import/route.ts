import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Student from "@/lib/models/Student";
import { requireRole } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { logError } from "@/lib/logger";
import { formatDateForStorage } from "@/lib/utils";
import ExcelJS from "exceljs";

// ── Flexible column name matching ──
// Each field maps to possible header names (all matched case-insensitively,
// with punctuation/whitespace stripped)
const COLUMN_ALIASES: Record<string, string[]> = {
  name: [
    "name",
    "studentname",
    "student_name",
    "fullname",
    "full_name",
    "studentsname",
  ],
  class_name: [
    "class",
    "classname",
    "class_name",
    "grade",
    "section",
    "classsection",
    "standard",
    "std",
  ],
  roll_number: [
    "rollnumber",
    "roll_number",
    "roll",
    "rollno",
    "roll_no",
    "sno",
    "s_no",
    "srno",
    "sr_no",
    "serialnumber",
    "admissionno",
    "admission_no",
    "regno",
    "reg_no",
    "registrationnumber",
  ],
  parent_name: [
    "parentname",
    "parent_name",
    "parent",
    "fathername",
    "father_name",
    "guardian",
    "guardianname",
    "guardian_name",
    "mothername",
    "mother_name",
  ],
  parent_phone: [
    "parentphone",
    "parent_phone",
    "parentmobile",
    "parent_mobile",
    "phone",
    "mobile",
    "contact",
    "contactnumber",
    "contact_number",
    "phonenumber",
    "phone_number",
  ],
  parent_email: ["parentemail", "parent_email"],
  email: [
    "email",
    "studentemail",
    "student_email",
    "mail",
    "emailaddress",
    "email_address",
    "emailid",
  ],
  address: [
    "address",
    "addr",
    "location",
    "residential_address",
    "residentialaddress",
    "homeaddress",
    "home_address",
  ],
  photo: [
    "photo",
    "photofilename",
    "photo_file_name",
    "photofile",
    "image",
    "picture",
    "pic",
  ],
};

/**
 * Normalize a header string for matching:
 * strips asterisks, special chars, extra spaces, lowercases
 */
function normalizeHeader(header: string): string {
  return header
    .replace(/[*#()[\]{}<>!@$%^&+=~`|\\/"':;,.?]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Detect the header row from raw 2D array data.
 * Looks for the row that contains the most student-related keywords.
 */
function detectHeaderRow(rows: unknown[][]): number {
  const headerKeywords = new Set<string>();
  for (const aliases of Object.values(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      headerKeywords.add(alias);
    }
  }

  let bestRow = 0;
  let bestScore = 0;

  const maxCheck = Math.min(rows.length, 10);
  for (let i = 0; i < maxCheck; i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row)) continue;

    let score = 0;
    for (const cell of row) {
      if (cell == null) continue;
      const normalized = normalizeHeader(String(cell));
      if (headerKeywords.has(normalized)) {
        score += 2;
      }
      for (const kw of headerKeywords) {
        if (normalized.includes(kw) && normalized !== kw) {
          score += 1;
          break;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestRow = i;
    }
  }

  return bestRow;
}

/**
 * Map actual Excel column headers to our internal field names.
 */
function mapColumns(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};

  for (let colIdx = 0; colIdx < headers.length; colIdx++) {
    const normalized = normalizeHeader(headers[colIdx] || "");
    if (!normalized) continue;

    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (mapping[field] !== undefined) continue;
      if (aliases.includes(normalized)) {
        mapping[field] = colIdx;
        break;
      }
      for (const alias of aliases) {
        if (normalized.includes(alias) || alias.includes(normalized)) {
          mapping[field] = colIdx;
          break;
        }
      }
      if (mapping[field] !== undefined) break;
    }
  }

  return mapping;
}

/** Get cell value as trimmed string */
function cellStr(row: unknown[], idx: number | undefined): string {
  if (idx === undefined) return "";
  const val = row[idx];
  if (val == null) return "";
  return String(val).trim();
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
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const validExtensions = ["xlsx", "xls", "csv"];
    if (!validExtensions.includes(ext)) {
      return NextResponse.json(
        {
          error: `Unsupported file type (.${ext}). Please upload an Excel (.xlsx, .xls) or CSV (.csv) file. If you have data in a Word or PDF document, please copy it into one of the supported formats first.`,
        },
        { status: 400 },
      );
    }

    // Max file size: 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 },
      );
    }

    // ── Parse the file ──
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];

    if (!sheet || sheet.rowCount < 2) {
      return NextResponse.json(
        {
          error:
            "File is empty or has no data rows. Please ensure the file has a header row and at least one data row.",
        },
        { status: 400 },
      );
    }

    // Read as raw 2D array (compatible with existing detection logic)
    const rawRows: unknown[][] = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const rowData: unknown[] = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        // Pad array to handle sparse columns
        while (rowData.length < colNumber - 1) rowData.push("");
        rowData[colNumber - 1] = cell.value ?? "";
      });
      rawRows.push(rowData);
    });

    if (rawRows.length < 2) {
      return NextResponse.json(
        {
          error:
            "File is empty or has no data rows. Please ensure the file has a header row and at least one data row.",
        },
        { status: 400 },
      );
    }

    // ── Auto-detect header row ──
    const headerRowIdx = detectHeaderRow(rawRows);
    const headers = (rawRows[headerRowIdx] as unknown[]).map((cell) =>
      String(cell ?? ""),
    );

    // ── Map columns ──
    const colMap = mapColumns(headers);

    // Validate required columns found
    const missingRequired: string[] = [];
    if (colMap.name === undefined) missingRequired.push("Student Name");
    if (colMap.class_name === undefined) missingRequired.push("Class");
    if (colMap.roll_number === undefined) missingRequired.push("Roll Number");

    if (missingRequired.length > 0) {
      return NextResponse.json(
        {
          error:
            `Could not find required columns: ${missingRequired.join(", ")}. ` +
            `Found headers: [${headers.filter(Boolean).join(", ")}]. ` +
            `Please use the template file or ensure your file has columns for: Student Name, Roll Number, and Class.`,
        },
        { status: 400 },
      );
    }

    // Data rows start after the header
    const dataRows = rawRows.slice(headerRowIdx + 1);

    if (dataRows.length === 0) {
      return NextResponse.json(
        { error: "File has headers but no data rows." },
        { status: 400 },
      );
    }

    // Max 500 students per import
    if (dataRows.length > 500) {
      return NextResponse.json(
        {
          error: `Found ${dataRows.length} rows. Maximum 500 students per import. Please split into smaller files.`,
        },
        { status: 400 },
      );
    }

    await connectDB();
    const school_id = session!.user.school_id;
    const admissionDate = formatDateForStorage(new Date());

    const results = {
      imported: 0,
      skipped: 0,
      total: 0,
      errors: [] as string[],
    };

    const seenInFile = new Set<string>();

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] as unknown[];
      const rowNum = headerRowIdx + i + 2;

      const name = cellStr(row, colMap.name);
      const class_name = cellStr(row, colMap.class_name);
      const roll_number = cellStr(row, colMap.roll_number);

      // Skip completely empty rows
      if (!name && !class_name && !roll_number) continue;
      results.total++;

      // Validate required fields
      const missing: string[] = [];
      if (!name) missing.push("Name");
      if (!class_name) missing.push("Class");
      if (!roll_number) missing.push("Roll Number");

      if (missing.length > 0) {
        results.errors.push(
          `Row ${rowNum}: Missing ${missing.join(", ")} (found: name="${name}", class="${class_name}", roll="${roll_number}")`,
        );
        results.skipped++;
        continue;
      }

      // Check duplicate within same file
      const fileKey = `${class_name}::${roll_number}`.toLowerCase();
      if (seenInFile.has(fileKey)) {
        results.errors.push(
          `Row ${rowNum}: Duplicate — Roll ${roll_number} in ${class_name} already appears earlier in this file`,
        );
        results.skipped++;
        continue;
      }
      seenInFile.add(fileKey);

      // Check duplicate in database
      const existing = await Student.findOne({
        school: school_id,
        class_name,
        roll_number,
        status: "active",
      });

      if (existing) {
        results.errors.push(
          `Row ${rowNum}: Roll ${roll_number} already exists in ${class_name}`,
        );
        results.skipped++;
        continue;
      }

      try {
        await Student.create({
          school: school_id,
          name,
          class_name,
          roll_number,
          parent_name: cellStr(row, colMap.parent_name),
          parent_phone: cellStr(row, colMap.parent_phone),
          parent_email: cellStr(row, colMap.parent_email),
          email: cellStr(row, colMap.email),
          address: cellStr(row, colMap.address),
          admission_date: admissionDate,
          status: "active",
        });
        results.imported++;
      } catch (err) {
        results.errors.push(
          `Row ${rowNum}: ${err instanceof Error ? err.message : "Database error"}`,
        );
        results.skipped++;
      }
    }

    await audit({
      action: "import",
      entity: "student",
      entityId: "bulk",
      schoolId: school_id,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: {
        fileName: file.name,
        totalRows: results.total,
        imported: results.imported,
        skipped: results.skipped,
        headerRow: headerRowIdx + 1,
        detectedColumns: Object.fromEntries(
          Object.entries(colMap).map(([k, v]) => [k, headers[v]]),
        ),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Import complete: ${results.imported} added, ${results.skipped} skipped out of ${results.total} rows`,
      data: results,
    });
  } catch (error) {
    logError("POST", "/api/students/import", error);
    return NextResponse.json(
      {
        error:
          "Failed to import students. Please check your file format and try again.",
      },
      { status: 500 },
    );
  }
}
