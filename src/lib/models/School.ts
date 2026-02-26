import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISchool extends Document {
  school_name: string;
  school_type: string;
  board: string;
  address: string;
  phone: string;
  email: string;
  plan: "starter" | "basic" | "pro" | "enterprise";
  subscriptionStatus: "active" | "trial" | "expired" | "cancelled";
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const SchoolSchema = new Schema<ISchool>(
  {
    school_name: { type: String, required: true },
    school_type: { type: String, default: "" },
    board: { type: String, default: "" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    plan: {
      type: String,
      enum: ["starter", "basic", "pro", "enterprise"],
      default: "starter",
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "trial", "expired", "cancelled"],
      default: "trial",
    },
    trialEndsAt: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true },
);

SchoolSchema.index({ email: 1 });

const School: Model<ISchool> =
  mongoose.models.School || mongoose.model<ISchool>("School", SchoolSchema);

export default School;
