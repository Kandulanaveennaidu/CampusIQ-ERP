import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";

export type Role = "admin" | "teacher" | "student" | "parent";

export type Permission =
  | "students:read"
  | "students:write"
  | "students:delete"
  | "attendance:read"
  | "attendance:write"
  | "teachers:read"
  | "teachers:write"
  | "teachers:delete"
  | "leaves:read"
  | "leaves:write"
  | "leaves:approve"
  | "reports:read"
  | "settings:read"
  | "settings:write"
  | "notifications:read"
  | "notifications:write"
  | "visitors:read"
  | "visitors:write"
  | "rooms:read"
  | "rooms:write"
  | "rooms:manage"
  | "holidays:read"
  | "holidays:write"
  | "holidays:delete"
  | "timetable:read"
  | "timetable:write"
  | "timetable:delete"
  | "emergency:read"
  | "emergency:write"
  | "qr:read"
  | "qr:write"
  | "profile:read"
  | "profile:write"
  | "fees:read"
  | "fees:write"
  | "fees:manage"
  | "exams:read"
  | "exams:write"
  | "exams:manage"
  | "departments:read"
  | "departments:write"
  | "departments:delete"
  | "semesters:read"
  | "semesters:write"
  | "subjects:read"
  | "subjects:write"
  | "salary:read"
  | "salary:write"
  | "salary:manage"
  | "transport:read"
  | "transport:write"
  | "transport:manage"
  | "library:read"
  | "library:write"
  | "library:manage"
  | "hostel:read"
  | "hostel:write"
  | "hostel:manage"
  | "promotion:read"
  | "promotion:write"
  | "backup:read"
  | "backup:write"
  | "academic:read"
  | "academic:write"
  | "upload:write"
  | "workload:read"
  | "workload:write"
  | "users:read"
  | "users:write"
  | "users:delete";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    "students:read",
    "students:write",
    "students:delete",
    "attendance:read",
    "attendance:write",
    "teachers:read",
    "teachers:write",
    "teachers:delete",
    "leaves:read",
    "leaves:write",
    "leaves:approve",
    "reports:read",
    "settings:read",
    "settings:write",
    "notifications:read",
    "notifications:write",
    "visitors:read",
    "visitors:write",
    "rooms:read",
    "rooms:write",
    "rooms:manage",
    "holidays:read",
    "holidays:write",
    "holidays:delete",
    "timetable:read",
    "timetable:write",
    "timetable:delete",
    "emergency:read",
    "emergency:write",
    "qr:read",
    "qr:write",
    "profile:read",
    "profile:write",
    "fees:read",
    "fees:write",
    "fees:manage",
    "exams:read",
    "exams:write",
    "exams:manage",
    "departments:read",
    "departments:write",
    "departments:delete",
    "semesters:read",
    "semesters:write",
    "subjects:read",
    "subjects:write",
    "salary:read",
    "salary:write",
    "salary:manage",
    "transport:read",
    "transport:write",
    "transport:manage",
    "library:read",
    "library:write",
    "library:manage",
    "hostel:read",
    "hostel:write",
    "hostel:manage",
    "promotion:read",
    "promotion:write",
    "backup:read",
    "backup:write",
    "academic:read",
    "academic:write",
    "upload:write",
    "workload:read",
    "workload:write",
    "users:read",
    "users:write",
    "users:delete",
  ],
  teacher: [
    "students:read",
    "attendance:read",
    "attendance:write",
    "leaves:read",
    "leaves:write",
    "reports:read",
    "notifications:read",
    "visitors:read",
    "visitors:write",
    "rooms:read",
    "rooms:write",
    "holidays:read",
    "timetable:read",
    "timetable:write",
    "emergency:read",
    "qr:read",
    "qr:write",
    "profile:read",
    "profile:write",
    "fees:read",
    "exams:read",
    "exams:write",
    "departments:read",
    "semesters:read",
    "subjects:read",
    "salary:read",
    "library:read",
    "library:write",
    "academic:read",
    "upload:write",
    "workload:read",
  ],
  student: [
    "attendance:read",
    "leaves:read",
    "notifications:read",
    "notifications:write",
    "holidays:read",
    "timetable:read",
    "profile:read",
    "profile:write",
    "fees:read",
    "exams:read",
    "departments:read",
    "subjects:read",
    "library:read",
    "academic:read",
  ],
  parent: [
    "attendance:read",
    "students:read",
    "leaves:read",
    "notifications:read",
    "notifications:write",
    "holidays:read",
    "profile:read",
    "profile:write",
    "fees:read",
    "exams:read",
    "transport:read",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export async function requireAuth(...requiredPermissions: Permission[]) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
    };
  }

  const role = session.user.role as Role;

  for (const perm of requiredPermissions) {
    if (!hasPermission(role, perm)) {
      return {
        error: NextResponse.json(
          { error: "Forbidden - Insufficient permissions" },
          { status: 403 },
        ),
        session: null,
      };
    }
  }

  return { error: null, session };
}

export async function requireRole(...roles: Role[]) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
    };
  }

  if (!roles.includes(session.user.role as Role)) {
    return {
      error: NextResponse.json(
        { error: `Access denied. Required role: ${roles.join(" or ")}` },
        { status: 403 },
      ),
      session: null,
    };
  }

  return { error: null, session };
}