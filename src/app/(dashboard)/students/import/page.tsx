"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { showSuccess, showError } from "@/lib/alerts";
import { Spinner } from "@/components/ui/spinner";

interface ImportResult {
  imported: number;
  skipped: number;
  total: number;
  errors: string[];
}

export default function ImportStudentsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // ── Upload file to server ──
  const uploadFile = useCallback(async (file: File) => {
    // Validate file extension
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const supportedExts = ["xlsx", "xls", "csv"];

    if (!supportedExts.includes(ext)) {
      const unsupported = ["pdf", "doc", "docx", "txt"];
      if (unsupported.includes(ext)) {
        showError(
          "Unsupported Format",
          `${ext.toUpperCase()} files are not supported for data import. Please copy your data into an Excel (.xlsx) or CSV file and try again. You can download our template below.`,
        );
      } else {
        showError(
          "Invalid File",
          "Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.",
        );
      }
      return;
    }

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      showError("File Too Large", "File must be less than 10MB.");
      return;
    }

    setUploading(true);
    setFileName(file.name);
    setResult(null);
    setServerError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/students/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setServerError(data.error || "Import failed. Please try again.");
        return;
      }

      setResult(data.data as ImportResult);

      if (data.data.imported > 0) {
        showSuccess(
          "Import Successful",
          `${data.data.imported} student${data.data.imported > 1 ? "s" : ""} imported successfully!`,
        );
      }
    } catch {
      setServerError(
        "Network error. Please check your connection and try again.",
      );
    } finally {
      setUploading(false);
    }
  }, []);

  // ── File input change ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // Reset input so same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Drag and drop ──
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) uploadFile(file);
    },
    [uploadFile],
  );

  // ── Download Excel template ──
  const downloadTemplate = async () => {
    const XLSX = (await import("@/lib/xlsx-utils")).default;

    const sampleData = [
      {
        "Student Name": "Rahul Sharma",
        "Roll Number": "101",
        Class: "Class 10-A",
        "Parent Name": "Suresh Sharma",
        "Parent Phone": "9876543210",
        Email: "rahul@example.com",
        Address: "123 MG Road, Hyderabad",
      },
      {
        "Student Name": "Priya Patel",
        "Roll Number": "102",
        Class: "Class 10-A",
        "Parent Name": "Rajesh Patel",
        "Parent Phone": "9876543211",
        Email: "priya@example.com",
        Address: "456 Tank Bund, Hyderabad",
      },
      {
        "Student Name": "Amit Kumar",
        "Roll Number": "201",
        Class: "Class 9-B",
        "Parent Name": "Vijay Kumar",
        "Parent Phone": "9876543212",
        Email: "",
        Address: "789 Jubilee Hills, Hyderabad",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);

    // Set column widths for readability
    ws["!cols"] = [
      { wch: 22 }, // Student Name
      { wch: 14 }, // Roll Number
      { wch: 14 }, // Class
      { wch: 20 }, // Parent Name
      { wch: 16 }, // Parent Phone
      { wch: 24 }, // Email
      { wch: 30 }, // Address
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");

    await XLSX.writeFile(wb, "student_import_template.xlsx");
  };

  // ── Reset for new upload ──
  const resetUpload = () => {
    setFileName(null);
    setResult(null);
    setServerError(null);
    setUploading(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Import Students
          </h1>
          <p className="text-muted-foreground">
            Bulk import students from Excel or CSV files
          </p>
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="mr-2 h-4 w-4" />
          Download Template
        </Button>
      </div>

      {/* Instructions Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="space-y-2 text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium">How to import students:</p>
              <ol className="list-inside list-decimal space-y-1 text-blue-800 dark:text-blue-200">
                <li>
                  Download the template above and fill in your student data
                </li>
                <li>
                  Required columns:{" "}
                  <span className="font-semibold">
                    Student Name, Roll Number, Class
                  </span>
                </li>
                <li>
                  Optional columns: Parent Name, Parent Phone, Email, Address
                </li>
                <li>Upload the file below — we handle the rest!</li>
              </ol>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Supported formats:</strong> Excel (.xlsx, .xls) and CSV
                (.csv) — max 500 students, 10MB file size.
                <br />
                <strong>Tip:</strong> Your file can have title rows, styled
                headers, asterisks (*) — we auto-detect the data columns.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload File
          </CardTitle>
          <CardDescription>
            Drag and drop your Excel/CSV file, or click to browse
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-all ${
              isDragging
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                : "border-slate-200 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-500 dark:hover:bg-slate-900"
            } ${uploading ? "pointer-events-none opacity-60" : ""}`}
          >
            {uploading ? (
              <>
                <Spinner className="mb-4 h-10 w-10" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Uploading and processing{" "}
                  <span className="text-blue-600">{fileName}</span>...
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  This may take a moment for large files
                </p>
              </>
            ) : (
              <>
                <FileSpreadsheet className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                  {isDragging
                    ? "Drop your file here"
                    : "Drag and drop your file here"}
                </p>
                <p className="mb-4 text-xs text-muted-foreground">
                  or click anywhere in this area to browse
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span>.xlsx</span>
                  <span className="text-slate-300">•</span>
                  <span>.xls</span>
                  <span className="text-slate-300">•</span>
                  <span>.csv</span>
                </div>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Server Error */}
      {serverError && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">
                  Import Failed
                </p>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                  {serverError}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetUpload}
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    Try Again
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadTemplate}
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    <Download className="mr-1 h-3.5 w-3.5" />
                    Download Template
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Summary Card */}
          <Card
            className={
              result.imported > 0
                ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20"
                : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20"
            }
          >
            <CardContent className="pt-6">
              <div className="flex gap-3">
                {result.imported > 0 ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                ) : (
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                )}
                <div className="flex-1">
                  <p
                    className={`font-medium ${result.imported > 0 ? "text-green-800 dark:text-green-200" : "text-amber-800 dark:text-amber-200"}`}
                  >
                    Import Complete — {fileName}
                  </p>

                  <div className="mt-3 grid grid-cols-3 gap-4">
                    <div className="rounded-lg bg-card/60 p-3 text-center dark:bg-black/20">
                      <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                        {result.total}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Rows</p>
                    </div>
                    <div className="rounded-lg bg-card/60 p-3 text-center dark:bg-black/20">
                      <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                        {result.imported}
                      </p>
                      <p className="text-xs text-muted-foreground">Imported</p>
                    </div>
                    <div className="rounded-lg bg-card/60 p-3 text-center dark:bg-black/20">
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {result.skipped}
                      </p>
                      <p className="text-xs text-muted-foreground">Skipped</p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {result.imported > 0 && (
                      <Button
                        size="sm"
                        onClick={() => router.push("/students")}
                      >
                        View Students
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={resetUpload}>
                      Upload Another File
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Row-level Errors */}
          {result.errors.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                  <AlertCircle className="h-5 w-5" />
                  Skipped Rows ({result.errors.length})
                </CardTitle>
                <CardDescription>
                  These rows were not imported due to missing or invalid data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto rounded-md bg-slate-50 p-3 dark:bg-slate-900">
                  <ul className="space-y-1 font-mono text-xs text-slate-700 dark:text-slate-300">
                    {result.errors.map((error, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 border-b border-slate-100 py-1.5 last:border-0 dark:border-slate-800"
                      >
                        <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-400" />
                        <span>{error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
