import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPromotion extends Document {
  school: mongoose.Types.ObjectId;
  academicYear: string;
  fromClass: string;
  toClass: string;
  student: mongoose.Types.ObjectId;
  studentName: string;
  rollNumber: string;
  status: "promoted" | "retained" | "graduated" | "transferred";
  remarks: string;
  promotedBy: mongoose.Types.ObjectId;
  promotedAt: Date;
  createdAt: Date;
}

const PromotionSchema = new Schema<IPromotion>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    academicYear: { type: String, required: true },
    fromClass: { type: String, required: true },
    toClass: { type: String, required: true },
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    studentName: { type: String, required: true },
    rollNumber: { type: String, default: "" },
    status: {
      type: String,
      enum: ["promoted", "retained", "graduated", "transferred"],
      required: true,
    },
    remarks: { type: String, default: "" },
    promotedBy: { type: Schema.Types.ObjectId, ref: "User" },
    promotedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

PromotionSchema.index({ school: 1, academicYear: 1, fromClass: 1 });
PromotionSchema.index({ school: 1, student: 1 });

const Promotion: Model<IPromotion> =
  mongoose.models.Promotion ||
  mongoose.model<IPromotion>("Promotion", PromotionSchema);

export default Promotion;
