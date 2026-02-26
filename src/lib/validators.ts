import { z } from "zod";
import { NextResponse } from "next/server";

// ──── Validation Error Helper ────
// Returns a 400 response with the first error message + full details array
export function validationError(zodError: z.ZodError) {
  const details = zodError.issues.map((i) => ({
    field: i.path.join("."),
    message: i.message,
  }));
  return NextResponse.json(
    { error: details[0]?.message || "Validation failed", details },
    { status: 400 },
  );
}

// ──── Password Complexity ────
const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

// ──── Auth Validators ────
export const registerSchema = z.object({
  school_name: z
    .string()
    .min(2, "Institution name must be at least 2 characters")
    .max(100, "Institution name must be at most 100 characters"),
  school_type: z.string().optional().default(""),
  board: z.string().optional().default(""),
  address: z.string().max(500, "Address is too long").optional().default(""),
  phone: z
    .string()
    .optional()
    .default("")
    .refine(
      (v) => !v || /^[\d\s+\-()]{10,15}$/.test(v),
      "Phone number must be 10-15 digits",
    ),
  email: z
    .string()
    .email("Please enter a valid institution email address")
    .optional()
    .default(""),
  admin_email: z.string().email("Please enter a valid admin email address"),
  admin_password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  role: z
    .enum(["admin", "teacher", "student", "parent"])
    .default("teacher")
    .optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is missing or invalid"),
  password: passwordSchema,
});

