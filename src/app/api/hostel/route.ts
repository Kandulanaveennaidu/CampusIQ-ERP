import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import { Hostel, HostelAllocation } from "@/lib/models/Hostel";
import Student from "@/lib/models/Student";
import {
  hostelSchema,
  hostelAllocationSchema,
  updateHostelSchema,
  validationError,
} from "@/lib/validators";
import { logRequest, logError } from "@/lib/logger";
import { createAuditLog, buildChanges } from "@/lib/audit";
import { notifyHostelAllocation } from "@/lib/twilio-notifications";
import { emitActivity } from "@/lib/socket-io";

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("hostel:read");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "hostels";
    const hostelId = searchParams.get("hostel_id");
    const studentId = searchParams.get("student_id");
    const page = parseInt(searchParams.get("page") || "1");
    const parsedLimit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * parsedLimit;

    await connectDB();
    const schoolId = session!.user.school_id;
    logRequest("GET", "/api/hostel", session!.user.id, schoolId);

    if (type === "hostels") {
      const hostelQuery = { school: schoolId };
      const [hostels, total] = await Promise.all([
        Hostel.find(hostelQuery)
          .sort({ name: 1 })
          .skip(skip)
          .limit(parsedLimit),
        Hostel.countDocuments(hostelQuery),
      ]);
      return NextResponse.json({
        success: true,
        data: hostels,
        pagination: {
          page,
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(total / parsedLimit),
        },
      });
    }

    if (type === "allocations") {
      const query: Record<string, unknown> = { school: schoolId };
      if (hostelId) query.hostel = hostelId;
      if (studentId) query.student = studentId;

      const [allocations, total] = await Promise.all([
        HostelAllocation.find(query)
          .populate("student", "name class_name roll_number")
          .sort({ roomNumber: 1 })
          .skip(skip)
          .limit(parsedLimit),
        HostelAllocation.countDocuments(query),
      ]);

      return NextResponse.json({
        success: true,
        data: allocations,
        pagination: {
          page,
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(total / parsedLimit),
        },
      });
    }

    if (type === "summary") {
      const hostels = await Hostel.find({ school: schoolId });
      const summary = await Promise.all(
        hostels.map(async (h) => {
          const occupied = await HostelAllocation.countDocuments({
            hostel: h._id,
            status: "active",
          });
          return {
            hostel_id: h._id,
            name: h.name,
            type: h.type,
            total_beds: h.totalBeds,
            occupied_beds: occupied,
            available_beds: h.totalBeds - occupied,
            occupancy_rate:
              h.totalBeds > 0 ? Math.round((occupied / h.totalBeds) * 100) : 0,
          };
        }),
      );

      return NextResponse.json({ success: true, data: summary });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    logError("GET", "/api/hostel", err);
    return NextResponse.json(
      { error: "Failed to fetch hostel data" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("hostel:write");
    if (error) return error;

    const body = await request.json();
    const action = body.action || "create_hostel";

    await connectDB();
    const schoolId = session!.user.school_id;
    logRequest("POST", "/api/hostel", session!.user.id, schoolId);

    if (action === "create_hostel") {
      const parsed = hostelSchema.safeParse(body);
      if (!parsed.success) {
        return validationError(parsed.error);
      }

      const hostel = await Hostel.create({
        school: schoolId,
        name: parsed.data.name,
        type: parsed.data.type,
        totalRooms: parsed.data.total_rooms,
        totalBeds: parsed.data.total_beds,
        wardenId: parsed.data.warden_id || null,
        wardenPhone: parsed.data.warden_phone,
        address: parsed.data.address,
        facilities: parsed.data.facilities,
      });

      createAuditLog({
        school: schoolId,
        action: "create",
        entity: "hostel",
        entityId: hostel._id.toString(),
        userId: session!.user.id,
        userName: session!.user.name,
        userRole: session!.user.role,
        metadata: { name: parsed.data.name },
      });

      emitActivity({
        type: "hostel:created",
        title: "New Hostel Created",
        message: `${parsed.data.name} hostel has been added (${parsed.data.total_beds} beds)`,
        module: "hostel",
        entityId: hostel._id.toString(),
        actionUrl: "/hostel",
        session: session!,
      });

      return NextResponse.json(
        { success: true, data: hostel },
        { status: 201 },
      );
    }

    if (action === "allocate") {
      const parsed = hostelAllocationSchema.safeParse(body);
      if (!parsed.success) {
        return validationError(parsed.error);
      }

      // CRITICAL: Scope by school for multi-tenant isolation
      const hostel = await Hostel.findOne({
        _id: parsed.data.hostel_id,
        school: schoolId,
      });
      if (!hostel)
        return NextResponse.json(
          { error: "Hostel not found" },
          { status: 404 },
        );

      const student = await Student.findOne({
        _id: parsed.data.student_id,
        school: schoolId,
      });
      if (!student)
        return NextResponse.json(
          { error: "Student not found" },
          { status: 404 },
        );

      // Check existing allocation for this student
      const existing = await HostelAllocation.findOne({
        school: schoolId,
        student: parsed.data.student_id,
        status: "active",
      });
      if (existing) {
        return NextResponse.json(
          { error: "Student already has an active allocation" },
          { status: 400 },
        );
      }

      // Check duplicate bed allocation (same room + bed in same hostel)
      const bedTaken = await HostelAllocation.findOne({
        school: schoolId,
        hostel: hostel._id,
        roomNumber: parsed.data.room_number,
        bedNumber: parsed.data.bed_number,
        status: "active",
      });
      if (bedTaken) {
        return NextResponse.json(
          {
            error: `Bed ${parsed.data.bed_number} in Room ${parsed.data.room_number} is already occupied`,
          },
          { status: 400 },
        );
      }

      const allocation = await HostelAllocation.create({
        school: schoolId,
        hostel: hostel._id,
        hostelName: hostel.name,
        roomNumber: parsed.data.room_number,
        bedNumber: parsed.data.bed_number,
        student: student._id,
        studentName: student.name,
        className: student.class_name,
        checkInDate: new Date(parsed.data.check_in_date),
        monthlyFee: parsed.data.monthly_fee,
      });

      hostel.occupiedBeds += 1;
      await hostel.save();

      createAuditLog({
        school: schoolId,
        action: "create",
        entity: "hostel_allocation",
        entityId: allocation._id.toString(),
        userId: session!.user.id,
        userName: session!.user.name,
        userRole: session!.user.role,
        metadata: {
          studentName: student.name,
          hostelName: hostel.name,
          room: parsed.data.room_number,
          bed: parsed.data.bed_number,
        },
      });

      // Notify parent about hostel allocation
      if (student.parent_phone) {
        notifyHostelAllocation(
          student.parent_phone,
          student.name,
          hostel.name,
          parsed.data.room_number,
          parsed.data.bed_number,
        ).catch(() => {});
      }

      emitActivity({
        type: "hostel:allocated",
        title: "Hostel Room Allocated",
        message: `${student.name} allocated to ${hostel.name} - Room ${parsed.data.room_number}, Bed ${parsed.data.bed_number}`,
        module: "hostel",
        entityId: allocation._id.toString(),
        actionUrl: "/hostel",
        session: session!,
      });

      return NextResponse.json(
        { success: true, data: allocation },
        { status: 201 },
      );
    }

    if (action === "vacate") {
      const { allocation_id } = body;
      if (!allocation_id) {
        return NextResponse.json(
          { error: "allocation_id is required" },
          { status: 400 },
        );
      }

      // CRITICAL: Scope by school for multi-tenant isolation
      const allocation = await HostelAllocation.findOne({
        _id: allocation_id,
        school: schoolId,
      });
      if (!allocation)
        return NextResponse.json(
          { error: "Allocation not found" },
          { status: 404 },
        );

      allocation.status = "vacated";
      allocation.checkOutDate = new Date();
      await allocation.save();

      const hostel = await Hostel.findById(allocation.hostel);
      if (hostel) {
        hostel.occupiedBeds = Math.max(0, hostel.occupiedBeds - 1);
        await hostel.save();
      }

      createAuditLog({
        school: schoolId,
        action: "update",
        entity: "hostel_allocation",
        entityId: allocation_id,
        userId: session!.user.id,
        userName: session!.user.name,
        userRole: session!.user.role,
        metadata: { action: "vacated", studentName: allocation.studentName },
      });

      emitActivity({
        type: "hostel:vacated",
        title: "Hostel Room Vacated",
        message: `${allocation.studentName} has vacated their hostel room`,
        module: "hostel",
        entityId: allocation_id,
        actionUrl: "/hostel",
        session: session!,
      });

      return NextResponse.json({ success: true, data: allocation });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    logError("POST", "/api/hostel", err);
    return NextResponse.json(
      { error: "Failed to process hostel request" },
      { status: 500 },
    );
  }
}

// PUT - Update hostel details
export async function PUT(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("hostel:write");
    if (error) return error;

    const body = await request.json();
    const parsed = updateHostelSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    const hostel = await Hostel.findOne({
      _id: parsed.data.hostel_id,
      school: schoolId,
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const oldObj = hostel.toObject();

    if (parsed.data.name !== undefined) hostel.name = parsed.data.name;
    if (parsed.data.type !== undefined) hostel.type = parsed.data.type;
    if (parsed.data.total_rooms !== undefined)
      hostel.totalRooms = parsed.data.total_rooms;
    if (parsed.data.total_beds !== undefined)
      hostel.totalBeds = parsed.data.total_beds;
    if (parsed.data.warden_id !== undefined)
      hostel.wardenId = parsed.data
        .warden_id as unknown as typeof hostel.wardenId;
    if (parsed.data.warden_phone !== undefined)
      hostel.wardenPhone = parsed.data.warden_phone;
    if (parsed.data.address !== undefined) hostel.address = parsed.data.address;
    if (parsed.data.facilities !== undefined)
      hostel.facilities = parsed.data.facilities;
    if (parsed.data.status !== undefined) hostel.status = parsed.data.status;

    await hostel.save();

    const changes = buildChanges(oldObj, hostel.toObject(), [
      "name",
      "type",
      "totalRooms",
      "totalBeds",
      "status",
    ]);

    createAuditLog({
      school: schoolId,
      action: "update",
      entity: "hostel",
      entityId: parsed.data.hostel_id,
      userId: session!.user.id,
      userName: session!.user.name,
      userRole: session!.user.role,
      changes,
    });

    emitActivity({
      type: "hostel:updated",
      title: "Hostel Updated",
      message: `${hostel.name} hostel details have been updated`,
      module: "hostel",
      entityId: parsed.data.hostel_id,
      actionUrl: "/hostel",
      session: session!,
    });

    logRequest("PUT", "/api/hostel", session!.user.id, schoolId);
    return NextResponse.json({ success: true, data: hostel });
  } catch (err) {
    logError("PUT", "/api/hostel", err);
    return NextResponse.json(
      { error: "Failed to update hostel" },
      { status: 500 },
    );
  }
}

// DELETE - Deactivate hostel
export async function DELETE(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("hostel:manage");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const hostelId = searchParams.get("hostel_id");
    if (!hostelId) {
      return NextResponse.json(
        { error: "hostel_id is required" },
        { status: 400 },
      );
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    const hostel = await Hostel.findOne({
      _id: hostelId,
      school: schoolId,
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    // Check for active allocations
    const activeAllocations = await HostelAllocation.countDocuments({
      hostel: hostelId,
      status: "active",
    });

    if (activeAllocations > 0) {
      return NextResponse.json(
        {
          error: `Cannot deactivate hostel with ${activeAllocations} active allocation(s). Vacate all students first.`,
        },
        { status: 400 },
      );
    }

    hostel.status = "inactive";
    await hostel.save();

    createAuditLog({
      school: schoolId,
      action: "delete",
      entity: "hostel",
      entityId: hostelId,
      userId: session!.user.id,
      userName: session!.user.name,
      userRole: session!.user.role,
    });

    emitActivity({
      type: "hostel:deactivated",
      title: "Hostel Deactivated",
      message: `${hostel.name} hostel has been deactivated`,
      module: "hostel",
      entityId: hostelId,
      actionUrl: "/hostel",
      session: session!,
    });

    logRequest("DELETE", "/api/hostel", session!.user.id, schoolId);
    return NextResponse.json({
      success: true,
      message: "Hostel deactivated successfully",
    });
  } catch (err) {
    logError("DELETE", "/api/hostel", err);
    return NextResponse.json(
      { error: "Failed to delete hostel" },
      { status: 500 },
    );
  }
}
