import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISemester extends Document {
  school: mongoose.Types.ObjectId;
  name: string;
  year: number;
  term: number; // 1, 2, etc.
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  status: "active" | "inactive" | "completed";
  createdAt: Date;
  updatedAt: Date;
}

const SemesterSchema = new Schema<ISemester>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    name: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    term: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isCurrent: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "inactive", "completed"],
      default: "active",
    },
  },
  { timestamps: true },
);

SemesterSchema.index({ school: 1, year: 1, term: 1 }, { unique: true });
SemesterSchema.index({ school: 1, isCurrent: 1 });

const Semester: Model<ISemester> =
  mongoose.models.Semester ||
  mongoose.model<ISemester>("Semester", SemesterSchema);

export default Semester;
