import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessage extends Document {
  school: mongoose.Types.ObjectId;
  conversation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  content: string;
  type: "text" | "image" | "file";
  attachments: { name: string; url: string; type: string }[];
  readBy: { user: mongoose.Types.ObjectId; readAt: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    type: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },
    attachments: [
      {
        name: { type: String },
        url: { type: String },
        type: { type: String },
      },
    ],
    readBy: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

MessageSchema.index({ conversation: 1, createdAt: 1 });

const Message: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);

export default Message;
