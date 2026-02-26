"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  GraduationCap,
  Check,
  Zap,
  Users,
  CalendarCheck,
  CreditCard,
  Shield,
  BarChart3,
  BusFront,
  Library,
  BedDouble,
  ArrowRight,
  Star,
  Play,
  Globe,
  Clock,
  Phone,
  Mail,
  MapPin,
  BookOpen,
  FileText,
  DollarSign,
  Bell,
  QrCode,
  Hotel,
  Briefcase,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Sparkles,
  Award,
  TrendingUp,
  HeadphonesIcon,
  Settings,
  Layers,
  Database,
  LockKeyhole,
  Smartphone,
  Monitor,
  Menu,
  X,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS, type PlanConfig } from "@/lib/plans";
import { cn } from "@/lib/utils";

/* ═══════════════════════ HOOKS ═══════════════════════ */

/** Intersection Observer hook for scroll-triggered animations */
function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, ...options },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [options]);

  return { ref, isInView };
}

/** Animated counter hook */
function useCountUp(end: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, start]);
  return count;
}

/* ═══════════════════════ ANIMATED WRAPPER ═══════════════════════ */

type AnimDirection = "up" | "down" | "left" | "right" | "scale" | "fade";

function AnimateOnScroll({
  children,
  direction = "up",
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  direction?: AnimDirection;
  delay?: number;
  className?: string;
}) {
  const { ref, isInView } = useInView();

  const directionClasses: Record<AnimDirection, string> = {
    up: "translate-y-10",
    down: "-translate-y-10",
    left: "translate-x-10",
    right: "-translate-x-10",
    scale: "scale-90",
    fade: "",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        isInView
          ? "opacity-100 translate-y-0 translate-x-0 scale-100"
          : `opacity-0 ${directionClasses[direction]}`,
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════ PARTICLE BACKGROUND ═══════════════════════ */

function ParticleField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-blue-500/10 dark:bg-blue-400/10"
          style={{
            width: `${Math.random() * 6 + 2}px`,
            height: `${Math.random() * 6 + 2}px`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animation: `float ${Math.random() * 6 + 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════ GRADIENT ORB ═══════════════════════ */

function GradientOrb({
  className,
  size = "lg",
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizes = {
    sm: "h-32 w-32",
    md: "h-56 w-56",
    lg: "h-72 w-72",
    xl: "h-96 w-96",
  };
  return (
    <div
      className={cn(
        "absolute rounded-full blur-3xl animate-morph",
        sizes[size],
        className,
      )}
    />
  );
}

/* ═══════════════════════ PLAN CARD ═══════════════════════ */

function PlanCard({
  plan,
  billing,
  index,
}: {
  plan: PlanConfig;
  billing: "monthly" | "yearly";
  index: number;
}) {
  const price = billing === "monthly" ? plan.price : plan.yearlyPrice;
  const monthlyEquivalent =
    billing === "yearly" && plan.yearlyPrice > 0
      ? Math.round(plan.yearlyPrice / 12)
      : null;

  return (
    <AnimateOnScroll direction="up" delay={index * 100}>
      <div
        className={cn(
          "group relative flex h-full flex-col rounded-2xl border bg-white/80 backdrop-blur-sm p-6 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 dark:bg-slate-900/80",
          plan.popular
            ? "border-blue-500 ring-2 ring-blue-500 shadow-xl shadow-blue-500/20 dark:shadow-blue-500/10"
            : "border-slate-200/80 hover:border-blue-300 dark:border-slate-700/80 dark:hover:border-blue-600",
        )}
      >
        {/* Hover gradient overlay */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-50/0 to-indigo-50/0 transition-all duration-500 group-hover:from-blue-50/50 group-hover:to-indigo-50/50 dark:group-hover:from-blue-950/20 dark:group-hover:to-indigo-950/20" />

        <div className="relative z-10 flex flex-col flex-1">
          {plan.popular && (
            <div className="absolute -top-9 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/30">
                <Sparkles className="h-3 w-3" />
                Most Popular
              </span>
            </div>
          )}
          {plan.badge && !plan.popular && (
            <span className="absolute -top-9 left-1/2 -translate-x-1/2 rounded-full bg-amber-100 px-4 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              {plan.badge}
            </span>
          )}

          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {plan.name}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground dark:text-slate-400">
            {plan.description}
          </p>

          <div className="mt-5 mb-6">
            {plan.price === 0 ? (
              <div className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Free
              </div>
            ) : (
              <>
                <div className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  ₹{price.toLocaleString("en-IN")}
                  <span className="text-base font-normal text-muted-foreground">
                    /{billing === "monthly" ? "mo" : "yr"}
                  </span>
                </div>
                {monthlyEquivalent && (
                  <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                    ₹{monthlyEquivalent.toLocaleString("en-IN")}/month billed
                    yearly
                  </p>
                )}
              </>
            )}
          </div>

          <ul className="flex-1 space-y-2.5">
            {plan.features.map((f) => (
              <li
                key={f}
                className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                {f}
              </li>
            ))}
          </ul>

          <Button
            asChild
            className={cn(
              "mt-6 w-full group/btn transition-all duration-300",
              plan.popular
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25"
                : "",
            )}
            size="lg"
            variant={plan.popular ? "default" : "outline"}
          >
            <Link href="/register">
              {plan.price === 0 ? "Start Free Trial" : "Get Started"}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </AnimateOnScroll>
  );
}

/* ═══════════════════════ DATA ═══════════════════════ */

const FEATURE_HIGHLIGHTS: {
  icon: LucideIcon;
  title: string;
  desc: string;
  color: string;
  gradient: string;
}[] = [
  {
    icon: Users,
    title: "Student Management",
    desc: "Complete student lifecycle from admission to graduation — enrollment, profiles, parent info, class assignments, and more.",
    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: CalendarCheck,
    title: "Smart Attendance",
    desc: "QR-based, manual, subject-wise and teacher attendance. Real-time tracking with automated reports.",
    color:
      "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: GraduationCap,
    title: "Exam & Grades",
    desc: "Full exam scheduling, grade entry, automatic GPA calculation, and downloadable report cards.",
    color:
      "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: DollarSign,
    title: "Fee Management",
    desc: "Create fee structures, track payments, generate receipts, and send automated reminders.",
    color:
      "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    icon: BedDouble,
    title: "Hostel Management",
    desc: "Room & bed allocation, floor management, warden assignment, and occupancy tracking.",
    color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
    gradient: "from-rose-500 to-pink-500",
  },
  {
    icon: Library,
    title: "Library System",
    desc: "Book catalog, issuing, returns, fine management with barcode scanning support.",
    color:
      "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
    gradient: "from-indigo-500 to-blue-500",
  },
  {
    icon: BusFront,
    title: "Transport",
    desc: "Route planning, vehicle tracking, driver details, and student transport allocation.",
    color: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
    gradient: "from-cyan-500 to-teal-500",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    desc: "Comprehensive dashboards, attendance reports, financial summaries with CSV/PDF exports.",
    color: "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
    gradient: "from-teal-500 to-green-500",
  },
  {
    icon: BookOpen,
    title: "Academic Management",
    desc: "Departments, subjects, semesters, academic years, and student promotions — all in one place.",
    color:
      "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    gradient: "from-orange-500 to-red-500",
  },
  {
    icon: Briefcase,
    title: "Faculty Workload",
    desc: "Track and allocate teaching hours, class loads, and workload reports per teacher.",
    color: "bg-lime-100 text-lime-600 dark:bg-lime-900/30 dark:text-lime-400",
    gradient: "from-lime-500 to-green-500",
  },
  {
    icon: CreditCard,
    title: "Salary Management",
    desc: "Automated salary calculation, payslips, deduction management, and payment history.",
    color: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: Shield,
    title: "Roles & Permissions",
    desc: "Granular role-based access control with custom roles and per-module permissions.",
    color:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    gradient: "from-emerald-500 to-teal-500",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Register Your Institution",
    desc: "Create your institution account in under 2 minutes. No credit card required for the free trial.",
    icon: FileText,
    color: "from-blue-500 to-cyan-500",
  },
  {
    step: "02",
    title: "Configure & Customize",
    desc: "Set up classes, add teachers, configure fee structures, and customize settings for your institution.",
    icon: Settings,
    color: "from-purple-500 to-pink-500",
  },
  {
    step: "03",
    title: "Add Students & Staff",
    desc: "Import students via bulk upload or add individually. Assign roles, permissions and access levels.",
    icon: Users,
    color: "from-amber-500 to-orange-500",
  },
  {
    step: "04",
    title: "Go Live & Manage",
    desc: "Start taking attendance, managing fees, scheduling exams — everything from your dashboard.",
    icon: Sparkles,
    color: "from-green-500 to-emerald-500",
  },
];

const STATS = [
  { value: 43, suffix: "+", label: "Modules", icon: Globe, isDecimal: false },
  {
    value: 50,
    suffix: "+",
    label: "API Endpoints",
    icon: Zap,
    isDecimal: false,
  },
  {
    value: 999,
    suffix: "%",
    label: "Uptime",
    icon: TrendingUp,
    isDecimal: true,
  },
  {
    value: 24,
    suffix: "/7",
    label: "Support",
    icon: HeadphonesIcon,
    isDecimal: false,
  },
];

const TESTIMONIALS = [
  {
    name: "Dr. Rajesh Kumar",
    role: "Principal, Delhi Public School",
    quote:
      "CampusIQ transformed how we manage our school. Attendance tracking that used to take hours now happens in minutes. The fee management module alone saved us from hiring an extra accountant.",
    rating: 5,
    avatar: "RK",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    name: "Priya Sharma",
    role: "Admin, St. Mary's Academy",
    quote:
      "We switched from paper-based systems to CampusIQ and the difference is night and day. Parents love the real-time attendance notifications. The QR code attendance feature is a game changer.",
    rating: 5,
    avatar: "PS",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    name: "Mohammed Fahad",
    role: "Director, Al-Ameen Group of Schools",
    quote:
      "Managing 3 branches with 5000+ students used to be chaotic. CampusIQ's multi-tenant architecture and role-based access made centralized management possible. Highly recommended!",
    rating: 5,
    avatar: "MF",
    gradient: "from-amber-500 to-orange-500",
  },
];

const WHY_CAMPUSIQ = [
  {
    icon: LockKeyhole,
    title: "Secure & Reliable",
    desc: "Enterprise-grade security with encrypted data, role-based access, and automatic backups.",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: Smartphone,
    title: "Mobile Friendly",
    desc: "Access from any device — desktop, tablet, or mobile. Fully responsive design.",
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    icon: Layers,
    title: "Modular Architecture",
    desc: "Only pay for modules you need. Start small and add features as your institution grows.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: Database,
    title: "Cloud-Based",
    desc: "No software to install. Access your data from anywhere with automatic updates.",
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    icon: Monitor,
    title: "Real-Time Dashboard",
    desc: "Live statistics, instant notifications, and real-time insights at your fingertips.",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    icon: HeadphonesIcon,
    title: "Dedicated Support",
    desc: "Priority support with dedicated account managers for Pro and Enterprise plans.",
    gradient: "from-rose-500 to-pink-500",
  },
];

const FAQS = [
  {
    q: "How long is the free trial?",
    a: "CampusIQ offers a 7-day free trial on the Starter plan. You get access to core features including student management, attendance tracking, and dashboard — no credit card required.",
  },
  {
    q: "Can I upgrade or downgrade my plan anytime?",
    a: "Yes! You can upgrade your plan at any time and the billing will be prorated. Downgrades take effect at the end of your current billing cycle.",
  },
  {
    q: "Is my data secure?",
    a: "Absolutely. We use industry-standard encryption, multi-tenant data isolation, and automatic backups. Each institution's data is completely separated and cannot be accessed by other institutions.",
  },
  {
    q: "Do you support bulk student import?",
    a: "Yes. You can import students, teachers, and other data via CSV files. We also provide downloadable templates to make the process seamless.",
  },
  {
    q: "Can I manage multiple branches?",
    a: "Yes, our Enterprise plan supports multi-branch management with centralized admin control, separate data for each branch, and consolidated reporting.",
  },
  {
    q: "What kind of support do you offer?",
    a: "We offer email support for all plans, priority support for Pro plans, and a dedicated account manager for Enterprise plans. Our support team is available 24/7.",
  },
];

const MODULES = [
  { icon: Users, label: "Students" },
  { icon: GraduationCap, label: "Teachers" },
  { icon: CalendarCheck, label: "Attendance" },
  { icon: QrCode, label: "QR Attendance" },
  { icon: FileText, label: "Exams" },
  { icon: DollarSign, label: "Fees" },
  { icon: CreditCard, label: "Salary" },
  { icon: BookOpen, label: "Academics" },
  { icon: Clock, label: "Timetable" },
  { icon: Library, label: "Library" },
  { icon: Hotel, label: "Hostel" },
  { icon: BusFront, label: "Transport" },
  { icon: Bell, label: "Notifications" },
  { icon: BarChart3, label: "Reports" },
  { icon: Shield, label: "Permissions" },
  { icon: Briefcase, label: "Workload" },
  { icon: Database, label: "Backup" },
  { icon: Settings, label: "Settings" },
];

/* ═══════════════════════ STAT COUNTER ═══════════════════════ */

function StatCounter({ stat }: { stat: (typeof STATS)[number] }) {
  const { ref, isInView } = useInView();
  const count = useCountUp(stat.value, 2000, isInView);
  const display = stat.isDecimal ? "99.9" : count;

  return (
    <div ref={ref} className="group relative text-center">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative p-6">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 transition-transform duration-300 group-hover:scale-110">
          <stat.icon className="h-7 w-7 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          {display}
          {stat.suffix}
        </div>
        <div className="mt-1 text-sm font-medium text-muted-foreground dark:text-slate-400">
          {stat.label}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ TYPING TEXT ═══════════════════════ */

function TypingText({ words }: { words: string[] }) {
  const [currentWord, setCurrentWord] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const word = words[currentWord];
    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          setDisplayed(word.slice(0, displayed.length + 1));
          if (displayed.length === word.length) {
            setTimeout(() => setIsDeleting(true), 2000);
          }
        } else {
          setDisplayed(word.slice(0, displayed.length - 1));
          if (displayed.length === 0) {
            setIsDeleting(false);
            setCurrentWord((c) => (c + 1) % words.length);
          }
        }
      },
      isDeleting ? 50 : 100,
    );
    return () => clearTimeout(timeout);
  }, [displayed, isDeleting, currentWord, words]);

  return (
    <span className="relative inline-block">
      <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
        {displayed}
      </span>
      <span className="ml-0.5 inline-block w-[3px] h-[0.85em] bg-blue-600 animate-pulse align-middle" />
    </span>
  );
}

/* ═══════════════════════ MAIN COMPONENT ═══════════════════════ */

export default function LandingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left - rect.width / 2) / 50,
      y: (e.clientY - rect.top - rect.height / 2) / 50,
    });
  }, []);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
    { label: "Testimonials", href: "#testimonials" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <div className="min-h-screen bg-background dark:bg-background overflow-x-hidden">
      {/* ═══════════════════ NAVBAR ═══════════════════ */}
      <nav
        className={cn(
          "fixed top-0 z-50 w-full transition-all duration-500",
          scrolled
            ? "border-b border-slate-200/60 bg-white/70 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:border-slate-800/60 dark:bg-slate-950/70"
            : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-blue-600/20 blur-md transition-all group-hover:bg-blue-600/30" />
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              CampusIQ
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="relative px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white group"
              >
                {link.label}
                <span className="absolute bottom-0 left-1/2 h-0.5 w-0 bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 group-hover:left-2 group-hover:w-[calc(100%-16px)]" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex font-medium"
            >
              <Link href="/login">Sign In</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30"
            >
              <Link href="/register">
                Get Started Free
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
            <button
              type="button"
              className="md:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={cn(
            "md:hidden overflow-hidden transition-all duration-500 ease-in-out border-t border-slate-200/60 dark:border-slate-800/60",
            mobileMenuOpen
              ? "max-h-96 opacity-100 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl"
              : "max-h-0 opacity-0 border-t-0",
          )}
        >
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-blue-950/30 dark:hover:text-blue-400 transition-colors"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section
        className="relative overflow-hidden px-4 pb-28 pt-32 sm:pt-36 lg:pt-40 min-h-[90vh] flex items-center"
        onMouseMove={handleMouseMove}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/80 via-white to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-950" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #6366f1 1px, transparent 1px), linear-gradient(to bottom, #6366f1 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <GradientOrb
          className="bg-blue-400/20 dark:bg-blue-600/10 top-20 -left-20"
          size="xl"
        />
        <GradientOrb
          className="bg-indigo-400/20 dark:bg-indigo-600/10 top-40 -right-20"
          size="lg"
        />
        <GradientOrb
          className="bg-purple-400/15 dark:bg-purple-600/10 bottom-20 left-1/3"
          size="md"
        />

        <ParticleField />

        {/* Floating decorative icons */}
        <div
          className="absolute top-32 left-[10%] hidden lg:block animate-float opacity-20"
          style={{
            transform: `translate(${mousePos.x * 2}px, ${mousePos.y * 2}px)`,
          }}
        >
          <BookOpen className="h-12 w-12 text-blue-500" />
        </div>
        <div
          className="absolute top-48 right-[12%] hidden lg:block animate-float-slow opacity-20"
          style={{
            transform: `translate(${mousePos.x * -1.5}px, ${mousePos.y * -1.5}px)`,
          }}
        >
          <GraduationCap className="h-16 w-16 text-indigo-500" />
        </div>
        <div
          className="absolute bottom-40 left-[8%] hidden lg:block animate-float-reverse opacity-15"
          style={{
            transform: `translate(${mousePos.x * 1}px, ${mousePos.y * 1}px)`,
          }}
        >
          <CalendarCheck className="h-10 w-10 text-purple-500" />
        </div>
        <div
          className="absolute bottom-60 right-[8%] hidden lg:block animate-float opacity-15"
          style={{
            animationDelay: "2s",
            transform: `translate(${mousePos.x * -2}px, ${mousePos.y * -2}px)`,
          }}
        >
          <BarChart3 className="h-12 w-12 text-cyan-500" />
        </div>

        <div className="relative mx-auto max-w-6xl text-center">
          {/* Badge */}
          <div
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-blue-50/80 backdrop-blur-sm px-5 py-2 text-sm font-medium text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/50 dark:text-blue-300 shadow-sm animate-slide-down opacity-0"
            style={{ animationFillMode: "forwards" }}
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 animate-pulse">
              <Zap className="h-3 w-3 text-white" />
            </div>
            Trusted by 500+ institutions across India
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>

          {/* Main heading with typing effect */}
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl md:text-6xl lg:text-7xl xl:text-[5.2rem] leading-[1.1]">
            <span
              className="block animate-slide-up opacity-0"
              style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
            >
              The Complete
            </span>
            <span
              className="block mt-2 animate-slide-up opacity-0"
              style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
            >
              <TypingText
                words={[
                  "Institution Management",
                  "Attendance System",
                  "Fee Management",
                  "Exam Platform",
                ]}
              />
            </span>
            <span
              className="block mt-2 animate-slide-up opacity-0"
              style={{ animationDelay: "0.5s", animationFillMode: "forwards" }}
            >
              Platform
            </span>
          </h1>

          <p
            className="mx-auto mt-8 max-w-3xl text-lg text-slate-600 dark:text-slate-400 sm:text-xl leading-relaxed animate-slide-up opacity-0"
            style={{ animationDelay: "0.7s", animationFillMode: "forwards" }}
          >
            Streamline attendance, fees, exams, hostel, library, transport,
            salary — and{" "}
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              20+ more modules
            </span>
            . Built for modern institutions, trusted by thousands.
          </p>

          {/* CTA buttons */}
          <div
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row animate-slide-up opacity-0"
            style={{ animationDelay: "0.9s", animationFillMode: "forwards" }}
          >
            <Button
              asChild
              size="lg"
              className="group h-14 px-10 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl shadow-blue-500/25 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
            >
              <Link href="/register">
                Start Free 7-Day Trial
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="group h-14 px-10 text-lg border-slate-300 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 hover:-translate-y-0.5"
            >
              <a href="#how-it-works">
                <div className="relative mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md">
                  <Play className="h-3.5 w-3.5 text-white ml-0.5" />
                </div>
                See How It Works
              </a>
            </Button>
          </div>

          {/* Trust badges */}
          <div
            className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground dark:text-slate-400 animate-slide-up opacity-0"
            style={{ animationDelay: "1.1s", animationFillMode: "forwards" }}
          >
            {[
              { icon: Shield, label: "No credit card required" },
              { icon: Check, label: "7-day free trial" },
              { icon: Check, label: "Cancel anytime" },
              { icon: Check, label: "20+ modules" },
            ].map((badge) => (
              <div
                key={badge.label}
                className="flex items-center gap-2 transition-colors hover:text-slate-700 dark:hover:text-slate-300"
              >
                <badge.icon className="h-4 w-4 text-green-500" />
                {badge.label}
              </div>
            ))}
          </div>

          {/* Hero Dashboard Preview */}
          <div
            className="relative mx-auto mt-20 max-w-5xl animate-slide-up opacity-0"
            style={{ animationDelay: "1.3s", animationFillMode: "forwards" }}
          >
            <div
              className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-sm p-2 shadow-2xl shadow-slate-900/10 dark:border-slate-700/80 dark:bg-slate-900/90 dark:shadow-blue-900/10 transition-transform duration-500"
              style={{
                transform: `perspective(1000px) rotateY(${mousePos.x * 0.15}deg) rotateX(${-mousePos.y * 0.15}deg)`,
              }}
            >
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b px-4 py-2.5 dark:border-slate-700/80 rounded-t-xl bg-slate-50/80 dark:bg-slate-800/50">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400 shadow-inner" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400 shadow-inner" />
                  <div className="h-3 w-3 rounded-full bg-green-400 shadow-inner" />
                </div>
                <div className="flex-1 mx-8">
                  <div className="mx-auto max-w-sm rounded-md bg-white dark:bg-slate-700 px-4 py-1 text-center text-xs text-slate-400 dark:text-muted-foreground border border-slate-200 dark:border-slate-600">
                    <LockKeyhole className="inline h-3 w-3 mr-1 -mt-0.5" />
                    app.campusiq.in/dashboard
                  </div>
                </div>
              </div>

              {/* Dashboard content */}
              <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
                {[
                  {
                    label: "Total Students",
                    value: "2,450",
                    color: "text-blue-600",
                    bg: "bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10",
                    icon: Users,
                  },
                  {
                    label: "Present Today",
                    value: "2,180",
                    color: "text-green-600",
                    bg: "bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10",
                    icon: Check,
                  },
                  {
                    label: "Fee Collected",
                    value: "₹12.5L",
                    color: "text-amber-600",
                    bg: "bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10",
                    icon: DollarSign,
                  },
                  {
                    label: "Active Teachers",
                    value: "156",
                    color: "text-purple-600",
                    bg: "bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10",
                    icon: GraduationCap,
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={cn(
                      "rounded-xl p-4 transition-all duration-300 hover:scale-105",
                      stat.bg,
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground dark:text-slate-400">
                        {stat.label}
                      </p>
                      <stat.icon className={cn("h-4 w-4", stat.color)} />
                    </div>
                    <p
                      className={cn(
                        "mt-2 text-xl font-bold sm:text-2xl",
                        stat.color,
                      )}
                    >
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-4 px-6 pb-6 sm:grid-cols-3">
                <div className="col-span-1 rounded-xl border border-slate-200/80 p-4 dark:border-slate-700/80 sm:col-span-2 bg-white/50 dark:bg-slate-800/30">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Attendance This Week
                  </p>
                  <div className="mt-4 flex items-end gap-2">
                    {[85, 92, 88, 95, 90, 87, 93].map((v, i) => (
                      <div
                        key={i}
                        className="flex flex-1 flex-col items-center gap-1.5"
                      >
                        <div
                          className="w-full rounded-lg bg-gradient-to-t from-blue-600 to-blue-400 dark:from-blue-700 dark:to-blue-500 transition-all duration-500 hover:from-indigo-600 hover:to-indigo-400"
                          style={{ height: `${v * 0.8}px` }}
                        />
                        <span className="text-[10px] font-medium text-slate-400">
                          {["M", "T", "W", "T", "F", "S", "S"][i]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200/80 p-4 dark:border-slate-700/80 bg-white/50 dark:bg-slate-800/30">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Quick Actions
                  </p>
                  <div className="mt-3 space-y-2">
                    {[
                      "Mark Attendance",
                      "Add Student",
                      "Create Exam",
                      "Send Notice",
                    ].map((action) => (
                      <div
                        key={action}
                        className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 dark:bg-slate-800/80 dark:text-slate-300 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 cursor-pointer"
                      >
                        <ChevronRight className="h-3 w-3" />
                        {action}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Glow effects */}
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-r from-blue-400/20 via-indigo-400/20 to-purple-400/20 blur-3xl animate-pulse-glow dark:from-blue-600/10 dark:via-indigo-600/10 dark:to-purple-600/10" />
            <div
              className="absolute -inset-8 -z-20 rounded-3xl bg-gradient-to-r from-blue-300/10 to-purple-300/10 blur-3xl animate-pulse-glow dark:from-blue-700/5 dark:to-purple-700/5"
              style={{ animationDelay: "1.5s" }}
            />
          </div>

          {/* Scroll indicator */}
          <div className="mt-12 flex justify-center animate-bounce-subtle">
            <a
              href="#stats"
              className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600 transition-colors"
            >
              <span className="text-xs font-medium">Scroll to explore</span>
              <ChevronDown className="h-5 w-5" />
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════ STATS BAR ═══════════════════ */}
      <section
        id="stats"
        className="relative border-y border-slate-200/60 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:border-slate-800/60 dark:from-slate-900/50 dark:via-slate-900/80 dark:to-slate-900/50"
      >
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-16 sm:grid-cols-4">
          {STATS.map((stat) => (
            <StatCounter key={stat.label} stat={stat} />
          ))}
        </div>
      </section>

      {/* ═══════════════════ FEATURES ═══════════════════ */}
      <section id="features" className="relative px-4 py-28">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <GradientOrb
            className="bg-blue-400/5 dark:bg-blue-600/5 -top-20 -right-40"
            size="xl"
          />
          <GradientOrb
            className="bg-purple-400/5 dark:bg-purple-600/5 bottom-20 -left-40"
            size="lg"
          />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <AnimateOnScroll direction="up" className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-blue-50/80 px-5 py-2 text-sm font-semibold text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/50 dark:text-blue-300 backdrop-blur-sm">
              <Layers className="h-4 w-4" />
              20+ Powerful Modules
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">
              Everything You Need to{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Run Your Institution
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
              Comprehensive tools designed for modern education management —
              from admission to graduation.
            </p>
          </AnimateOnScroll>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {FEATURE_HIGHLIGHTS.map((f, i) => (
              <AnimateOnScroll key={f.title} direction="up" delay={i * 60}>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 dark:border-slate-700/80 dark:bg-slate-900/80">
                  {/* Gradient hover border effect */}
                  <div
                    className={cn(
                      "absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100",
                      "bg-gradient-to-br",
                      f.gradient,
                    )}
                    style={{ padding: "1px" }}
                  >
                    <div className="h-full w-full rounded-2xl bg-white dark:bg-slate-900" />
                  </div>

                  {/* Gradient glow on hover */}
                  <div
                    className={cn(
                      "absolute -inset-px rounded-2xl bg-gradient-to-br opacity-0 blur-xl transition-all duration-500 group-hover:opacity-20",
                      f.gradient,
                    )}
                  />

                  <div className="relative">
                    <div
                      className={cn(
                        "mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg",
                        f.color,
                      )}
                    >
                      <f.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {f.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground dark:text-slate-400">
                      {f.desc}
                    </p>
                  </div>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
      <section
        id="how-it-works"
        className="relative bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-950 px-4 py-28 overflow-hidden"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-blue-100/30 dark:bg-blue-900/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <AnimateOnScroll direction="up" className="mb-20 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-green-200/60 bg-green-50/80 px-5 py-2 text-sm font-semibold text-green-700 dark:border-green-800/60 dark:bg-green-950/50 dark:text-green-300">
              <Sparkles className="h-4 w-4" />
              Simple Setup
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">
              Get Started in{" "}
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                4 Easy Steps
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
              Setting up CampusIQ takes minutes, not days. Here&apos;s how it
              works.
            </p>
          </AnimateOnScroll>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((item, idx) => (
              <AnimateOnScroll key={item.step} direction="up" delay={idx * 150}>
                <div className="relative group">
                  {idx < HOW_IT_WORKS.length - 1 && (
                    <div className="absolute top-14 left-[calc(50%+48px)] hidden w-[calc(100%-48px)] lg:block">
                      <div className="h-0.5 w-full bg-gradient-to-r from-blue-300 via-blue-200 to-transparent dark:from-blue-700 dark:via-blue-800 dark:to-transparent" />
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-blue-300 dark:bg-blue-700" />
                    </div>
                  )}

                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-6">
                      <div
                        className={cn(
                          "absolute inset-0 rounded-2xl bg-gradient-to-br blur-xl opacity-50 transition-opacity group-hover:opacity-80",
                          item.color,
                        )}
                      />
                      <div
                        className={cn(
                          "relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
                          item.color,
                        )}
                      >
                        <item.icon className="h-10 w-10 text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-lg border-2 border-blue-200 dark:border-blue-800">
                        <span className="text-xs font-extrabold text-blue-600">
                          {item.step}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm text-muted-foreground dark:text-slate-400 leading-relaxed max-w-[250px]">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ WHY CAMPUSIQ ═══════════════════ */}
      <section className="relative px-4 py-28 overflow-hidden">
        <GradientOrb
          className="bg-purple-400/10 dark:bg-purple-600/5 -top-40 right-0"
          size="xl"
        />

        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <AnimateOnScroll direction="right">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-200/60 bg-purple-50/80 px-5 py-2 text-sm font-semibold text-purple-700 dark:border-purple-800/60 dark:bg-purple-950/50 dark:text-purple-300">
                  <Award className="h-4 w-4" />
                  Why Choose Us
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
                  Built for Institutions That Want to{" "}
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Go Digital
                  </span>
                </h2>
                <p className="mt-5 text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                  CampusIQ is designed from the ground up for Indian
                  institutions and institutions. We understand your workflows,
                  compliance needs, and budget constraints.
                </p>

                <div className="mt-8 space-y-4">
                  {[
                    "Multi-tenant architecture — each institution's data is completely isolated",
                    "Built-in role-based access control (Admin, Teacher, Student, Parent)",
                    "Works on any device — desktop, tablet, or smartphone",
                    "Indian Rupee billing with GST-compliant invoicing",
                    "Supports regional languages and local academic patterns",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 group/item"
                    >
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-transform duration-300 group-hover/item:scale-110">
                        <Check className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>

                <Button
                  asChild
                  size="lg"
                  className="mt-10 group h-13 px-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/30"
                >
                  <Link href="/register">
                    Start Your Free Trial
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll direction="left">
              <div className="grid grid-cols-2 gap-4">
                {WHY_CAMPUSIQ.map((item) => (
                  <div
                    key={item.title}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 dark:border-slate-700/80 dark:bg-slate-900/80"
                  >
                    <div
                      className={cn(
                        "absolute -inset-1 rounded-2xl bg-gradient-to-br opacity-0 blur-xl transition-all duration-500 group-hover:opacity-15",
                        item.gradient,
                      )}
                    />

                    <div className="relative">
                      <div
                        className={cn(
                          "mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg",
                          item.gradient,
                        )}
                      >
                        <item.icon className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </h3>
                      <p className="mt-1.5 text-xs text-muted-foreground dark:text-slate-400 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      {/* ═══════════════════ MODULES SHOWCASE ═══════════════════ */}
      <section className="relative bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 px-4 py-28 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, #60a5fa 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <GradientOrb className="bg-blue-600/10 top-0 left-1/4" size="xl" />
        <GradientOrb
          className="bg-indigo-600/10 bottom-0 right-1/4"
          size="lg"
        />

        <div className="relative mx-auto max-w-7xl">
          <AnimateOnScroll direction="up" className="mb-16 text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
              One Platform,{" "}
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Endless Possibilities
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400">
              Every module works together seamlessly to give you a complete
              institution management solution.
            </p>
          </AnimateOnScroll>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {MODULES.map((mod, i) => (
              <AnimateOnScroll key={mod.label} direction="scale" delay={i * 40}>
                <div className="group relative flex flex-col items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-800/30 backdrop-blur-sm p-5 transition-all duration-500 hover:border-blue-500/60 hover:bg-blue-500/10 hover:-translate-y-1 cursor-pointer">
                  <div className="absolute inset-0 rounded-xl bg-blue-500/5 opacity-0 transition-opacity group-hover:opacity-100" />

                  <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-slate-700/50 transition-all duration-300 group-hover:bg-blue-500/20 group-hover:scale-110">
                    <mod.icon className="h-6 w-6 text-slate-400 transition-colors duration-300 group-hover:text-blue-400" />
                  </div>
                  <span className="relative text-xs font-semibold text-slate-400 transition-colors group-hover:text-white">
                    {mod.label}
                  </span>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ TESTIMONIALS ═══════════════════ */}
      <section
        id="testimonials"
        className="relative px-4 py-28 overflow-hidden"
      >
        <GradientOrb
          className="bg-amber-400/5 dark:bg-amber-600/5 top-0 right-0"
          size="xl"
        />

        <div className="relative mx-auto max-w-7xl">
          <AnimateOnScroll direction="up" className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200/60 bg-amber-50/80 px-5 py-2 text-sm font-semibold text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-300">
              <Star className="h-4 w-4 fill-amber-500" />
              Testimonials
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
              Loved by Institutions{" "}
              <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                Across India
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
              Don&apos;t just take our word for it — hear from the educators who
              use CampusIQ every day.
            </p>
          </AnimateOnScroll>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <AnimateOnScroll key={t.name} direction="up" delay={i * 150}>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-8 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 dark:border-slate-700/80 dark:bg-slate-900/80">
                  <div className="absolute top-4 right-6 text-7xl font-serif text-slate-100 dark:text-slate-800 leading-none select-none">
                    &ldquo;
                  </div>

                  <div className="relative mb-5 flex gap-1">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star
                        key={j}
                        className="h-5 w-5 fill-amber-400 text-amber-400 transition-transform duration-300"
                        style={{ transitionDelay: `${j * 50}ms` }}
                      />
                    ))}
                  </div>

                  <blockquote className="relative text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>

                  <div className="relative mt-6 flex items-center gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <div
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-lg transition-transform duration-300 group-hover:scale-110",
                        t.gradient,
                      )}
                    >
                      {t.avatar}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {t.name}
                      </p>
                      <p className="text-xs text-muted-foreground dark:text-slate-400">
                        {t.role}
                      </p>
                    </div>
                  </div>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ PRICING ═══════════════════ */}
      <section
        id="pricing"
        className="relative bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-950 px-4 py-28 overflow-hidden"
      >
        <GradientOrb
          className="bg-green-400/5 dark:bg-green-600/5 -top-20 left-1/4"
          size="xl"
        />
        <GradientOrb
          className="bg-blue-400/5 dark:bg-blue-600/5 bottom-20 right-1/4"
          size="lg"
        />

        <div className="relative mx-auto max-w-7xl">
          <AnimateOnScroll direction="up" className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-green-200/60 bg-green-50/80 px-5 py-2 text-sm font-semibold text-green-700 dark:border-green-800/60 dark:bg-green-950/50 dark:text-green-300">
              <CreditCard className="h-4 w-4" />
              Pricing Plans
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">
              Simple,{" "}
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Transparent Pricing
              </span>
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              Choose the plan that fits your institution. Upgrade anytime.
            </p>

            {/* Enhanced billing toggle */}
            <div className="mt-10 inline-flex items-center gap-4 rounded-full bg-white dark:bg-slate-800 p-1.5 shadow-lg border border-slate-200/80 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => setBilling("monthly")}
                className={cn(
                  "rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-300",
                  billing === "monthly"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
                )}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBilling("yearly")}
                className={cn(
                  "rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-300 flex items-center gap-2",
                  billing === "yearly"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
                )}
              >
                Yearly
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors",
                    billing === "yearly"
                      ? "bg-white/20 text-white"
                      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                  )}
                >
                  -17%
                </span>
              </button>
            </div>
          </AnimateOnScroll>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan, i) => (
              <PlanCard key={plan.id} plan={plan} billing={billing} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ FAQ ═══════════════════ */}
      <section id="faq" className="relative px-4 py-28">
        <div className="relative mx-auto max-w-3xl">
          <AnimateOnScroll direction="up" className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-indigo-50/80 px-5 py-2 text-sm font-semibold text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-950/50 dark:text-indigo-300">
              <Bell className="h-4 w-4" />
              FAQ
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
              Frequently Asked{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Questions
              </span>
            </h2>
            <p className="mt-5 text-lg text-slate-600 dark:text-slate-400">
              Got questions? We&apos;ve got answers.
            </p>
          </AnimateOnScroll>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => (
              <AnimateOnScroll key={idx} direction="up" delay={idx * 80}>
                <div className="group rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-sm transition-all duration-300 hover:border-blue-200 hover:shadow-lg dark:border-slate-700/80 dark:bg-slate-900/80 dark:hover:border-blue-800 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="flex w-full items-center justify-between px-6 py-5 text-left"
                  >
                    <span className="font-semibold text-slate-900 dark:text-white pr-4">
                      {faq.q}
                    </span>
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                        openFaq === idx
                          ? "bg-blue-600 text-white rotate-180"
                          : "bg-slate-100 text-slate-400 dark:bg-slate-800",
                      )}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </button>
                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-500 ease-in-out",
                      openFaq === idx
                        ? "max-h-48 opacity-100"
                        : "max-h-0 opacity-0",
                    )}
                  >
                    <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {faq.a}
                    </div>
                  </div>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ CTA ═══════════════════ */}
      <section className="relative overflow-hidden px-4 py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700" />

        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="absolute top-10 left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl animate-float" />
        <div className="absolute bottom-10 right-10 h-60 w-60 rounded-full bg-white/10 blur-3xl animate-float-slow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-white/5 blur-3xl animate-morph" />

        <AnimateOnScroll
          direction="up"
          className="relative mx-auto max-w-3xl text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm px-5 py-2 text-sm font-semibold text-white border border-white/20">
            <Sparkles className="h-4 w-4" />
            Start Today — It&apos;s Free
          </div>
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl leading-tight">
            Ready to Transform Your Institution?
          </h2>
          <p className="mt-6 text-lg text-blue-100/90 leading-relaxed max-w-2xl mx-auto">
            Join 500+ institutions already using CampusIQ to manage their
            institutions efficiently. Start your free 7-day trial today — no
            credit card required.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="group h-14 bg-white px-10 text-lg text-blue-600 hover:bg-blue-50 shadow-xl shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl"
            >
              <Link href="/register">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 border-white/30 px-10 text-lg text-white hover:bg-white/10 transition-all duration-300 hover:-translate-y-0.5 backdrop-blur-sm"
            >
              <Link href="/login">Sign In to Dashboard</Link>
            </Button>
          </div>
        </AnimateOnScroll>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="relative border-t border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950 px-4 py-20">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #6366f1 1px, transparent 1px), linear-gradient(to bottom, #6366f1 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-12 md:grid-cols-4">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">CampusIQ</span>
              </div>
              <p className="mt-4 text-sm text-slate-400 leading-relaxed">
                The complete institution management platform trusted by
                institutions across India.
              </p>
              <div className="mt-6 flex items-center gap-2">
                <div className="flex -space-x-2">
                  {["RK", "PS", "MF", "AK"].map((initials) => (
                    <div
                      key={initials}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[10px] font-bold text-white border-2 border-slate-900"
                    >
                      {initials}
                    </div>
                  ))}
                </div>
                <span className="text-xs text-slate-400">
                  <span className="font-semibold text-white">500+</span>{" "}
                  institutions trust us
                </span>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="mb-5 text-sm font-bold uppercase tracking-wider text-slate-400">
                Product
              </h4>
              <ul className="space-y-3 text-sm">
                {["Features", "Pricing", "How It Works", "Testimonials"].map(
                  (item) => (
                    <li key={item}>
                      <a
                        href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                        className="text-slate-400 transition-colors hover:text-white group flex items-center gap-2"
                      >
                        <ChevronRight className="h-3 w-3 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                        {item}
                      </a>
                    </li>
                  ),
                )}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="mb-5 text-sm font-bold uppercase tracking-wider text-slate-400">
                Company
              </h4>
              <ul className="space-y-3 text-sm">
                {[
                  { label: "About Us", href: "/about" },
                  { label: "Blog", href: "/blog" },
                  { label: "Careers", href: "/careers" },
                  { label: "Privacy Policy", href: "/privacy" },
                  { label: "Terms of Service", href: "/terms" },
                ].map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="text-slate-400 transition-colors hover:text-white group flex items-center gap-2"
                    >
                      <ChevronRight className="h-3 w-3 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="mb-5 text-sm font-bold uppercase tracking-wider text-slate-400">
                Contact
              </h4>
              <ul className="space-y-4 text-sm">
                <li className="flex items-center gap-3 text-slate-400 group">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 transition-colors group-hover:bg-blue-600/20">
                    <Mail className="h-4 w-4 text-blue-400" />
                  </div>
                  <span className="group-hover:text-white transition-colors">
                    support@campusiq.in
                  </span>
                </li>
                <li className="flex items-center gap-3 text-slate-400 group">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 transition-colors group-hover:bg-blue-600/20">
                    <Phone className="h-4 w-4 text-blue-400" />
                  </div>
                  <span className="group-hover:text-white transition-colors">
                    +91 1800-123-4567
                  </span>
                </li>
                <li className="flex items-start gap-3 text-slate-400 group">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 transition-colors group-hover:bg-blue-600/20">
                    <MapPin className="h-4 w-4 text-blue-400" />
                  </div>
                  <span className="group-hover:text-white transition-colors">
                    Hyderabad, Telangana, India
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-slate-800/80 pt-8 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} CampusIQ. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <Link
                href="/login"
                className="text-muted-foreground transition-colors hover:text-white"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="text-muted-foreground transition-colors hover:text-white"
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
