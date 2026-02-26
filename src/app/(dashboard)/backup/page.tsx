"use client";

import { useEffect, useState, useCallback } from "react";
import { HardDrive, CheckCircle, XCircle, Clock } from "lucide-react";
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
import { showSuccess, showError } from "@/lib/alerts";
import { Spinner } from "@/components/ui/spinner";
import { usePermissions } from "@/hooks/use-permissions";

interface Backup {
  _id: string;
  name: string;
  type: string;
  size: number;
  collections: string[];
  status: string;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

export default function BackupPage() {
  const { canAdd } = usePermissions("backup");
  const [loading, setLoading] = useState(true);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [backupName, setBackupName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/backup");
      if (res.ok) {
        const d = await res.json();
        setBackups(d.data || []);
      }
    } catch {
      showError("Error", "Failed to fetch backups");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createBackup = async () => {
    try {
      setCreating(true);
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: backupName || undefined,
        }),
      });

      if (res.ok) {
        const d = await res.json();
        showSuccess("Success", d.message || "Backup created");
        setShowDialog(false);
        setBackupName("");
        fetchData();
      } else {
        const err = await res.json();
        showError("Error", err.error);
      }
    } catch {
      showError("Error", "Failed to create backup");
    } finally {
      setCreating(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Backup</h1>
          <p className="text-slate-500">Create and manage data backups</p>
        </div>
        {canAdd && (
          <Button onClick={() => setShowDialog(true)}>
            <HardDrive className="mr-2 h-4 w-4" />
            Create Backup
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Backups</p>
            <p className="text-2xl font-bold text-blue-600">{backups.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Successful</p>
            <p className="text-2xl font-bold text-green-600">
              {backups.filter((b) => b.status === "completed").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Last Backup</p>
            <p className="text-sm font-medium text-slate-700">
              {backups.length > 0
                ? new Date(backups[0].createdAt).toLocaleString()
                : "Never"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Backups Table */}
      <Card>
        <CardHeader>
          <CardTitle>Backup History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Collections</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500">
                    No backups yet
                  </TableCell>
                </TableRow>
              ) : (
                backups.map((b) => (
                  <TableRow key={b._id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{b.type}</Badge>
                    </TableCell>
                    <TableCell>
                      {b.collections?.length || 0} collections
                    </TableCell>
                    <TableCell>{formatSize(b.size)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          b.status === "completed"
                            ? "present"
                            : b.status === "failed"
                              ? "absent"
                              : "late"
                        }
                      >
                        <span className="flex items-center gap-1">
                          {b.status === "completed" && (
                            <CheckCircle className="h-3 w-3" />
                          )}
                          {b.status === "failed" && (
                            <XCircle className="h-3 w-3" />
                          )}
                          {b.status === "in-progress" && (
                            <Clock className="h-3 w-3" />
                          )}
                          {b.status}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {b.createdAt
                        ? new Date(b.createdAt).toLocaleString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Backup</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label>Backup Name (optional)</Label>
              <Input
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                placeholder="e.g., Monthly Backup - Jan 2024"
              />
            </div>
            <p className="text-sm text-slate-500">
              This will backup all institution data including students,
              teachers, attendance, fees, exams, and settings.
            </p>
            <Button
              onClick={createBackup}
              disabled={creating}
              className="w-full"
            >
              {creating ? "Creating Backup..." : "Start Backup"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
