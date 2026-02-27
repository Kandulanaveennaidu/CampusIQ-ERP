import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Alumni from "@/lib/models/Alumni";
import { logError } from "@/lib/logger";
import { emitActivity } from "@/lib/socket-io";
import { escapeRegex } from "@/lib/utils";

/**
 * GET /api/alumni — List alumni with search/filter
 * Query: ?year=2020&search=John&page=1&limit=20
 */
export async function GET(request: Request) {
  try {
    const { error, session } = await requireAuth("students:read");
    if (error) return error;

    await connectDB();
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const search = searchParams.get("search");
    const city = searchParams.get("city");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const query: Record<string, unknown> = { school: session!.user.school_id };
    if (year) query.graduationYear = parseInt(year, 10);
    if (city) query.city = { $regex: escapeRegex(city), $options: "i" };
    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { company: { $regex: safeSearch, $options: "i" } },
        { currentOccupation: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const [alumni, total] = await Promise.all([
      Alumni.find(query)
        .sort({ graduationYear: -1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Alumni.countDocuments(query),
    ]);

    // Summary stats
    const allAlumni = (await Alumni.find({
      school: session!.user.school_id,
    }).lean()) as Record<string, unknown>[];
    const yearGroups: Record<number, number> = {};
    const cities: Record<string, number> = {};
    let totalDonations = 0;
    for (const a of allAlumni) {
      yearGroups[Number(a.graduationYear)] =
        (yearGroups[Number(a.graduationYear)] || 0) + 1;
      if (a.city) cities[String(a.city)] = (cities[String(a.city)] || 0) + 1;
      if (Array.isArray(a.donations)) {
        totalDonations += a.donations.reduce(
          (s: number, d: Record<string, unknown>) =>
            s + (Number(d.amount) || 0),
          0,
        );
      }
    }

    return NextResponse.json({
      data: alumni,
      total,
      page,
      limit,
      summary: {
        totalAlumni: allAlumni.length,
        yearGroups,
        topCities: cities,
        totalDonations,
      },
    });
  } catch (err) {
    logError("GET", "/api/alumni", err);
    return NextResponse.json(
      { error: "Failed to fetch alumni" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/alumni — Register new alumni
 */
export async function POST(request: Request) {
  try {
    const { error, session } = await requireAuth("students:write");
    if (error) return error;

    await connectDB();
    const body = await request.json();

    const alumni = await Alumni.create({
      ...body,
      school: session!.user.school_id,
      registeredBy: session!.user.id,
    });

    emitActivity({
      type: "alumni:created",
      title: "New Alumni Added",
      message: `${body.name || "Alumni"} has been registered`,
      module: "alumni",
      entityId: alumni._id.toString(),
      actionUrl: "/alumni",
      session: session!,
    });

    return NextResponse.json({ data: alumni }, { status: 201 });
  } catch (err) {
    logError("POST", "/api/alumni", err);
    return NextResponse.json(
      { error: "Failed to register alumni" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/alumni — Update alumni profile / Add event / Add donation
 */
export async function PUT(request: Request) {
  try {
    const { error, session } = await requireAuth("students:write");
    if (error) return error;

    await connectDB();
    const body = await request.json();
    const { _id, action, ...updates } = body;

    if (!_id)
      return NextResponse.json({ error: "_id required" }, { status: 400 });

    const alumni = await Alumni.findOne({
      _id,
      school: session!.user.school_id,
    });
    if (!alumni)
      return NextResponse.json({ error: "Alumni not found" }, { status: 404 });

    if (action === "add_event") {
      alumni.events.push({
        eventName: updates.eventName,
        date: new Date(updates.date),
        attended: updates.attended || false,
      });
    } else if (action === "add_donation") {
      alumni.donations.push({
        amount: updates.amount,
        date: new Date(updates.date || Date.now()),
        purpose: updates.purpose || "General",
        transactionId: updates.transactionId || "",
      });
    } else {
      Object.assign(alumni, updates);
    }

    await alumni.save();

    emitActivity({
      type: "alumni:updated",
      title: "Alumni Updated",
      message: `${alumni.name || "Alumni"} record has been updated`,
      module: "alumni",
      entityId: alumni._id.toString(),
      actionUrl: "/alumni",
      session: session!,
    });

    return NextResponse.json({ data: alumni });
  } catch (err) {
    logError("PUT", "/api/alumni", err);
    return NextResponse.json(
      { error: "Failed to update alumni" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/alumni — Remove alumni record
 */
export async function DELETE(request: Request) {
  try {
    const { error, session } = await requireAuth("students:write");
    if (error) return error;

    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "id required" }, { status: 400 });

    await Alumni.findOneAndDelete({ _id: id, school: session!.user.school_id });

    emitActivity({
      type: "alumni:deleted",
      title: "Alumni Removed",
      message: `An alumni record has been deleted`,
      module: "alumni",
      entityId: id,
      actionUrl: "/alumni",
      session: session!,
    });

    return NextResponse.json({ message: "Alumni record deleted" });
  } catch (err) {
    logError("DELETE", "/api/alumni", err);
    return NextResponse.json(
      { error: "Failed to delete alumni" },
      { status: 500 },
    );
  }
}
