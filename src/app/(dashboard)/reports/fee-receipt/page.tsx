"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Receipt, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { showError, showWarning } from "@/lib/alerts";
import { usePermissions } from "@/hooks/use-permissions";

interface Student {
  _id: string;
  name: string;
  roll_number: string;
  class_name: string;
}

interface FeePayment {
  _id: string;
  studentName: string;
  className: string;
  feeName: string;
  amount: number;
  lateFee: number;
  discount: number;
  totalPaid: number;
  balanceDue: number;
  paymentDate: string;
  paymentMethod: string;
  receiptNumber: string;
  status: string;
  transactionId: string;
}

export default function FeeReceiptPage() {
  useSession();
  const { canView } = usePermissions("reports");
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [searched, setSearched] = useState(false);

  const classNames = [...new Set(students.map((s) => s.class_name))].sort();

  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch("/api/students");
      if (res.ok) {
        const d = await res.json();
        setStudents(d.data || []);
      }
    } catch {
      showError("Error", "Failed to load students");
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const filteredStudents = filterClass
    ? students.filter((s) => s.class_name === filterClass)
    : students;

  const fetchPayments = async () => {
    if (!selectedStudent) {
      showWarning("Select Student", "Please select a student first.");
      return;
    }

    try {
      setLoading(true);
      setSearched(true);
      const params = new URLSearchParams({
        type: "payments",
        student_id: selectedStudent,
      });
      const res = await fetch(`/api/fees?${params}`);
      if (res.ok) {
        const d = await res.json();
        setPayments(d.data || []);
      } else {
        showError("Error", "Failed to fetch fee payments");
      }
    } catch {
      showError("Error", "Failed to fetch payments");
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = (paymentId: string) => {
    window.open(
      `/api/reports/fee-receipt?payment_id=${paymentId}`,
      "_blank",
      "width=800,height=700,scrollbars=yes",
    );
  };

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground dark:text-muted-foreground">
          You do not have permission to view reports.
        </p>
      </div>
    );
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "partial":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "pending":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "overdue":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "refunded":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-muted text-foreground dark:bg-card dark:text-foreground";
    }
  };

  const methodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: "Cash",
      upi: "UPI",
      bank_transfer: "Bank Transfer",
      cheque: "Cheque",
      online: "Online",
      other: "Other",
    };
    return labels[method] || method;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground dark:text-foreground flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Fee Receipt
          </h1>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
            View and print fee payment receipts
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="dark:bg-background dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-base">
            Select Student to View Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Class Filter */}
            <div>
              <label className="text-sm font-medium text-foreground dark:text-foreground mb-1 block">
                Filter by Class
              </label>
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger>
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classNames.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Student Select */}
            <div>
              <label className="text-sm font-medium text-foreground dark:text-foreground mb-1 block">
                Student *
              </label>
              <Select
                value={selectedStudent}
                onValueChange={setSelectedStudent}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Student" />
                </SelectTrigger>
                <SelectContent>
                  {filteredStudents.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name} ({s.roll_number}) - {s.class_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Button */}
            <div className="flex items-end">
              <Button onClick={fetchPayments} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                View Payments
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      {!loading && searched && payments.length === 0 && (
        <Card className="dark:bg-background dark:border-gray-800">
          <CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground dark:text-muted-foreground">
              No fee payments found for this student.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && payments.length > 0 && (
        <Card className="dark:bg-background dark:border-gray-800 overflow-hidden">
          <CardHeader className="bg-muted/50/50">
            <CardTitle className="text-lg">
              Fee Payments ({payments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Fee Name</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p._id}>
                      <TableCell className="font-mono text-sm">
                        {p.receiptNumber}
                      </TableCell>
                      <TableCell className="font-medium">{p.feeName}</TableCell>
                      <TableCell className="text-right">
                        ₹{p.amount.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ₹{p.totalPaid.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.balanceDue > 0 ? (
                          <span className="text-red-600 dark:text-red-400">
                            ₹{p.balanceDue.toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span className="text-green-600 dark:text-green-400">
                            ₹0
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{methodLabel(p.paymentMethod)}</TableCell>
                      <TableCell>
                        {new Date(p.paymentDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={statusColor(p.status)}>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => printReceipt(p._id)}
                          title="Print Receipt"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
