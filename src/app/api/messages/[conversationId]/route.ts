import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/lib/models/Message";
import Conversation from "@/lib/models/Conversation";
import { requireAuth } from "@/lib/permissions";
import { logError } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } },
) {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    await connectDB();

    // Verify user is participant
    const conversation = await Conversation.findOne({
      _id: params.conversationId,
      school: session!.user.school_id,
      participants: session!.user.id,
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const [messages, total] = await Promise.all([
      Message.find({ conversation: params.conversationId })
        .populate("sender", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments({ conversation: params.conversationId }),
    ]);

    // Mark messages as read
    await Message.updateMany(
      {
        conversation: params.conversationId,
        sender: { $ne: session!.user.id },
        "readBy.user": { $ne: session!.user.id },
      },
      {
        $addToSet: {
          readBy: { user: session!.user.id, readAt: new Date() },
        },
      },
    );

    // Reset unread count for this user
    await Conversation.updateOne(
      { _id: params.conversationId },
      { $set: { [`unreadCount.${session!.user.id}`]: 0 } },
    );

    return NextResponse.json({
      data: messages.reverse(),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logError("GET", "/api/messages/[conversationId]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } },
) {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { content, type, attachments } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 },
      );
    }

    await connectDB();

    // Verify user is participant
    const conversation = await Conversation.findOne({
      _id: params.conversationId,
      school: session!.user.school_id,
      participants: session!.user.id,
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const message = await Message.create({
      school: session!.user.school_id,
      conversation: params.conversationId,
      sender: session!.user.id,
      content: content.trim(),
      type: type || "text",
      attachments: attachments || [],
      readBy: [{ user: session!.user.id, readAt: new Date() }],
    });

    // Update conversation's lastMessage and increment unread for other participants
    const unreadUpdates: Record<string, unknown> = {};
    for (const participantId of conversation.participants) {
      const pid = participantId.toString();
      if (pid !== session!.user.id) {
        unreadUpdates[`unreadCount.${pid}`] =
          (conversation.unreadCount?.get(pid) || 0) + 1;
      }
    }

    await Conversation.updateOne(
      { _id: params.conversationId },
      {
        $set: {
          lastMessage: {
            content: content.trim(),
            sender: session!.user.id,
            timestamp: new Date(),
          },
          ...unreadUpdates,
        },
      },
    );

    const populated = await Message.findById(message._id)
      .populate("sender", "name email role")
      .lean();

    return NextResponse.json(
      { data: populated, message: "Message sent" },
      { status: 201 },
    );
  } catch (error) {
    logError("POST", "/api/messages/[conversationId]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
