import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Event from "@/lib/models/Event";
import { requireAuth, requireRole } from "@/lib/permissions";
import { logError } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;

    await connectDB();

    const event = await Event.findOne({
      _id: params.id,
      school: session!.user.school_id,
    })
      .populate("organizer", "name email")
      .populate("createdBy", "name")
      .lean();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ data: event });
  } catch (error) {
    logError("GET", "/api/events/[id]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { error, session } = await requireRole("admin", "teacher");
    if (error) return error;

    const body = await request.json();
    const {
      title,
      description,
      type,
      startDate,
      endDate,
      allDay,
      location,
      participants,
      color,
      isRecurring,
      recurringPattern,
      status,
    } = body;

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 },
      );
    }

    await connectDB();

    const event = await Event.findOneAndUpdate(
      { _id: params.id, school: session!.user.school_id },
      {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
        ...(allDay !== undefined && { allDay }),
        ...(location !== undefined && { location }),
        ...(participants !== undefined && { participants }),
        ...(color !== undefined && { color }),
        ...(isRecurring !== undefined && { isRecurring }),
        ...(recurringPattern !== undefined && { recurringPattern }),
        ...(status !== undefined && { status }),
      },
      { new: true },
    );

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ data: event, message: "Event updated" });
  } catch (error) {
    logError("PUT", "/api/events/[id]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { error, session } = await requireRole("admin");
    if (error) return error;

    await connectDB();

    const event = await Event.findOneAndDelete({
      _id: params.id,
      school: session!.user.school_id,
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Event deleted" });
  } catch (error) {
    logError("DELETE", "/api/events/[id]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
