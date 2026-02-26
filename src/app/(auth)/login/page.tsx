"use client";

import { useState, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  Mail,
  Lock,
  ArrowLeft,
  AlertTriangle,
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

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loginError, setLoginError] = useState("");

  const updateField = useCallback(
    (field: string, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
      if (loginError) setLoginError("");
    },
    [errors, loginError],
  );

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()))
      e.email = "Please enter a valid email address";
    if (!formData.password) e.password = "Password is required";
    else if (formData.password.length < 6)
      e.password = "Password must be at least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    setLoginError("");

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (result?.error) {
        // Show user-friendly error messages
        const err = result.error;
        let errMsg = "";
        if (err.includes("locked")) {
          errMsg = err;
        } else if (err.includes("attempt")) {
          errMsg = err;
        } else if (err.includes("verify")) {
          errMsg =
            "Please verify your email before logging in. Check your inbox.";
        } else {
          errMsg =
            "Invalid email or password. Please check your credentials and try again.";
        }
        setLoginError(errMsg);
        showError("Login Failed", errMsg);
      } else {
        showSuccess("Welcome Back!", "Redirecting you...");
        // Redirect to callback URL or dashboard
        const params = new URLSearchParams(window.location.search);
        const callbackUrl = params.get("callbackUrl") || "/dashboard";
        router.push(callbackUrl);
      }
    } catch (error) {
      console.error("Login error:", error);
      showError(
        "Login Error",
        "An unexpected error occurred. Please try again.",
      );
    } finally {
      setIsLoading(false);
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

        {/* Logo & Brand */}
        <div className="mb-7 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-200/60 dark:shadow-blue-900/30">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>
          <h1 className="mt-4 text-3xl font-bold text-foreground">CampusIQ</h1>
          <p className="mt-1 text-muted-foreground">
            Institution Management System
          </p>
        </div>

        <Card className="shadow-xl border-0 ring-1 ring-slate-200/60 dark:ring-slate-700/40">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* Global Error Banner */}
              {loginError && (
                <div className="flex items-start gap-2.5 rounded-xl bg-red-50 p-3 border border-red-200 dark:bg-red-950/30 dark:border-red-800 animate-in fade-in slide-in-from-top-2 duration-300">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
                    {loginError}
                  </p>
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@institution.com"
                    className={`pl-10 h-11 ${errors.email ? "border-red-500 focus:ring-red-500" : ""}`}
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className={`px-10 h-11 ${errors.password ? "border-red-500 focus:ring-red-500" : ""}`}
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 z-10 cursor-pointer transition-colors"
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
              </div>

              {/* Security Note */}
              <div className="flex items-start gap-2.5 rounded-xl bg-blue-50 p-3 border border-blue-100 dark:bg-blue-950/30 dark:border-blue-900">
                <Shield className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                  Your account is secured with lockout protection. After 5
                  failed attempts, access will be temporarily restricted for 15
                  minutes.
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex-col space-y-4 pt-2">
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Footer Links */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-blue-600 hover:underline font-medium"
            >
              Register your institution
            </Link>
          </p>
          <p className="text-xs text-muted-foreground">
            Protected by CampusIQ Security &middot; 256-bit SSL encryption
          </p>
        </div>
      </div>
    </div>
  );
}
