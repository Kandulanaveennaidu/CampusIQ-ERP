import { connectDB } from "@/lib/db";
import AuditLog from "@/lib/models/AuditLog";

interface AuditParams {
  action:
    | "create"
    | "update"
    | "delete"
    | "login"
    | "logout"
    | "export"
    | "import";
  entity: string;
  entityId?: string;
  schoolId: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Record an audit log entry. Fire-and-forget — never throws.
 */
export async function audit(params: AuditParams): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      school: params.schoolId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId || "",
      userId: params.userId || "",
      userName: params.userName || "",
      userRole: params.userRole || "",
      changes: params.changes,
      metadata: params.metadata,
      ipAddress: params.ipAddress || "",
      userAgent: params.userAgent || "",
    });
  } catch (error) {
    // Audit logging must never break the request — silence errors
    // Audit log error (non-blocking)
  }
}

/**
 * Build a changes diff between old and new objects.
 */
export function buildChanges(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oldObj: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newObj: Record<string, any>,
  fields: string[],
): Record<string, { old: unknown; new: unknown }> | undefined {
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  for (const field of fields) {
    const oldVal = oldObj[field];
    const newVal = newObj[field];
    if (String(oldVal) !== String(newVal) && newVal !== undefined) {
      changes[field] = { old: oldVal, new: newVal };
    }
  }
  return Object.keys(changes).length > 0 ? changes : undefined;
}

// Alias that also accepts `school` as a synonym for `schoolId`
export async function createAuditLog(
  params: Omit<AuditParams, "schoolId"> & {
    school?: string;
    schoolId?: string;
  },
): Promise<void> {
  return audit({ ...params, schoolId: params.schoolId || params.school || "" });
}
