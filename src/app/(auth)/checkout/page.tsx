"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SessionProvider, useSession } from "next-auth/react";
import Link from "next/link";
import {
  GraduationCap,
  CreditCard,
  Lock,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Building2,
  User,
  MapPin,
  Mail,
  Phone,
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
import { Spinner } from "@/components/ui/spinner";
import { showSuccess, showError } from "@/lib/alerts";
import { PLANS, type PlanId, type BillingCycle } from "@/lib/plans";

// ─── USD Prices ──────────────────────────────────────────────────────────────
const PLAN_PRICES_USD: Record<string, number> = {
  starter: 0,
  basic: 11.99,
  pro: 23.99,
  enterprise: 47.99,
};

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

// ─── Card formatting helpers ─────────────────────────────────────────────────
function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").substring(0, 16);
  const groups = digits.match(/.{1,4}/g);
  return groups ? groups.join(" ") : digits;
}

function getCardBrand(number: string): string {
  const clean = number.replace(/\D/g, "");
  if (/^4/.test(clean)) return "Visa";
  if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return "Mastercard";
  if (/^3[47]/.test(clean)) return "Amex";
  if (/^6(?:011|5)/.test(clean)) return "Discover";
  return "";
}

// ─── Validation ──────────────────────────────────────────────────────────────
interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  cardNumber?: string;
  expMonth?: string;
  expYear?: string;
  cvv?: string;
}

function validateForm(
  billing: typeof initialBilling,
  card: typeof initialCard,
): FormErrors {
  const errors: FormErrors = {};
  if (!billing.firstName.trim()) errors.firstName = "First name is required";
  if (!billing.lastName.trim()) errors.lastName = "Last name is required";
  if (!billing.email.trim() || !/\S+@\S+\.\S+/.test(billing.email))
    errors.email = "Valid email is required";
  if (!billing.address.trim()) errors.address = "Street address is required";
  if (!billing.city.trim()) errors.city = "City is required";
  if (!billing.state) errors.state = "State is required";
  if (!billing.zip.trim() || !/^\d{5}(-\d{4})?$/.test(billing.zip))
    errors.zip = "Valid ZIP code is required";

  const cardDigits = card.number.replace(/\D/g, "");
  if (!cardDigits || cardDigits.length < 13 || cardDigits.length > 16)
    errors.cardNumber = "Valid card number is required";
  if (!card.expMonth) errors.expMonth = "Required";
  if (!card.expYear) errors.expYear = "Required";
  if (!card.cvv || card.cvv.length < 3) errors.cvv = "Valid CVV is required";

  return errors;
}

const initialBilling = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  company: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  country: "US",
};

const initialCard = {
  number: "",
  expMonth: "",
  expYear: "",
  cvv: "",
};

