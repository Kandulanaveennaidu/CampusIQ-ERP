import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import Semester from "@/lib/models/Semester";
import {
  semesterSchema,
  updateSemesterSchema,
  validationError,
} from "@/lib/validators";
import { logRequest, logError } from "@/lib/logger";
import { audit, buildChanges } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("semesters:read");
    if (error) return error;

    await connectDB();
    const schoolId = session!.user.school_id;
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");

    const query: Record<string, unknown> = { school: schoolId };
    if (year) query.year = parseInt(year);

    const semesters = await Semester.find(query)
      .sort({ year: -1, term: 1 })
      .limit(100);
    logRequest("GET", "/api/semesters", session!.user.id, schoolId);
    return NextResponse.json({ success: true, data: semesters });
  } catch (err) {
    logError("GET", "/api/semesters", err);
    return NextResponse.json(
      { error: "Failed to fetch semesters" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("semesters:write");
    if (error) return error;

    const body = await request.json();
    const parsed = semesterSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    // If setting as current, unset others
    if (parsed.data.is_current) {
      await Semester.updateMany({ school: schoolId }, { isCurrent: false });
    }

    const semester = await Semester.create({
      school: schoolId,
      name: parsed.data.name,
      year: parsed.data.year,
      term: parsed.data.term,
      startDate: new Date(parsed.data.start_date),
      endDate: new Date(parsed.data.end_date),
      isCurrent: parsed.data.is_current,
    });

    await audit({
      action: "create",
      entity: "semester",
      entityId: semester._id.toString(),
      schoolId,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
    });

    logRequest("POST", "/api/semesters", session!.user.id, schoolId);
    return NextResponse.json(
      { success: true, data: semester },
      { status: 201 },
    );
  } catch (err) {
    logError("POST", "/api/semesters", err);
    return NextResponse.json(
      { error: "Failed to create semester" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("semesters:write");
    if (error) return error;

    const body = await request.json();
    const parsed = updateSemesterSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    const semester = await Semester.findOne({
      _id: parsed.data.semester_id,
      school: schoolId,
    });
    if (!semester) {
      return NextResponse.json(
        { error: "Semester not found" },
        { status: 404 },
      );
    }

    const oldObj = semester.toObject();

    if (parsed.data.is_current) {
      await Semester.updateMany({ school: schoolId }, { isCurrent: false });
    }

    if (parsed.data.name !== undefined) semester.name = parsed.data.name;
    if (parsed.data.year !== undefined) semester.year = parsed.data.year;
    if (parsed.data.term !== undefined) semester.term = parsed.data.term;
    if (parsed.data.start_date !== undefined)
      semester.startDate = new Date(parsed.data.start_date);
    if (parsed.data.end_date !== undefined)
      semester.endDate = new Date(parsed.data.end_date);
    if (parsed.data.is_current !== undefined)
      semester.isCurrent = parsed.data.is_current;
    if (parsed.data.status !== undefined) semester.status = parsed.data.status;

    await semester.save();

    const changes = buildChanges(oldObj, semester.toObject(), [
      "name",
      "year",
      "term",
      "startDate",
      "endDate",
      "isCurrent",
      "status",
    ]);

    await audit({
      action: "update",
      entity: "semester",
      entityId: parsed.data.semester_id,
      schoolId,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
      changes,
    });

    logRequest("PUT", "/api/semesters", session!.user.id, schoolId);
    return NextResponse.json({ success: true, data: semester });
  } catch (err) {
    logError("PUT", "/api/semesters", err);
    return NextResponse.json(
      { error: "Failed to update semester" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("semesters:write");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const semesterId = searchParams.get("semester_id");
    if (!semesterId) {
      return NextResponse.json(
        { error: "semester_id is required" },
        { status: 400 },
      );
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    const semester = await Semester.findOne({
      _id: semesterId,
      school: schoolId,
    });
    if (!semester) {
      return NextResponse.json(
        { error: "Semester not found" },
        { status: 404 },
      );
    }

    if (semester.isCurrent) {
      return NextResponse.json(
        {
          error:
            "Cannot delete the current semester. Set another semester as current first.",
        },
        { status: 400 },
      );
    }

    semester.status = "completed";
    await semester.save();

    await audit({
      action: "delete",
      entity: "semester",
      entityId: semesterId,
      schoolId,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
    });

    logRequest("DELETE", "/api/semesters", session!.user.id, schoolId);
    return NextResponse.json({
      success: true,
      message: "Semester archived successfully",
    });
  } catch (err) {
    logError("DELETE", "/api/semesters", err);
    return NextResponse.json(
      { error: "Failed to delete semester" },
      { status: 500 },
    );
  }
}
