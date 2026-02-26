import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITransport extends Document {
  school: mongoose.Types.ObjectId;
  vehicleNumber: string;
  vehicleType: "bus" | "van" | "auto" | "other";
  capacity: number;
  driverName: string;
  driverPhone: string;
  driverLicense: string;
  routeName: string;
  routeStops: Array<{
    stopName: string;
    pickupTime: string;
    dropTime: string;
    order: number;
  }>;
  assignedStudents: mongoose.Types.ObjectId[];
  status: "active" | "inactive" | "maintenance";
  createdAt: Date;
  updatedAt: Date;
}

const TransportSchema = new Schema<ITransport>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    vehicleNumber: { type: String, required: true, trim: true },
    vehicleType: {
      type: String,
      enum: ["bus", "van", "auto", "other"],
      default: "bus",
    },
    capacity: { type: Number, required: true },
    driverName: { type: String, required: true },
    driverPhone: { type: String, default: "" },
    driverLicense: { type: String, default: "" },
    routeName: { type: String, required: true },
    routeStops: [
      {
        stopName: { type: String, required: true },
        pickupTime: { type: String, default: "" },
        dropTime: { type: String, default: "" },
        order: { type: Number, default: 0 },
      },
    ],
    assignedStudents: [{ type: Schema.Types.ObjectId, ref: "Student" }],
    status: {
      type: String,
      enum: ["active", "inactive", "maintenance"],
      default: "active",
    },
  },
  { timestamps: true },
);

TransportSchema.index({ school: 1, vehicleNumber: 1 }, { unique: true });
TransportSchema.index({ school: 1, routeName: 1 });

const Transport: Model<ITransport> =
  mongoose.models.Transport ||
  mongoose.model<ITransport>("Transport", TransportSchema);

export default Transport;