// ──── Student Validators ────
export const studentSchema = z.object({
  class_name: z.string().min(1, "Class name is required"),
  roll_number: z
    .string()
    .min(1, "Roll number is required")
    .max(20, "Roll number is too long"),
  name: z
    .string()
    .min(1, "Student name is required")
    .max(100, "Name is too long"),
  parent_name: z.string().max(100).optional().default(""),
  parent_phone: z
    .string()
    .optional()
    .default("")
    .refine(
      (v) => !v || /^[\d\s+\-()]{10,15}$/.test(v),
      "Enter a valid parent phone number",
    ),
  email: z
    .string()
    .optional()
    .default("")
    .refine(
      (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "Enter a valid email",
    ),
  address: z.string().max(500).optional().default(""),
});

export const updateStudentSchema = studentSchema.partial();

// ──── Attendance Validators ────
export const attendanceRecordSchema = z.object({
  student_id: z.string().min(1),
  status: z.enum(["present", "absent", "late", "leave"]),
  notes: z.string().optional().default(""),
});

export const markAttendanceSchema = z.object({
  date: z.string().min(1, "Date is required"),
  class_name: z.string().min(1, "Class name is required"),
  school_id: z.string().optional(),
  records: z
    .array(attendanceRecordSchema)
    .min(1, "At least one record is required"),
});

// ──── Teacher Validators ────
export const teacherSchema = z.object({
  name: z
    .string()
    .min(1, "Teacher name is required")
    .max(100, "Name is too long"),
  email: z.string().email("Please enter a valid email address"),
  password: passwordSchema,
  phone: z
    .string()
    .optional()
    .default("")
    .refine(
      (v) => !v || /^[\d\s+\-()]{10,15}$/.test(v),
      "Enter a valid phone number",
    ),
  subject: z.string().max(100).optional().default(""),
  classes: z.string().max(200).optional().default(""),
  salary_per_day: z.union([z.string(), z.number()]).optional().default(""),
});

export const updateTeacherSchema = z.object({
  teacher_id: z.string().min(1),
  name: z.string().optional(),
  phone: z.string().optional(),
  subject: z.string().optional(),
  classes: z.string().optional(),
  salary_per_day: z.union([z.string(), z.number()]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

// ──── User Management Validators ────
export const createUserSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),
  email: z.string().email("Please enter a valid email address"),
  password: passwordSchema,
  role: z.enum(["admin", "teacher", "student", "parent"], {
    message: "Please select a valid role",
  }),
  phone: z.string().optional().default(""),
  // Module access (empty = full plan access)
  allowedModules: z.array(z.string()).optional().default([]),
  // Teacher fields
  subject: z.string().optional().default(""),
  classes: z.string().optional().default(""),
  salary_per_day: z.union([z.string(), z.number()]).optional().default(0),
  // Student fields
  class_name: z.string().optional().default(""),
  roll_number: z.string().optional().default(""),
  parent_name: z.string().optional().default(""),
  parent_phone: z.string().optional().default(""),
  address: z.string().optional().default(""),
});

export const updateUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(["admin", "teacher", "student", "parent"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
  // Module access (empty = full plan access)
  allowedModules: z.array(z.string()).optional(),
  // Teacher fields
  subject: z.string().optional(),
  classes: z.string().optional(),
  salary_per_day: z.union([z.string(), z.number()]).optional(),
  // Student fields
  class_name: z.string().optional(),
  roll_number: z.string().optional(),
  parent_name: z.string().optional(),
  parent_phone: z.string().optional(),
  address: z.string().optional(),
});

// ──── Leave Validators ────
export const leaveRequestSchema = z.object({
  student_id: z.string().min(1),
  student_name: z.string().optional().default(""),
  class_name: z.string().optional().default(""),
  from_date: z.string().min(1, "From date is required"),
  to_date: z.string().min(1, "To date is required"),
  reason: z.string().min(1, "Reason is required"),
});

export const leaveActionSchema = z.object({
  leave_id: z.string().min(1),
  status: z.enum(["approved", "rejected"]),
});

// ──── Notification Validators ────
export const notificationSchema = z.object({
  type: z.string().optional().default("announcement"),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  target_role: z.string().optional().default("all"),
});

// ──── Visitor Validators ────
export const visitorSchema = z.object({
  visitor_name: z.string().min(1, "Visitor name is required"),
  visitor_phone: z.string().optional().default(""),
  visitor_email: z.string().optional().default(""),
  purpose: z.string().min(1, "Purpose is required"),
  host_name: z.string().optional().default(""),
  host_type: z.string().optional().default("staff"),
  student_id: z.string().optional().default(""),
  id_proof: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  pre_register: z.boolean().optional().default(false),
});

// ──── Room Validators ────
export const addRoomSchema = z.object({
  room_name: z.string().min(1, "Room name is required"),
  room_type: z.string().min(1, "Room type is required"),
  capacity: z.union([z.string(), z.number()]).optional().default(""),
  floor: z.string().optional().default(""),
  facilities: z.string().optional().default(""),
});

export const bookRoomSchema = z.object({
  room_name: z.string().min(1),
  date: z.string().min(1),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  purpose: z.string().optional().default(""),
  attendees: z.string().optional().default(""),
  equipment_needed: z.string().optional().default(""),
});

// ──── Holiday Validators ────
export const holidaySchema = z.object({
  date: z.string().min(1, "Date is required"),
  name: z.string().min(1, "Holiday name is required"),
  type: z.enum(["national", "regional", "school", "exam", "event"]),
  description: z.string().optional().default(""),
});

export const updateHolidaySchema = z.object({
  holiday_id: z.string().min(1, "Holiday ID is required"),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  holiday_type: z
    .enum(["national", "regional", "school", "exam", "event"])
    .optional(),
});

// ──── Timetable Validators ────
export const timetableSchema = z.object({
  class_name: z.string().min(1),
  day: z.string().min(1),
  period: z.union([z.string(), z.number()]),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  subject: z.string().min(1),
  teacher_id: z.string().optional().default(""),
  teacher_name: z.string().optional().default(""),
  room: z.string().optional().default(""),
});

export const updateTimetableSchema = z.object({
  timetable_id: z.string().min(1, "Timetable ID is required"),
  subject: z.string().min(1).optional(),
  teacher_name: z.string().optional(),
  teacher_id: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  room: z.string().optional(),
});

// ──── Emergency Alert Validators ────
export const emergencyAlertSchema = z.object({
  type: z.string().min(1, "Type is required"),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  severity: z.enum(["critical", "high", "medium", "low"]),
  instructions: z.string().max(2000).optional(),
  affected_areas: z.string().max(1000).optional(),
});

// ──── Settings Validators ────
export const settingsSchema = z.object({
  settings: z.record(z.string(), z.string()),
});

// ──── QR Attendance Validators ────
export const qrGenerateSchema = z.object({
  action: z.literal("generate"),
  class_name: z.string().min(1),
  duration_minutes: z.number().optional().default(30),
});

export const qrScanSchema = z.object({
  action: z.literal("scan"),
  token: z.string().min(1),
  student_id: z.string().min(1),
});

// ──── Profile / Password Change ────
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

// ──── Teacher Attendance Validators ────
export const teacherAttendanceRecordSchema = z.object({
  teacher_id: z.string().min(1),
  status: z.enum(["present", "absent", "late", "leave", "half-day"]),
  check_in: z.string().optional().default(""),
  check_out: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export const markTeacherAttendanceSchema = z.object({
  date: z.string().min(1, "Date is required"),
  records: z
    .array(teacherAttendanceRecordSchema)
    .min(1, "At least one record is required"),
});

// ──── Salary Validators ────
export const salaryGenerateSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
  teacher_id: z.string().optional(),
});

export const salaryUpdateSchema = z.object({
  salary_id: z.string().min(1),
  deductions: z.number().optional(),
  bonus: z.number().optional(),
  status: z.enum(["draft", "processed", "paid"]).optional(),
  payment_method: z.string().optional(),
  transaction_id: z.string().optional(),
  notes: z.string().optional(),
});

// ──── Fee Validators ────
export const feeStructureSchema = z.object({
  name: z.string().min(1, "Fee name is required"),
  class_name: z.string().min(1, "Class name is required"),
  academic_year: z.string().min(1, "Academic year is required"),
  amount: z.number().min(0, "Amount must be positive"),
  due_date: z.string().min(1, "Due date is required"),
  category: z
    .enum(["tuition", "exam", "lab", "library", "transport", "hostel", "other"])
    .default("tuition"),
  description: z.string().optional().default(""),
  is_recurring: z.boolean().optional().default(false),
  frequency: z
    .enum(["monthly", "quarterly", "semi-annual", "annual", "one-time"])
    .default("one-time"),
  late_fee_per_day: z.number().optional().default(0),
});

export const feePaymentSchema = z.object({
  student_id: z.string().min(1),
  fee_structure_id: z.string().min(1),
  amount: z.number().min(0),
  payment_method: z.enum([
    "cash",
    "upi",
    "bank_transfer",
    "cheque",
    "online",
    "other",
  ]),
  discount: z.number().optional().default(0),
  paid_by: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

// ──── Exam & Grades Validators ────
export const examSchema = z.object({
  name: z.string().min(1, "Exam name is required"),
  type: z.enum([
    "unit-test",
    "mid-term",
    "final",
    "practical",
    "assignment",
    "quiz",
  ]),
  class_name: z.string().min(1),
  subject: z.string().min(1),
  subject_code: z.string().optional().default(""),
  date: z.string().min(1, "Date is required"),
  start_time: z.string().optional().default(""),
  end_time: z.string().optional().default(""),
  total_marks: z.number().min(1),
  passing_marks: z.number().min(0),
  room: z.string().optional().default(""),
});

export const gradeEntrySchema = z.object({
  exam_id: z.string().min(1),
  grades: z
    .array(
      z.object({
        student_id: z.string().min(1),
        marks_obtained: z.number().min(0),
        remarks: z.string().optional().default(""),
      }),
    )
    .min(1),
});

// ──── Department Validators ────
export const departmentSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  code: z.string().min(1, "Department code is required"),
  description: z.string().optional().default(""),
  hod_id: z.string().optional().default(""),
});

// ──── Semester Validators ────
export const semesterSchema = z.object({
  name: z.string().min(1, "Semester name is required"),
  year: z.number().min(2000).max(2100),
  term: z.number().min(1).max(8),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  is_current: z.boolean().optional().default(false),
});

// ──── Subject Validators ────
export const subjectSchema = z.object({
  name: z.string().min(1, "Subject name is required"),
  code: z.string().min(1, "Subject code is required"),
  credits: z.number().optional().default(0),
  type: z.enum(["theory", "lab", "practical", "elective"]).default("theory"),
  semester: z.number().optional().default(0),
  class_name: z.string().optional().default(""),
  department_id: z.string().optional().default(""),
  teacher_id: z.string().optional().default(""),
  max_students: z.number().optional().default(60),
});

// ──── Subject Attendance Validators ────
export const subjectAttendanceSchema = z.object({
  date: z.string().min(1),
  subject_id: z.string().min(1),
  class_name: z.string().min(1),
  period: z.number().min(1),
  start_time: z.string().optional().default(""),
  end_time: z.string().optional().default(""),
  type: z.enum(["lecture", "lab", "practical", "tutorial"]).default("lecture"),
  records: z
    .array(
      z.object({
        student_id: z.string().min(1),
        status: z.enum(["present", "absent", "late", "leave"]),
        notes: z.string().optional().default(""),
      }),
    )
    .min(1),
});

// ──── Academic Year Validators ────
export const academicYearSchema = z.object({
  name: z.string().min(1, "Academic year name is required"),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  is_current: z.boolean().optional().default(false),
  terms: z
    .array(
      z.object({
        name: z.string().min(1),
        start_date: z.string().min(1),
        end_date: z.string().min(1),
      }),
    )
    .optional()
    .default([]),
});

// ──── Transport Validators ────
export const transportSchema = z.object({
  vehicle_number: z.string().min(1, "Vehicle number is required"),
  vehicle_type: z.enum(["bus", "van", "auto", "other"]).default("bus"),
  capacity: z.number().min(1),
  driver_name: z.string().min(1, "Driver name is required"),
  driver_phone: z.string().optional().default(""),
  driver_license: z.string().optional().default(""),
  route_name: z.string().min(1, "Route name is required"),
  route_stops: z
    .array(
      z.object({
        stop_name: z.string().min(1),
        pickup_time: z.string().optional().default(""),
        drop_time: z.string().optional().default(""),
        order: z.number().optional().default(0),
      }),
    )
    .optional()
    .default([]),
});

// ──── Library Validators ────
export const libraryBookSchema = z.object({
  title: z.string().min(1, "Book title is required"),
  author: z.string().min(1, "Author is required"),
  isbn: z.string().optional().default(""),
  category: z.string().optional().default("general"),
  publisher: z.string().optional().default(""),
  publish_year: z.number().optional().default(0),
  edition: z.string().optional().default(""),
  copies: z.number().optional().default(1),
  location: z.string().optional().default(""),
});

export const bookIssueSchema = z.object({
  book_id: z.string().min(1),
  borrower_id: z.string().min(1),
  borrower_type: z.enum(["student", "teacher", "staff"]),
  due_date: z.string().min(1, "Due date is required"),
});

export const bookReturnSchema = z.object({
  issue_id: z.string().min(1),
  fine: z.number().optional().default(0),
});

// ──── Hostel Validators ────
export const hostelSchema = z.object({
  name: z.string().min(1, "Hostel name is required"),
  type: z.enum(["boys", "girls", "mixed"]),
  total_rooms: z.number().optional().default(0),
  total_beds: z.number().optional().default(0),
  warden_id: z.string().optional().default(""),
  warden_phone: z.string().optional().default(""),
  address: z.string().optional().default(""),
  facilities: z.array(z.string()).optional().default([]),
});

export const hostelAllocationSchema = z.object({
  hostel_id: z.string().min(1),
  room_number: z.string().min(1),
  bed_number: z.string().optional().default(""),
  student_id: z.string().min(1),
  check_in_date: z.string().min(1),
  monthly_fee: z.number().optional().default(0),
});

// ──── Student Promotion Validators ────
export const promotionSchema = z.object({
  academic_year: z.string().min(1),
  from_class: z.string().min(1),
  to_class: z.string().min(1),
  student_ids: z.array(z.string()).min(1, "At least one student is required"),
  status: z
    .enum(["promoted", "retained", "graduated", "transferred"])
    .default("promoted"),
  remarks: z.string().optional().default(""),
});

// ──── Faculty Workload Validators ────
export const facultyWorkloadSchema = z.object({
  teacher_id: z.string().min(1),
  academic_year: z.string().optional().default(""),
  department_id: z.string().optional().default(""),
  subjects: z
    .array(
      z.object({
        subject_id: z.string().min(1),
        class_name: z.string().min(1),
        type: z
          .enum(["theory", "lab", "practical", "tutorial"])
          .default("theory"),
        hours_per_week: z.number().min(0),
      }),
    )
    .optional()
    .default([]),
  max_hours_per_week: z.number().optional().default(20),
});

// ──── Backup Validators ────
const ALLOWED_BACKUP_COLLECTIONS = [
  "students",
  "users",
  "attendance",
  "leaves",
  "notifications",
  "visitors",
  "rooms",
  "holidays",
  "timetables",
  "settings",
  "fees",
  "exams",
  "grades",
  "departments",
  "subjects",
  "semesters",
  "transport",
  "salary",
  "library",
  "hostel",
  "auditlogs",
  "backups",
] as const;

export const backupSchema = z.object({
  action: z.literal("create").default("create"),
  name: z.string().max(100).optional(),
  type: z.enum(["full", "incremental", "manual"]).default("manual"),
  collections: z
    .array(
      z
        .string()
        .refine(
          (v) => (ALLOWED_BACKUP_COLLECTIONS as readonly string[]).includes(v),
          {
            message: "Invalid collection name",
          },
        ),
    )
    .optional()
    .default([]),
});

// ──── File Upload Validators ────
export const fileUploadSchema = z.object({
  entity_type: z.enum(["student", "teacher", "school", "document"]),
  entity_id: z.string().min(1),
  folder: z.string().optional().default("uploads"),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

// ──── User Action Validators ────
export const userActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("reset_password"),
    user_id: z.string().min(1),
    new_password: z.string().min(8, "Password must be at least 8 characters"),
  }),
  z.object({ action: z.literal("unlock"), user_id: z.string().min(1) }),
  z.object({ action: z.literal("activate"), user_id: z.string().min(1) }),
  z.object({ action: z.literal("deactivate"), user_id: z.string().min(1) }),
  z.object({
    action: z.literal("bulk_activate"),
    user_ids: z.array(z.string().min(1)).min(1).max(100),
  }),
  z.object({
    action: z.literal("bulk_deactivate"),
    user_ids: z.array(z.string().min(1)).min(1).max(100),
  }),
]);

