import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDepartment extends Document {
  school: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description: string;
  hodId: mongoose.Types.ObjectId | null;
  hodName: string;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    description: { type: String, default: "" },
    hodId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    hodName: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true },
);

DepartmentSchema.index({ school: 1, code: 1 }, { unique: true });
DepartmentSchema.index({ school: 1, status: 1 });

const Department: Model<IDepartment> =
  mongoose.models.Department ||
  mongoose.model<IDepartment>("Department", DepartmentSchema);

export default Department;
