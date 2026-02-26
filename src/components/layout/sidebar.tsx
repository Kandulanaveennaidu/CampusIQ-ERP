"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";
import {
  type ModuleId,
  type PlanId,
  getAccessibleModules,
  getPlan,
} from "@/lib/plans";
import type { MenuPermissionData } from "@/lib/auth";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  ClipboardList,
  DollarSign,
  Bell,
  Settings,
  Shield,
  FileText,
  Clock,
  Building2,
  Bus,
  Library,
  Hotel,
  UserCheck,
  CalendarOff,
  BarChart3,
  AlertTriangle,
  Database,
  UserCog,
  QrCode,
  BookOpenCheck,
  Briefcase,
  CreditCard,
  Crown,
  ChevronRight,
  Globe,
  PenTool,
  CalendarDays,
  MessageSquare,
  Megaphone,
  UserCircle,
  Receipt,
  Monitor,
  TrendingUp,
  Brain,
  Wrench,
  CalendarCheck,
  Palette,
  Package,
  GraduationCap as AlumniIcon,
  CalendarRange,
  type LucideIcon,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  module?: ModuleId;
  adminOnly?: boolean;
  children?: NavItem[];
}

// ─── Navigation Configuration ────────────────────────────────────────────────
// Each item is tagged with a `module` — sidebar rendering will filter items
// based on whether the module is accessible (plan + allowedModules).

