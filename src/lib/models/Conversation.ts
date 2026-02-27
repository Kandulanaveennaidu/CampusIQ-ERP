import mongoose, { Schema, Document, Model } from "mongoose";

export interface IConversation extends Document {
  school: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  type: "direct" | "group";
  name: string;
  lastMessage: {
    content: string;
    sender: mongoose.Types.ObjectId;
    timestamp: Date;
  };
  unreadCount: Map<string, number>;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    participants: [
      { type: Schema.Types.ObjectId, ref: "User", required: true },
    ],
    type: {
      type: String,
      enum: ["direct", "group"],
      default: "direct",
    },
    name: { type: String, default: "" },
    lastMessage: {
      content: { type: String, default: "" },
      sender: { type: Schema.Types.ObjectId, ref: "User" },
      timestamp: { type: Date },
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

ConversationSchema.index({ school: 1, participants: 1 });
ConversationSchema.index({ school: 1, updatedAt: -1 });

const Conversation: Model<IConversation> =
  mongoose.models.Conversation ||
  mongoose.model<IConversation>("Conversation", ConversationSchema);

export default Conversation;
