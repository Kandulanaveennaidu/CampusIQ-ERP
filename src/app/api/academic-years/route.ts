import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import AcademicYear from "@/lib/models/AcademicYear";
import {
  academicYearSchema,
  updateAcademicYearSchema,
  validationError,
} from "@/lib/validators";
import { logRequest, logError } from "@/lib/logger";
import { audit, buildChanges } from "@/lib/audit";
import { emitActivity } from "@/lib/socket-io";

export async function GET() {
  try {
    const { error, session } = await requireAuth("academic:read");
    if (error) return error;

    await connectDB();
    const schoolId = session!.user.school_id;
    logRequest("GET", "/api/academic-years", session!.user.id, schoolId);

    const years = await AcademicYear.find({ school: schoolId })
      .sort({
        startDate: -1,
      })
      .limit(50);
    return NextResponse.json({ success: true, data: years });
  } catch (err) {
    logError("GET", "/api/academic-years", err);
    return NextResponse.json(
      { error: "Failed to fetch academic years" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("academic:write");
    if (error) return error;

    const body = await request.json();
    const parsed = academicYearSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    if (parsed.data.is_current) {
      await AcademicYear.updateMany({ school: schoolId }, { isCurrent: false });
    }

    const year = await AcademicYear.create({
      school: schoolId,
      name: parsed.data.name,
      startDate: new Date(parsed.data.start_date),
      endDate: new Date(parsed.data.end_date),
      isCurrent: parsed.data.is_current,
      status: parsed.data.is_current ? "active" : "upcoming",
      terms: parsed.data.terms.map((t) => ({
        name: t.name,
        startDate: new Date(t.start_date),
        endDate: new Date(t.end_date),
      })),
    });

    await audit({
      action: "create",
      entity: "academic_year",
      entityId: year._id.toString(),
      schoolId,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
    });

    logRequest("POST", "/api/academic-years", session!.user.id, schoolId);

    emitActivity({
      type: "academic:year_created",
      title: "Academic Year Created",
      message: `Academic year "${parsed.data.name}" has been created`,
      module: "academic-years",
      entityId: year._id.toString(),
      actionUrl: "/academic-years",
      session: session!,
    });

    return NextResponse.json({ success: true, data: year }, { status: 201 });
  } catch (err) {
    logError("POST", "/api/academic-years", err);
    return NextResponse.json(
      { error: "Failed to create academic year" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("academic:write");
    if (error) return error;

    const body = await request.json();
    const parsed = updateAcademicYearSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    const year = await AcademicYear.findOne({
      _id: parsed.data.year_id,
      school: schoolId,
    });
    if (!year) {
      return NextResponse.json(
        { error: "Academic year not found" },
        { status: 404 },
      );
    }

    const oldObj = year.toObject();

    if (parsed.data.is_current) {
      await AcademicYear.updateMany({ school: schoolId }, { isCurrent: false });
    }

    if (parsed.data.name !== undefined) year.name = parsed.data.name;
    if (parsed.data.start_date !== undefined)
      year.startDate = new Date(parsed.data.start_date);
    if (parsed.data.end_date !== undefined)
      year.endDate = new Date(parsed.data.end_date);
    if (parsed.data.is_current !== undefined)
      year.isCurrent = parsed.data.is_current;
    if (parsed.data.status !== undefined) year.status = parsed.data.status;
    if (parsed.data.terms !== undefined) {
      year.terms = parsed.data.terms.map((t) => ({
        name: t.name,
        startDate: new Date(t.start_date),
        endDate: new Date(t.end_date),
      })) as typeof year.terms;
    }

    await year.save();

    const changes = buildChanges(oldObj, year.toObject(), [
      "name",
      "startDate",
      "endDate",
      "isCurrent",
      "status",
    ]);

    await audit({
      action: "update",
      entity: "academic_year",
      entityId: parsed.data.year_id,
      schoolId,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
      changes,
    });

    logRequest("PUT", "/api/academic-years", session!.user.id, schoolId);

    emitActivity({
      type: "academic:year_updated",
      title: "Academic Year Updated",
      message: `Academic year "${year.name}" has been updated`,
      module: "academic-years",
      entityId: parsed.data.year_id,
      actionUrl: "/academic-years",
      session: session!,
    });

    return NextResponse.json({ success: true, data: year });
  } catch (err) {
    logError("PUT", "/api/academic-years", err);
    return NextResponse.json(
      { error: "Failed to update academic year" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("academic:write");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const yearId = searchParams.get("year_id");
    if (!yearId) {
      return NextResponse.json(
        { error: "year_id is required" },
        { status: 400 },
      );
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    const year = await AcademicYear.findOne({
      _id: yearId,
      school: schoolId,
    });
    if (!year) {
      return NextResponse.json(
        { error: "Academic year not found" },
        { status: 404 },
      );
    }

    if (year.isCurrent) {
      return NextResponse.json(
        {
          error:
            "Cannot delete the current academic year. Set another year as current first.",
        },
        { status: 400 },
      );
    }

    year.status = "completed";
    await year.save();

    await audit({
      action: "delete",
      entity: "academic_year",
      entityId: yearId,
      schoolId,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
    });

    logRequest("DELETE", "/api/academic-years", session!.user.id, schoolId);

    emitActivity({
      type: "academic:year_archived",
      title: "Academic Year Archived",
      message: `Academic year "${year.name}" has been archived`,
      module: "academic-years",
      entityId: yearId,
      actionUrl: "/academic-years",
      session: session!,
    });

    return NextResponse.json({
      success: true,
      message: "Academic year archived successfully",
    });
  } catch (err) {
    logError("DELETE", "/api/academic-years", err);
    return NextResponse.json(
      { error: "Failed to delete academic year" },
      { status: 500 },
    );
  }
}
