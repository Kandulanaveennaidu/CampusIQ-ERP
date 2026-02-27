import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITeacherAttendance extends Document {
  date: string;
  school: mongoose.Types.ObjectId;
  teacher: mongoose.Types.ObjectId;
  status: "present" | "absent" | "late" | "leave" | "half-day";
  checkIn: string;
  checkOut: string;
  workedHours: number;
  markedBy: mongoose.Types.ObjectId;
  notes: string;
  createdAt: Date;
}

const TeacherAttendanceSchema = new Schema<ITeacherAttendance>(
  {
    date: { type: String, required: true },
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    teacher: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["present", "absent", "late", "leave", "half-day"],
      required: true,
    },
    checkIn: { type: String, default: "" },
    checkOut: { type: String, default: "" },
    workedHours: { type: Number, default: 0 },
    markedBy: { type: Schema.Types.ObjectId, ref: "User" },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

TeacherAttendanceSchema.index({ date: 1, teacher: 1 }, { unique: true });
TeacherAttendanceSchema.index({ school: 1, date: 1 });
TeacherAttendanceSchema.index({ school: 1, teacher: 1, date: 1 });

const TeacherAttendance: Model<ITeacherAttendance> =
  mongoose.models.TeacherAttendance ||
  mongoose.model<ITeacherAttendance>(
    "TeacherAttendance",
    TeacherAttendanceSchema,
  );

export default TeacherAttendance;
