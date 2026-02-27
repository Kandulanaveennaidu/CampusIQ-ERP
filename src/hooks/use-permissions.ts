"use client";

import { useSession } from "next-auth/react";
import { useMemo } from "react";
import type { MenuPermissionData } from "@/lib/auth";

export interface Permissions {
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  loading: boolean;
}

// Full access (admin)
const FULL: Permissions = {
  canView: true,
  canAdd: true,
  canEdit: true,
  canDelete: true,
  loading: false,
};

// No access
const NONE: Permissions = {
  canView: false,
  canAdd: false,
  canEdit: false,
  canDelete: false,
  loading: false,
};

/**
 * Role-based default permissions when no custom role is assigned.
 *
 * - admin   → full access (view, add, edit, delete)
 * - teacher → view, add, edit (no delete — admin must grant via custom role)
 * - student → view only
 * - parent  → view only
 */
const ROLE_DEFAULTS: Record<string, Permissions> = {
  admin: FULL,
  teacher: {
    canView: true,
    canAdd: true,
    canEdit: true,
    canDelete: false,
    loading: false,
  },
  student: {
    canView: true,
    canAdd: false,
    canEdit: false,
    canDelete: false,
    loading: false,
  },
  parent: {
    canView: true,
    canAdd: false,
    canEdit: false,
    canDelete: false,
    loading: false,
  },
};

/**
 * Hook that returns granular permissions (view/add/edit/delete) for a given module.
 *
 * Priority:
 * 1. Admin role → always full access.
 * 2. User with a custom role → permissions come from the role's menuPermissions matrix.
 * 3. Built-in roles (teacher/student/parent) without custom role → role-based defaults.
 *    - teacher: view + add + edit (no delete)
 *    - student/parent: view only
 *
 * Principle: NO permission = NO button. Deny by default.
 */
export function usePermissions(module: string): Permissions {
  const { data: session, status } = useSession();

  return useMemo(() => {
    // While session is loading, deny everything but flag as loading
    if (status === "loading") {
      return { ...NONE, loading: true };
    }

    // No session = no access
    if (!session?.user) return NONE;

    const role = session.user.role;

    // Admin always gets full access — no restrictions
    if (role === "admin") return FULL;

    const customRole = session.user.customRole;
    const menuPermissions =
      (session.user.menuPermissions as MenuPermissionData[]) || [];

    // User has a custom role with permissions → use the permission matrix
    if (customRole && menuPermissions.length > 0) {
      const perm = menuPermissions.find((p) => p.menu === module);

      // Module not in permission list = no access to that module
      if (!perm) return { ...NONE, canView: true };

      return {
        canView: perm.view,
        canAdd: perm.add,
        canEdit: perm.edit,
        canDelete: perm.delete,
        loading: false,
      };
    }

    // Built-in role without custom role → use role-based defaults
    return ROLE_DEFAULTS[role] || NONE;
  }, [session, status, module]);
}