// Re-export password schema for use elsewhere
export { passwordSchema };

// ──── Update / Partial Schemas for PUT endpoints ────

export const updateAcademicYearSchema = z.object({
  year_id: z.string().min(1, "year_id is required"),
  name: z.string().min(1).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  is_current: z.boolean().optional(),
  status: z.enum(["active", "completed", "upcoming"]).optional(),
  terms: z
    .array(
      z.object({
        name: z.string().min(1),
        start_date: z.string().min(1),
        end_date: z.string().min(1),
      }),
    )
    .optional(),
});

export const updateExamSchema = z.object({
  exam_id: z.string().min(1, "exam_id is required"),
  name: z.string().min(1).optional(),
  type: z
    .enum(["unit-test", "mid-term", "final", "practical", "assignment", "quiz"])
    .optional(),
  class_name: z.string().optional(),
  subject: z.string().optional(),
  subject_code: z.string().optional(),
  date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  total_marks: z.number().min(1).optional(),
  passing_marks: z.number().min(0).optional(),
  room: z.string().optional(),
  status: z.enum(["scheduled", "ongoing", "completed", "cancelled"]).optional(),
  invigilator: z.string().optional(),
});

export const updateFeeStructureSchema = z.object({
  structure_id: z.string().min(1, "structure_id is required"),
  name: z.string().min(1).optional(),
  class_name: z.string().optional(),
  academic_year: z.string().optional(),
  amount: z.number().min(0).optional(),
  due_date: z.string().optional(),
  category: z
    .enum(["tuition", "exam", "lab", "library", "transport", "hostel", "other"])
    .optional(),
  description: z.string().optional(),
  is_recurring: z.boolean().optional(),
  frequency: z
    .enum(["monthly", "quarterly", "semi-annual", "annual"])
    .optional(),
  late_fee_per_day: z.number().min(0).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const updateHostelSchema = z.object({
  hostel_id: z.string().min(1, "hostel_id is required"),
  name: z.string().min(1).optional(),
  type: z.enum(["boys", "girls", "mixed"]).optional(),
  total_rooms: z.number().min(1).optional(),
  total_beds: z.number().min(1).optional(),
  warden_id: z.string().optional(),
  warden_phone: z.string().optional(),
  address: z.string().optional(),
  facilities: z.array(z.string()).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const updateLibraryBookSchema = z.object({
  book_id: z.string().min(1, "book_id is required"),
  title: z.string().min(1).optional(),
  author: z.string().optional(),
  isbn: z.string().optional(),
  category: z.string().optional(),
  publisher: z.string().optional(),
  publish_year: z.number().optional(),
  edition: z.string().optional(),
  copies: z.number().min(1).optional(),
  location: z.string().optional(),
  status: z.enum(["available", "all-issued", "damaged", "lost"]).optional(),
});

export const updateSemesterSchema = z.object({
  semester_id: z.string().min(1, "semester_id is required"),
  name: z.string().min(1).optional(),
  year: z.number().optional(),
  term: z.number().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  is_current: z.boolean().optional(),
  status: z.enum(["active", "inactive", "completed"]).optional(),
});

export const updateWorkloadSchema = z.object({
  workload_id: z.string().min(1, "workload_id is required"),
  subjects: z
    .array(
      z.object({
        subject_id: z.string().min(1),
        class_name: z.string().min(1),
        type: z.enum(["theory", "practical", "tutorial", "lab"]),
        hours_per_week: z.number().min(1).max(20),
      }),
    )
    .optional(),
  max_hours_per_week: z.number().min(1).max(50).optional(),
  department_id: z.string().optional(),
  academic_year: z.string().optional(),
});