// ─── Checkout Inner Component ────────────────────────────────────────────────
function CheckoutInner() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const planId = (searchParams.get("plan") || "basic") as PlanId;
  const billingCycleParam = (searchParams.get("cycle") ||
    "monthly") as BillingCycle;
  const source = searchParams.get("source") || "plans"; // plans or billing

  const [billingCycle, setBillingCycle] =
    useState<BillingCycle>(billingCycleParam);
  const [billing, setBilling] = useState({ ...initialBilling });
  const [card, setCard] = useState({ ...initialCard });
  const [errors, setErrors] = useState<FormErrors>({});
  const [processing, setProcessing] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const planConfig = PLANS.find((p) => p.id === planId);
  const monthlyPrice = PLAN_PRICES_USD[planId] || 0;
  const totalPrice =
    billingCycle === "monthly" ? monthlyPrice : monthlyPrice * 10;
  const cardBrand = getCardBrand(card.number);

  // Pre-fill email from session
  useEffect(() => {
    if (session?.user?.email && !billing.email) {
      setBilling((prev) => ({
        ...prev,
        email: session.user?.email || prev.email,
      }));
    }
    if (session?.user?.name && !billing.firstName) {
      const parts = (session.user.name || "").split(" ");
      setBilling((prev) => ({
        ...prev,
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" ") || "",
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Current exp month/year defaults
  const currentYear = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: 12 }, (_, i) => currentYear + i),
    [currentYear],
  );

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

  if (!planConfig || planId === "starter" || monthlyPrice <= 0) {
    router.push("/plans");
    return null;
  }

  const handleFieldBlur = (field: string) => {
    setTouched((prev) => new Set(prev).add(field));
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm(billing, card);
    setErrors(validationErrors);

    // Mark all fields as touched
    setTouched(
      new Set([
        "firstName",
        "lastName",
        "email",
        "phone",
        "address",
        "city",
        "state",
        "zip",
        "cardNumber",
        "expMonth",
        "expYear",
        "cvv",
      ]),
    );

    if (Object.keys(validationErrors).length > 0) {
      showError(
        "Validation Error",
        "Please fill in all required fields correctly.",
      );
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch("/api/payment/authorize-net", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardNumber: card.number.replace(/\s/g, ""),
          expMonth: card.expMonth,
          expYear: card.expYear,
          cvv: card.cvv,
          plan: planId,
          billingCycle,
          type: "subscription",
          billingAddress: {
            firstName: billing.firstName.trim(),
            lastName: billing.lastName.trim(),
            email: billing.email.trim(),
            phone: billing.phone.trim(),
            company: billing.company.trim(),
            address: billing.address.trim(),
            city: billing.city.trim(),
            state: billing.state,
            zip: billing.zip.trim(),
            country: billing.country,
          },
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Payment failed");

      showSuccess(
        "Payment Successful!",
        `You are now subscribed to the ${planConfig.name} plan. A receipt has been sent to ${billing.email}.`,
      );

      await update();

      // Redirect based on source
      setTimeout(() => {
        if (source === "billing") {
          router.push("/billing");
        } else {
          router.push("/dashboard");
        }
      }, 1800);
    } catch (err) {
      showError(
        "Payment Failed",
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setProcessing(false);
    }
  };

  const showFieldError = (field: keyof FormErrors) =>
    touched.has(field) && errors[field];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <GraduationCap className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                CampusIQ
              </span>
            </Link>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Lock className="h-4 w-4" />
              <span>Secure Checkout</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Back link */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {source === "billing" ? "Billing" : "Plans"}
        </Button>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* ─── Left: Billing & Payment Form (3 cols) ─────────────────────── */}
          <div className="lg:col-span-3 space-y-6">
            {/* Billing Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Billing Information
                </CardTitle>
                <CardDescription>
                  Enter the billing details for this subscription
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Name row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="firstName"
                      className="flex items-center gap-1"
                    >
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      First Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={billing.firstName}
                      onChange={(e) =>
                        setBilling({ ...billing, firstName: e.target.value })
                      }
                      onBlur={() => handleFieldBlur("firstName")}
                      className={
                        showFieldError("firstName")
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                      }
                    />
                    {showFieldError("firstName") && (
                      <p className="text-xs text-red-500">{errors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="lastName"
                      className="flex items-center gap-1"
                    >
                      Last Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={billing.lastName}
                      onChange={(e) =>
                        setBilling({ ...billing, lastName: e.target.value })
                      }
                      onBlur={() => handleFieldBlur("lastName")}
                      className={
                        showFieldError("lastName")
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                      }
                    />
                    {showFieldError("lastName") && (
                      <p className="text-xs text-red-500">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@school.edu"
                      value={billing.email}
                      onChange={(e) =>
                        setBilling({ ...billing, email: e.target.value })
                      }
                      onBlur={() => handleFieldBlur("email")}
                      className={
                        showFieldError("email")
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                      }
                    />
                    {showFieldError("email") && (
                      <p className="text-xs text-red-500">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={billing.phone}
                      onChange={(e) =>
                        setBilling({ ...billing, phone: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* Company */}
                <div className="space-y-2">
                  <Label htmlFor="company" className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    Institution / Company
                  </Label>
                  <Input
                    id="company"
                    placeholder="Springfield School District"
                    value={billing.company}
                    onChange={(e) =>
                      setBilling({ ...billing, company: e.target.value })
                    }
                  />
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    Street Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="address"
                    placeholder="123 Main Street, Suite 100"
                    value={billing.address}
                    onChange={(e) =>
                      setBilling({ ...billing, address: e.target.value })
                    }
                    onBlur={() => handleFieldBlur("address")}
                    className={
                      showFieldError("address")
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }
                  />
                  {showFieldError("address") && (
                    <p className="text-xs text-red-500">{errors.address}</p>
                  )}
                </div>

                {/* City, State, ZIP */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">
                      City <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="city"
                      placeholder="Springfield"
                      value={billing.city}
                      onChange={(e) =>
                        setBilling({ ...billing, city: e.target.value })
                      }
                      onBlur={() => handleFieldBlur("city")}
                      className={
                        showFieldError("city")
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                      }
                    />
                    {showFieldError("city") && (
                      <p className="text-xs text-red-500">{errors.city}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">
                      State <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={billing.state}
                      onValueChange={(v) =>
                        setBilling({ ...billing, state: v })
                      }
                    >
                      <SelectTrigger
                        id="state"
                        className={
                          showFieldError("state")
                            ? "border-red-500 focus:ring-red-500"
                            : ""
                        }
                        onBlur={() => handleFieldBlur("state")}
                      >
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {showFieldError("state") && (
                      <p className="text-xs text-red-500">{errors.state}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip">
                      ZIP Code <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="zip"
                      placeholder="62704"
                      maxLength={10}
                      value={billing.zip}
                      onChange={(e) =>
                        setBilling({ ...billing, zip: e.target.value })
                      }
                      onBlur={() => handleFieldBlur("zip")}
                      className={
                        showFieldError("zip")
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                      }
                    />
                    {showFieldError("zip") && (
                      <p className="text-xs text-red-500">{errors.zip}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  Payment Method
                </CardTitle>
                <CardDescription>
                  Your card details are encrypted end-to-end and never stored on
                  our servers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Card Number */}
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">
                    Card Number <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="cardNumber"
                      placeholder="4111 1111 1111 1111"
                      value={card.number}
                      maxLength={19}
                      onChange={(e) =>
                        setCard({
                          ...card,
                          number: formatCardNumber(e.target.value),
                        })
                      }
                      onBlur={() => handleFieldBlur("cardNumber")}
                      className={`pr-20 font-mono tracking-wider ${
                        showFieldError("cardNumber")
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                      }`}
                      autoComplete="cc-number"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      {cardBrand && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-semibold px-1.5 py-0"
                        >
                          {cardBrand}
                        </Badge>
                      )}
                      <CreditCard className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                  {showFieldError("cardNumber") && (
                    <p className="text-xs text-red-500">{errors.cardNumber}</p>
                  )}
                </div>

                {/* Exp & CVV */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expMonth">
                      Month <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={card.expMonth}
                      onValueChange={(v) => setCard({ ...card, expMonth: v })}
                    >
                      <SelectTrigger
                        id="expMonth"
                        className={
                          showFieldError("expMonth") ? "border-red-500" : ""
                        }
                        onBlur={() => handleFieldBlur("expMonth")}
                      >
                        <SelectValue placeholder="MM" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => {
                          const m = String(i + 1).padStart(2, "0");
                          return (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {showFieldError("expMonth") && (
                      <p className="text-xs text-red-500">{errors.expMonth}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expYear">
                      Year <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={card.expYear}
                      onValueChange={(v) => setCard({ ...card, expYear: v })}
                    >
                      <SelectTrigger
                        id="expYear"
                        className={
                          showFieldError("expYear") ? "border-red-500" : ""
                        }
                        onBlur={() => handleFieldBlur("expYear")}
                      >
                        <SelectValue placeholder="YYYY" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {showFieldError("expYear") && (
                      <p className="text-xs text-red-500">{errors.expYear}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvv">
                      CVV <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="cvv"
                      type="password"
                      placeholder="123"
                      maxLength={4}
                      value={card.cvv}
                      onChange={(e) =>
                        setCard({
                          ...card,
                          cvv: e.target.value.replace(/\D/g, ""),
                        })
                      }
                      onBlur={() => handleFieldBlur("cvv")}
                      className={`text-center tracking-widest ${
                        showFieldError("cvv")
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                      }`}
                      autoComplete="cc-csc"
                    />
                    {showFieldError("cvv") && (
                      <p className="text-xs text-red-500">{errors.cvv}</p>
                    )}
                  </div>
                </div>

                {/* Security badge */}
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
                  <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Secured by <strong>Authorize.net</strong> — PCI-DSS Level 1
                    compliant. Your card data is encrypted via TLS and
                    tokenized. We never store card numbers.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Submit (mobile) */}
            <div className="lg:hidden">
              <Button
                onClick={handleSubmit}
                disabled={processing}
                className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Pay ${totalPrice.toFixed(2)}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* ─── Right: Order Summary (2 cols) ─────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-8 space-y-6">
              {/* Order Summary Card */}
              <Card className="border-blue-200 dark:border-blue-800">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                  <CardDescription className="text-blue-100">
                    Review your subscription details
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-5">
                  {/* Plan info */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {planConfig.name} Plan
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {planConfig.description}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                    >
                      {planConfig.badge || planConfig.id}
                    </Badge>
                  </div>

                  {/* Billing cycle toggle */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Billing Cycle</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBillingCycle("monthly")}
                        className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                          billingCycle === "monthly"
                            ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-400"
                            : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingCycle("yearly")}
                        className={`relative rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                          billingCycle === "yearly"
                            ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-400"
                            : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
                        }`}
                      >
                        Yearly
                        <span className="ml-1 text-[10px] font-bold text-green-600 dark:text-green-400">
                          -17%
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-200 dark:border-slate-700" />

                  {/* Price breakdown */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">
                        {planConfig.name} Plan (
                        {billingCycle === "monthly" ? "Monthly" : "Yearly"})
                      </span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        ${totalPrice.toFixed(2)}
                      </span>
                    </div>
                    {billingCycle === "yearly" && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600 dark:text-green-400">
                          Yearly Discount (17%)
                        </span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          -${(monthlyPrice * 12 - totalPrice).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                      <div className="flex justify-between">
                        <span className="text-base font-semibold text-slate-900 dark:text-white">
                          Total Due Today
                        </span>
                        <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          ${totalPrice.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Billed{" "}
                        {billingCycle === "monthly"
                          ? "every month"
                          : "annually"}{" "}
                        in USD
                      </p>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                      Included Features
                    </p>
                    <ul className="space-y-2">
                      {planConfig.features.slice(0, 6).map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Submit (desktop) */}
                  <div className="hidden lg:block pt-2">
                    <Button
                      onClick={handleSubmit}
                      disabled={processing}
                      className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700"
                      size="lg"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 h-4 w-4" />
                          Pay ${totalPrice.toFixed(2)}
                        </>
                      )}
                    </Button>
                    <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
                      By completing this purchase you agree to our{" "}
                      <Link
                        href="/terms"
                        className="underline hover:text-slate-600"
                      >
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/privacy"
                        className="underline hover:text-slate-600"
                      >
                        Privacy Policy
                      </Link>
                      .
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Trust signals */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center text-center p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <ShieldCheck className="h-5 w-5 text-green-600 mb-1" />
                  <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 leading-tight">
                    PCI-DSS Compliant
                  </span>
                </div>
                <div className="flex flex-col items-center text-center p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <Lock className="h-5 w-5 text-blue-600 mb-1" />
                  <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 leading-tight">
                    256-bit TLS Encryption
                  </span>
                </div>
                <div className="flex flex-col items-center text-center p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <CreditCard className="h-5 w-5 text-purple-600 mb-1" />
                  <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 leading-tight">
                    Authorize.net
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/50 dark:bg-slate-900/50 dark:border-slate-800 mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <p>
              &copy; {new Date().getFullYear()} CampusIQ. All rights reserved.
            </p>
            <div className="flex items-center gap-1">
              <Lock className="h-3 w-3" />
              <span>
                All transactions are secured and encrypted by Authorize.net
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <SessionProvider>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <Spinner className="h-8 w-8" />
          </div>
        }
      >
        <CheckoutInner />
      </Suspense>
    </SessionProvider>
  );
}
