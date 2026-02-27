"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SessionProvider, useSession } from "next-auth/react";
import Link from "next/link";
import {
  GraduationCap,
  Check,
  Crown,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLANS, type PlanConfig, type BillingCycle } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

// ─── USD Prices (Authorize.net) ──────────────────────────────────────────────
const PLAN_PRICES_USD: Record<string, number> = {
  starter: 0,
  basic: 11.99,
  pro: 23.99,
  enterprise: 47.99,
};

const PLAN_ORDER = ["starter", "basic", "pro", "enterprise"];

function PlanCard({
  plan,
  billing,
  currentPlan,
  onSubscribe,
}: {
  plan: PlanConfig;
  billing: BillingCycle;
  currentPlan: string;
  onSubscribe: () => void;
}) {
  const isCurrent = plan.id === currentPlan;
  const priceUsd = PLAN_PRICES_USD[plan.id] || 0;
  const displayPrice = billing === "monthly" ? priceUsd : priceUsd * 10;
  const currentIdx = PLAN_ORDER.indexOf(currentPlan);
  const thisIdx = PLAN_ORDER.indexOf(plan.id);
  const isUpgrade = thisIdx > currentIdx;

  return (
    <Card
      className={cn(
        "relative flex flex-col transition-shadow hover:shadow-lg",
        plan.popular &&
          !isCurrent &&
          "border-blue-500 ring-2 ring-blue-500 shadow-xl",
        isCurrent && "border-green-500 ring-2 ring-green-500",
      )}
    >
      {plan.popular && !isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-blue-600 text-white shadow">Most Popular</Badge>
        </div>
      )}
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-green-600 text-white shadow">
            <Crown className="mr-1 h-3 w-3" />
            Current Plan
          </Badge>
        </div>
      )}

      <CardHeader className="pb-2">
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <p className="text-sm text-muted-foreground">{plan.description}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="mb-4">
          {priceUsd === 0 ? (
            <span className="text-3xl font-bold">Free</span>
          ) : (
            <>
              <span className="text-3xl font-bold">
                ${displayPrice.toFixed(2)}
              </span>
              <span className="text-muted-foreground">
                /{billing === "monthly" ? "mo" : "yr"}
              </span>
              {billing === "yearly" && displayPrice > 0 && (
                <p className="mt-1 text-xs text-green-600">
                  ${(displayPrice / 12).toFixed(2)}/month billed yearly
                </p>
              )}
            </>
          )}
        </div>

        <ul className="flex-1 space-y-2">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              {f}
            </li>
          ))}
        </ul>

        <div className="mt-6">
          {isCurrent ? (
            <Button className="w-full" variant="outline" disabled>
              <Crown className="mr-2 h-4 w-4" /> Current Plan
            </Button>
          ) : plan.id === "starter" ? (
            <Button className="w-full" variant="outline" disabled>
              Trial Only
            </Button>
          ) : (
            <Button
              className="w-full"
              variant={plan.popular ? "default" : "outline"}
              onClick={onSubscribe}
            >
              {isUpgrade ? "Upgrade" : "Switch"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PlansInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [billing, setBilling] = useState<BillingCycle>("monthly");

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!session) {
    router.push("/login");
    return null;
  }

  const currentPlan = session.user?.plan || "starter";
  const subStatus = session.user?.subscriptionStatus || "trial";

  const handleSubscribe = (planId: string) => {
    router.push(`/checkout?plan=${planId}&cycle=${billing}&source=plans`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-4 dark:from-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-6xl py-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <Link href="/" className="mb-6 inline-flex items-center gap-2">
            <GraduationCap className="h-10 w-10 text-blue-600" />
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              CampusIQ
            </span>
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">
            {subStatus === "expired"
              ? "Your Trial Has Expired"
              : "Choose Your Plan"}
          </h1>
          <p className="mt-2 text-muted-foreground dark:text-muted-foreground">
            {subStatus === "expired"
              ? "Select a plan to continue using CampusIQ"
              : "Upgrade anytime to unlock more features"}
          </p>
          {subStatus === "expired" && (
            <Badge className="mt-3 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
              <Sparkles className="mr-1 h-3 w-3" />
              Your 7-day trial has ended. Please select a plan to continue.
            </Badge>
          )}
          {subStatus === "trial" && (
            <Badge className="mt-3 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <Sparkles className="mr-1 h-3 w-3" />
              You&apos;re on a free trial. Upgrade anytime.
            </Badge>
          )}
        </div>

        {/* Billing toggle */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <span
            className={cn(
              "text-sm font-medium",
              billing === "monthly"
                ? "text-slate-900 dark:text-white"
                : "text-muted-foreground",
            )}
          >
            Monthly
          </span>
          <button
            type="button"
            onClick={() =>
              setBilling((b) => (b === "monthly" ? "yearly" : "monthly"))
            }
            className="relative h-7 w-14 rounded-full bg-blue-600"
          >
            <div
              className={cn(
                "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform",
                billing === "yearly" ? "translate-x-8" : "translate-x-1",
              )}
            />
          </button>
          <span
            className={cn(
              "text-sm font-medium",
              billing === "yearly"
                ? "text-slate-900 dark:text-white"
                : "text-muted-foreground",
            )}
          >
            Yearly{" "}
            <span className="text-xs font-semibold text-green-600">
              Save 17%
            </span>
          </span>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              billing={billing}
              currentPlan={currentPlan}
              onSubscribe={() => handleSubscribe(plan.id)}
            />
          ))}
        </div>

        {/* Secure payment badge */}
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground">
          <Lock className="h-4 w-4" />
          <span>Payments secured by Authorize.net — PCI-DSS compliant</span>
        </div>

        {/* Back to dashboard (only shown if not expired) */}
        {subStatus !== "expired" && (
          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard")}
              className="text-muted-foreground dark:text-muted-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlansPage() {
  return (
    <SessionProvider>
      <PlansInner />
    </SessionProvider>
  );
}
