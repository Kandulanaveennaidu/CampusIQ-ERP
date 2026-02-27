import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Conversation from "@/lib/models/Conversation";
import { requireAuth } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { emitActivity } from "@/lib/socket-io";

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;

    await connectDB();

    const conversations = await Conversation.find({
      school: session!.user.school_id,
      participants: session!.user.id,
    })
      .populate("participants", "name email role")
      .populate("lastMessage.sender", "name")
      .sort({ updatedAt: -1 })
      .lean();

    const data = conversations.map((c) => {
      const unreadMap = c.unreadCount as unknown as Map<string, number>;
      const unread = unreadMap?.get?.(session!.user.id) || 0;
      return {
        _id: c._id.toString(),
        participants: c.participants,
        type: c.type,
        name: c.name || "",
        lastMessage: c.lastMessage || null,
        unreadCount: unread,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    logError("GET", "/api/messages", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { participants, name, type } = body;

    if (
      !participants ||
      !Array.isArray(participants) ||
      participants.length === 0
    ) {
      return NextResponse.json(
        { error: "At least one participant is required" },
        { status: 400 },
      );
    }

    await connectDB();

    // For direct chats, check if conversation already exists
    const allParticipants = [...new Set([session!.user.id, ...participants])];

    if (type !== "group" && allParticipants.length === 2) {
      const existing = await Conversation.findOne({
        school: session!.user.school_id,
        type: "direct",
        participants: { $all: allParticipants, $size: 2 },
      })
        .populate("participants", "name email role")
        .lean();

      if (existing) {
        return NextResponse.json({ data: existing });
      }
    }

    const conversation = await Conversation.create({
      school: session!.user.school_id,
      participants: allParticipants,
      type: type || (allParticipants.length > 2 ? "group" : "direct"),
      name: name || "",
      createdBy: session!.user.id,
    });

    const populated = await Conversation.findById(conversation._id)
      .populate("participants", "name email role")
      .lean();

    emitActivity({
      type: "message:sent",
      title: "New Conversation",
      message: `${name || "Direct message"} conversation created`,
      module: "messages",
      entityId: conversation._id.toString(),
      actionUrl: "/messages",
      session: session!,
    });

    return NextResponse.json(
      { data: populated, message: "Conversation created" },
      { status: 201 },
    );
  } catch (error) {
    logError("POST", "/api/messages", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
