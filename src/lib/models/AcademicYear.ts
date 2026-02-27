import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAcademicYear extends Document {
  school: mongoose.Types.ObjectId;
  name: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  status: "active" | "completed" | "upcoming";
  terms: Array<{
    name: string;
    startDate: Date;
    endDate: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const AcademicYearSchema = new Schema<IAcademicYear>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    name: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isCurrent: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "completed", "upcoming"],
      default: "upcoming",
    },
    terms: [
      {
        name: { type: String, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
      },
    ],
  },
  { timestamps: true },
);

AcademicYearSchema.index({ school: 1, isCurrent: 1 });
AcademicYearSchema.index({ school: 1, name: 1 }, { unique: true });

const AcademicYear: Model<IAcademicYear> =
  mongoose.models.AcademicYear ||
  mongoose.model<IAcademicYear>("AcademicYear", AcademicYearSchema);

export default AcademicYear;
