import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEmergencyAlert extends Document {
  school: mongoose.Types.ObjectId;
  type: string;
  title: string;
  message: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "active" | "resolved";
  created_by: mongoose.Types.ObjectId;
  created_by_name: string;
  resolved_by: mongoose.Types.ObjectId;
  resolved_by_name: string;
  resolved_at: Date;
  instructions: string;
  affected_areas: string;
  sent_by: string;
  sent_at: string;
  createdAt: Date;
}

const EmergencyAlertSchema = new Schema<IEmergencyAlert>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    type: { type: String, default: "emergency" },
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: {
      type: String,
      enum: ["critical", "high", "medium", "low"],
      required: true,
    },
    status: { type: String, enum: ["active", "resolved"], default: "active" },
    created_by: { type: Schema.Types.ObjectId, ref: "User" },
    created_by_name: { type: String, default: "" },
    resolved_by: { type: Schema.Types.ObjectId, ref: "User" },
    resolved_by_name: { type: String, default: "" },
    resolved_at: { type: Date },
    instructions: { type: String, default: "" },
    affected_areas: { type: String, default: "" },
    sent_by: { type: String, default: "" },
    sent_at: { type: String, default: "" },
  },
  { timestamps: true },
);

EmergencyAlertSchema.index({ school: 1, status: 1 });

const EmergencyAlert: Model<IEmergencyAlert> =
  mongoose.models.EmergencyAlert ||
  mongoose.model<IEmergencyAlert>("EmergencyAlert", EmergencyAlertSchema);

export default EmergencyAlert;