const navigation: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    module: "dashboard",
  },
  {
    title: "Students",
    href: "/students",
    icon: GraduationCap,
    module: "students",
  },
  {
    title: "Teachers",
    href: "/teachers",
    icon: Users,
    module: "teachers",
  },
  {
    title: "Attendance",
    href: "/attendance",
    icon: ClipboardList,
    module: "attendance",
    children: [
      {
        title: "Student Attendance",
        href: "/attendance/mark",
        icon: ClipboardList,
        module: "attendance",
      },
      {
        title: "Attendance History",
        href: "/attendance/history",
        icon: ClipboardList,
        module: "attendance",
      },
      {
        title: "QR Attendance",
        href: "/attendance/qr",
        icon: QrCode,
        module: "qr_attendance",
      },
      {
        title: "Subject Attendance",
        href: "/subject-attendance",
        icon: BookOpenCheck,
        module: "subject_attendance",
      },
      {
        title: "Teacher Attendance",
        href: "/teacher-attendance",
        icon: UserCheck,
        module: "teacher_attendance",
      },
    ],
  },
  {
    title: "Academics",
    href: "/departments",
    icon: BookOpen,
    module: "academics",
    children: [
      {
        title: "Departments",
        href: "/departments",
        icon: Building2,
        module: "academics",
      },
      {
        title: "Subjects",
        href: "/subjects",
        icon: BookOpen,
        module: "academics",
      },
      {
        title: "Academic Years",
        href: "/academic-years",
        icon: Calendar,
        module: "academic_management",
      },
      {
        title: "Semesters",
        href: "/semesters",
        icon: Calendar,
        module: "academic_management",
      },
      {
        title: "Promotions",
        href: "/promotions",
        icon: GraduationCap,
        module: "academic_management",
      },
    ],
  },
  {
    title: "Timetable",
    href: "/timetable",
    icon: Calendar,
    module: "timetable",
  },
  {
    title: "Exams",
    href: "/exams",
    icon: FileText,
    module: "exams",
  },
  {
    title: "Assignments",
    href: "/assignments",
    icon: PenTool,
    module: "assignments",
  },
  {
    title: "Online Exams",
    href: "/online-exams",
    icon: Monitor,
    module: "online_exams",
  },
  {
    title: "Events",
    href: "/events",
    icon: CalendarDays,
    module: "events",
  },
  {
    title: "Messages",
    href: "/messages",
    icon: MessageSquare,
    module: "messages",
  },
  {
    title: "Circulars",
    href: "/circulars",
    icon: Megaphone,
    module: "circulars",
  },
  {
    title: "Fees",
    href: "/fees",
    icon: DollarSign,
    module: "fees",
  },
  {
    title: "Salary",
    href: "/salary",
    icon: CreditCard,
    module: "salary",
  },
  {
    title: "Leave Management",
    href: "/leaves",
    icon: CalendarOff,
    module: "leaves",
  },
  {
    title: "Holidays",
    href: "/holidays",
    icon: Clock,
    module: "holidays",
  },
  {
    title: "Rooms",
    href: "/rooms",
    icon: Building2,
    module: "rooms",
  },
  {
    title: "Transport",
    href: "/transport",
    icon: Bus,
    module: "transport",
  },
  {
    title: "Library",
    href: "/library",
    icon: Library,
    module: "library",
  },
  {
    title: "Hostel",
    href: "/hostel",
    icon: Hotel,
    module: "hostel",
  },
  {
    title: "Visitors",
    href: "/visitors",
    icon: UserCog,
    module: "visitors",
  },
  {
    title: "Faculty Workload",
    href: "/faculty-workload",
    icon: Briefcase,
    module: "workload",
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    module: "reports",
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: TrendingUp,
    module: "reports",
  },
  {
    title: "AI Insights",
    href: "/ai-insights",
    icon: Brain,
    module: "ai_insights",
  },
  {
    title: "Timetable Generator",
    href: "/timetable-generator",
    icon: CalendarCheck,
    module: "timetable_generator",
  },
  {
    title: "Inventory",
    href: "/inventory",
    icon: Package,
    module: "inventory",
  },
  {
    title: "Alumni Network",
    href: "/alumni",
    icon: AlumniIcon,
    module: "alumni",
  },
  {
    title: "Academic Calendar",
    href: "/academic-calendar",
    icon: CalendarRange,
    module: "academic_calendar",
  },
  {
    title: "Staff Leave Calendar",
    href: "/staff-leave-calendar",
    icon: CalendarOff,
    module: "staff_leave_calendar",
  },
  {
    title: "Student Performance",
    href: "/student-performance",
    icon: TrendingUp,
    module: "student_performance",
  },
  {
    title: "Teacher Evaluation",
    href: "/teacher-evaluation",
    icon: UserCheck,
    module: "teacher_evaluation",
  },
  {
    title: "Documents",
    href: "/documents",
    icon: FileText,
    module: "documents",
  },
  {
    title: "Student Diary",
    href: "/diary",
    icon: BookOpen,
    module: "diary",
  },
  {
    title: "Emergency",
    href: "/emergency",
    icon: AlertTriangle,
    module: "emergency",
  },
  {
    title: "Notifications",
    href: "/notifications",
    icon: Bell,
    module: "notifications",
  },
  {
    title: "Bulk Messages",
    href: "/bulk-messages",
    icon: Megaphone,
    module: "notifications",
    adminOnly: true,
  },
  {
    title: "User Management",
    href: "/users",
    icon: Shield,
    module: "user_management",
    adminOnly: true,
  },
  {
    title: "Backup",
    href: "/backup",
    icon: Database,
    module: "backup",
    adminOnly: true,
  },
  {
    title: "Branding",
    href: "/branding",
    icon: Palette,
    module: "branding",
    adminOnly: true,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    module: "settings",
    adminOnly: true,
  },
  {
    title: "Billing",
    href: "/billing",
    icon: Receipt,
    module: "billing",
    adminOnly: true,
  },
  {
    title: "Parent Portal",
    href: "/parent",
    icon: UserCircle,
    module: "parent",
  },
  {
    title: "Profile",
    href: "/profile",
    icon: UserCog,
    module: "profile",
  },
];

// ─── Nav Title → i18n Key Map ────────────────────────────────────────────────

