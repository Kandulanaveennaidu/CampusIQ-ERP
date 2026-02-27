"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { MODULES, getPlan, type PlanId, type ModuleId } from "@/lib/plans";
import {
  Users,
  UserPlus,
  Pencil,
  Trash2,
  Shield,
  ShieldCheck,
  Search,
  Lock,
  Unlock,
  KeyRound,
  UserCog,
  GraduationCap,
  User as UserIcon,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  showSuccess,
  showError,
  confirmDelete,
  confirmAlert,
  promptPassword,
} from "@/lib/alerts";
import { Spinner } from "@/components/ui/spinner";
import { usePermissions } from "@/hooks/use-permissions";

/* ═══════════════════ TYPES ═══════════════════ */

interface MenuPermission {
  menu: string;
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
}

interface RoleData {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
  isSystem: boolean;
  permissions: MenuPermission[];
  createdAt: string;
}

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  isActive: boolean;
  emailVerified?: boolean;
  lastLoginAt?: string;
  createdAt: string;
  allowedModules?: string[];
  customRole?: string;
  subject?: string;
  classes?: string[];
  salaryPerDay?: number;
  joiningDate?: string;
  className?: string;
  rollNumber?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  address?: string;
}

interface Summary {
  total: number;
  admins: number;
  teachers: number;
  students: number;
  parents: number;
  active: number;
  inactive: number;
}

interface MenuItem {
  id: string;
  label: string;
}

