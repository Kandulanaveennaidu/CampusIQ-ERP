"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  QrCode,
  Timer,
  CheckCircle,
  AlertTriangle,
  Copy,
  Users,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError, showInfo } from "@/lib/alerts";
import { useClasses } from "@/hooks/use-classes";

interface QRData {
  token: string;
  class_name: string;
  date: string;
  expires_at: string;
  qr_content?: string;
}

export default function QRAttendancePage() {
  const { data: session } = useSession();

  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [selectedClass, setSelectedClass] = useState("");
  const [duration, setDuration] = useState("30");
  const [scanToken, setScanToken] = useState("");
  const [scanStudentId, setScanStudentId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    status?: string;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const { classes, classLabel } = useClasses();

  const isAdmin = session?.user?.role === "admin";

  // Countdown timer
  useEffect(() => {
    if (!qrData?.expires_at) return;
    const interval = setInterval(() => {
      const diff = new Date(qrData.expires_at).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expired");
        setQrData(null);
        clearInterval(interval);
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}m ${secs}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [qrData]);

  const generateQR = useCallback(async () => {
    if (!selectedClass) {
      showError("Error", "Please select a class");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/qr-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          class_name: selectedClass,
          duration_minutes: parseInt(duration),
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setQrData(result.data);
        showSuccess("QR Generated", `Valid for ${duration} minutes`);
      } else {
        throw new Error("Failed");
      }
    } catch {
      showError("Error", "Failed to generate QR code");
    } finally {
      setLoading(false);
    }
  }, [selectedClass, duration]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/qr-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scan",
          token: scanToken,
          student_id: scanStudentId,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setScanResult({
          success: true,
          message: result.message,
          status: result.data?.status,
        });
      } else {
        setScanResult({ success: false, message: result.error });
      }
    } catch {
      setScanResult({ success: false, message: "Failed to scan" });
    } finally {
      setScanning(false);
    }
  };

  const copyToken = () => {
    if (qrData?.token) {
      navigator.clipboard.writeText(qrData.token);
      showInfo("Copied", "Token copied to clipboard");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          QR Code Attendance
        </h1>
        <p className="text-slate-500">
          Generate QR codes for quick class attendance or scan to mark
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Generate QR - Teacher/Admin */}
        {(isAdmin || session?.user?.role === "teacher") && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-blue-600" />
                Generate QR Code
              </CardTitle>
              <CardDescription>
                Create a time-limited QR token for class attendance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select {classLabel}</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={`Choose a ${classLabel.toLowerCase()}...`}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                    {classes.length === 0 && (
                      <SelectItem value="__none" disabled>
                        No classes found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={generateQR}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <QrCode className="mr-2 h-4 w-4" />
                )}
                Generate QR Token
              </Button>

              {qrData && (
                <div className="rounded-lg border bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <Badge variant="default" className="text-xs">
                      Active
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-amber-600">
                      <Timer className="h-4 w-4" />
                      {timeLeft}
                    </div>
                  </div>

                  {/* QR Visual Representation */}
                  <div className="mx-auto mb-4 flex h-48 w-48 items-center justify-center rounded-lg border-4 border-dashed border-blue-300 bg-white">
                    <div className="text-center">
                      <QrCode className="mx-auto h-16 w-16 text-blue-600" />
                      <p className="mt-2 text-xs text-slate-500">
                        {qrData.class_name}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={qrData.token}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button variant="outline" size="icon" onClick={copyToken}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Share this token with students or display the QR code
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Scan / Enter Token - Student Flow */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Mark Attendance via Token
            </CardTitle>
            <CardDescription>
              Enter the QR token shared by your teacher
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleScan} className="space-y-4">
              <div className="space-y-2">
                <Label>Student ID</Label>
                <Input
                  placeholder="e.g. STU001"
                  value={scanStudentId}
                  onChange={(e) => setScanStudentId(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>QR Token</Label>
                <Input
                  placeholder="Paste the token here..."
                  value={scanToken}
                  onChange={(e) => setScanToken(e.target.value)}
                  className="font-mono"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                variant="outline"
                disabled={scanning}
              >
                {scanning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Mark Attendance
              </Button>

              {scanResult && (
                <div
                  className={`rounded-lg p-4 ${
                    scanResult.success
                      ? "bg-green-50 text-green-800"
                      : "bg-red-50 text-red-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {scanResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium">{scanResult.message}</p>
                      {scanResult.status && (
                        <p className="text-sm">
                          Status:{" "}
                          <Badge
                            variant={
                              scanResult.status === "present"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {scanResult.status}
                          </Badge>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle>How QR Attendance Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-blue-50 p-4 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <span className="text-lg font-bold text-blue-600">1</span>
              </div>
              <h3 className="font-medium">Teacher Generates</h3>
              <p className="mt-1 text-sm text-slate-500">
                Teacher creates a time-limited QR token for the class
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <span className="text-lg font-bold text-green-600">2</span>
              </div>
              <h3 className="font-medium">Students Scan</h3>
              <p className="mt-1 text-sm text-slate-500">
                Students enter the token within the time window
              </p>
            </div>
            <div className="rounded-lg bg-purple-50 p-4 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                <span className="text-lg font-bold text-purple-600">3</span>
              </div>
              <h3 className="font-medium">Auto-Recorded</h3>
              <p className="mt-1 text-sm text-slate-500">
                Attendance is automatically marked with late detection
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
