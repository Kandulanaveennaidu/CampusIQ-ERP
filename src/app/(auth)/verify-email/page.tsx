"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useState } from "react";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Mail,
  ArrowLeft,
} from "lucide-react";
import { showSuccess, showError } from "@/lib/alerts";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const [resendEmail, setResendEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleResend = async () => {
    if (!resendEmail) {
      showError("Error", "Please enter your email address");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(
          data.message || "Verification email sent! Check your inbox.",
        );
      } else {
        showError("Error", data.error || "Failed to resend verification email");
      }
    } catch {
      showError("Error", "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (status === "success") {
    return (
      <div className="flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Email Verified!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Your email has been verified successfully. You can now log in to
            your account.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Link Expired
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This verification link has expired. Please request a new one.
          </p>
          <div className="space-y-3">
            <input
              type="email"
              placeholder="Enter your email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              onClick={handleResend}
              disabled={sending}
              className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {sending ? "Sending..." : "Resend Verification Email"}
            </button>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 mt-4 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>
        </div>
      </div>
    );
  }

  if (status === "invalid" || status === "error") {
    return (
      <div className="flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
            <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Verification Failed
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {status === "invalid"
              ? "The verification link is invalid. Please check the link and try again."
              : "Something went wrong. Please try again or request a new verification email."}
          </p>
          <div className="space-y-3">
            <input
              type="email"
              placeholder="Enter your email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              onClick={handleResend}
              disabled={sending}
              className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {sending ? "Sending..." : "Resend Verification Email"}
            </button>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 mt-4 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>
        </div>
      </div>
    );
  }

  // Default: no status - show "check your email" page
  return (
    <div className="flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
          <Mail className="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Check Your Email
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          We&apos;ve sent a verification link to your email address. Click the
          link to verify your account.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Didn&apos;t receive the email? Check your spam folder or request a new
          one.
        </p>
        <div className="space-y-3">
          <input
            type="email"
            placeholder="Enter your email"
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button
            onClick={handleResend}
            disabled={sending}
            className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {sending ? "Sending..." : "Resend Verification Email"}
          </button>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 mt-4 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
