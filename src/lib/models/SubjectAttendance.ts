import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubjectAttendance extends Document {
  date: string;
  school: mongoose.Types.ObjectId;
  subject: mongoose.Types.ObjectId;
  subjectCode: string;
  subjectName: string;
  className: string;
  department: mongoose.Types.ObjectId | null;
  semester: number;
  period: number;
  startTime: string;
  endTime: string;
  type: "lecture" | "lab" | "practical" | "tutorial";
  student: mongoose.Types.ObjectId;
  status: "present" | "absent" | "late" | "leave";
  markedBy: mongoose.Types.ObjectId;
  notes: string;
  createdAt: Date;
}

const SubjectAttendanceSchema = new Schema<ISubjectAttendance>(
  {
    date: { type: String, required: true },
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    subject: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    subjectCode: { type: String, default: "" },
    subjectName: { type: String, default: "" },
    className: { type: String, required: true },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    semester: { type: Number, default: 0 },
    period: { type: Number, required: true },
    startTime: { type: String, default: "" },
    endTime: { type: String, default: "" },
    type: {
      type: String,
      enum: ["lecture", "lab", "practical", "tutorial"],
      default: "lecture",
    },
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    status: {
      type: String,
      enum: ["present", "absent", "late", "leave"],
      required: true,
    },
    markedBy: { type: Schema.Types.ObjectId, ref: "User" },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

SubjectAttendanceSchema.index(
  { date: 1, subject: 1, student: 1, period: 1 },
  { unique: true },
);
SubjectAttendanceSchema.index({ school: 1, student: 1, subject: 1, date: 1 });
SubjectAttendanceSchema.index({ school: 1, className: 1, date: 1 });
SubjectAttendanceSchema.index({ school: 1, department: 1, date: 1 });

const SubjectAttendance: Model<ISubjectAttendance> =
  mongoose.models.SubjectAttendance ||
  mongoose.model<ISubjectAttendance>(
    "SubjectAttendance",
    SubjectAttendanceSchema,
  );

export default SubjectAttendance;
