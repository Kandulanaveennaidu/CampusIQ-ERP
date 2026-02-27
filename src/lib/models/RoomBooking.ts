import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRoomBooking extends Document {
  school: mongoose.Types.ObjectId;
  room_name: string;
  room_type: string;
  booked_by: mongoose.Types.ObjectId;
  booked_by_name: string;
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  attendees: string;
  equipment_needed: string;
  status: "confirmed" | "cancelled" | "completed";
  createdAt: Date;
}

const RoomBookingSchema = new Schema<IRoomBooking>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    room_name: { type: String, required: true },
    room_type: { type: String, default: "" },
    booked_by: { type: Schema.Types.ObjectId, ref: "User" },
    booked_by_name: { type: String, default: "" },
    date: { type: String, required: true },
    start_time: { type: String, required: true },
    end_time: { type: String, required: true },
    purpose: { type: String, default: "" },
    attendees: { type: String, default: "" },
    equipment_needed: { type: String, default: "" },
    status: {
      type: String,
      enum: ["confirmed", "cancelled", "completed"],
      default: "confirmed",
    },
  },
  { timestamps: true },
);

RoomBookingSchema.index({ school: 1, date: 1, room_name: 1 });

const RoomBooking: Model<IRoomBooking> =
  mongoose.models.RoomBooking ||
  mongoose.model<IRoomBooking>("RoomBooking", RoomBookingSchema);

export default RoomBooking;
