// ─── CampusIQ Plan Configuration ─────────────────────────────────────────────
// Central config for subscription tiers, feature gating, and sidebar access.

export type PlanId = "starter" | "basic" | "pro" | "enterprise";
export type BillingCycle = "monthly" | "yearly";
export type SubscriptionStatus = "active" | "trial" | "expired" | "cancelled";

// Feature modules that gate sidebar items and API access
export const MODULES = {
  dashboard: "Dashboard",
  students: "Student Management",
  attendance: "Attendance",
  qr_attendance: "QR Attendance",
  subject_attendance: "Subject Attendance",
  teacher_attendance: "Teacher Attendance",
  teachers: "Teacher Management",
  academics: "Academics",
  timetable: "Timetable",
  academic_management: "Academic Management",
  exams: "Exams & Grades",
  fees: "Fee Management",
  salary: "Salary Management",
  rooms: "Room Booking",
  transport: "Transport",
  library: "Library",
  hostel: "Hostel",
  visitors: "Visitor Management",
  leaves: "Leave Management",
  holidays: "Holiday Calendar",
  reports: "Reports & Analytics",
  user_management: "User Management",
  emergency: "Emergency Alerts",
  notifications: "Notifications",
  workload: "Faculty Workload",
  backup: "Backup & Restore",
  profile: "Profile",
  settings: "Settings",
  assignments: "Assignments & Homework",
  events: "Event Calendar",
  messages: "Messaging",
  circulars: "Circulars & Notices",
  parent: "Parent Portal",
  billing: "Billing & Payments",
  online_exams: "Online Exams",
  ai_insights: "AI Insights",
  student_performance: "Student Performance",
  teacher_evaluation: "Teacher Evaluation",
  documents: "Document Vault",
  diary: "Student Diary",
  inventory: "Inventory & Assets",
  alumni: "Alumni Network",
  academic_calendar: "Academic Calendar",
  branding: "White-labeling",
  staff_leave_calendar: "Staff Leave Calendar",
  timetable_generator: "Smart Timetable",
} as const;

export type ModuleId = keyof typeof MODULES;

export interface PlanConfig {
  id: PlanId;
  name: string;
  price: number; // monthly price in INR (0 for trial)
  yearlyPrice: number; // yearly price in INR
  description: string;
  trialDays: number;
  modules: ModuleId[];
  limits: {
    maxStudents: number; // -1 = unlimited
    maxTeachers: number;
    maxStorage: string;
  };
  badge?: string;
  popular?: boolean;
  features: string[]; // human-readable feature bullet points
}

