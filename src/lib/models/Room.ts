import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRoom extends Document {
  school: mongoose.Types.ObjectId;
  room_name: string;
  room_type: string;
  capacity: number;
  floor: string;
  facilities: string;
  status: "available" | "maintenance" | "occupied";
  createdAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    room_name: { type: String, required: true },
    room_type: { type: String, required: true },
    capacity: { type: Number, default: 0 },
    floor: { type: String, default: "" },
    facilities: { type: String, default: "" },
    status: {
      type: String,
      enum: ["available", "maintenance", "occupied"],
      default: "available",
    },
  },
  { timestamps: true },
);

RoomSchema.index({ school: 1 });

const Room: Model<IRoom> =
  mongoose.models.Room || mongoose.model<IRoom>("Room", RoomSchema);

export default Room;
