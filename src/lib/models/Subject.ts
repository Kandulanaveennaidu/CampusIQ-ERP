import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubject extends Document {
  school: mongoose.Types.ObjectId;
  department: mongoose.Types.ObjectId | null;
  name: string;
  code: string;
  credits: number;
  type: "theory" | "lab" | "practical" | "elective";
  semester: number;
  className: string;
  teacherId: mongoose.Types.ObjectId | null;
  teacherName: string;
  maxStudents: number;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema = new Schema<ISubject>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    credits: { type: Number, default: 0 },
    type: {
      type: String,
      enum: ["theory", "lab", "practical", "elective"],
      default: "theory",
    },
    semester: { type: Number, default: 0 },
    className: { type: String, default: "" },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    teacherName: { type: String, default: "" },
    maxStudents: { type: Number, default: 60 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true },
);

SubjectSchema.index({ school: 1, code: 1 }, { unique: true });
SubjectSchema.index({ school: 1, department: 1, status: 1 });
SubjectSchema.index({ school: 1, className: 1 });

const Subject: Model<ISubject> =
  mongoose.models.Subject || mongoose.model<ISubject>("Subject", SubjectSchema);

export default Subject;