const NAV_KEY_MAP: Record<string, string> = {
  Dashboard: "nav.dashboard",
  Students: "nav.students",
  Teachers: "nav.teachers",
  Attendance: "nav.attendance",
  "Student Attendance": "nav.studentAttendance",
  "Attendance History": "nav.history",
  "QR Attendance": "nav.qrAttendance",
  "Subject Attendance": "nav.subjectAttendance",
  "Teacher Attendance": "nav.teacherAttendance",
  Academics: "nav.academics",
  Departments: "nav.departments",
  Subjects: "nav.subjects",
  "Academic Years": "nav.academicYears",
  Semesters: "nav.semesters",
  Promotions: "nav.promotion",
  Timetable: "nav.timetable",
  Exams: "nav.exams",
  Assignments: "nav.assignments",
  "Online Exams": "nav.onlineExams",
  Events: "nav.events",
  Messages: "nav.messages",
  Circulars: "nav.circulars",
  Fees: "nav.fees",
  Salary: "nav.salary",
  "Leave Management": "nav.leaveManagement",
  Holidays: "nav.holidays",
  Rooms: "nav.rooms",
  Transport: "nav.transport",
  Library: "nav.library",
  Hostel: "nav.hostel",
  Visitors: "nav.visitors",
  "Faculty Workload": "nav.facultyWorkload",
  Reports: "nav.reports",
  Analytics: "nav.analytics",
  Emergency: "nav.emergency",
  Notifications: "nav.notifications",
  "Bulk Messages": "nav.bulkMessages",
  "User Management": "nav.userManagement",
  Backup: "nav.backup",
  Settings: "nav.settings",
  Billing: "nav.billing",
  "Parent Portal": "nav.parentPortal",
  Profile: "nav.profile",
  "AI Insights": "nav.aiInsights",
  "Timetable Generator": "nav.timetableGenerator",
  Inventory: "nav.inventory",
  "Alumni Network": "nav.alumniNetwork",
  "Academic Calendar": "nav.academicCalendar",
  "Staff Leave Calendar": "nav.staffLeaveCalendar",
  "Student Performance": "nav.studentPerformance",
  "Teacher Evaluation": "nav.teacherEvaluation",
  Documents: "nav.documents",
  "Student Diary": "nav.studentDiary",
  Branding: "nav.branding",
};

// ─── Plan Badge Colors ──────────────────────────────────────────────────────

const PLAN_BADGE_COLORS: Record<string, string> = {
  starter: "bg-gray-100 text-gray-700 border-gray-300",
  basic: "bg-blue-50 text-blue-700 border-blue-300",
  pro: "bg-purple-50 text-purple-700 border-purple-300",
  enterprise: "bg-amber-50 text-amber-700 border-amber-300",
};

