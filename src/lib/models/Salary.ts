import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISalary extends Document {
  school: mongoose.Types.ObjectId;
  teacher: mongoose.Types.ObjectId;
  teacherName: string;
  month: number;
  year: number;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  leaveDays: number;
  halfDays: number;
  salaryPerDay: number;
  grossSalary: number;
  deductions: number;
  bonus: number;
  netSalary: number;
  status: "draft" | "processed" | "paid";
  paidDate: Date | null;
  paymentMethod: string;
  transactionId: string;
  notes: string;
  generatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SalarySchema = new Schema<ISalary>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    teacher: { type: Schema.Types.ObjectId, ref: "User", required: true },
    teacherName: { type: String, required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    totalDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    lateDays: { type: Number, default: 0 },
    leaveDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    salaryPerDay: { type: Number, default: 0 },
    grossSalary: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "processed", "paid"],
      default: "draft",
    },
    paidDate: { type: Date, default: null },
    paymentMethod: { type: String, default: "" },
    transactionId: { type: String, default: "" },
    notes: { type: String, default: "" },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

SalarySchema.index(
  { school: 1, teacher: 1, month: 1, year: 1 },
  { unique: true },
);
SalarySchema.index({ school: 1, year: 1, month: 1, status: 1 });

const Salary: Model<ISalary> =
  mongoose.models.Salary || mongoose.model<ISalary>("Salary", SalarySchema);

export default Salary;
