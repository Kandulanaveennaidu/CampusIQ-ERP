import mongoose, { Schema, Document, Model } from "mongoose";

// ── Type Definitions ──
export type UserRole = "admin" | "teacher" | "student" | "parent";
export type UserStatus = "pending" | "active" | "inactive";

/**
 * IUser — Unified user document.
 *
 * The schema stores role-specific profile fields alongside shared fields
 * in a flat structure for backward compatibility. Only fields relevant to a
 * user's role should be populated; others remain at their defaults.
 *
 * ┌─────────────────────────────────────┐
 * │ Shared         → all roles          │
 * │ Teacher Profile → role="teacher"    │
 * │ Student Profile → role="student"    │
 * │ Parent Profile  → role="parent"     │
 * │ Permissions     → admin-controlled  │
 * │ Security        → system-managed    │
 * └─────────────────────────────────────┘
 *
 * Multi-school: Currently one user = one school (email globally unique).
 * For multi-school support, introduce a UserSchoolMembership join table.
 */
export interface IUser extends Document {
  // ── Shared Fields (all roles) ──
  name: string;
  email: string;
  password: string;
  role: UserRole;
  school: mongoose.Types.ObjectId;
  phone: string;
  emailVerified: boolean;
  isActive: boolean;
  status: UserStatus;
  avatar: string;

  // ── Teacher Profile (role="teacher") ──
  subject: string;
  classes: string[];
  salaryPerDay: number;
  joiningDate: Date;

  // ── Student Profile (role="student") ──
  className: string;
  rollNumber: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  address: string;
  admissionDate: Date;

  // ── Parent Profile (role="parent") ──
  children: mongoose.Types.ObjectId[];

  // ── Permissions & Access Control ──
  /** Admin-assigned module access. Empty array = all modules in plan. */
  allowedModules: string[];
  /** Optional custom role that overrides default role permissions. */
  customRole: mongoose.Types.ObjectId | null;

  // ── Security & Account State ──
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;

  // ── Timestamps ──
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    // ── Shared Fields ──
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["admin", "teacher", "student", "parent"],
      required: true,
    },
    /**
     * One user belongs to one school. Email is globally unique.
     * Multi-school: To let a user belong to multiple schools, create a
     * UserSchoolMembership model with { userId, schoolId, role } and
     * keep this field as the "primary" school for session purposes.
     */
    school: { type: Schema.Types.ObjectId, ref: "School" },
    phone: { type: String, default: "" },
    emailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["pending", "active", "inactive"],
      default: "active",
    },
    avatar: { type: String, default: "" },

    // ── Teacher Profile ──
    subject: { type: String, default: "" },
    classes: [{ type: String }],
    salaryPerDay: { type: Number, default: 0 },
    joiningDate: { type: Date },

    // ── Student Profile ──
    className: { type: String, default: "" },
    rollNumber: { type: String, default: "" },
    parentName: { type: String, default: "" },
    parentPhone: { type: String, default: "" },
    parentEmail: { type: String, default: "" },
    address: { type: String, default: "" },
    admissionDate: { type: Date },

    // ── Parent Profile ──
    children: [{ type: Schema.Types.ObjectId, ref: "Student" }],

    // ── Permissions ──
    allowedModules: [{ type: String }],
    customRole: { type: Schema.Types.ObjectId, ref: "Role", default: null },

    // ── Security ──
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// ── Indexes ──
UserSchema.index({ school: 1, role: 1 });
UserSchema.index({ school: 1, email: 1 });
UserSchema.index({ school: 1, isActive: 1, role: 1 });
UserSchema.index({ school: 1, status: 1 });

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
