"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Receipt,
  IndianRupee,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { showError, showSuccess } from "@/lib/alerts";

interface FeePayment {
  payment_id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  receiptNumber: string;
  status: string;
}

interface FeeItem {
  fee_id: string;
  name: string;
  category: string;
  amount: number;
  dueDate: string;
  totalPaid: number;
  remaining: number;
  status: "paid" | "overdue" | "pending";
  payments: FeePayment[];
}

interface FeeSummary {
  totalFees: number;
  totalPaid: number;
  totalDue: number;
  overdueCount: number;
}

const STATUS_BADGE: Record<string, string> = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400",
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400",
  partial:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400",
  refunded: "bg-muted text-foreground dark:bg-card dark:text-foreground",
};

export default function ParentFeesPage() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get("student_id") || "";

  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState<FeeItem[]>([]);
  const [summary, setSummary] = useState<FeeSummary | null>(null);
  const [payingFeeId, setPayingFeeId] = useState<string | null>(null);

  useEffect(() => {
    if (studentId) fetchFees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function fetchFees() {
    try {
      setLoading(true);
      const res = await fetch(`/api/parent/fees?student_id=${studentId}`);
      const json = await res.json();
      if (!json.success) {
        showError("Error", json.error || "Failed to load fee data");
        return;
      }
      setFees(json.data);
      setSummary(json.summary);
    } catch {
      showError("Error", "Failed to load fee data");
    } finally {
      setLoading(false);
    }
  }

  function loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).Razorpay) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
      document.head.appendChild(script);
    });
  }

  async function handlePayNow(fee: FeeItem) {
    if (fee.remaining <= 0) return;
    setPayingFeeId(fee.fee_id);
    try {
      // Step 1: Create order
      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: fee.remaining,
          type: "fee",
          fee_id: fee.fee_id,
          student_id: studentId,
        }),
      });
      if (!orderRes.ok) {
        const err = await orderRes.json();
        throw new Error(err.error || "Failed to create payment order");
      }
      const orderData = await orderRes.json();

      // Step 2: If Razorpay keys available — open checkout
      if (orderData.key && !orderData.simulated) {
        await loadRazorpayScript();
        const options = {
          key: orderData.key,
          amount: orderData.amountInPaise,
          currency: orderData.currency || "INR",
          name: "CampusIQ",
          description: `Fee Payment: ${fee.name}`,
          order_id: orderData.orderId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          handler: async function (response: any) {
            await verifyFeePayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
              fee,
            );
          },
          theme: { color: "#2563eb" },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        setPayingFeeId(null);
        return;
      }

      // Step 3: Simulated mode
      await verifyFeePayment(orderData.orderId, "", "", fee);
    } catch (err) {
      showError(
        "Payment Failed",
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setPayingFeeId(null);
    }
  }

  async function verifyFeePayment(
    orderId: string,
    paymentId: string,
    signature: string,
    fee: FeeItem,
  ) {
    try {
      const res = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          paymentId,
          signature,
          type: "fee",
          fee_id: fee.fee_id,
          student_id: studentId,
          amount: fee.remaining,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Verification failed");
      }
      showSuccess(
        "Payment Successful!",
        `₹${fee.remaining.toLocaleString()} paid for ${fee.name}`,
      );
      fetchFees();
    } catch (err) {
      showError(
        "Verification Failed",
        err instanceof Error ? err.message : "Something went wrong",
      );
    }
  }

  if (!studentId) {
    return (
      <div className="space-y-6">
        <Link href="/parent">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
        </Link>
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground dark:text-muted-foreground">
            No student selected. Please go back and select a child.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/parent">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-foreground">
            Fee Details
          </h1>
          <p className="text-muted-foreground dark:text-muted-foreground">
            Payment history and outstanding dues
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground dark:text-foreground">
                      &#8377;{summary.totalFees.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                      Total Fees
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      &#8377;{summary.totalPaid.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                      Total Paid
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                      &#8377;{summary.totalDue.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                      Balance Due
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">
                      {summary.overdueCount}
                    </p>
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                      Overdue
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Fee List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fee Breakdown</CardTitle>
              <CardDescription>
                Click on a fee item to view payment history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fees.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground dark:text-muted-foreground">
                  No fee records found for this student.
                </p>
              ) : (
                <div className="space-y-2">
                  {fees.map((fee) => (
                    <details
                      key={fee.fee_id}
                      className="border rounded-lg dark:border-border group"
                    >
                      <summary className="flex items-center justify-between w-full px-4 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium text-left text-foreground dark:text-foreground">
                              {fee.name}
                            </p>
                            <p className="text-xs text-muted-foreground dark:text-muted-foreground text-left capitalize">
                              {fee.category} &bull; Due:{" "}
                              {new Date(fee.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-foreground dark:text-foreground">
                            &#8377;{fee.amount.toLocaleString()}
                          </span>
                          <Badge
                            className={
                              STATUS_BADGE[fee.status] ||
                              "bg-muted text-foreground"
                            }
                          >
                            {fee.status}
                          </Badge>
                          {fee.status !== "paid" && fee.remaining > 0 && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white h-7 px-3"
                              disabled={payingFeeId === fee.fee_id}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handlePayNow(fee);
                              }}
                            >
                              {payingFeeId === fee.fee_id ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <IndianRupee className="h-3 w-3 mr-1" />
                              )}
                              Pay ₹{fee.remaining.toLocaleString()}
                            </Button>
                          )}
                        </div>
                      </summary>
                      <div className="px-4 pb-4">
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm px-2">
                            <span className="text-muted-foreground dark:text-muted-foreground">
                              Paid
                            </span>
                            <span className="font-medium text-green-600 dark:text-green-400">
                              &#8377;{fee.totalPaid.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm px-2">
                            <span className="text-muted-foreground dark:text-muted-foreground">
                              Remaining
                            </span>
                            <span className="font-medium text-red-600 dark:text-red-400">
                              &#8377;{fee.remaining.toLocaleString()}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="h-2 bg-muted rounded-full overflow-hidden mx-2">
                            <div
                              className={`h-full rounded-full transition-all ${
                                fee.status === "paid"
                                  ? "bg-green-500"
                                  : fee.status === "overdue"
                                    ? "bg-red-500"
                                    : "bg-yellow-500"
                              }`}
                              style={{
                                width: `${fee.amount > 0 ? Math.min((fee.totalPaid / fee.amount) * 100, 100) : 0}%`,
                              }}
                            />
                          </div>

                          {/* Payment history */}
                          {fee.payments.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-foreground dark:text-foreground mb-2 flex items-center gap-1">
                                <Receipt className="h-4 w-4" /> Payment History
                              </p>
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Date</TableHead>
                                      <TableHead>Amount</TableHead>
                                      <TableHead>Method</TableHead>
                                      <TableHead>Receipt</TableHead>
                                      <TableHead>Status</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {fee.payments.map((p) => (
                                      <TableRow key={p.payment_id}>
                                        <TableCell>
                                          {new Date(
                                            p.paymentDate,
                                          ).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                          &#8377;{p.amount.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="capitalize">
                                          {p.paymentMethod.replace("_", " ")}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                          {p.receiptNumber}
                                        </TableCell>
                                        <TableCell>
                                          <Badge
                                            className={
                                              STATUS_BADGE[p.status] ||
                                              "bg-muted text-foreground"
                                            }
                                          >
                                            {p.status}
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}
                          {fee.payments.length === 0 && (
                            <p className="text-xs text-muted-foreground dark:text-muted-foreground text-center py-2">
                              No payments recorded yet.
                            </p>
                          )}
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
