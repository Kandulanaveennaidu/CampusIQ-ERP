import mongoose, { Schema, Document, Model } from "mongoose";

export interface IExam extends Document {
  school: mongoose.Types.ObjectId;
  name: string;
  type:
    | "unit-test"
    | "mid-term"
    | "final"
    | "practical"
    | "assignment"
    | "quiz";
  className: string;
  subject: string;
  subjectCode: string;
  department: mongoose.Types.ObjectId | null;
  semester: number;
  date: Date;
  startTime: string;
  endTime: string;
  totalMarks: number;
  passingMarks: number;
  room: string;
  invigilator: mongoose.Types.ObjectId | null;
  invigilatorName: string;
  status: "scheduled" | "ongoing" | "completed" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const ExamSchema = new Schema<IExam>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [
        "unit-test",
        "mid-term",
        "final",
        "practical",
        "assignment",
        "quiz",
      ],
      required: true,
    },
    className: { type: String, required: true },
    subject: { type: String, required: true },
    subjectCode: { type: String, default: "" },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    semester: { type: Number, default: 0 },
    date: { type: Date, required: true },
    startTime: { type: String, default: "" },
    endTime: { type: String, default: "" },
    totalMarks: { type: Number, required: true },
    passingMarks: { type: Number, required: true },
    room: { type: String, default: "" },
    invigilator: { type: Schema.Types.ObjectId, ref: "User", default: null },
    invigilatorName: { type: String, default: "" },
    status: {
      type: String,
      enum: ["scheduled", "ongoing", "completed", "cancelled"],
      default: "scheduled",
    },
  },
  { timestamps: true },
);

ExamSchema.index({ school: 1, className: 1, date: 1 });
ExamSchema.index({ school: 1, status: 1 });

export interface IGrade extends Document {
  school: mongoose.Types.ObjectId;
  exam: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  studentName: string;
  className: string;
  subject: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  rank: number;
  remarks: string;
  enteredBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const GradeSchema = new Schema<IGrade>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    exam: { type: Schema.Types.ObjectId, ref: "Exam", required: true },
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    studentName: { type: String, required: true },
    className: { type: String, required: true },
    subject: { type: String, required: true },
    marksObtained: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    percentage: { type: Number, default: 0 },
    grade: { type: String, default: "" },
    rank: { type: Number, default: 0 },
    remarks: { type: String, default: "" },
    enteredBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

GradeSchema.index({ school: 1, exam: 1, student: 1 }, { unique: true });
GradeSchema.index({ school: 1, student: 1, className: 1 });

// Grade calculation helper
GradeSchema.pre("save", function () {
  if (this.totalMarks > 0) {
    this.percentage =
      Math.round((this.marksObtained / this.totalMarks) * 100 * 100) / 100;
    if (this.percentage >= 90) this.grade = "A+";
    else if (this.percentage >= 80) this.grade = "A";
    else if (this.percentage >= 70) this.grade = "B+";
    else if (this.percentage >= 60) this.grade = "B";
    else if (this.percentage >= 50) this.grade = "C";
    else if (this.percentage >= 40) this.grade = "D";
    else this.grade = "F";
  }
});

const Exam: Model<IExam> =
  mongoose.models.Exam || mongoose.model<IExam>("Exam", ExamSchema);

const Grade: Model<IGrade> =
  mongoose.models.Grade || mongoose.model<IGrade>("Grade", GradeSchema);

export { Exam, Grade };
export default Exam;
