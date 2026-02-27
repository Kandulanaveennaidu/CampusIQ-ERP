import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import Student from "@/lib/models/Student";
import { requireRole } from "@/lib/permissions";
import { logError } from "@/lib/logger";

/**
 * GET /api/parent
 * Returns the parent's linked children (students) with basic info.
 * Auth required, role = parent.
 */
export async function GET() {
  try {
    const { error, session } = await requireRole("parent");
    if (error) return error;

    await connectDB();

    const parentUser = await User.findById(session!.user.id).lean();
    if (!parentUser) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    }

    // Get children linked via User.children[] or Student.parent_user
    const childrenIds = parentUser.children || [];

    // Also find students linked via parent_user field
    const linkedByParentUser = await Student.find({
      parent_user: parentUser._id,
      status: "active",
    }).lean();

    // Merge: children from User.children + Student.parent_user (deduplicate)
    const allChildIds = new Set<string>(
      childrenIds.map((id: { toString: () => string }) => id.toString()),
    );
    linkedByParentUser.forEach((s) => allChildIds.add(s._id.toString()));

    const students = await Student.find({
      _id: { $in: Array.from(allChildIds) },
    }).lean();

    const children = students.map((s) => ({
      student_id: s._id.toString(),
      name: s.name,
      class_name: s.class_name,
      roll_number: s.roll_number,
      photo: s.photo || "",
      email: s.email || "",
      status: s.status,
      admission_date: s.admission_date,
      school_id: s.school.toString(),
    }));

    return NextResponse.json({ success: true, data: children });
  } catch (err) {
    logError("GET", "/api/parent", err);
    return NextResponse.json(
      { error: "Failed to fetch children" },
      { status: 500 },
    );
  }
}
