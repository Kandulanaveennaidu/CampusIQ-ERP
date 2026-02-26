"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface FeeStructure {
  _id: string;
  name: string;
  className: string;
  academicYear: string;
  amount: number;
  dueDate: string;
  category: string;
  lateFeePerDay: number;
  status: string;
}

interface FeePayment {
  _id: string;
  studentName: string;
  feeStructureName: string;
  amount: number;
  lateFee: number;
  discount: number;
  totalPaid: number;
  balanceDue: number;
  paymentMethod: string;
  receiptNumber: string;
  status: string;
  paidAt: string;
}

export default function FeesPage() {
  useSession();

  const { canAdd } = usePermissions("fees");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"structures" | "payments" | "summary">(
    "structures",
  );
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [summary, setSummary] = useState({
    total_expected: 0,
    total_collected: 0,
    total_pending: 0,
    total_overdue: 0,
  });
  const [showStructureDialog, setShowStructureDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [structureForm, setStructureForm] = useState({
    name: "",
    class_name: "",
    academic_year: "2024-25",
    amount: 0,
    due_date: "",
    category: "tuition",
    late_fee_per_day: 0,
  });
  const [paymentForm, setPaymentForm] = useState({
    student_id: "",
    fee_structure_id: "",
    amount: 0,
    payment_method: "cash",
    discount: 0,
  });
  const [students, setStudents] = useState<
    Array<{ _id: string; name: string; class_name: string }>
  >([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [sRes, pRes, smRes] = await Promise.all([
        fetch("/api/fees?type=structures"),
        fetch("/api/fees?type=payments"),
        fetch("/api/fees?type=summary"),
      ]);

      if (sRes.ok) {
        const d = await sRes.json();
        setStructures(d.data || []);
      }
      if (pRes.ok) {
        const d = await pRes.json();
        setPayments(d.data || []);
      }
      if (smRes.ok) {
        const d = await smRes.json();
        setSummary(
          d.data || {
            total_expected: 0,
            total_collected: 0,
            total_pending: 0,
            total_overdue: 0,
          },
        );
      }
    } catch {
      showError("Error", "Failed to fetch fee data");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch("/api/students");
      if (res.ok) {
        const d = await res.json();
        setStudents(d.data || []);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchStudents();
  }, [fetchData, fetchStudents]);

  const createStructure = async () => {
    try {
      setSubmitting(true);
      const res = await fetch("/api/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_structure", ...structureForm }),
      });

      if (res.ok) {
        showSuccess("Success", "Fee structure created");
        setShowStructureDialog(false);
        setStructureForm({
          name: "",
          class_name: "",
          academic_year: "2024-25",
          amount: 0,
          due_date: "",
          category: "tuition",
          late_fee_per_day: 0,
        });
        fetchData();
      } else {
        const err = await res.json();
        showError("Error", err.error);
      }
    } catch {
      showError("Error", "Failed to create fee structure");
    } finally {
      setSubmitting(false);
    }
  };

  const recordPayment = async () => {
    try {
      setSubmitting(true);
      const res = await fetch("/api/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "record_payment", ...paymentForm }),
      });

      if (res.ok) {
        const data = await res.json();
        showSuccess(
          "Success",
          `Payment recorded. Receipt: ${data.data?.receiptNumber || "—"}`,
        );
        setShowPaymentDialog(false);
        setPaymentForm({
          student_id: "",
          fee_structure_id: "",
          amount: 0,
          payment_method: "cash",
          discount: 0,
        });
        fetchData();
      } else {
        const err = await res.json();
        showError("Error", err.error);
      }
    } catch {
      showError("Error", "Failed to record payment");
    } finally {
      setSubmitting(false);
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fee Management</h1>
          <p className="text-slate-500">Manage fee structures and payments</p>
        </div>
        <div className="flex gap-2">
          {canAdd && (
            <Button onClick={() => setShowStructureDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Structure
            </Button>
          )}
          {canAdd && (
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(true)}
            >
              <Receipt className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          {
            label: "Total Expected",
            value: summary.total_expected,
            color: "text-blue-600",
          },
          {
            label: "Collected",
            value: summary.total_collected,
            color: "text-green-600",
          },
          {
            label: "Pending",
            value: summary.total_pending,
            color: "text-amber-600",
          },
          {
            label: "Overdue",
            value: summary.total_overdue,
            color: "text-red-600",
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>
                ₹{(s.value || 0).toLocaleString("en-IN")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(["structures", "payments"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {t === "structures" ? "Fee Structures" : "Payments"}
          </button>
        ))}
      </div>

      {/* Fee Structures */}
      {tab === "structures" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Late Fee/Day</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {structures.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-slate-500"
                    >
                      No fee structures
                    </TableCell>
                  </TableRow>
                ) : (
                  structures.map((s) => (
                    <TableRow key={s._id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.className}</TableCell>
                      <TableCell>{s.academicYear}</TableCell>
                      <TableCell>
                        ₹{(s.amount ?? 0).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        {s.dueDate
                          ? new Date(s.dueDate).toLocaleDateString()
                          : "Not set"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{s.category}</Badge>
                      </TableCell>
                      <TableCell>
                        ₹{(s.lateFeePerDay ?? 0).toLocaleString("en-IN")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Payments */}
      {tab === "payments" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Late Fee</TableHead>
                  <TableHead>Total Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center text-slate-500"
                    >
                      No payments
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((p) => (
                    <TableRow key={p._id}>
                      <TableCell className="font-medium">
                        {p.studentName}
                      </TableCell>
                      <TableCell>{p.feeStructureName}</TableCell>
                      <TableCell>
                        ₹{(p.amount ?? 0).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-red-600">
                        ₹{(p.lateFee ?? 0).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-green-600">
                        ₹{(p.totalPaid ?? 0).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        ₹{(p.balanceDue ?? 0).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>{p.paymentMethod}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.receiptNumber}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            p.status === "paid"
                              ? "present"
                              : p.status === "partial"
                                ? "late"
                                : "absent"
                          }
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add Structure Dialog */}
      <Dialog open={showStructureDialog} onOpenChange={setShowStructureDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Fee Structure</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label>Name</Label>
              <Input
                value={structureForm.name}
                onChange={(e) =>
                  setStructureForm({ ...structureForm, name: e.target.value })
                }
                placeholder="Tuition Fee Q1"
              />
            </div>
            <div>
              <Label>Class</Label>
              <Input
                value={structureForm.class_name}
                onChange={(e) =>
                  setStructureForm({
                    ...structureForm,
                    class_name: e.target.value,
                  })
                }
                placeholder="Class 10"
              />
            </div>
            <div>
              <Label>Academic Year</Label>
              <Input
                value={structureForm.academic_year}
                onChange={(e) =>
                  setStructureForm({
                    ...structureForm,
                    academic_year: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                value={structureForm.amount}
                onChange={(e) =>
                  setStructureForm({
                    ...structureForm,
                    amount: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={structureForm.due_date}
                onChange={(e) =>
                  setStructureForm({
                    ...structureForm,
                    due_date: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={structureForm.category}
                onValueChange={(v) =>
                  setStructureForm({ ...structureForm, category: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "tuition",
                    "transport",
                    "hostel",
                    "library",
                    "lab",
                    "exam",
                    "other",
                  ].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Late Fee Per Day (₹)</Label>
              <Input
                type="number"
                value={structureForm.late_fee_per_day}
                onChange={(e) =>
                  setStructureForm({
                    ...structureForm,
                    late_fee_per_day: Number(e.target.value),
                  })
                }
              />
            </div>
            <Button
              onClick={createStructure}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? "Creating..." : "Create Structure"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label>Student</Label>
              <Select
                value={paymentForm.student_id || undefined}
                onValueChange={(v) =>
                  setPaymentForm({ ...paymentForm, student_id: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name} - {s.class_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fee Structure</Label>
              <Select
                value={paymentForm.fee_structure_id || undefined}
                onValueChange={(v) =>
                  setPaymentForm({ ...paymentForm, fee_structure_id: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fee" />
                </SelectTrigger>
                <SelectContent>
                  {structures.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name} - ₹{s.amount}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    amount: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label>Discount (₹)</Label>
              <Input
                type="number"
                value={paymentForm.discount}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    discount: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select
                value={paymentForm.payment_method}
                onValueChange={(v) =>
                  setPaymentForm({ ...paymentForm, payment_method: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "cash",
                    "online",
                    "cheque",
                    "upi",
                    "card",
                    "bank_transfer",
                  ].map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={recordPayment}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
