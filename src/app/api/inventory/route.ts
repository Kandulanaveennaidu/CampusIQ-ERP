import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Inventory from "@/lib/models/Inventory";
import { logError } from "@/lib/logger";
import { emitActivity } from "@/lib/socket-io";
import { escapeRegex } from "@/lib/utils";

/**
 * GET /api/inventory — List inventory items
 * Query: ?category=lab_equipment&status=available&search=microscope
 */
export async function GET(request: Request) {
  try {
    const { error, session } = await requireAuth("students:read");
    if (error) return error;

    await connectDB();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const query: Record<string, unknown> = { school: session!.user.school_id };
    if (category) query.category = category;
    if (status) query.status = status;
    if (search) query.name = { $regex: escapeRegex(search), $options: "i" };

    const [items, total] = await Promise.all([
      Inventory.find(query)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("assignedTo", "name")
        .lean(),
      Inventory.countDocuments(query),
    ]);

    const data = (items as Record<string, unknown>[]).map((item) => ({
      _id: String(item._id),
      name: item.name,
      category: item.category,
      serialNumber: item.serialNumber,
      quantity: item.quantity,
      availableQuantity: item.availableQuantity,
      location: item.location,
      condition: item.condition,
      status: item.status,
      purchaseDate: item.purchaseDate,
      purchasePrice: item.purchasePrice,
      vendor: item.vendor,
      warrantyExpiry: item.warrantyExpiry,
      assignedTo: item.assignedTo,
      imageUrl: item.imageUrl,
      maintenanceCount: Array.isArray(item.maintenanceLog)
        ? item.maintenanceLog.length
        : 0,
      checkoutCount: Array.isArray(item.checkoutHistory)
        ? item.checkoutHistory.length
        : 0,
      updatedAt: item.updatedAt,
    }));

    // Summary stats
    const allItems = (await Inventory.find({
      school: session!.user.school_id,
    }).lean()) as Record<string, unknown>[];
    const totalValue = allItems.reduce(
      (s, i) => s + (Number(i.purchasePrice) || 0) * (Number(i.quantity) || 1),
      0,
    );
    const categories: Record<string, number> = {};
    const statuses: Record<string, number> = {};
    for (const i of allItems) {
      categories[String(i.category)] =
        (categories[String(i.category)] || 0) + 1;
      statuses[String(i.status)] = (statuses[String(i.status)] || 0) + 1;
    }

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      summary: {
        totalItems: allItems.length,
        totalValue,
        categories,
        statuses,
      },
    });
  } catch (err) {
    logError("GET", "/api/inventory", err);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/inventory — Add new inventory item
 */
export async function POST(request: Request) {
  try {
    const { error, session } = await requireAuth("students:write");
    if (error) return error;

    await connectDB();
    const body = await request.json();

    const item = await Inventory.create({
      ...body,
      school: session!.user.school_id,
      availableQuantity: body.availableQuantity ?? body.quantity,
    });

    emitActivity({
      type: "inventory:updated",
      title: "New Inventory Item Added",
      message: `${body.name || "Item"} added to inventory (Qty: ${body.quantity || 0})`,
      module: "inventory",
      entityId: item._id.toString(),
      actionUrl: "/inventory",
      session: session!,
    });

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (err) {
    logError("POST", "/api/inventory", err);
    return NextResponse.json(
      { error: "Failed to add inventory item" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/inventory — Update inventory / Checkout / Return / Maintenance
 * Body: { _id, action?: "checkout"|"return"|"maintenance", ...fields }
 */
export async function PUT(request: Request) {
  try {
    const { error, session } = await requireAuth("students:write");
    if (error) return error;

    await connectDB();
    const body = await request.json();
    const { _id, action, ...updates } = body;

    if (!_id)
      return NextResponse.json({ error: "Item _id required" }, { status: 400 });

    const item = await Inventory.findOne({
      _id,
      school: session!.user.school_id,
    });
    if (!item)
      return NextResponse.json({ error: "Item not found" }, { status: 404 });

    if (action === "checkout") {
      if (item.availableQuantity <= 0) {
        return NextResponse.json(
          { error: "No available quantity" },
          { status: 400 },
        );
      }
      item.checkoutHistory.push({
        user: updates.userId || session!.user.id,
        checkoutDate: new Date(),
        notes: updates.notes || "",
      });
      item.availableQuantity -= 1;
      if (item.availableQuantity === 0) item.status = "checked_out";
    } else if (action === "return") {
      const lastCheckout = item.checkoutHistory.find(
        (ch: Record<string, unknown>) =>
          !ch.returnDate &&
          String(ch.user) === (updates.userId || session!.user.id),
      );
      if (lastCheckout) {
        lastCheckout.returnDate = new Date();
        item.availableQuantity = Math.min(
          item.availableQuantity + 1,
          item.quantity,
        );
        if (item.availableQuantity > 0) item.status = "available";
      }
    } else if (action === "maintenance") {
      item.maintenanceLog.push({
        date: new Date(),
        description: updates.description || "Routine maintenance",
        cost: updates.cost || 0,
        performedBy: updates.performedBy || session!.user.name || "Admin",
      });
      item.status = "maintenance";
    } else {
      // Normal update
      Object.assign(item, updates);
    }

    await item.save();

    emitActivity({
      type: "inventory:updated",
      title: "Inventory Updated",
      message: `${item.name || "Item"} was updated`,
      module: "inventory",
      entityId: item._id.toString(),
      actionUrl: "/inventory",
      session: session!,
    });

    return NextResponse.json({ data: item });
  } catch (err) {
    logError("PUT", "/api/inventory", err);
    return NextResponse.json(
      { error: "Failed to update inventory" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/inventory — Delete/retire inventory item
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

    const result = await Inventory.findOneAndUpdate(
      { _id: id, school: session!.user.school_id },
      { status: "retired" },
      { new: true },
    );

    if (!result)
      return NextResponse.json({ error: "Item not found" }, { status: 404 });

    emitActivity({
      type: "inventory:updated",
      title: "Inventory Item Retired",
      message: `${result.name || "Item"} has been retired`,
      module: "inventory",
      entityId: id,
      actionUrl: "/inventory",
      session: session!,
    });

    return NextResponse.json({ message: "Item retired", data: result });
  } catch (err) {
    logError("DELETE", "/api/inventory", err);
    return NextResponse.json(
      { error: "Failed to retire item" },
      { status: 500 },
    );
  }
}
