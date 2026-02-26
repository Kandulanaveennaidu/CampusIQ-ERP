import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Student from "@/lib/models/Student";
import School from "@/lib/models/School";
import { requireAuth } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import {
  getDefaultClassOptions,
  mergeClassOptions,
  getClassLabel,
} from "@/lib/class-options";

export async function GET() {
  try {
    const { error, session } = await requireAuth("students:read");
    if (error) return error;

    const school_id = session!.user.school_id;

    await connectDB();

    // Get the institution's category (school_type) to determine default classes
    const school = await School.findById(school_id)
      .select("school_type")
      .lean();
    const category =
      (school as { school_type?: string })?.school_type || "school";

    // Get predefined defaults for this category
    const defaults = getDefaultClassOptions(category);

    // Get existing class names from active students
    const existing: string[] = await Student.distinct("class_name", {
      school: school_id,
      status: "active",
    });

    // Merge defaults + existing, de-duplicate and sort
    const classes = mergeClassOptions(defaults, existing);

    return NextResponse.json({
      success: true,
      data: classes,
      category,
      classLabel: getClassLabel(category),
    });
  } catch (err) {
    logError("GET", "/api/classes", err);
    return NextResponse.json(
      { error: "Failed to fetch classes" },
      { status: 500 },
    );
  }
}