import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  school: mongoose.Types.ObjectId;
  type: string;
  title: string;
  message: string;
  target_role: string;
  status: "unread" | "read";
  readBy: mongoose.Types.ObjectId[];
  /** Module this notification relates to (e.g. "students", "fees") */
  module: string;
  /** ID of the affected entity */
  entityId: string;
  /** URL to navigate to when clicking this notification */
  actionUrl: string;
  /** Name of the user who triggered this notification */
  actorName: string;
  /** Role of the user who triggered this notification */
  actorRole: string;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    type: { type: String, default: "announcement" },
    title: { type: String, required: true },
    message: { type: String, required: true },
    target_role: { type: String, default: "all" },
    status: { type: String, enum: ["unread", "read"], default: "unread" },
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    module: { type: String, default: "" },
    entityId: { type: String, default: "" },
    actionUrl: { type: String, default: "" },
    actorName: { type: String, default: "System" },
    actorRole: { type: String, default: "" },
  },
  { timestamps: true },
);

NotificationSchema.index({ school: 1, createdAt: -1 });
NotificationSchema.index({ school: 1, status: 1 });
NotificationSchema.index({ school: 1, target_role: 1, createdAt: -1 });

const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
