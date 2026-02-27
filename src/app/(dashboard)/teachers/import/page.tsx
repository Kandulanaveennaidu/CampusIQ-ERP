"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePermissions } from "@/hooks/use-permissions";

interface ParsedTeacher {
  name: string;
  email: string;
  phone: string;
  subject: string;
  qualification: string;
}

export default function ImportTeachersPage() {
  const router = useRouter();
  const permissions = usePermissions("teachers");

  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedTeacher[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrors([]);
    setParsedData([]);
    setImportResult(null);

    try {
      const reader = new FileReader();

      reader.onload = async (event) => {
        const text = event.target?.result as string;

        if (file.name.endsWith(".csv")) {
          const lines = text.split("\n");
          const headers = lines[0]
            .split(",")
            .map((h) => h.trim().toLowerCase());

          const data: ParsedTeacher[] = [];
          const parseErrors: string[] = [];

          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = line.split(",").map((v) => v.trim());
            const teacher: ParsedTeacher = {
              name: values[headers.indexOf("name")] || "",
              email: values[headers.indexOf("email")] || "",
              phone:
                values[headers.indexOf("phone")] ||
                values[headers.indexOf("mobile")] ||
                "",
              subject:
                values[headers.indexOf("subject")] ||
                values[headers.indexOf("department")] ||
                "",
              qualification:
                values[headers.indexOf("qualification")] ||
                values[headers.indexOf("degree")] ||
                "",
            };

            if (!teacher.name || !teacher.email) {
              parseErrors.push(
                `Row ${i + 1}: Missing required fields (name, email)`,
              );
            } else {
              data.push(teacher);
            }
          }

          setParsedData(data);
          setErrors(parseErrors);
        } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
          const XLSX = (await import("@/lib/xlsx-utils")).default;
          const workbook = await XLSX.read(text);
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          const data: ParsedTeacher[] = [];
          const parseErrors: string[] = [];

          (jsonData as Record<string, unknown>[]).forEach((row, index) => {
            const teacher: ParsedTeacher = {
              name: String(row.name || row.Name || row.teacher_name || ""),
              email: String(row.email || row.Email || ""),
              phone: String(row.phone || row.Phone || row.mobile || ""),
              subject: String(
                row.subject || row.Subject || row.department || "",
              ),
              qualification: String(
                row.qualification || row.Qualification || row.degree || "",
              ),
            };

            if (!teacher.name || !teacher.email) {
              parseErrors.push(`Row ${index + 2}: Missing required fields`);
            } else {
              data.push(teacher);
            }
          });

          setParsedData(data);
          setErrors(parseErrors);
        } else {
          showError("Error", "Please upload a CSV or Excel file");
        }

        setLoading(false);
      };

      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        reader.readAsBinaryString(file);
      } else {
        reader.readAsText(file);
      }
    } catch {
      setLoading(false);
      showError("Error", "Failed to parse file");
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setImporting(true);
    setImportResult(null);

    try {
      // Build CSV content and upload as file
      const csvHeader = "name,email,phone,subject,qualification";
      const csvRows = parsedData.map(
        (t) =>
          `${t.name},${t.email},${t.phone},${t.subject},${t.qualification}`,
      );
      const csvContent = [csvHeader, ...csvRows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const csvFile = new File([blob], "teachers_import.csv", {
        type: "text/csv",
      });

      const formData = new FormData();
      formData.append("file", csvFile);

      const response = await fetch("/api/teachers/import", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setImportResult(result.data);
        showSuccess(
          "Import Complete",
          `Successfully imported ${result.data.imported} teachers. ${result.data.skipped} skipped.`,
        );
        if (result.data.imported > 0) {
          setTimeout(() => router.push("/teachers"), 2000);
        }
      } else {
        showError("Import Failed", result.error || "Failed to import teachers");
      }
    } catch {
      showError("Error", "Failed to import teachers");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const headers = "name,email,phone,subject,qualification";
    const sampleRow =
      "Jane Smith,jane.smith@institution.com,9876543210,Mathematics,M.Sc Mathematics";
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${sampleRow}`;

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "teacher_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!permissions.canAdd) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">
          You do not have permission to import teachers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Import Teachers
          </h1>
          <p className="text-muted-foreground">
            Bulk import teachers from CSV or Excel file
          </p>
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="mr-2 h-4 w-4" />
          Download Template
        </Button>
      </div>

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>
            Upload a CSV or Excel file with teacher data. Required columns:
            name, email. Optional: phone, subject, qualification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 p-12 dark:border-slate-700">
            <FileSpreadsheet className="mb-4 h-12 w-12 text-muted-foreground dark:text-muted-foreground" />
            <p className="mb-4 text-sm text-muted-foreground">
              Drag and drop your file here, or click to browse
            </p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="teacher-file-upload"
            />
            <label htmlFor="teacher-file-upload">
              <Button asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  Choose File
                </span>
              </Button>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent className="flex h-32 items-center justify-center">
            <Spinner />
            <span className="ml-2 text-muted-foreground">Parsing file...</span>
          </CardContent>
        </Card>
      )}

      {/* Import Result */}
      {importResult && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-green-700 dark:text-green-300">
              Successfully imported: <strong>{importResult.imported}</strong>
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              Skipped: <strong>{importResult.skipped}</strong>
            </p>
            {importResult.errors.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-sm text-red-600 dark:text-red-400">
                {importResult.errors.slice(0, 10).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {importResult.errors.length > 10 && (
                  <li>...and {importResult.errors.length - 10} more errors</li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              Parsing Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc text-sm text-red-700 dark:text-red-400">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Preview Table */}
      {parsedData.length > 0 && !importResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Preview</CardTitle>
                <CardDescription>
                  {parsedData.length} teachers ready to import
                </CardDescription>
              </div>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import All
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Qualification</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 10).map((teacher, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {teacher.name}
                      </TableCell>
                      <TableCell>{teacher.email}</TableCell>
                      <TableCell>{teacher.phone || "—"}</TableCell>
                      <TableCell>{teacher.subject || "—"}</TableCell>
                      <TableCell>{teacher.qualification || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {parsedData.length > 10 && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Showing first 10 of {parsedData.length} teachers
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Default password for imported teachers:{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">
                Teacher@123
              </code>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
