import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFeeStructure extends Document {
  school: mongoose.Types.ObjectId;
  name: string;
  className: string;
  academicYear: string;
  amount: number;
  dueDate: Date;
  category:
    | "tuition"
    | "exam"
    | "lab"
    | "library"
    | "transport"
    | "hostel"
    | "other";
  description: string;
  isRecurring: boolean;
  frequency: "monthly" | "quarterly" | "semi-annual" | "annual" | "one-time";
  lateFeePerDay: number;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const FeeStructureSchema = new Schema<IFeeStructure>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    name: { type: String, required: true, trim: true },
    className: { type: String, required: true },
    academicYear: { type: String, required: true },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    category: {
      type: String,
      enum: [
        "tuition",
        "exam",
        "lab",
        "library",
        "transport",
        "hostel",
        "other",
      ],
      default: "tuition",
    },
    description: { type: String, default: "" },
    isRecurring: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ["monthly", "quarterly", "semi-annual", "annual", "one-time"],
      default: "one-time",
    },
    lateFeePerDay: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true },
);

FeeStructureSchema.index({ school: 1, className: 1, academicYear: 1 });

export interface IFeePayment extends Document {
  school: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  studentName: string;
  className: string;
  feeStructure: mongoose.Types.ObjectId;
  feeName: string;
  amount: number;
  lateFee: number;
  discount: number;
  totalPaid: number;
  balanceDue: number;
  paymentDate: Date;
  paymentMethod:
    | "cash"
    | "upi"
    | "bank_transfer"
    | "cheque"
    | "online"
    | "other";
  transactionId: string;
  receiptNumber: string;
  status: "paid" | "partial" | "pending" | "overdue" | "refunded";
  paidBy: string;
  collectedBy: mongoose.Types.ObjectId;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeePaymentSchema = new Schema<IFeePayment>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    studentName: { type: String, required: true },
    className: { type: String, required: true },
    feeStructure: {
      type: Schema.Types.ObjectId,
      ref: "FeeStructure",
      required: true,
    },
    feeName: { type: String, required: true },
    amount: { type: Number, required: true },
    lateFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalPaid: { type: Number, required: true },
    balanceDue: { type: Number, default: 0 },
    paymentDate: { type: Date, required: true },
    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "bank_transfer", "cheque", "online", "other"],
      required: true,
    },
    transactionId: { type: String, default: "" },
    receiptNumber: { type: String, required: true },
    status: {
      type: String,
      enum: ["paid", "partial", "pending", "overdue", "refunded"],
      default: "pending",
    },
    paidBy: { type: String, default: "" },
    collectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

FeePaymentSchema.index({ school: 1, student: 1, feeStructure: 1 });
FeePaymentSchema.index({ school: 1, status: 1, paymentDate: 1 });
FeePaymentSchema.index({ receiptNumber: 1 }, { unique: true });

const FeeStructure: Model<IFeeStructure> =
  mongoose.models.FeeStructure ||
  mongoose.model<IFeeStructure>("FeeStructure", FeeStructureSchema);

const FeePayment: Model<IFeePayment> =
  mongoose.models.FeePayment ||
  mongoose.model<IFeePayment>("FeePayment", FeePaymentSchema);

export { FeeStructure, FeePayment };
export default FeeStructure;
