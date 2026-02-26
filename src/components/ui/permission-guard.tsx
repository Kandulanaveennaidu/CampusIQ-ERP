"use client";

import { usePermissions } from "@/hooks/use-permissions";
import type { ReactNode } from "react";

type PermissionType = "view" | "add" | "edit" | "delete";

interface PermissionGuardProps {
  /** Module ID from MODULES config (e.g., "students", "fees", "user_management") */
  module: string;
  /** Which permission to check: "view" | "add" | "edit" | "delete" */
  permission: PermissionType;
  /** Content to render when permission is granted */
  children: ReactNode;
  /** Optional fallback to render when permission is denied (default: null) */
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on the user's menu permissions.
 *
 * Usage:
 *   <PermissionGuard module="students" permission="add">
 *     <Button>Add Student</Button>
 *   </PermissionGuard>
 *
 *   <PermissionGuard module="fees" permission="delete" fallback={<span>No access</span>}>
 *     <Button variant="destructive">Delete</Button>
 *   </PermissionGuard>
 */
export function PermissionGuard({
  module,
  permission,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const perms = usePermissions(module);

  const allowed =
    permission === "view"
      ? perms.canView
      : permission === "add"
        ? perms.canAdd
        : permission === "edit"
          ? perms.canEdit
          : permission === "delete"
            ? perms.canDelete
            : false;

  if (!allowed) return <>{fallback}</>;

  return <>{children}</>;
}

/**
 * Hook-based alternative — returns a guard function for inline conditionals.
 *
 * Usage:
 *   const guard = usePermissionGuard("students");
 *   {guard.canAdd && <Button>Add</Button>}
 *   {guard.canDelete && <Button>Delete</Button>}
 */
export function usePermissionGuard(module: string) {
  return usePermissions(module);
}
