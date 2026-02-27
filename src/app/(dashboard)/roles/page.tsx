"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Shield,
  ShieldCheck,
  Users,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError, showConfirm } from "@/lib/alerts";
import { usePermissions } from "@/hooks/use-permissions";
import { Spinner } from "@/components/ui/spinner";

interface Permission {
  id: string;
  label: string;
  module: string;
}

interface Role {
  _id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
  createdAt: string;
}

const PERMISSION_MODULES: Record<string, Permission[]> = {
  Students: [
    { id: "students:read", label: "View Students", module: "Students" },
    { id: "students:write", label: "Add/Edit Students", module: "Students" },
    {
      id: "students:delete",
      label: "Delete Students",
      module: "Students",
    },
  ],
  Teachers: [
    { id: "teachers:read", label: "View Teachers", module: "Teachers" },
    { id: "teachers:write", label: "Add/Edit Teachers", module: "Teachers" },
    {
      id: "teachers:delete",
      label: "Delete Teachers",
      module: "Teachers",
    },
  ],
  Attendance: [
    {
      id: "attendance:read",
      label: "View Attendance",
      module: "Attendance",
    },
    {
      id: "attendance:write",
      label: "Mark Attendance",
      module: "Attendance",
    },
  ],
  Exams: [
    { id: "exams:read", label: "View Exams/Grades", module: "Exams" },
    { id: "exams:write", label: "Create/Edit Exams", module: "Exams" },
    { id: "exams:delete", label: "Delete Exams", module: "Exams" },
  ],
  Fees: [
    { id: "fees:read", label: "View Fees", module: "Fees" },
    { id: "fees:write", label: "Manage Fees", module: "Fees" },
  ],
  Settings: [
    { id: "settings:read", label: "View Settings", module: "Settings" },
    { id: "settings:write", label: "Change Settings", module: "Settings" },
  ],
  Reports: [
    { id: "reports:read", label: "View Reports", module: "Reports" },
    { id: "reports:export", label: "Export Reports", module: "Reports" },
  ],
  "User Management": [
    { id: "users:read", label: "View Users", module: "User Management" },
    {
      id: "users:write",
      label: "Add/Edit Users",
      module: "User Management",
    },
    {
      id: "users:delete",
      label: "Delete Users",
      module: "User Management",
    },
  ],
};

export default function RolesPage() {
  const { canAdd, canEdit, canDelete } = usePermissions("user_management");
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  });

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/roles");
      if (res.ok) {
        const data = await res.json();
        setRoles(data.data || []);
      }
    } catch {
      showError("Error", "Failed to fetch roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const openCreate = () => {
    setEditId(null);
    setForm({ name: "", description: "", permissions: [] });
    setShowDialog(true);
  };

  const openEdit = (role: Role) => {
    setEditId(role._id);
    setForm({
      name: role.name,
      description: role.description || "",
      permissions: [...role.permissions],
    });
    setShowDialog(true);
  };

  const togglePermission = (permId: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter((p) => p !== permId)
        : [...prev.permissions, permId],
    }));
  };

  const toggleModule = (moduleName: string) => {
    const modulePerms = PERMISSION_MODULES[moduleName].map((p) => p.id);
    const allSelected = modulePerms.every((p) => form.permissions.includes(p));
    if (allSelected) {
      setForm((prev) => ({
        ...prev,
        permissions: prev.permissions.filter((p) => !modulePerms.includes(p)),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...modulePerms])],
      }));
    }
  };

  const save = async () => {
    if (!form.name) {
      showError("Validation", "Role name is required");
      return;
    }
    try {
      setSubmitting(true);
      const method = editId ? "PUT" : "POST";
      const url = "/api/roles";
      const payload = editId ? { id: editId, ...form } : form;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showSuccess("Success", `Role ${editId ? "updated" : "created"}`);
        setShowDialog(false);
        fetchRoles();
      } else {
        const err = await res.json();
        showError("Error", err.error);
      }
    } catch {
      showError("Error", "Failed to save role");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRole = async (id: string) => {
    const confirmed = await showConfirm(
      "Delete Role",
      "This will remove this role. Users with this role will need to be reassigned. Continue?",
    );
    if (!confirmed) return;
    try {
      const res = await fetch("/api/roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        showSuccess("Deleted", "Role deleted");
        fetchRoles();
      } else {
        const err = await res.json();
        showError("Error", err.error);
      }
    } catch {
      showError("Error", "Failed to delete role");
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Role Management
          </h1>
          <p className="text-muted-foreground dark:text-muted-foreground">
            Create custom roles with specific permissions
          </p>
        </div>
        {canAdd && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Role
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{roles.length}</p>
              <p className="text-xs text-muted-foreground">Total Roles</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Lock className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-2xl font-bold">
                {roles.filter((r) => r.isSystem).length}
              </p>
              <p className="text-xs text-muted-foreground">System Roles</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">
                {roles.reduce((sum, r) => sum + (r.userCount || 0), 0)}
              </p>
              <p className="text-xs text-muted-foreground">Users Assigned</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Roles Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-10"
                  >
                    <Shield className="mx-auto h-10 w-10 mb-2 text-slate-300 dark:text-muted-foreground" />
                    No roles found
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => (
                  <TableRow key={role._id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {role.isSystem ? (
                          <ShieldCheck className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Shield className="h-4 w-4 text-muted-foreground" />
                        )}
                        {role.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {role.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {role.permissions?.length || 0} permissions
                      </Badge>
                    </TableCell>
                    <TableCell>{role.userCount || 0}</TableCell>
                    <TableCell>
                      <Badge variant={role.isSystem ? "default" : "outline"}>
                        {role.isSystem ? "System" : "Custom"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Edit"
                            onClick={() => openEdit(role)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && !role.isSystem && (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Delete"
                            onClick={() => deleteRole(role._id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit" : "Create"} Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Role Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Class Teacher, Accountant"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Brief description of this role"
              />
            </div>

            <div>
              <Label className="mb-3 block">Permissions</Label>
              <div className="space-y-4">
                {Object.entries(PERMISSION_MODULES).map(
                  ([moduleName, perms]) => {
                    const allSelected = perms.every((p) =>
                      form.permissions.includes(p.id),
                    );
                    const someSelected = perms.some((p) =>
                      form.permissions.includes(p.id),
                    );
                    return (
                      <div
                        key={moduleName}
                        className="border rounded-lg p-3 dark:border-border"
                      >
                        <label className="flex items-center gap-2 cursor-pointer mb-2">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(el) => {
                              if (el)
                                el.indeterminate = someSelected && !allSelected;
                            }}
                            onChange={() => toggleModule(moduleName)}
                            className="rounded"
                          />
                          <span className="font-medium text-sm">
                            {moduleName}
                          </span>
                        </label>
                        <div className="grid grid-cols-2 gap-2 pl-6">
                          {perms.map((perm) => (
                            <label
                              key={perm.id}
                              className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground"
                            >
                              <input
                                type="checkbox"
                                checked={form.permissions.includes(perm.id)}
                                onChange={() => togglePermission(perm.id)}
                                className="rounded"
                              />
                              {perm.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                {form.permissions.length} permission(s) selected
              </p>
              <Button
                onClick={save}
                disabled={submitting}
                className="min-w-[120px]"
              >
                {submitting
                  ? "Saving..."
                  : editId
                    ? "Update Role"
                    : "Create Role"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
