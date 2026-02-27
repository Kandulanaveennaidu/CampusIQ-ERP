"use client";

import { useState, useEffect, useCallback } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { showError } from "@/lib/alerts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Filter,
} from "lucide-react";

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  userId: string;
  userName: string;
  userRole: string;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ACTION_TYPES = [
  { value: "all", label: "All Actions" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "export", label: "Export" },
  { value: "import", label: "Import" },
];

const ACTION_COLORS: Record<string, string> = {
  create:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  delete: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  login:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  logout: "bg-muted text-foreground dark:bg-background/30 dark:text-muted-foreground",
  export:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  import: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
};

export default function AuditLogsPage() {
  const permissions = usePermissions("settings");

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchLogs = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", "20");
        if (actionFilter && actionFilter !== "all")
          params.set("action", actionFilter);
        if (entityFilter.trim()) params.set("entity", entityFilter.trim());
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);

        const res = await fetch(`/api/audit-logs?${params.toString()}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to fetch audit logs");
        }

        const data = await res.json();
        setLogs(data.data);
        setPagination(data.pagination);
      } catch (err) {
        showError(
          "Error",
          err instanceof Error ? err.message : "Failed to fetch audit logs",
        );
      } finally {
        setLoading(false);
      }
    },
    [actionFilter, entityFilter, dateFrom, dateTo],
  );

  useEffect(() => {
    if (permissions.canView) {
      fetchLogs(1);
    }
  }, [permissions.canView, fetchLogs]);

  const handleSearch = () => {
    fetchLogs(1);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderChanges = (
    changes: Record<string, { old: unknown; new: unknown }> | null,
  ) => {
    if (!changes || Object.keys(changes).length === 0) return "—";
    return (
      <div className="max-w-xs space-y-1">
        {Object.entries(changes)
          .slice(0, 3)
          .map(([field, val]) => (
            <div key={field} className="text-xs">
              <span className="font-medium text-foreground">{field}:</span>{" "}
              <span className="text-red-500 line-through dark:text-red-400">
                {String(val.old ?? "—")}
              </span>{" "}
              →{" "}
              <span className="text-green-600 dark:text-green-400">
                {String(val.new ?? "—")}
              </span>
            </div>
          ))}
        {Object.keys(changes).length > 3 && (
          <span className="text-xs text-muted-foreground">
            +{Object.keys(changes).length - 3} more
          </span>
        )}
      </div>
    );
  };

  if (!permissions.canView) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">
          You do not have permission to view audit logs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
            <p className="text-muted-foreground">
              Track all system activities and changes
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter audit logs by action, entity, or date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Entity (e.g. student, teacher)"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
            />

            <Input
              type="date"
              placeholder="From"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />

            <Input
              type="date"
              placeholder="To"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />

            <Button onClick={handleSearch} className="w-full">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>{pagination.total} total entries</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Spinner />
              <span className="ml-2 text-muted-foreground">
                Loading audit logs...
              </span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-muted-foreground">No audit logs found.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Changes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(log.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {log.userName || "System"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {log.userRole}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              ACTION_COLORS[log.action] ||
                              "bg-muted text-foreground dark:bg-card dark:text-foreground"
                            }
                          >
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium capitalize text-foreground">
                              {log.entity}
                            </p>
                            {log.entityId && log.entityId !== "bulk" && (
                              <p className="max-w-[120px] truncate text-xs text-muted-foreground">
                                {log.entityId}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{renderChanges(log.changes)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages} (
                    {pagination.total} entries)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => fetchLogs(pagination.page - 1)}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => fetchLogs(pagination.page + 1)}
                    >
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
