// CampusIQ Type Definitions

export type AttendanceStatus = "present" | "absent" | "late" | "leave";
export type UserRole = "admin" | "teacher" | "student" | "parent";
export type RequestStatus = "pending" | "approved" | "rejected";
export type EntityStatus = "active" | "inactive";
export type PlanType = "starter" | "basic" | "pro" | "enterprise";

export interface School {
  school_id: string;
  school_name: string;
  address: string;
  phone: string;
  email: string;
  admin_email: string;
  plan: PlanType;
  created_at: string;
  status: EntityStatus;
}

export interface Teacher {
  teacher_id: string;
  school_id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  classes: string;
  salary_per_day: number;
  joining_date: string;
  role: UserRole;
  status: EntityStatus;
}

export interface Student {
  student_id: string;
  school_id: string;
  class_name: string;
  roll_number: string;
  name: string;
  parent_name: string;
  parent_phone: string;
  email: string;
  address: string;
  admission_date: string;
  status: EntityStatus;
}

export interface Attendance {
  attendance_id: string;
  date: string;
  school_id: string;
  class_name: string;
  student_id: string;
  status: AttendanceStatus;
  marked_by: string;
  marked_at: string;
  notes: string;
}

export interface LeaveRequest {
  leave_id: string;
  school_id: string;
  student_id: string;
  student_name: string;
  class_name: string;
  from_date: string;
  to_date: string;
  reason: string;
  status: RequestStatus;
  applied_at: string;
  approved_by: string;
}

export interface Settings {
  setting_key: string;
  setting_value: string;
  school_id: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Session Types
export interface SessionUser {
  id: string;
  school_id: string;
  teacher_id: string;
  name: string;
  email: string;
  role: UserRole;
}

// Attendance Record for Bulk Operations
export interface AttendanceRecord {
  student_id: string;
  status: AttendanceStatus;
  notes?: string;
}

// Report Types
export interface StudentAttendanceReport {
  student_id: string;
  student_name: string;
  roll_number: string;
  total_days: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  leave_count: number;
  percentage: number;
}

export interface MonthlyReportSummary {
  month: number;
  year: number;
  class_name: string;
  total_students: number;
  average_attendance: number;
  students: StudentAttendanceReport[];
}

// Dashboard Stats
export interface DashboardStats {
  totalStudents: number;
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  presentPercentage: number;
}

export interface AttendanceTrend {
  date: string;
  present: number;
  absent: number;
  late: number;
}

// Form Types
export interface StudentFormData {
  name: string;
  roll_number: string;
  class_name: string;
  parent_name: string;
  parent_phone: string;
  email: string;
  address: string;
}

export interface LoginFormData {
  email: string;
  password: string;
  role: UserRole;
}
