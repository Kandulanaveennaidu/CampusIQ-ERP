"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showError } from "@/lib/alerts";
import { FileText, Printer, Eye, GraduationCap } from "lucide-react";

interface StudentOption {
  _id: string;
  name: string;
  class_name: string;
  roll_number: string;
}

export default function TransferCertificatePage() {
  useSession();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [leavingDate, setLeavingDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [reason, setReason] = useState("Parent's request");
  const [conduct, setConduct] = useState("Good");
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch("/api/students");
      const json = await res.json();
      if (res.ok) {
        setStudents(json.data || []);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handlePreview = async () => {
    if (!selectedStudent) {
      showError("Validation", "Please select a student");
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({
      student_id: selectedStudent,
      leaving_date: leavingDate,
      reason,
      conduct,
    });
    setPreviewUrl(`/api/reports/transfer-certificate?${params.toString()}`);
    setLoading(false);
  };

  const handlePrint = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground dark:text-foreground flex items-center gap-2">
          <FileText className="h-7 w-7" />
          Transfer Certificate
        </h1>
        <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
          Generate and print transfer certificates for students
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-5 w-5" />
              Leaving Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Select Student *</Label>
              <Select
                value={selectedStudent}
                onValueChange={setSelectedStudent}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name} — {s.class_name} (#{s.roll_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Leaving Date</Label>
              <Input
                type="date"
                value={leavingDate}
                onChange={(e) => setLeavingDate(e.target.value)}
              />
            </div>

            <div>
              <Label>Reason for Leaving</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Parent's request">
                    Parent&apos;s request
                  </SelectItem>
                  <SelectItem value="Transfer to another institution">
                    Transfer to another institution
                  </SelectItem>
                  <SelectItem value="Relocation">Relocation</SelectItem>
                  <SelectItem value="Course completed">
                    Course completed
                  </SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>General Conduct</Label>
              <Select value={conduct} onValueChange={setConduct}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Excellent">Excellent</SelectItem>
                  <SelectItem value="Very Good">Very Good</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Satisfactory">Satisfactory</SelectItem>
                  <SelectItem value="Needs Improvement">
                    Needs Improvement
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handlePreview}
                disabled={loading}
                className="flex-1 gap-2"
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              <Button
                variant="outline"
                onClick={handlePrint}
                disabled={!previewUrl}
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {previewUrl ? (
              <iframe
                ref={iframeRef}
                src={previewUrl}
                className="w-full border rounded-lg bg-card"
                style={{ height: "80vh" }}
                title="Transfer Certificate Preview"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
                <FileText className="h-16 w-16 mb-4" />
                <p className="text-lg font-medium">No preview yet</p>
                <p className="text-sm">
                  Select a student and click Preview to generate the TC
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
