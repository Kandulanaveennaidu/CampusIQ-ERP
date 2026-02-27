"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  X,
  Building2,
  Mail,
  Lock,
  Phone,
  MapPin,
  CheckCircle2,
  ChevronDown,
  Shield,
  Sparkles,
  Copy,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { showSuccess, showError } from "@/lib/alerts";

// ── Step Config ──
const STEPS = [
  {
    id: 1,
    title: "Institution Info",
    icon: Building2,
    description: "Institution details",
  },
  {
    id: 2,
    title: "Admin Account",
    icon: Lock,
    description: "Create credentials",
  },
  {
    id: 3,
    title: "Review",
    icon: CheckCircle2,
    description: "Confirm & register",
  },
];

// ── School Type & Board options ──
const SCHOOL_TYPES = [
  { value: "school", label: "School (K-12)" },
  { value: "college", label: "College" },
  { value: "university", label: "University" },
  { value: "institute", label: "Institute" },
  { value: "coaching", label: "Coaching Center" },
];

const BOARDS = [
  { value: "cbse", label: "CBSE" },
  { value: "icse", label: "ICSE / ISC" },
  { value: "state_board", label: "State Board" },
  { value: "ib", label: "IB" },
  { value: "igcse", label: "IGCSE / Cambridge" },
  { value: "autonomous", label: "Autonomous" },
  { value: "other", label: "Other" },
];

