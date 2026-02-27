import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEvent extends Document {
  school: mongoose.Types.ObjectId;
  title: string;
  description: string;
  type:
    | "academic"
    | "sports"
    | "cultural"
    | "meeting"
    | "holiday"
    | "exam"
    | "other";
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location: string;
  organizer: mongoose.Types.ObjectId;
  participants: string[];
  color: string;
  reminders: { type: string; time: Date }[];
  isRecurring: boolean;
  recurringPattern: "daily" | "weekly" | "monthly" | "yearly";
  status: "scheduled" | "ongoing" | "completed" | "cancelled";
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    type: {
      type: String,
      enum: [
        "academic",
        "sports",
        "cultural",
        "meeting",
        "holiday",
        "exam",
        "other",
      ],
      default: "other",
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    allDay: { type: Boolean, default: true },
    location: { type: String, default: "" },
    organizer: { type: Schema.Types.ObjectId, ref: "User" },
    participants: [{ type: String }],
    color: { type: String, default: "#3b82f6" },
    reminders: [
      {
        type: { type: String },
        time: { type: Date },
      },
    ],
    isRecurring: { type: Boolean, default: false },
    recurringPattern: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly"],
    },
    status: {
      type: String,
      enum: ["scheduled", "ongoing", "completed", "cancelled"],
      default: "scheduled",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

EventSchema.index({ school: 1, startDate: 1 });
EventSchema.index({ school: 1, type: 1 });

const Event: Model<IEvent> =
  mongoose.models.Event || mongoose.model<IEvent>("Event", EventSchema);

export default Event;
