import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAuditLog extends Document {
  school: mongoose.Types.ObjectId;
  action:
    | "create"
    | "update"
    | "delete"
    | "login"
    | "logout"
    | "export"
    | "import";
  entity: string; // e.g., "student", "teacher", "attendance"
  entityId: string;
  userId: string;
  userName: string;
  userRole: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    action: {
      type: String,
      enum: [
        "create",
        "update",
        "delete",
        "login",
        "logout",
        "export",
        "import",
      ],
      required: true,
    },
    entity: { type: String, required: true },
    entityId: { type: String, default: "" },
    userId: { type: String, required: true },
    userName: { type: String, default: "" },
    userRole: { type: String, default: "" },
    changes: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true },
);

AuditLogSchema.index({ school: 1, createdAt: -1 });
AuditLogSchema.index({ entity: 1, entityId: 1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });

// TTL index: auto-delete audit logs after 365 days
AuditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 },
);

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;