/* ═══════════════════ HELPER COMPONENTS ═══════════════════ */

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "Min 6 chars", met: password.length >= 6 },
    { label: "Uppercase", met: /[A-Z]/.test(password) },
    { label: "Lowercase", met: /[a-z]/.test(password) },
    { label: "Number", met: /[0-9]/.test(password) },
    { label: "Special char", met: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.met).length;
  const color =
    score <= 2
      ? "bg-red-500"
      : score <= 3
        ? "bg-yellow-500"
        : score <= 4
          ? "bg-blue-500"
          : "bg-green-500";

  if (!password) return null;
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= score ? color : "bg-muted"}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {checks.map((c) => (
          <span
            key={c.label}
            className={`flex items-center gap-1 text-xs ${c.met ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}
          >
            {c.met ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const m: Record<string, string> = {
    admin:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    teacher: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    student:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    parent:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  };
  const icons: Record<string, React.ReactNode> = {
    admin: <Shield className="h-3.5 w-3.5" />,
    teacher: <UserCog className="h-3.5 w-3.5" />,
    student: <GraduationCap className="h-3.5 w-3.5" />,
    parent: <UserIcon className="h-3.5 w-3.5" />,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${m[role] || "bg-muted text-foreground"}`}
    >
      {icons[role] || <UserIcon className="h-3.5 w-3.5" />}
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

/* ═══════════════════ MAIN PAGE ═══════════════════ */

export default function UserManagementPage() {
  const { data: session } = useSession();
  const { canAdd, canEdit, canDelete } = usePermissions("user_management");

  // Tab state
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");

  // ─── User State ───
  const [users, setUsers] = useState<UserData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // User dialog
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "teacher",
    phone: "",
    allowedModules: [] as string[],
    customRole: "",
    subject: "",
    classes: "",
    salary_per_day: "",
    class_name: "",
    roll_number: "",
    parent_name: "",
    parent_phone: "",
    address: "",
  });
  const [userMenuPerms, setUserMenuPerms] = useState<MenuPermission[]>([]);

  // ─── Role State ───
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleData | null>(null);
  const [savingRole, setSavingRole] = useState(false);
  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "",
  });
  const [rolePermissions, setRolePermissions] = useState<MenuPermission[]>([]);

  const isAdmin = session?.user?.role === "admin";
  const userPlan = (session?.user?.plan as PlanId) || "starter";
  const planConfig = useMemo(() => getPlan(userPlan), [userPlan]);

  // Redirect if not admin
  if (!isAdmin) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-16 w-16 text-muted-foreground" />
          <h2 className="mt-4 text-2xl font-bold text-foreground">
            Access Denied
          </h2>
          <p className="mt-2 text-muted-foreground">
            Only administrators can access user management.
          </p>
        </div>
      </div>
    );
  }

  /* ═══════════════════ DATA FETCHING ═══════════════════ */

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/users?${params}`);
      const json = await res.json();
      if (res.ok) {
        setUsers(json.data || []);
        setSummary(json.summary || null);
        setTotalPages(json.pagination?.pages || 1);
      } else {
        showError("Error", json.error);
      }
    } catch {
      showError("Error", "Failed to fetch users");
    } finally {
      setLoadingUsers(false);
    }
  }, [page, roleFilter, statusFilter, search]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const fetchRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const res = await fetch("/api/roles");
      const json = await res.json();
      if (res.ok) {
        setRoles(json.data || []);
        setMenuItems(json.menuItems || []);
      }
    } catch {
      // silent
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  /* ═══════════════════ USER CRUD ═══════════════════ */

  const openAddUser = () => {
    setEditingUser(null);
    setUserForm({
      name: "",
      email: "",
      password: "",
      role: "teacher",
      phone: "",
      allowedModules: [],
      customRole: "",
      subject: "",
      classes: "",
      salary_per_day: "",
      class_name: "",
      roll_number: "",
      parent_name: "",
      parent_phone: "",
      address: "",
    });
    setUserMenuPerms(
      menuItems.map((m) => ({
        menu: m.id,
        view: false,
        add: false,
        edit: false,
        delete: false,
      })),
    );
    setShowPassword(false);
    setShowUserDialog(true);
  };

  const openEditUser = (user: UserData) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      phone: user.phone || "",
      allowedModules: user.allowedModules || [],
      customRole: user.customRole || "",
      subject: user.subject || "",
      classes: (user.classes || []).join(", "),
      salary_per_day: user.salaryPerDay ? String(user.salaryPerDay) : "",
      class_name: user.className || "",
      roll_number: user.rollNumber || "",
      parent_name: user.parentName || "",
      parent_phone: user.parentPhone || "",
      address: user.address || "",
    });
    // Try to load permissions from the role
    if (user.customRole) {
      const role = roles.find((r) => r._id === user.customRole);
      if (role) {
        setUserMenuPerms(
          menuItems.map((m) => {
            const rp = role.permissions.find((p) => p.menu === m.id);
            return rp
              ? { ...rp }
              : {
                  menu: m.id,
                  view: false,
                  add: false,
                  edit: false,
                  delete: false,
                };
          }),
        );
      } else {
        setUserMenuPerms(
          menuItems.map((m) => ({
            menu: m.id,
            view: false,
            add: false,
            edit: false,
            delete: false,
          })),
        );
      }
    } else {
      setUserMenuPerms(
        menuItems.map((m) => ({
          menu: m.id,
          view: false,
          add: false,
          edit: false,
          delete: false,
        })),
      );
    }
    setShowPassword(false);
    setShowUserDialog(true);
  };

  const saveUser = async () => {
    setSavingUser(true);
    try {
      const body: Record<string, unknown> = {
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        phone: userForm.phone,
        allowedModules: userForm.allowedModules,
        customRole: userForm.customRole || null,
      };

      if (userForm.password) body.password = userForm.password;

      // Role-specific fields
      if (userForm.role === "teacher") {
        body.subject = userForm.subject;
        body.classes = userForm.classes
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean);
        body.salary_per_day = Number(userForm.salary_per_day) || 0;
      }
      if (userForm.role === "student") {
        body.class_name = userForm.class_name;
        body.roll_number = userForm.roll_number;
        body.parent_name = userForm.parent_name;
        body.parent_phone = userForm.parent_phone;
        body.address = userForm.address;
      }

      if (editingUser) {
        body.id = editingUser._id;
        const res = await fetch("/api/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        showSuccess("User updated");
      } else {
        if (!userForm.password) {
          showError("Error", "Password is required");
          setSavingUser(false);
          return;
        }
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        showSuccess("User created");
      }
      setShowUserDialog(false);
      fetchUsers();
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingUser(false);
    }
  };

  const toggleUserStatus = async (user: UserData) => {
    try {
      const res = await fetch("/api/users/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: user.isActive ? "deactivate" : "activate",
          userId: user._id,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showSuccess(user.isActive ? "User deactivated" : "User activated");
      fetchUsers();
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : "Failed");
    }
  };

  const resetPassword = async (user: UserData) => {
    const newPass = await promptPassword(
      "Enter new password for " + user.name + ":",
    );
    if (!newPass) return;
    try {
      const res = await fetch("/api/users/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_password",
          userId: user._id,
          newPassword: newPass,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showSuccess("Password reset successfully");
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : "Failed");
    }
  };

  const deleteUser = async (user: UserData) => {
    const confirmed = await confirmDelete(user.name);
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/users?id=${user._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showSuccess("User deleted");
      fetchUsers();
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : "Failed");
    }
  };

  /* ═══════════════════ ROLE CRUD ═══════════════════ */

  const openAddRole = () => {
    setEditingRole(null);
    setRoleForm({ name: "", description: "" });
    setRolePermissions(
      menuItems.map((m) => ({
        menu: m.id,
        view: false,
        add: false,
        edit: false,
        delete: false,
      })),
    );
    setShowRoleDialog(true);
  };

  const openEditRole = (role: RoleData) => {
    setEditingRole(role);
    setRoleForm({ name: role.name, description: role.description });
    setRolePermissions(
      menuItems.map((m) => {
        const rp = role.permissions.find((p) => p.menu === m.id);
        return rp
          ? {
              menu: m.id,
              view: rp.view,
              add: rp.add,
              edit: rp.edit,
              delete: rp.delete,
            }
          : { menu: m.id, view: false, add: false, edit: false, delete: false };
      }),
    );
    setShowRoleDialog(true);
  };

  const saveRole = async () => {
    setSavingRole(true);
    try {
      // Only include permissions that have at least one action enabled
      const perms = rolePermissions.filter(
        (p) => p.view || p.add || p.edit || p.delete,
      );
      const body: Record<string, unknown> = {
        name: roleForm.name,
        description: roleForm.description,
        permissions: perms,
      };

      if (editingRole) {
        body.id = editingRole._id;
        const res = await fetch("/api/roles", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        showSuccess("Role updated");
      } else {
        const res = await fetch("/api/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        showSuccess("Role created");
      }
      setShowRoleDialog(false);
      fetchRoles();
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingRole(false);
    }
  };

  const deleteRole = async (role: RoleData) => {
    if (role.isSystem) {
      showError("Error", "System roles cannot be deleted");
      return;
    }
    const confirmed = await confirmAlert(
      "Delete Role",
      `Delete role "${role.name}"? Users assigned this role will lose their custom permissions.`,
      "Delete",
      "warning",
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/roles?id=${role._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showSuccess("Role deleted");
      fetchRoles();
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : "Failed");
    }
  };

  const togglePermission = (
    perms: MenuPermission[],
    setPerms: (p: MenuPermission[]) => void,
    menuId: string,
    action: "view" | "add" | "edit" | "delete",
  ) => {
    setPerms(
      perms.map((p) =>
        p.menu === menuId
          ? {
              ...p,
              [action]: !p[action],
              // If enabling add/edit/delete, also enable view
              ...(action !== "view" && !p[action] ? { view: true } : {}),
              // If disabling view, disable all
              ...(action === "view" && p.view
                ? { add: false, edit: false, delete: false }
                : {}),
            }
          : p,
      ),
    );
  };

  const selectAllPermissions = (
    perms: MenuPermission[],
    setPerms: (p: MenuPermission[]) => void,
    action: "view" | "add" | "edit" | "delete",
  ) => {
    const allEnabled = perms.every((p) => p[action]);
    setPerms(
      perms.map((p) => ({
        ...p,
        [action]: !allEnabled,
        ...(action !== "view" && !allEnabled ? { view: true } : {}),
        ...(action === "view" && allEnabled
          ? { add: false, edit: false, delete: false }
          : {}),
      })),
    );
  };

  /* ═══════════════════ PERMISSION TABLE ═══════════════════ */

  const PermissionTable = ({
    permissions,
    setPermissions,
  }: {
    permissions: MenuPermission[];
    setPermissions: (p: MenuPermission[]) => void;
  }) => (
    <div className="rounded-lg border dark:border-slate-700">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Menu</TableHead>
            <TableHead className="text-center w-[80px]">
              <button
                type="button"
                onClick={() =>
                  selectAllPermissions(permissions, setPermissions, "view")
                }
                className="text-xs font-medium hover:text-primary"
              >
                View
              </button>
            </TableHead>
            <TableHead className="text-center w-[80px]">
              <button
                type="button"
                onClick={() =>
                  selectAllPermissions(permissions, setPermissions, "add")
                }
                className="text-xs font-medium hover:text-primary"
              >
                Add
              </button>
            </TableHead>
            <TableHead className="text-center w-[80px]">
              <button
                type="button"
                onClick={() =>
                  selectAllPermissions(permissions, setPermissions, "edit")
                }
                className="text-xs font-medium hover:text-primary"
              >
                Edit
              </button>
            </TableHead>
            <TableHead className="text-center w-[80px]">
              <button
                type="button"
                onClick={() =>
                  selectAllPermissions(permissions, setPermissions, "delete")
                }
                className="text-xs font-medium hover:text-primary"
              >
                Delete
              </button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {permissions.map((perm) => {
            const menuLabel =
              menuItems.find((m) => m.id === perm.menu)?.label || perm.menu;
            return (
              <TableRow key={perm.menu}>
                <TableCell className="font-medium text-sm">
                  {menuLabel}
                </TableCell>
                {(["view", "add", "edit", "delete"] as const).map((action) => (
                  <TableCell key={action} className="text-center">
                    <input
                      type="checkbox"
                      checked={perm[action]}
                      onChange={() =>
                        togglePermission(
                          permissions,
                          setPermissions,
                          perm.menu,
                          action,
                        )
                      }
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                    />
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  /* ═══════════════════ RENDER ═══════════════════ */

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            User & Role Management
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage users, assign roles, and configure menu permissions
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "users"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          User Management
        </button>
        <button
          onClick={() => setActiveTab("roles")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "roles"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Shield className="h-4 w-4" />
          Role Management
        </button>
      </div>

      {/* ═══════════════ USER MANAGEMENT TAB ═══════════════ */}
      {activeTab === "users" && (
        <>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
              {[
                {
                  label: "Total",
                  value: summary.total,
                  color: "text-foreground",
                },
                {
                  label: "Admins",
                  value: summary.admins,
                  color: "text-purple-600",
                },
                {
                  label: "Teachers",
                  value: summary.teachers,
                  color: "text-blue-600",
                },
                {
                  label: "Students",
                  value: summary.students,
                  color: "text-green-600",
                },
                {
                  label: "Parents",
                  value: summary.parents,
                  color: "text-orange-600",
                },
                {
                  label: "Active",
                  value: summary.active,
                  color: "text-emerald-600",
                },
                {
                  label: "Inactive",
                  value: summary.inactive,
                  color: "text-red-600",
                },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative max-w-xs flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <Select
                value={roleFilter}
                onValueChange={(v) => {
                  setRoleFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchUsers()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              {canAdd && (
                <Button size="sm" onClick={openAddUser}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add New User
                </Button>
              )}
            </div>
          </div>

          {/* Users Table */}
          <Card>
            <CardContent className="p-0">
              {loadingUsers ? (
                <div className="flex h-64 items-center justify-center">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : users.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
                  <Users className="h-12 w-12 mb-3" />
                  <p className="text-lg font-medium">No users found</p>
                  <p className="text-sm">
                    Try adjusting your search or filters
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Custom Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user, idx) => (
                      <TableRow key={user._id}>
                        <TableCell className="text-muted-foreground">
                          {(page - 1) * 20 + idx + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {user.name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.phone || "—"}
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={user.role} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {user.customRole ? (
                            roles.find((r) => r._id === user.customRole)
                              ?.name || "Custom"
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.isActive ? "default" : "secondary"}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditUser(user)}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleUserStatus(user)}
                                title={
                                  user.isActive ? "Deactivate" : "Activate"
                                }
                              >
                                {user.isActive ? (
                                  <Lock className="h-4 w-4 text-amber-500" />
                                ) : (
                                  <Unlock className="h-4 w-4 text-green-500" />
                                )}
                              </Button>
                            )}
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resetPassword(user)}
                                title="Reset Password"
                              >
                                <KeyRound className="h-4 w-4 text-blue-500" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteUser(user)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* ═══════════════ ROLE MANAGEMENT TAB ═══════════════ */}
      {activeTab === "roles" && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Create custom roles with granular menu permissions. Assign roles
              to users for fine-grained access control.
            </p>
            {canAdd && (
              <Button size="sm" onClick={openAddRole}>
                <Plus className="mr-2 h-4 w-4" />
                Add New Role
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingRoles ? (
                <div className="flex h-64 items-center justify-center">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : roles.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
                  <Shield className="h-12 w-12 mb-3" />
                  <p className="text-lg font-medium">No custom roles</p>
                  <p className="text-sm">
                    Create a role to get started with custom permissions
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Role Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((role, idx) => (
                      <TableRow key={role._id}>
                        <TableCell className="text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {role.name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {role.description || "—"}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {role.permissions?.length || 0} menus configured
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={role.isActive ? "default" : "secondary"}
                          >
                            {role.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={role.isSystem ? "outline" : "secondary"}
                          >
                            {role.isSystem ? "System" : "Custom"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditRole(role)}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && !role.isSystem && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteRole(role)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ═══════════════ ADD/EDIT USER DIALOG ═══════════════ */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingUser ? (
                <Pencil className="h-5 w-5" />
              ) : (
                <UserPlus className="h-5 w-5" />
              )}
              {editingUser ? "Edit User" : "Add New User"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-2">
            {/* Basic Info */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Full Name *</Label>
                <Input
                  value={userForm.name}
                  onChange={(e) =>
                    setUserForm({ ...userForm, name: e.target.value })
                  }
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={userForm.email}
                  onChange={(e) =>
                    setUserForm({ ...userForm, email: e.target.value })
                  }
                  placeholder="user@example.com"
                  disabled={!!editingUser}
                />
              </div>
              <div>
                <Label>
                  Password {editingUser ? "(leave blank to keep)" : "*"}
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={userForm.password}
                    onChange={(e) =>
                      setUserForm({ ...userForm, password: e.target.value })
                    }
                    placeholder={
                      editingUser
                        ? "Leave blank to keep current"
                        : "Enter password"
                    }
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <PasswordStrength password={userForm.password} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={userForm.phone}
                  onChange={(e) =>
                    setUserForm({ ...userForm, phone: e.target.value })
                  }
                  placeholder="+91 1234567890"
                />
              </div>
              <div>
                <Label>System Role *</Label>
                <Select
                  value={userForm.role}
                  onValueChange={(v) => setUserForm({ ...userForm, role: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Custom Role (Permissions)</Label>
                <Select
                  value={userForm.customRole || "none"}
                  onValueChange={(v) => {
                    const val = v === "none" ? "" : v;
                    setUserForm({ ...userForm, customRole: val });
                    // Load permissions from selected role
                    if (val) {
                      const role = roles.find((r) => r._id === val);
                      if (role) {
                        setUserMenuPerms(
                          menuItems.map((m) => {
                            const rp = role.permissions.find(
                              (p) => p.menu === m.id,
                            );
                            return rp
                              ? { ...rp }
                              : {
                                  menu: m.id,
                                  view: false,
                                  add: false,
                                  edit: false,
                                  delete: false,
                                };
                          }),
                        );
                      }
                    } else {
                      setUserMenuPerms(
                        menuItems.map((m) => ({
                          menu: m.id,
                          view: false,
                          add: false,
                          edit: false,
                          delete: false,
                        })),
                      );
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select custom role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Custom Role</SelectItem>
                    {roles
                      .filter((r) => r.isActive)
                      .map((r) => (
                        <SelectItem key={r._id} value={r._id}>
                          {r.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Role-Specific Fields */}
            {userForm.role === "teacher" && (
              <div className="rounded-lg border p-4 dark:border-slate-700">
                <h4 className="text-sm font-semibold mb-3">Teacher Details</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <Label>Subject</Label>
                    <Input
                      value={userForm.subject}
                      onChange={(e) =>
                        setUserForm({ ...userForm, subject: e.target.value })
                      }
                      placeholder="Mathematics"
                    />
                  </div>
                  <div>
                    <Label>Classes (comma-separated)</Label>
                    <Input
                      value={userForm.classes}
                      onChange={(e) =>
                        setUserForm({ ...userForm, classes: e.target.value })
                      }
                      placeholder="10A, 10B, 11A"
                    />
                  </div>
                  <div>
                    <Label>Salary Per Day (₹)</Label>
                    <Input
                      type="number"
                      value={userForm.salary_per_day}
                      onChange={(e) =>
                        setUserForm({
                          ...userForm,
                          salary_per_day: e.target.value,
                        })
                      }
                      placeholder="1500"
                    />
                  </div>
                </div>
              </div>
            )}

            {userForm.role === "student" && (
              <div className="rounded-lg border p-4 dark:border-slate-700">
                <h4 className="text-sm font-semibold mb-3">Student Details</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Class</Label>
                    <Input
                      value={userForm.class_name}
                      onChange={(e) =>
                        setUserForm({ ...userForm, class_name: e.target.value })
                      }
                      placeholder="10A"
                    />
                  </div>
                  <div>
                    <Label>Roll Number</Label>
                    <Input
                      value={userForm.roll_number}
                      onChange={(e) =>
                        setUserForm({
                          ...userForm,
                          roll_number: e.target.value,
                        })
                      }
                      placeholder="001"
                    />
                  </div>
                  <div>
                    <Label>Parent Name</Label>
                    <Input
                      value={userForm.parent_name}
                      onChange={(e) =>
                        setUserForm({
                          ...userForm,
                          parent_name: e.target.value,
                        })
                      }
                      placeholder="Parent/Guardian Name"
                    />
                  </div>
                  <div>
                    <Label>Parent Phone</Label>
                    <Input
                      value={userForm.parent_phone}
                      onChange={(e) =>
                        setUserForm({
                          ...userForm,
                          parent_phone: e.target.value,
                        })
                      }
                      placeholder="+91 9876543210"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Address</Label>
                    <Input
                      value={userForm.address}
                      onChange={(e) =>
                        setUserForm({ ...userForm, address: e.target.value })
                      }
                      placeholder="Full address"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Menu Permissions Preview */}
            {userForm.customRole && userMenuPerms.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Menu Permissions (from role)
                </h4>
                <PermissionTable
                  permissions={userMenuPerms}
                  setPermissions={setUserMenuPerms}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  These permissions are inherited from the selected custom role.
                  Changes here are preview-only — edit the role to modify
                  permissions.
                </p>
              </div>
            )}

            {/* Module Access */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Module Access ({planConfig.name} Plan)
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                Select which modules this user can access. Leave empty for full
                plan access.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {planConfig.modules.map((modId: ModuleId) => {
                  const label = MODULES[modId];
                  const checked = userForm.allowedModules.includes(modId);
                  return (
                    <label
                      key={modId}
                      className="flex items-center gap-2 rounded-lg border p-2 cursor-pointer hover:bg-accent text-sm dark:border-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setUserForm({
                            ...userForm,
                            allowedModules: checked
                              ? userForm.allowedModules.filter(
                                  (m) => m !== modId,
                                )
                              : [...userForm.allowedModules, modId],
                          });
                        }}
                        className="h-4 w-4 rounded border-border"
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t pt-4">
              <Button
                variant="outline"
                onClick={() => setShowUserDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={saveUser}
                disabled={savingUser || !userForm.name || !userForm.email}
              >
                {savingUser && <Spinner className="mr-2 h-4 w-4" />}
                {editingUser ? "Update User" : "Create User"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ ADD/EDIT ROLE DIALOG ═══════════════ */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingRole ? (
                <Pencil className="h-5 w-5" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
              {editingRole ? "Edit Role" : "Add New Role"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Role Name *</Label>
                <Input
                  value={roleForm.name}
                  onChange={(e) =>
                    setRoleForm({ ...roleForm, name: e.target.value })
                  }
                  placeholder="e.g., HOD, Coordinator, Accountant"
                  disabled={editingRole?.isSystem}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={roleForm.description}
                  onChange={(e) =>
                    setRoleForm({ ...roleForm, description: e.target.value })
                  }
                  placeholder="Brief description of this role"
                />
              </div>
            </div>

            {/* Role Permissions */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Menu Permissions
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                Configure which menus this role can access and what actions they
                can perform. Click column headers to select/deselect all.
              </p>
              <PermissionTable
                permissions={rolePermissions}
                setPermissions={setRolePermissions}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t pt-4">
              <Button
                variant="outline"
                onClick={() => setShowRoleDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={saveRole}
                disabled={savingRole || !roleForm.name}
              >
                {savingRole && <Spinner className="mr-2 h-4 w-4" />}
                {editingRole ? "Update Role" : "Create Role"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
