import mongoose, { Schema, Document, Model } from "mongoose";

// ─── Menu Permission Actions ─────────────────────────────────────────────────
// Each menu item can have these granular permissions per role.

export interface IMenuPermission {
  menu: string; // Module ID (e.g., "students", "attendance", "teachers")
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
}

export interface IRole extends Document {
  name: string;
  school: mongoose.Types.ObjectId;
  description: string;
  isActive: boolean;
  isSystem: boolean; // System roles (admin/teacher/student/parent) cannot be deleted
  permissions: IMenuPermission[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MenuPermissionSchema = new Schema<IMenuPermission>(
  {
    menu: { type: String, required: true },
    view: { type: Boolean, default: false },
    add: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
  },
  { _id: false },
);

const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, trim: true },
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    isSystem: { type: Boolean, default: false },
    permissions: [MenuPermissionSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Compound unique: role name must be unique within a school
RoleSchema.index({ school: 1, name: 1 }, { unique: true });
RoleSchema.index({ school: 1, isActive: 1 });

const Role: Model<IRole> =
  mongoose.models.Role || mongoose.model<IRole>("Role", RoleSchema);

export default Role;
