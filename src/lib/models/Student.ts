import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Student — Academic record for a student.
 *
 * Relationship to User model:
 * ─────────────────────────────
 * A Student document holds academic data (class, roll number, attendance, fees).
 * An optional `user` field links to a User document (role="student") that holds
 * the authentication account (email/password login).
 *
 * Not every Student needs a User account (e.g. younger students without login
 * access), and the `parent_user` field links to the parent's User account.
 *
 * ┌──────────┐   user (optional)   ┌──────────┐
 * │ Student  │ ──────────────────── │  User    │
 * │ (academic│                      │(auth +   │
 * │  record) │                      │ login)   │
 * └──────────┘                      └──────────┘
 *       │                                 │
 *       │ parent_user (optional)          │
 *       └────────────────────────── User (role="parent")
 */
export interface IStudent extends Document {
  school: mongoose.Types.ObjectId;
  /** Optional link to User model (role="student") for login access. */
  user: mongoose.Types.ObjectId | null;
  class_name: string;
  roll_number: string;
  name: string;
  photo: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  parent_user: mongoose.Types.ObjectId | null;
  email: string;
  address: string;
  admission_date: string;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", default: null },
    class_name: { type: String, required: true },
    roll_number: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    photo: { type: String, default: "" },
    parent_name: { type: String, default: "" },
    parent_phone: { type: String, default: "" },
    parent_email: { type: String, default: "" },
    parent_user: { type: Schema.Types.ObjectId, ref: "User", default: null },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    admission_date: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true },
);

StudentSchema.index({ school: 1, class_name: 1, status: 1 });
StudentSchema.index({ school: 1, roll_number: 1, class_name: 1 });
StudentSchema.index({ school: 1, user: 1 }, { sparse: true });

const Student: Model<IStudent> =
  mongoose.models.Student || mongoose.model<IStudent>("Student", StudentSchema);

export default Student;
