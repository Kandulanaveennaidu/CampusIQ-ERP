"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  Loader2,
  Eye,
  EyeOff,
  Lock,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Check,
  X,
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

// ── Password Strength ──
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
        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden dark:bg-slate-700">
          <div
            className={`h-full ${strengthColor} transition-all duration-300 rounded-full`}
            style={{ width: `${(score / 5) * 100}%` }}
          />
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {strengthLabel}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-1">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-1.5 text-xs">
            {check.met ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <X className="h-3 w-3 text-slate-400" />
            )}
            <span
              className={
                check.met
                  ? "text-green-700 dark:text-green-400"
                  : "text-slate-500"
              }
            >
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

type TokenStatus = "loading" | "valid" | "invalid" | "expired" | "activated";

interface UserInfo {
  name: string;
  email: string;
  role: string;
}

function ActivatePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("loading");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setTokenStatus("invalid");
      return;
    }

    fetch(`/api/auth/activate?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setTokenStatus("valid");
          setUserInfo(data.data);
        } else if (data.error?.includes("expired")) {
          setTokenStatus("expired");
        } else {
          setTokenStatus("invalid");
        }
      })
      .catch(() => setTokenStatus("invalid"));
  }, [token]);

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!password) e.password = "Password is required";
    else if (password.length < 6) e.password = "At least 6 characters";
    else if (!/[A-Z]/.test(password))
      e.password = "Must contain an uppercase letter";
    else if (!/[a-z]/.test(password))
      e.password = "Must contain a lowercase letter";
    else if (!/[0-9]/.test(password)) e.password = "Must contain a number";
    if (!confirmPassword) e.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword)
      e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setTokenStatus("activated");
        showSuccess(
          "Account Activated!",
          "Your password has been set. Redirecting to login...",
        );
        setTimeout(() => router.push("/login"), 3000);
      } else {
        showError("Activation Failed", data.error || "Something went wrong");
        if (data.error?.includes("expired")) setTokenStatus("expired");
        if (data.error?.includes("already")) setTokenStatus("activated");
      }
    } catch {
      showError("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <div className="mb-5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        {/* Logo */}
        <div className="mb-7 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-200/60 dark:shadow-blue-900/30">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>
          <h1 className="mt-4 text-3xl font-bold text-foreground">CampusIQ</h1>
          <p className="mt-1 text-muted-foreground">Activate Your Account</p>
        </div>

        {/* Loading State */}
        {tokenStatus === "loading" && (
          <Card className="shadow-xl border-0 ring-1 ring-slate-200/60 dark:ring-slate-700/40">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
              <p className="text-muted-foreground">
                Validating your invitation...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Invalid Token */}
        {tokenStatus === "invalid" && (
          <Card className="shadow-xl border-0 ring-1 ring-red-200/60 dark:ring-red-700/40">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40 mb-4">
                <AlertTriangle className="h-7 w-7 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Invalid Activation Link
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                This activation link is invalid or has already been used. Please
                contact your school administrator to receive a new invitation.
              </p>
              <Button asChild variant="outline">
                <Link href="/login">Go to Login</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Expired Token */}
        {tokenStatus === "expired" && (
          <Card className="shadow-xl border-0 ring-1 ring-orange-200/60 dark:ring-orange-700/40">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950/40 mb-4">
                <AlertTriangle className="h-7 w-7 text-orange-600" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Invitation Expired
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                This invitation link has expired. Please ask your school
                administrator to send a new invitation.
              </p>
              <Button asChild variant="outline">
                <Link href="/login">Go to Login</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Successfully Activated */}
        {tokenStatus === "activated" && (
          <Card className="shadow-xl border-0 ring-1 ring-green-200/60 dark:ring-green-700/40">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/40 mb-4">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Account Activated!
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                Your password has been set and your account is now active.
                Redirecting you to the login page...
              </p>
              <Button asChild>
                <Link href="/login">Go to Login</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Valid Token — Show Password Form */}
        {tokenStatus === "valid" && userInfo && (
          <Card className="shadow-xl border-0 ring-1 ring-slate-200/60 dark:ring-slate-700/40">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl">Set Your Password</CardTitle>
              <CardDescription>
                Welcome, <strong>{userInfo.name}</strong>! Create a password to
                activate your{" "}
                <span className="capitalize font-medium text-blue-600">
                  {userInfo.role}
                </span>{" "}
                account.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {/* Account Info */}
                <div className="flex items-start gap-2.5 rounded-xl bg-blue-50 p-3 border border-blue-100 dark:bg-blue-950/30 dark:border-blue-900">
                  <ShieldCheck className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                    <p>
                      <strong>Email:</strong> {userInfo.email}
                    </p>
                    <p>
                      <strong>Role:</strong>{" "}
                      <span className="capitalize">{userInfo.role}</span>
                    </p>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Create Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      className={`px-10 h-11 ${errors.password ? "border-red-500" : ""}`}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password)
                          setErrors((prev) => ({ ...prev, password: "" }));
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                  {errors.password && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {errors.password}
                    </p>
                  )}
                  <PasswordStrength password={password} />
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter your password"
                      className={`px-10 h-11 ${errors.confirmPassword ? "border-red-500" : ""}`}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword)
                          setErrors((prev) => ({
                            ...prev,
                            confirmPassword: "",
                          }));
                      }}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      onClick={() => setShowConfirm(!showConfirm)}
                      tabIndex={-1}
                    >
                      {showConfirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex-col space-y-4 pt-2">
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Activate Account
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Protected by CampusIQ Security &middot; 256-bit SSL encryption
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <ActivatePageContent />
    </Suspense>
  );
}
