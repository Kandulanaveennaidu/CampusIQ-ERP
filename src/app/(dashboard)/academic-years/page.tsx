"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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

interface AcademicYear {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: string;
  terms: Array<{ name: string; startDate: string; endDate: string }>;
}

export default function AcademicYearsPage() {
  const { canAdd } = usePermissions("academic_management");
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
    is_current: false,
    terms: [{ name: "Term 1", start_date: "", end_date: "" }],
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/academic-years");
      if (res.ok) {
        const d = await res.json();
        setYears(d.data || []);
      }
    } catch {
      showError("Error", "Failed to fetch academic years");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const create = async () => {
    try {
      setSubmitting(true);
      const res = await fetch("/api/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        showSuccess("Success", "Academic year created");
        setShowDialog(false);
        setForm({
          name: "",
          start_date: "",
          end_date: "",
          is_current: false,
          terms: [{ name: "Term 1", start_date: "", end_date: "" }],
        });
        fetchData();
      } else {
        const err = await res.json();
        showError("Error", err.error);
      }
    } catch {
      showError("Error");
    } finally {
      setSubmitting(false);
    }
  };

  const addTerm = () => {
    setForm({
      ...form,
      terms: [
        ...form.terms,
        { name: `Term ${form.terms.length + 1}`, start_date: "", end_date: "" },
      ],
    });
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
          <h1 className="text-2xl font-bold text-foreground">Academic Years</h1>
          <p className="text-slate-500">Manage academic years and terms</p>
        </div>
        {canAdd && (
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Academic Year
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {years.map((y) => (
          <Card
            key={y._id}
            className={y.isCurrent ? "border-blue-500 border-2" : ""}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{y.name}</CardTitle>
                <div className="flex gap-1">
                  {y.isCurrent && <Badge variant="present">Current</Badge>}
                  <Badge
                    variant={
                      y.status === "active"
                        ? "present"
                        : y.status === "upcoming"
                          ? "late"
                          : "secondary"
                    }
                  >
                    {y.status}
                  </Badge>
                </div>
              </div>
              <CardDescription>
                {y.startDate ? new Date(y.startDate).toLocaleDateString() : "—"}{" "}
                — {y.endDate ? new Date(y.endDate).toLocaleDateString() : "—"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <h4 className="text-sm font-medium mb-2">Terms</h4>
              <div className="space-y-2">
                {y.terms?.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded border p-2 text-sm"
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className="text-slate-500">
                      {t.startDate
                        ? new Date(t.startDate).toLocaleDateString()
                        : "—"}{" "}
                      —{" "}
                      {t.endDate
                        ? new Date(t.endDate).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                ))}
                {(!y.terms || y.terms.length === 0) && (
                  <p className="text-sm text-slate-400">No terms defined</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {years.length === 0 && (
          <p className="col-span-3 text-center text-slate-500 py-8">
            No academic years defined
          </p>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Academic Year</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="2024-25"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) =>
                    setForm({ ...form, start_date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) =>
                    setForm({ ...form, end_date: e.target.value })
                  }
                />
              </div>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_current}
                onChange={(e) =>
                  setForm({ ...form, is_current: e.target.checked })
                }
                className="rounded"
              />
              <span className="text-sm">Set as current</span>
            </label>

            <div>
              <Label>Terms</Label>
              <div className="space-y-2 mt-1">
                {form.terms.map((t, i) => (
                  <div key={i} className="grid grid-cols-3 gap-1">
                    <Input
                      value={t.name}
                      onChange={(e) => {
                        const terms = [...form.terms];
                        terms[i].name = e.target.value;
                        setForm({ ...form, terms });
                      }}
                      placeholder="Term name"
                    />
                    <Input
                      type="date"
                      value={t.start_date}
                      onChange={(e) => {
                        const terms = [...form.terms];
                        terms[i].start_date = e.target.value;
                        setForm({ ...form, terms });
                      }}
                    />
                    <Input
                      type="date"
                      value={t.end_date}
                      onChange={(e) => {
                        const terms = [...form.terms];
                        terms[i].end_date = e.target.value;
                        setForm({ ...form, terms });
                      }}
                    />
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addTerm}
                className="mt-2"
              >
                + Add Term
              </Button>
            </div>

            <Button onClick={create} disabled={submitting} className="w-full">
              {submitting ? "Creating..." : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