// ── Password Strength Component ──
function PasswordStrength({ password }: { password: string }) {
  const checks = useMemo(
    () => [
      { label: "At least 6 characters", met: password.length >= 6 },
      { label: "Uppercase letter", met: /[A-Z]/.test(password) },
      { label: "Lowercase letter", met: /[a-z]/.test(password) },
      { label: "Contains number", met: /[0-9]/.test(password) },
      { label: "Special character", met: /[^A-Za-z0-9]/.test(password) },
    ],
    [password],
  );

  const score = checks.filter((c) => c.met).length;
  const strengthLabel =
    score <= 1
      ? "Weak"
      : score <= 2
        ? "Fair"
        : score <= 3
          ? "Good"
          : score <= 4
            ? "Strong"
            : "Excellent";
  const strengthColor =
    score <= 1
      ? "bg-red-500"
      : score <= 2
        ? "bg-orange-500"
        : score <= 3
          ? "bg-yellow-500"
          : score <= 4
            ? "bg-blue-500"
            : "bg-green-500";

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden dark:bg-slate-700">
          <div
            className={`h-full rounded-full transition-all duration-500 ${strengthColor}`}
            style={{ width: `${(score / 5) * 100}%` }}
          />
        </div>
        <span
          className={`text-xs font-semibold min-w-[60px] text-right ${
            score <= 2
              ? "text-red-500"
              : score <= 3
                ? "text-yellow-600"
                : "text-green-600"
          }`}
        >
          {strengthLabel}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {checks.map((c) => (
          <div
            key={c.label}
            className={`flex items-center gap-1 text-xs transition-colors ${
              c.met
                ? "text-green-600 dark:text-green-400"
                : "text-muted-foreground dark:text-muted-foreground"
            }`}
          >
            {c.met ? (
              <Check className="h-3 w-3 shrink-0" />
            ) : (
              <X className="h-3 w-3 shrink-0" />
            )}
            <span>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Register Page ──
export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    school_name: "",
    school_type: "",
    board: "",
    address: "",
    phone: "",
    email: "",
    admin_email: "",
    admin_password: "",
    confirm_password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = useCallback(
    (field: string, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }
    },
    [errors],
  );

  const validateStep = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!formData.school_name.trim())
        e.school_name = "Institution name is required";
      else if (formData.school_name.trim().length < 2)
        e.school_name = "Name must be at least 2 characters";
      if (!formData.school_type)
        e.school_type = "Please select an institution type";
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
        e.email = "Please enter a valid email address";
      if (formData.phone && !/^[\d\s+\-()]{10,15}$/.test(formData.phone))
        e.phone = "Enter a valid phone number (10-15 digits)";
    }
    if (s === 2) {
      if (!formData.admin_email.trim())
        e.admin_email = "Admin email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.admin_email.trim()))
        e.admin_email = "Please enter a valid email address";
      if (!formData.admin_password) e.admin_password = "Password is required";
      else if (formData.admin_password.length < 6)
        e.admin_password = "At least 6 characters required";
      else if (!/[A-Z]/.test(formData.admin_password))
        e.admin_password = "Must contain an uppercase letter";
      else if (!/[a-z]/.test(formData.admin_password))
        e.admin_password = "Must contain a lowercase letter";
      else if (!/[0-9]/.test(formData.admin_password))
        e.admin_password = "Must contain a number";
      if (!formData.confirm_password)
        e.confirm_password = "Please confirm your password";
      else if (formData.admin_password !== formData.confirm_password)
        e.confirm_password = "Passwords do not match";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    } else {
      // Show popup so user clearly sees what needs fixing
      const currentErrors = {} as Record<string, string>;
      if (step === 1) {
        if (!formData.school_name.trim())
          currentErrors.school_name = "Institution name is required";
        else if (formData.school_name.trim().length < 2)
          currentErrors.school_name = "Name must be at least 2 characters";
        if (!formData.school_type)
          currentErrors.school_type = "Please select an institution type";
        if (
          formData.email &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
        )
          currentErrors.email = "Please enter a valid email address";
        if (formData.phone && !/^[\d\s+\-()]{10,15}$/.test(formData.phone))
          currentErrors.phone = "Enter a valid phone number (10-15 digits)";
      } else if (step === 2) {
        if (!formData.admin_email.trim())
          currentErrors.admin_email = "Admin email is required";
        else if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.admin_email.trim())
        )
          currentErrors.admin_email = "Please enter a valid email address";
        if (!formData.admin_password)
          currentErrors.admin_password = "Password is required";
        else if (formData.admin_password.length < 6)
          currentErrors.admin_password = "At least 6 characters required";
        else if (!/[A-Z]/.test(formData.admin_password))
          currentErrors.admin_password = "Must contain an uppercase letter";
        else if (!/[a-z]/.test(formData.admin_password))
          currentErrors.admin_password = "Must contain a lowercase letter";
        else if (!/[0-9]/.test(formData.admin_password))
          currentErrors.admin_password = "Must contain a number";
        if (!formData.confirm_password)
          currentErrors.confirm_password = "Please confirm your password";
        else if (formData.admin_password !== formData.confirm_password)
          currentErrors.confirm_password = "Passwords do not match";
      }
      const msgs = Object.values(currentErrors);
      if (msgs.length > 0) {
        showError("Please Fix the Following", msgs.join(". ") + ".");
      }
    }
  };

  const prevStep = () => setStep(step - 1);

  const handleSubmit = async () => {
    if (!validateStep(2)) {
      setStep(2);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_name: formData.school_name.trim(),
          school_type: formData.school_type,
          board: formData.board,
          address: formData.address.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          admin_email: formData.admin_email.trim(),
          admin_password: formData.admin_password,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSchoolId(result.school_id);
        showSuccess(
          "Registration Successful!",
          "Your institution has been registered. You can now login.",
        );
      } else {
        showError(
          "Registration Failed",
          result.error || "Something went wrong. Please try again.",
        );
      }
    } catch {
      showError(
        "Network Error",
        "Please check your internet connection and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copySchoolId = () => {
    if (schoolId) {
      navigator.clipboard.writeText(schoolId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getSchoolTypeLabel = (val: string) =>
    SCHOOL_TYPES.find((t) => t.value === val)?.label || val;
  const getBoardLabel = (val: string) =>
    BOARDS.find((b) => b.value === val)?.label || val;

  // ── Success Screen ──
  if (schoolId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-xl shadow-green-200/50 dark:shadow-green-900/30">
              <CheckCircle2 className="h-12 w-12 text-white" />
            </div>
            <h1 className="mt-5 text-3xl font-bold text-foreground">
              Registration Complete!
            </h1>
            <p className="mt-2 text-muted-foreground">
              Your institution has been successfully registered on CampusIQ
            </p>
          </div>

          <Card className="shadow-2xl border-0 ring-1 ring-green-200/60 dark:ring-green-800/30">
            <CardContent className="p-6 space-y-4">
              {/* School ID */}
              <div className="rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 p-6 border border-green-200 text-center dark:from-green-950/30 dark:to-emerald-950/30 dark:border-green-800">
                <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">
                  Your Institution ID
                </p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-2xl font-bold text-green-800 font-mono dark:text-green-300 select-all">
                    {schoolId}
                  </p>
                  <button
                    onClick={copySchoolId}
                    className="p-1.5 rounded-lg hover:bg-green-200/50 dark:hover:bg-green-800/30 transition-colors"
                    title="Copy Institution ID"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-green-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Login Credentials */}
              <div className="rounded-2xl bg-blue-50 p-4 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Login Credentials
                </p>
                <div className="space-y-2 text-sm text-blue-700 dark:text-blue-400">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-600/80">Email:</span>
                    <span className="font-medium font-mono text-xs bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded">
                      {formData.admin_email}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-600/80">Role:</span>
                    <span className="font-medium">Administrator</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-600/80">Login As:</span>
                    <span className="font-medium">Admin</span>
                  </div>
                </div>
              </div>

              {/* Important Notice */}
              <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  <strong>Important:</strong> Save your Institution ID! Share it
                  with teachers and staff so they can create their accounts. You
                  can manage all users from the admin dashboard.
                </p>
              </div>

              {/* Buttons */}
              <div className="space-y-2 pt-1">
                <Button
                  className="w-full h-12 text-base font-semibold gap-2"
                  onClick={() => router.push("/login")}
                >
                  <ExternalLink className="h-4 w-4" />
                  Go to Login
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/")}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Registration Form ──
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Back to Home */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        {/* Logo */}
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-200/60 dark:shadow-blue-900/30">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-3 text-2xl font-bold text-foreground">
            Register on CampusIQ
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up your institution management system
          </p>
        </div>

        {/* Step Progress Bar */}
        <div className="flex items-center justify-center gap-0 mb-6">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  if (s.id < step) setStep(s.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                  step >= s.id
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200/50 dark:shadow-blue-900/30"
                    : "bg-slate-100 text-muted-foreground dark:bg-slate-800 dark:text-muted-foreground"
                } ${s.id < step ? "cursor-pointer hover:bg-blue-700" : s.id > step ? "cursor-default" : ""}`}
              >
                {step > s.id ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <s.icon className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{s.title}</span>
                <span className="sm:hidden">{s.id}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-1 transition-colors duration-500 ${
                    step > s.id
                      ? "bg-blue-600"
                      : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <Card className="shadow-xl border-0 ring-1 ring-border/60 dark:ring-slate-700/40">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">
                {step === 1
                  ? "Institution Information"
                  : step === 2
                    ? "Admin Account"
                    : "Review & Register"}
              </CardTitle>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium dark:bg-blue-900/40 dark:text-blue-300">
                Step {step}/3
              </span>
            </div>
            <CardDescription>
              {step === 1
                ? "Enter your institution details"
                : step === 2
                  ? "Create the administrator login credentials"
                  : "Verify your details before submitting"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* ── Step 1: School Info ── */}
            {step === 1 && (
              <>
                {/* School Name */}
                <div className="space-y-2">
                  <Label htmlFor="school_name">
                    Institution Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="school_name"
                      placeholder="Enter institution name"
                      className={`pl-10 h-11 ${errors.school_name ? "border-red-500 focus:ring-red-500" : ""}`}
                      value={formData.school_name}
                      onChange={(e) =>
                        updateField("school_name", e.target.value)
                      }
                      autoFocus
                    />
                  </div>
                  {errors.school_name && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <X className="h-3 w-3" />
                      {errors.school_name}
                    </p>
                  )}
                </div>

                {/* School Type & Board */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="school_type">
                      Institution Type <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <select
                        id="school_type"
                        value={formData.school_type}
                        onChange={(e) =>
                          updateField("school_type", e.target.value)
                        }
                        className={`h-11 w-full appearance-none rounded-md border ${
                          errors.school_type
                            ? "border-red-500"
                            : "border-slate-300 dark:border-slate-600"
                        } bg-white dark:bg-slate-900 px-3 pr-9 text-sm ${
                          !formData.school_type
                            ? "text-muted-foreground"
                            : "text-slate-900 dark:text-slate-100"
                        } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer`}
                      >
                        <option value="" disabled>
                          Select type
                        </option>
                        {SCHOOL_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>
                    {errors.school_type && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <X className="h-3 w-3" />
                        {errors.school_type}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="board">Board / Affiliation</Label>
                    <div className="relative">
                      <select
                        id="board"
                        value={formData.board}
                        onChange={(e) => updateField("board", e.target.value)}
                        className={`h-11 w-full appearance-none rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 pr-9 text-sm ${
                          !formData.board
                            ? "text-muted-foreground"
                            : "text-slate-900 dark:text-slate-100"
                        } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer`}
                      >
                        <option value="" disabled>
                          Select board
                        </option>
                        {BOARDS.map((b) => (
                          <option key={b.value} value={b.value}>
                            {b.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Phone & Email */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="phone"
                        placeholder="+91 9876543210"
                        className={`pl-10 h-11 ${errors.phone ? "border-red-500" : ""}`}
                        value={formData.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <X className="h-3 w-3" />
                        {errors.phone}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Institution Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="info@institution.com"
                        className={`pl-10 h-11 ${errors.email ? "border-red-500" : ""}`}
                        value={formData.email}
                        onChange={(e) => updateField("email", e.target.value)}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <X className="h-3 w-3" />
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="address"
                      placeholder="Institution address"
                      className="pl-10 h-11"
                      value={formData.address}
                      onChange={(e) => updateField("address", e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {/* ── Step 2: Admin Account ── */}
            {step === 2 && (
              <>
                {/* Info */}
                <div className="flex items-start gap-2.5 rounded-xl bg-blue-50 p-3 border border-blue-100 dark:bg-blue-950/30 dark:border-blue-900">
                  <Shield className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                    This will be the primary administrator account for your
                    institution. You can add more staff and teachers after
                    logging in.
                  </p>
                </div>

                {/* Admin Email */}
                <div className="space-y-2">
                  <Label htmlFor="admin_email">
                    Admin Email <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="admin_email"
                      type="email"
                      placeholder="admin@institution.com"
                      className={`pl-10 h-11 ${errors.admin_email ? "border-red-500" : ""}`}
                      value={formData.admin_email}
                      onChange={(e) =>
                        updateField("admin_email", e.target.value)
                      }
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                  {errors.admin_email && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <X className="h-3 w-3" />
                      {errors.admin_email}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="admin_password">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="admin_password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      className={`px-10 h-11 ${errors.admin_password ? "border-red-500" : ""}`}
                      value={formData.admin_password}
                      onChange={(e) =>
                        updateField("admin_password", e.target.value)
                      }
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground dark:hover:text-slate-300 z-10 cursor-pointer transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.admin_password && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <X className="h-3 w-3" />
                      {errors.admin_password}
                    </p>
                  )}
                  <PasswordStrength password={formData.admin_password} />
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">
                    Confirm Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirm_password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      className={`px-10 h-11 ${errors.confirm_password ? "border-red-500" : ""}`}
                      value={formData.confirm_password}
                      onChange={(e) =>
                        updateField("confirm_password", e.target.value)
                      }
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground dark:hover:text-slate-300 z-10 cursor-pointer transition-colors"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirm_password && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <X className="h-3 w-3" />
                      {errors.confirm_password}
                    </p>
                  )}
                  {formData.confirm_password &&
                    formData.admin_password === formData.confirm_password && (
                      <p className="text-xs text-green-600 flex items-center gap-1 dark:text-green-400">
                        <Check className="h-3 w-3" />
                        Passwords match
                      </p>
                    )}
                </div>
              </>
            )}

            {/* ── Step 3: Review ── */}
            {step === 3 && (
              <div className="space-y-4">
                {/* School Details */}
                <div className="rounded-xl bg-muted/50 p-4 dark:bg-slate-800/50 border border-border dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    Institution Details
                    <button
                      onClick={() => setStep(1)}
                      className="ml-auto text-xs text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-700">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">
                        {formData.school_name}
                      </span>
                    </div>
                    {formData.school_type && (
                      <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-muted-foreground">Type</span>
                        <span className="font-medium">
                          {getSchoolTypeLabel(formData.school_type)}
                        </span>
                      </div>
                    )}
                    {formData.board && (
                      <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-muted-foreground">Board</span>
                        <span className="font-medium">
                          {getBoardLabel(formData.board)}
                        </span>
                      </div>
                    )}
                    {formData.phone && (
                      <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-muted-foreground">Phone</span>
                        <span>{formData.phone}</span>
                      </div>
                    )}
                    {formData.email && (
                      <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-muted-foreground">Email</span>
                        <span>{formData.email}</span>
                      </div>
                    )}
                    {formData.address && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-muted-foreground">Address</span>
                        <span className="text-right max-w-[200px]">
                          {formData.address}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Account */}
                <div className="rounded-xl bg-muted/50 p-4 dark:bg-slate-800/50 border border-border dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-blue-600" />
                    Admin Account
                    <button
                      onClick={() => setStep(2)}
                      className="ml-auto text-xs text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-700">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium">
                        {formData.admin_email}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-700">
                      <span className="text-muted-foreground">Password</span>
                      <span className="font-mono tracking-widest">
                        {"•".repeat(
                          Math.min(formData.admin_password.length, 12),
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-muted-foreground">Role</span>
                      <span className="inline-flex items-center gap-1 font-medium text-blue-700 dark:text-blue-400">
                        <Shield className="h-3 w-3" />
                        Administrator
                      </span>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border border-blue-200 dark:from-blue-950/30 dark:to-indigo-950/30 dark:border-blue-800">
                  <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    Included with your free trial
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      "Student Management",
                      "Attendance Tracking",
                      "Fee Management",
                      "Staff Management",
                      "Reports & Analytics",
                      "7-Day Free Trial",
                    ].map((f) => (
                      <div
                        key={f}
                        className="flex items-center gap-1 text-xs text-blue-700 dark:text-blue-400"
                      >
                        <Check className="h-3 w-3 shrink-0 text-blue-600" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Terms */}
                <p className="text-xs text-center text-muted-foreground">
                  By registering, you agree to set up an institution management
                  account. You can add teachers, students, and parents after
                  logging in.
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between gap-3 pt-2">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                className="gap-1.5 h-11"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1 text-sm text-blue-600 hover:underline font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                Sign in instead
              </Link>
            )}
            {step < 3 ? (
              <Button
                type="button"
                onClick={nextStep}
                className="gap-1.5 h-11 min-w-[100px]"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="gap-1.5 h-11 min-w-[160px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Register Institution
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Footer */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Protected by CampusIQ Security &middot; 256-bit SSL encryption
        </p>
      </div>
    </div>
  );
}
