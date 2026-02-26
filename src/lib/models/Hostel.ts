import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHostel extends Document {
  school: mongoose.Types.ObjectId;
  name: string;
  type: "boys" | "girls" | "mixed";
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  wardenId: mongoose.Types.ObjectId | null;
  wardenName: string;
  wardenPhone: string;
  address: string;
  facilities: string[];
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const HostelSchema = new Schema<IHostel>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["boys", "girls", "mixed"],
      required: true,
    },
    totalRooms: { type: Number, default: 0 },
    totalBeds: { type: Number, default: 0 },
    occupiedBeds: { type: Number, default: 0 },
    wardenId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    wardenName: { type: String, default: "" },
    wardenPhone: { type: String, default: "" },
    address: { type: String, default: "" },
    facilities: [{ type: String }],
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true },
);

HostelSchema.index({ school: 1, name: 1 }, { unique: true });

export interface IHostelAllocation extends Document {
  school: mongoose.Types.ObjectId;
  hostel: mongoose.Types.ObjectId;
  hostelName: string;
  roomNumber: string;
  bedNumber: string;
  student: mongoose.Types.ObjectId;
  studentName: string;
  className: string;
  checkInDate: Date;
  checkOutDate: Date | null;
  monthlyFee: number;
  status: "active" | "vacated" | "suspended";
  createdAt: Date;
  updatedAt: Date;
}

const HostelAllocationSchema = new Schema<IHostelAllocation>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    hostel: { type: Schema.Types.ObjectId, ref: "Hostel", required: true },
    hostelName: { type: String, required: true },
    roomNumber: { type: String, required: true },
    bedNumber: { type: String, default: "" },
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    studentName: { type: String, required: true },
    className: { type: String, default: "" },
    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date, default: null },
    monthlyFee: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "vacated", "suspended"],
      default: "active",
    },
  },
  { timestamps: true },
);

HostelAllocationSchema.index({ school: 1, hostel: 1, roomNumber: 1 });
HostelAllocationSchema.index({ school: 1, student: 1, status: 1 });

const Hostel: Model<IHostel> =
  mongoose.models.Hostel || mongoose.model<IHostel>("Hostel", HostelSchema);

const HostelAllocation: Model<IHostelAllocation> =
  mongoose.models.HostelAllocation ||
  mongoose.model<IHostelAllocation>("HostelAllocation", HostelAllocationSchema);

export { Hostel, HostelAllocation };
export default Hostel;
