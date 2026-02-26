import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILeaveRequest extends Document {
  school: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  student_name: string;
  class_name: string;
  from_date: string;
  to_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  applied_at: string;
  approved_by: string;
  createdAt: Date;
}

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    student_name: { type: String, default: "" },
    class_name: { type: String, default: "" },
    from_date: { type: String, required: true },
    to_date: { type: String, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    applied_at: { type: String, default: "" },
    approved_by: { type: String, default: "" },
  },
  { timestamps: true },
);

LeaveRequestSchema.index({ school: 1, status: 1 });

const LeaveRequest: Model<ILeaveRequest> =
  mongoose.models.LeaveRequest ||
  mongoose.model<ILeaveRequest>("LeaveRequest", LeaveRequestSchema);

export default LeaveRequest;