export const PLANS: PlanConfig[] = [
  {
    id: "starter",
    name: "Starter",
    price: 0,
    yearlyPrice: 0,
    description: "7-day free trial to explore CampusIQ",
    trialDays: 7,
    modules: [
      "dashboard",
      "students",
      "attendance",
      "profile",
      "notifications",
    ],
    limits: { maxStudents: 50, maxTeachers: 5, maxStorage: "100 MB" },
    badge: "Free Trial",
    features: [
      "Up to 50 students",
      "Basic attendance tracking",
      "Student management",
      "Dashboard overview",
      "7-day free trial",
    ],
  },
  {
    id: "basic",
    name: "Basic",
    price: 999,
    yearlyPrice: 9990,
    description: "Essential tools for small institutions",
    trialDays: 0,
    modules: [
      "dashboard",
      "students",
      "attendance",
      "teachers",
      "academics",
      "timetable",
      "exams",
      "fees",
      "leaves",
      "holidays",
      "reports",
      "notifications",
      "profile",
      "assignments",
      "events",
      "circulars",
      "parent",
      "billing",
    ],
    limits: { maxStudents: 500, maxTeachers: 50, maxStorage: "5 GB" },
    features: [
      "Up to 500 students",
      "Up to 50 teachers",
      "Exam & grade management",
      "Fee management",
      "Leave & holiday calendar",
      "Reports & analytics",
      "Department & subject management",
      "Timetable management",
      "Email notifications",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 1999,
    yearlyPrice: 19990,
    description: "Advanced features for growing institutions",
    trialDays: 0,
    modules: [
      "dashboard",
      "students",
      "attendance",
      "qr_attendance",
      "subject_attendance",
      "teacher_attendance",
      "teachers",
      "academics",
      "timetable",
      "exams",
      "fees",
      "salary",
      "leaves",
      "holidays",
      "reports",
      "rooms",
      "transport",
      "library",
      "hostel",
      "visitors",
      "workload",
      "notifications",
      "profile",
      "assignments",
      "events",
      "messages",
      "circulars",
      "parent",
      "billing",
      "online_exams",
      "ai_insights",
      "student_performance",
      "teacher_evaluation",
      "documents",
      "diary",
      "inventory",
      "timetable_generator",
      "staff_leave_calendar",
    ],
    limits: { maxStudents: 2000, maxTeachers: 200, maxStorage: "25 GB" },
    popular: true,
    features: [
      "Up to 2,000 students",
      "Up to 200 teachers",
      "Everything in Basic",
      "QR-based attendance",
      "Subject & teacher attendance",
      "Salary management",
      "Hostel & library management",
      "Transport management",
      "Room booking",
      "Visitor management",
      "Faculty workload tracking",
      "AI attendance insights",
      "Document vault",
      "Student diary",
      "Inventory management",
      "Smart timetable generator",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 3999,
    yearlyPrice: 39990,
    description: "Complete solution for large institutions",
    trialDays: 0,
    modules: [
      "dashboard",
      "students",
      "attendance",
      "qr_attendance",
      "subject_attendance",
      "teacher_attendance",
      "teachers",
      "academics",
      "timetable",
      "academic_management",
      "exams",
      "fees",
      "salary",
      "leaves",
      "holidays",
      "reports",
      "rooms",
      "transport",
      "library",
      "hostel",
      "visitors",
      "workload",
      "user_management",
      "emergency",
      "backup",
      "settings",
      "notifications",
      "profile",
      "assignments",
      "events",
      "messages",
      "circulars",
      "parent",
      "billing",
      "online_exams",
      "ai_insights",
      "student_performance",
      "teacher_evaluation",
      "documents",
      "diary",
      "inventory",
      "alumni",
      "academic_calendar",
      "branding",
      "timetable_generator",
      "staff_leave_calendar",
    ],
    limits: { maxStudents: -1, maxTeachers: -1, maxStorage: "Unlimited" },
    badge: "Most Powerful",
    features: [
      "Unlimited students & teachers",
      "Everything in Pro",
      "Sub-user management & permissions",
      "Emergency alert system",
      "Full backup & restore",
      "Advanced settings",
      "Academic year management",
      "Student promotions",
      "Priority support",
      "Unlimited storage",
      "Alumni network",
      "Academic calendar generator",
      "White-label branding",
      "Teacher evaluation system",
      "Student performance analytics",
    ],
  },
];

// Maps dashboard paths to module IDs for access control
export const PATH_MODULE_MAP: Record<string, ModuleId> = {
  "/dashboard": "dashboard",
  "/students": "students",
  "/attendance": "attendance",
  "/qr-attendance": "attendance",
  "/subject-attendance": "subject_attendance",
  "/teacher-attendance": "teacher_attendance",
  "/teachers": "teachers",
  "/departments": "academics",
  "/subjects": "academics",
  "/timetable": "timetable",
  "/academic-years": "academic_management",
  "/semesters": "academic_management",
  "/promotions": "academic_management",
  "/exams": "exams",
  "/fees": "fees",
  "/salary": "salary",
  "/rooms": "rooms",
  "/transport": "transport",
  "/library": "library",
  "/hostel": "hostel",
  "/visitors": "visitors",
  "/leaves": "leaves",
  "/holidays": "holidays",
  "/reports": "reports",
  "/users": "user_management",
  "/emergency": "emergency",
  "/notifications": "notifications",
  "/faculty-workload": "workload",
  "/backup": "backup",
  "/profile": "profile",
  "/settings": "settings",
  "/assignments": "assignments",
  "/events": "events",
  "/messages": "messages",
  "/circulars": "circulars",
  "/parent": "parent",
  "/billing": "billing",
  "/online-exams": "online_exams",
  "/ai-insights": "ai_insights",
  "/analytics": "reports",
  "/student-performance": "student_performance",
  "/teacher-evaluation": "teacher_evaluation",
  "/documents": "documents",
  "/diary": "diary",
  "/inventory": "inventory",
  "/alumni": "alumni",
  "/academic-calendar": "academic_calendar",
  "/branding": "branding",
  "/timetable-generator": "timetable_generator",
  "/staff-leave-calendar": "staff_leave_calendar",
  "/bulk-messages": "notifications",
  "/audit-logs": "settings",
};

export function getPlan(planId: PlanId): PlanConfig {
  return PLANS.find((p) => p.id === planId) || PLANS[0];
}

export function isPlanModuleAllowed(
  planId: PlanId,
  moduleId: ModuleId,
): boolean {
  const plan = getPlan(planId);
  return plan.modules.includes(moduleId);
}

/**
 * Computes accessible modules for a user.
 * - If allowedModules is empty → all plan modules (full plan access)
 * - If allowedModules is non-empty → intersection with plan modules
 */
export function getAccessibleModules(
  planId: PlanId,
  allowedModules: string[],
): ModuleId[] {
  const plan = getPlan(planId);
  if (!allowedModules || allowedModules.length === 0) {
    return plan.modules;
  }
  return plan.modules.filter((m) => allowedModules.includes(m));
}

/**
 * Check if a dashboard path is allowed for a given plan
 */
export function isPathAllowedForPlan(planId: PlanId, path: string): boolean {
  const entry = Object.entries(PATH_MODULE_MAP).find(([p]) =>
    path.startsWith(p),
  );
  if (!entry) return true; // Unknown paths allowed by default
  const moduleId = entry[1];
  return isPlanModuleAllowed(planId, moduleId);
}
