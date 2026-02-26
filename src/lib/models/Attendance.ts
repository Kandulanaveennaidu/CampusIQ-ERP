import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAttendance extends Document {
  date: string;
  school: mongoose.Types.ObjectId;
  class_name: string;
  student: mongoose.Types.ObjectId;
  status: "present" | "absent" | "late" | "leave";
  marked_by: string;
  marked_at: string;
  notes: string;
  createdAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    date: { type: String, required: true },
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    class_name: { type: String, required: true },
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    status: {
      type: String,
      enum: ["present", "absent", "late", "leave"],
      required: true,
    },
    marked_by: { type: String, default: "" },
    marked_at: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

AttendanceSchema.index({ date: 1, school: 1, class_name: 1 });
AttendanceSchema.index({ date: 1, student: 1 }, { unique: true });
AttendanceSchema.index({ school: 1, student: 1, date: 1 });

const Attendance: Model<IAttendance> =
  mongoose.models.Attendance ||
  mongoose.model<IAttendance>("Attendance", AttendanceSchema);

export default Attendance;
