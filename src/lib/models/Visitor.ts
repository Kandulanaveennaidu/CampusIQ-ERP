import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVisitor extends Document {
  school: mongoose.Types.ObjectId;
  visitor_name: string;
  visitor_phone: string;
  visitor_email: string;
  purpose: string;
  host_name: string;
  host_type: string;
  student_id: string;
  photo_url: string;
  id_proof: string;
  check_in: string;
  check_out: string;
  badge_number: string;
  status: "pre_registered" | "checked_in" | "checked_out" | "cancelled";
  notes: string;
  createdAt: Date;
}

const VisitorSchema = new Schema<IVisitor>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    visitor_name: { type: String, required: true },
    visitor_phone: { type: String, default: "" },
    visitor_email: { type: String, default: "" },
    purpose: { type: String, required: true },
    host_name: { type: String, default: "" },
    host_type: { type: String, default: "staff" },
    student_id: { type: String, default: "" },
    photo_url: { type: String, default: "" },
    id_proof: { type: String, default: "" },
    check_in: { type: String, default: "" },
    check_out: { type: String, default: "" },
    badge_number: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pre_registered", "checked_in", "checked_out", "cancelled"],
      default: "checked_in",
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

VisitorSchema.index({ school: 1, createdAt: -1 });
VisitorSchema.index({ school: 1, status: 1 });

const Visitor: Model<IVisitor> =
  mongoose.models.Visitor || mongoose.model<IVisitor>("Visitor", VisitorSchema);

export default Visitor;
