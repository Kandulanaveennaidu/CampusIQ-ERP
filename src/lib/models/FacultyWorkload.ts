import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFacultyWorkload extends Document {
  school: mongoose.Types.ObjectId;
  teacher: mongoose.Types.ObjectId;
  teacherName: string;
  department: mongoose.Types.ObjectId | null;
  semester: mongoose.Types.ObjectId | null;
  academicYear: string;
  subjects: Array<{
    subject: mongoose.Types.ObjectId;
    subjectName: string;
    subjectCode: string;
    className: string;
    type: "theory" | "lab" | "practical" | "tutorial";
    hoursPerWeek: number;
    credits: number;
  }>;
  totalHoursPerWeek: number;
  totalCredits: number;
  maxHoursPerWeek: number;
  status: "under-loaded" | "optimal" | "over-loaded";
  createdAt: Date;
  updatedAt: Date;
}

const FacultyWorkloadSchema = new Schema<IFacultyWorkload>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    teacher: { type: Schema.Types.ObjectId, ref: "User", required: true },
    teacherName: { type: String, required: true },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    semester: { type: Schema.Types.ObjectId, ref: "Semester", default: null },
    academicYear: { type: String, default: "" },
    subjects: [
      {
        subject: { type: Schema.Types.ObjectId, ref: "Subject" },
        subjectName: { type: String, required: true },
        subjectCode: { type: String, default: "" },
        className: { type: String, default: "" },
        type: {
          type: String,
          enum: ["theory", "lab", "practical", "tutorial"],
          default: "theory",
        },
        hoursPerWeek: { type: Number, default: 0 },
        credits: { type: Number, default: 0 },
      },
    ],
    totalHoursPerWeek: { type: Number, default: 0 },
    totalCredits: { type: Number, default: 0 },
    maxHoursPerWeek: { type: Number, default: 20 },
    status: {
      type: String,
      enum: ["under-loaded", "optimal", "over-loaded"],
      default: "optimal",
    },
  },
  { timestamps: true },
);

FacultyWorkloadSchema.index({ school: 1, teacher: 1, academicYear: 1 });

// Auto-calculate status
FacultyWorkloadSchema.pre("save", function () {
  this.totalHoursPerWeek = this.subjects.reduce(
    (sum, s) => sum + s.hoursPerWeek,
    0,
  );
  this.totalCredits = this.subjects.reduce((sum, s) => sum + s.credits, 0);
  if (this.totalHoursPerWeek < this.maxHoursPerWeek * 0.6)
    this.status = "under-loaded";
  else if (this.totalHoursPerWeek > this.maxHoursPerWeek)
    this.status = "over-loaded";
  else this.status = "optimal";
});

const FacultyWorkload: Model<IFacultyWorkload> =
  mongoose.models.FacultyWorkload ||
  mongoose.model<IFacultyWorkload>("FacultyWorkload", FacultyWorkloadSchema);

export default FacultyWorkload;