// ─── Sidebar Component ──────────────────────────────────────────────────────

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLocale();

  const isAdmin = session?.user?.role === "admin";
  const userPlan = (session?.user?.plan as PlanId) || "starter";
  const userAllowedModules = useMemo(
    () => session?.user?.allowedModules || [],
    [session?.user?.allowedModules],
  );
  const menuPermissions = useMemo<MenuPermissionData[]>(
    () => (session?.user?.menuPermissions as MenuPermissionData[]) || [],
    [session?.user?.menuPermissions],
  );
  const hasCustomRole = !!session?.user?.customRole;

  // Compute accessible modules based on plan + individual permissions
  const accessibleModules = useMemo(
    () => getAccessibleModules(userPlan, userAllowedModules),
    [userPlan, userAllowedModules],
  );

  const planConfig = useMemo(() => getPlan(userPlan), [userPlan]);

  // Map module IDs to their corresponding menu permission entry
  const menuPermMap = useMemo(() => {
    const map = new Map<string, MenuPermissionData>();
    for (const mp of menuPermissions) {
      map.set(mp.menu, mp);
    }
    return map;
  }, [menuPermissions]);

  // Check if a nav item is accessible
  const isItemAllowed = (item: NavItem): boolean => {
    // Admin-only items require admin role
    if (item.adminOnly && !isAdmin) return false;
    // If no module tag, item is always visible
    if (!item.module) return true;

    // Check plan-level module access first
    if (!accessibleModules.includes(item.module)) return false;

    // If user has a custom role with menu permissions, check view permission
    if (hasCustomRole && menuPermissions.length > 0) {
      const perm = menuPermMap.get(item.module);
      // If there's no permission entry for this module, allow it by default
      // (so admins still see everything not explicitly configured)
      if (perm && !perm.view) return false;
    }

    return true;
  };

  // Filter navigation items (including children)
  const filteredNavigation = useMemo(() => {
    return navigation.reduce<NavItem[]>((acc, item) => {
      if (!isItemAllowed(item)) return acc;

      if (item.children) {
        const filteredChildren = item.children.filter(isItemAllowed);
        // If all children are filtered out, skip the parent too
        if (filteredChildren.length === 0) return acc;
        acc.push({ ...item, children: filteredChildren });
      } else {
        acc.push(item);
      }
      return acc;
    }, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessibleModules, isAdmin]);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-bold text-lg"
        >
          <GraduationCap className="h-6 w-6 text-primary" />
          <span>CampusIQ</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {filteredNavigation.map((item) => (
          <NavItemRenderer
            key={item.href}
            item={item}
            pathname={pathname}
            tNav={(title: string) => t(NAV_KEY_MAP[title] || title)}
          />
        ))}
      </nav>

      {/* Plan Badge Footer */}
      <div className="border-t p-3 space-y-2">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Globe className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>
        <Link
          href="/plans"
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
            PLAN_BADGE_COLORS[userPlan] || PLAN_BADGE_COLORS.starter,
          )}
        >
          <Crown className="h-4 w-4" />
          <span>{planConfig.name}</span>
          {userPlan === "starter" && (
            <span className="ml-auto text-xs opacity-75">Upgrade</span>
          )}
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col border-r bg-card h-screen fixed top-0 left-0 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 flex w-64 flex-col bg-card shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

// ─── NavItem Renderer ───────────────────────────────────────────────────────

function NavItemRenderer({
  item,
  pathname,
  tNav,
}: {
  item: NavItem;
  pathname: string;
  tNav: (title: string) => string;
}) {
  const isActive =
    pathname === item.href ||
    (item.children && item.children.some((c) => pathname === c.href));

  const hasChildren = item.children && item.children.length > 0;

  // Auto-expand if any child is active
  const isExpanded =
    hasChildren && item.children!.some((c) => pathname === c.href);

  if (hasChildren) {
    return (
      <CollapsibleNavItem
        item={item}
        pathname={pathname}
        defaultExpanded={!!isExpanded}
        tNav={tNav}
      />
    );
  }

  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{tNav(item.title)}</span>
    </Link>
  );
}

// ─── Collapsible Nav Item ───────────────────────────────────────────────────

function CollapsibleNavItem({
  item,
  pathname,
  defaultExpanded,
  tNav,
}: {
  item: NavItem;
  pathname: string;
  defaultExpanded: boolean;
  tNav: (title: string) => string;
}) {
  const Icon = item.icon;
  const isParentActive = item.children?.some((c) => pathname === c.href);

  // Use a details/summary for pure CSS collapsible
  return (
    <details open={defaultExpanded || undefined} className="group">
      <summary
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent cursor-pointer list-none",
          isParentActive
            ? "bg-accent/50 text-accent-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1">{tNav(item.title)}</span>
        <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
      </summary>
      <div className="ml-4 mt-1 space-y-1 border-l pl-3">
        {item.children!.map((child) => {
          const ChildIcon = child.icon;
          const isChildActive = pathname === child.href;
          return (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-all hover:bg-accent",
                isChildActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ChildIcon className="h-3.5 w-3.5 shrink-0" />
              <span>{tNav(child.title)}</span>
            </Link>
          );
        })}
      </div>
    </details>
  );
}
