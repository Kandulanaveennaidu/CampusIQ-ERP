/**
 * ──────────────────────────────────────────────────────────────────────────────
 * CampusIQ — Comprehensive Validator Unit Tests
 * ──────────────────────────────────────────────────────────────────────────────
 * Pure Zod‑schema tests – no DB, no auth, no server required.
 * Covers every schema exported from src/lib/validators.ts
 * ──────────────────────────────────────────────────────────────────────────────
 */

import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  passwordSchema,
  studentSchema,
  updateStudentSchema,
  markAttendanceSchema,
  attendanceRecordSchema,
  teacherSchema,
  updateTeacherSchema,
  createUserSchema,
  updateUserSchema,
  leaveRequestSchema,
  leaveActionSchema,
  notificationSchema,
  visitorSchema,
  addRoomSchema,
  bookRoomSchema,
  holidaySchema,
  updateHolidaySchema,
  timetableSchema,
  updateTimetableSchema,
  emergencyAlertSchema,
  settingsSchema,
  qrGenerateSchema,
  qrScanSchema,
  changePasswordSchema,
  teacherAttendanceRecordSchema,
  markTeacherAttendanceSchema,
  salaryGenerateSchema,
  salaryUpdateSchema,
  feeStructureSchema,
  feePaymentSchema,
  examSchema,
  gradeEntrySchema,
  departmentSchema,
  semesterSchema,
  subjectSchema,
  subjectAttendanceSchema,
  academicYearSchema,
  transportSchema,
  libraryBookSchema,
  bookIssueSchema,
  bookReturnSchema,
  hostelSchema,
  hostelAllocationSchema,
  promotionSchema,
  facultyWorkloadSchema,
  backupSchema,
  fileUploadSchema,
  profileUpdateSchema,
  userActionSchema,
  updateAcademicYearSchema,
  updateExamSchema,
  updateFeeStructureSchema,
  updateHostelSchema,
  updateLibraryBookSchema,
  updateSemesterSchema,
  updateWorkloadSchema,
} from "@/lib/validators";

// ═══════════════════════════════════════════════════════
// Helper
// ═══════════════════════════════════════════════════════
function expectValid(schema: any, data: any) {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error("Unexpected validation failure:", result.error.issues);
  }
  expect(result.success).toBe(true);
  return result;
}

function expectInvalid(schema: any, data: any) {
  const result = schema.safeParse(data);
  expect(result.success).toBe(false);
  return result;
}

// ═══════════════════════════════════════════════════════
// 1. PASSWORD SCHEMA
// ═══════════════════════════════════════════════════════
describe("passwordSchema", () => {
  it("accepts a valid password", () => {
    expectValid(passwordSchema, "Password1");
  });

  it("rejects password shorter than 6 chars", () => {
    expectInvalid(passwordSchema, "Pa1");
  });

  it("rejects password without uppercase", () => {
    expectInvalid(passwordSchema, "password1");
  });

  it("rejects password without lowercase", () => {
    expectInvalid(passwordSchema, "PASSWORD1");
  });

  it("rejects password without number", () => {
    expectInvalid(passwordSchema, "Password");
  });

  it("rejects password longer than 128 chars", () => {
    expectInvalid(
      passwordSchema,
      "A".repeat(100) + "a".repeat(20) + "1".repeat(10),
    );
  });
});

// ═══════════════════════════════════════════════════════
// 2. AUTH — REGISTER
// ═══════════════════════════════════════════════════════
describe("registerSchema", () => {
  const validData = {
    school_name: "Test School",
    school_type: "public",
    board: "cbse",
    address: "123 Main St",
    phone: "9876543210",
    email: "school@test.com",
    admin_email: "admin@test.com",
    admin_password: "Admin123",
  };

  it("accepts valid registration data", () => {
    expectValid(registerSchema, validData);
  });

  it("accepts minimal data (only required fields)", () => {
    expectValid(registerSchema, {
      school_name: "AB",
      admin_email: "a@b.com",
      admin_password: "Pass123x",
    });
  });

  it("rejects missing school_name", () => {
    expectInvalid(registerSchema, { ...validData, school_name: undefined });
  });

  it("rejects school_name too short", () => {
    expectInvalid(registerSchema, { ...validData, school_name: "A" });
  });

  it("rejects school_name too long", () => {
    expectInvalid(registerSchema, {
      ...validData,
      school_name: "X".repeat(101),
    });
  });

  it("rejects invalid admin_email", () => {
    expectInvalid(registerSchema, { ...validData, admin_email: "notanemail" });
  });

  it("rejects weak admin_password (no uppercase)", () => {
    expectInvalid(registerSchema, {
      ...validData,
      admin_password: "password1",
    });
  });

  it("rejects invalid phone number", () => {
    expectInvalid(registerSchema, { ...validData, phone: "abc" });
  });
});

// ═══════════════════════════════════════════════════════
// 3. AUTH — LOGIN
// ═══════════════════════════════════════════════════════
describe("loginSchema", () => {
  it("accepts valid login", () => {
    expectValid(loginSchema, { email: "u@e.com", password: "x" });
  });

  it("defaults role to teacher", () => {
    const r = expectValid(loginSchema, { email: "u@e.com", password: "x" });
    expect(r.data.role).toBe("teacher");
  });

  it("accepts explicit role", () => {
    expectValid(loginSchema, {
      email: "u@e.com",
      password: "x",
      role: "admin",
    });
  });

  it("rejects invalid role", () => {
    expectInvalid(loginSchema, {
      email: "u@e.com",
      password: "x",
      role: "superadmin",
    });
  });

  it("rejects missing email", () => {
    expectInvalid(loginSchema, { password: "x" });
  });

  it("rejects empty password", () => {
    expectInvalid(loginSchema, { email: "u@e.com", password: "" });
  });
});

// ═══════════════════════════════════════════════════════
// 4. AUTH — FORGOT / RESET PASSWORD
// ═══════════════════════════════════════════════════════
describe("forgotPasswordSchema", () => {
  it("accepts valid email", () => {
    expectValid(forgotPasswordSchema, { email: "u@e.com" });
  });

  it("rejects invalid email", () => {
    expectInvalid(forgotPasswordSchema, { email: "nope" });
  });
});

describe("resetPasswordSchema", () => {
  it("accepts valid token + password", () => {
    expectValid(resetPasswordSchema, {
      token: "abc123",
      password: "NewPass1",
    });
  });

  it("rejects empty token", () => {
    expectInvalid(resetPasswordSchema, { token: "", password: "NewPass1" });
  });

  it("rejects weak password", () => {
    expectInvalid(resetPasswordSchema, { token: "abc123", password: "weak" });
  });
});

// ═══════════════════════════════════════════════════════
// 5. STUDENT SCHEMA
// ═══════════════════════════════════════════════════════
describe("studentSchema", () => {
  const valid = {
    class_name: "Class 10",
    roll_number: "ROLL01",
    name: "Alice",
  };

  it("accepts valid student", () => {
    expectValid(studentSchema, valid);
  });

  it("accepts full student data", () => {
    expectValid(studentSchema, {
      ...valid,
      parent_name: "Bob",
      parent_phone: "1234567890",
      email: "alice@school.com",
      address: "123 Lane",
    });
  });

  it("rejects missing class_name", () => {
    expectInvalid(studentSchema, { ...valid, class_name: undefined });
  });

  it("rejects missing roll_number", () => {
    expectInvalid(studentSchema, { ...valid, roll_number: undefined });
  });

  it("rejects missing name", () => {
    expectInvalid(studentSchema, { ...valid, name: undefined });
  });

  it("rejects roll_number too long", () => {
    expectInvalid(studentSchema, { ...valid, roll_number: "X".repeat(21) });
  });

  it("rejects invalid email", () => {
    expectInvalid(studentSchema, { ...valid, email: "notvalid" });
  });

  it("rejects invalid parent_phone", () => {
    expectInvalid(studentSchema, { ...valid, parent_phone: "abc" });
  });
});

describe("updateStudentSchema", () => {
  it("accepts partial updates", () => {
    expectValid(updateStudentSchema, { name: "Bob" });
  });

  it("accepts empty object", () => {
    expectValid(updateStudentSchema, {});
  });
});

// ═══════════════════════════════════════════════════════
// 6. TEACHER SCHEMA
// ═══════════════════════════════════════════════════════
describe("teacherSchema", () => {
  const valid = {
    name: "Mr. Smith",
    email: "smith@school.com",
    password: "Teacher1",
  };

  it("accepts valid teacher", () => {
    expectValid(teacherSchema, valid);
  });

  it("accepts full teacher data", () => {
    expectValid(teacherSchema, {
      ...valid,
      phone: "9876543210",
      subject: "Math",
      classes: "10A, 10B",
      salary_per_day: 500,
    });
  });

  it("rejects missing name", () => {
    expectInvalid(teacherSchema, { ...valid, name: undefined });
  });

  it("rejects invalid email", () => {
    expectInvalid(teacherSchema, { ...valid, email: "bad" });
  });

  it("rejects weak password", () => {
    expectInvalid(teacherSchema, { ...valid, password: "weak" });
  });

  it("rejects invalid phone", () => {
    expectInvalid(teacherSchema, { ...valid, phone: "abc" });
  });
});

describe("updateTeacherSchema", () => {
  it("accepts valid update", () => {
    expectValid(updateTeacherSchema, {
      teacher_id: "t1",
      name: "Updated Name",
    });
  });

  it("rejects missing teacher_id", () => {
    expectInvalid(updateTeacherSchema, { name: "Test" });
  });

  it("rejects invalid status", () => {
    expectInvalid(updateTeacherSchema, {
      teacher_id: "t1",
      status: "fired",
    });
  });
});

// ═══════════════════════════════════════════════════════
// 7. ATTENDANCE SCHEMAS
// ═══════════════════════════════════════════════════════
describe("attendanceRecordSchema", () => {
  it("accepts valid record", () => {
    expectValid(attendanceRecordSchema, {
      student_id: "s1",
      status: "present",
    });
  });

  it("rejects invalid status", () => {
    expectInvalid(attendanceRecordSchema, {
      student_id: "s1",
      status: "unknown",
    });
  });

  it("accepts all valid statuses", () => {
    for (const s of ["present", "absent", "late", "leave"]) {
      expectValid(attendanceRecordSchema, { student_id: "s1", status: s });
    }
  });
});

describe("markAttendanceSchema", () => {
  it("accepts valid attendance", () => {
    expectValid(markAttendanceSchema, {
      date: "2026-01-15",
      class_name: "Class 10",
      records: [{ student_id: "s1", status: "present" }],
    });
  });

  it("rejects empty records", () => {
    expectInvalid(markAttendanceSchema, {
      date: "2026-01-15",
      class_name: "Class 10",
      records: [],
    });
  });

  it("rejects missing date", () => {
    expectInvalid(markAttendanceSchema, {
      class_name: "Class 10",
      records: [{ student_id: "s1", status: "present" }],
    });
  });
});

// ═══════════════════════════════════════════════════════
// 8. DEPARTMENT SCHEMA
// ═══════════════════════════════════════════════════════
describe("departmentSchema", () => {
  it("accepts valid department", () => {
    expectValid(departmentSchema, { name: "CS", code: "CSE" });
  });

  it("rejects missing name", () => {
    expectInvalid(departmentSchema, { code: "CSE" });
  });

  it("rejects missing code", () => {
    expectInvalid(departmentSchema, { name: "CS" });
  });
});

// ═══════════════════════════════════════════════════════
// 9. SUBJECT SCHEMA
// ═══════════════════════════════════════════════════════
describe("subjectSchema", () => {
  it("accepts valid subject", () => {
    expectValid(subjectSchema, { name: "Mathematics", code: "MATH101" });
  });

  it("accepts full subject", () => {
    expectValid(subjectSchema, {
      name: "Mathematics",
      code: "MATH101",
      credits: 4,
      type: "theory",
      semester: 1,
      class_name: "Class 10",
      department_id: "d1",
      teacher_id: "t1",
      max_students: 30,
    });
  });

  it("rejects missing name", () => {
    expectInvalid(subjectSchema, { code: "X" });
  });

  it("rejects missing code", () => {
    expectInvalid(subjectSchema, { name: "Math" });
  });

  it("rejects invalid type", () => {
    expectInvalid(subjectSchema, {
      name: "Math",
      code: "M1",
      type: "workshop",
    });
  });
});

// ═══════════════════════════════════════════════════════
// 10. SEMESTER SCHEMA
// ═══════════════════════════════════════════════════════
describe("semesterSchema", () => {
  const valid = {
    name: "Fall 2026",
    year: 2026,
    term: 1,
    start_date: "2026-08-01",
    end_date: "2026-12-15",
  };

  it("accepts valid semester", () => {
    expectValid(semesterSchema, valid);
  });

  it("rejects year below 2000", () => {
    expectInvalid(semesterSchema, { ...valid, year: 1999 });
  });

  it("rejects term above 8", () => {
    expectInvalid(semesterSchema, { ...valid, term: 9 });
  });

  it("rejects term below 1", () => {
    expectInvalid(semesterSchema, { ...valid, term: 0 });
  });
});

describe("updateSemesterSchema", () => {
  it("accepts valid update", () => {
    expectValid(updateSemesterSchema, {
      semester_id: "sem1",
      name: "Spring 2026",
    });
  });

  it("rejects missing semester_id", () => {
    expectInvalid(updateSemesterSchema, { name: "Test" });
  });

  it("rejects invalid status", () => {
    expectInvalid(updateSemesterSchema, {
      semester_id: "s1",
      status: "deleted",
    });
  });
});

// ═══════════════════════════════════════════════════════
// 11. ACADEMIC YEAR SCHEMA
// ═══════════════════════════════════════════════════════
describe("academicYearSchema", () => {
  const valid = {
    name: "2025-2026",
    start_date: "2025-06-01",
    end_date: "2026-05-31",
  };

  it("accepts valid academic year", () => {
    expectValid(academicYearSchema, valid);
  });

  it("accepts with terms", () => {
    expectValid(academicYearSchema, {
      ...valid,
      terms: [
        { name: "Term 1", start_date: "2025-06-01", end_date: "2025-10-31" },
        { name: "Term 2", start_date: "2025-11-01", end_date: "2026-03-31" },
      ],
    });
  });

  it("rejects missing name", () => {
    expectInvalid(academicYearSchema, {
      start_date: "2025-06-01",
      end_date: "2026-05-31",
    });
  });

  it("rejects term missing name", () => {
    expectInvalid(academicYearSchema, {
      ...valid,
      terms: [{ start_date: "2025-06-01", end_date: "2025-10-31" }],
    });
  });
});

describe("updateAcademicYearSchema", () => {
  it("accepts valid update", () => {
    expectValid(updateAcademicYearSchema, {
      year_id: "y1",
      name: "2026-2027",
    });
  });

  it("rejects missing year_id", () => {
    expectInvalid(updateAcademicYearSchema, { name: "Test" });
  });

  it("rejects invalid status", () => {
    expectInvalid(updateAcademicYearSchema, {
      year_id: "y1",
      status: "deleted",
    });
  });
});

// ═══════════════════════════════════════════════════════
// 12. FEE SCHEMAS
// ═══════════════════════════════════════════════════════
describe("feeStructureSchema", () => {
  const valid = {
    name: "Tuition Fee",
    class_name: "Class 10",
    academic_year: "2025-2026",
    amount: 5000,
    due_date: "2026-03-31",
  };

  it("accepts valid fee structure", () => {
    expectValid(feeStructureSchema, valid);
  });

  it("accepts full fee structure", () => {
    expectValid(feeStructureSchema, {
      ...valid,
      category: "tuition",
      description: "Annual tuition",
      is_recurring: true,
      frequency: "annual",
      late_fee_per_day: 50,
    });
  });

  it("rejects negative amount", () => {
    expectInvalid(feeStructureSchema, { ...valid, amount: -100 });
  });

  it("rejects missing name", () => {
    expectInvalid(feeStructureSchema, { ...valid, name: undefined });
  });

  it("rejects invalid category", () => {
    expectInvalid(feeStructureSchema, { ...valid, category: "food" });
  });

  it("rejects invalid frequency", () => {
    expectInvalid(feeStructureSchema, { ...valid, frequency: "daily" });
  });
});

describe("feePaymentSchema", () => {
  it("accepts valid payment", () => {
    expectValid(feePaymentSchema, {
      student_id: "s1",
      fee_structure_id: "f1",
      amount: 5000,
      payment_method: "cash",
    });
  });

  it("rejects invalid payment_method", () => {
    expectInvalid(feePaymentSchema, {
      student_id: "s1",
      fee_structure_id: "f1",
      amount: 5000,
      payment_method: "bitcoin",
    });
  });

  it("accepts all valid payment methods", () => {
    for (const m of [
      "cash",
      "upi",
      "bank_transfer",
      "cheque",
      "online",
      "other",
    ]) {
      expectValid(feePaymentSchema, {
        student_id: "s1",
        fee_structure_id: "f1",
        amount: 5000,
        payment_method: m,
      });
    }
  });
});

describe("updateFeeStructureSchema", () => {
  it("accepts valid update", () => {
    expectValid(updateFeeStructureSchema, {
      structure_id: "f1",
      amount: 6000,
    });
  });

  it("rejects missing structure_id", () => {
    expectInvalid(updateFeeStructureSchema, { amount: 1000 });
  });
});

// ═══════════════════════════════════════════════════════
// 13. EXAM SCHEMAS
// ═══════════════════════════════════════════════════════
describe("examSchema", () => {
  const valid = {
    name: "Unit Test 1",
    type: "unit-test" as const,
    class_name: "Class 10",
    subject: "Math",
    date: "2026-03-01",
    total_marks: 100,
    passing_marks: 40,
  };

  it("accepts valid exam", () => {
    expectValid(examSchema, valid);
  });

  it("accepts all valid exam types", () => {
    for (const t of [
      "unit-test",
      "mid-term",
      "final",
      "practical",
      "assignment",
      "quiz",
    ]) {
      expectValid(examSchema, { ...valid, type: t });
    }
  });

  it("rejects missing name", () => {
    expectInvalid(examSchema, { ...valid, name: undefined });
  });

  it("rejects invalid type", () => {
    expectInvalid(examSchema, { ...valid, type: "pop-quiz" });
  });

  it("rejects total_marks < 1", () => {
    expectInvalid(examSchema, { ...valid, total_marks: 0 });
  });

  it("rejects negative passing_marks", () => {
    expectInvalid(examSchema, { ...valid, passing_marks: -1 });
  });
});

describe("gradeEntrySchema", () => {
  it("accepts valid grade entry", () => {
    expectValid(gradeEntrySchema, {
      exam_id: "e1",
      grades: [{ student_id: "s1", marks_obtained: 85 }],
    });
  });

  it("rejects empty grades array", () => {
    expectInvalid(gradeEntrySchema, { exam_id: "e1", grades: [] });
  });

  it("rejects negative marks", () => {
    expectInvalid(gradeEntrySchema, {
      exam_id: "e1",
      grades: [{ student_id: "s1", marks_obtained: -5 }],
    });
  });
});

describe("updateExamSchema", () => {
  it("accepts valid update", () => {
    expectValid(updateExamSchema, { exam_id: "e1", name: "Mid Term" });
  });

  it("rejects missing exam_id", () => {
    expectInvalid(updateExamSchema, { name: "Test" });
  });

  it("rejects invalid status", () => {
    expectInvalid(updateExamSchema, { exam_id: "e1", status: "deleted" });
  });
});

// ═══════════════════════════════════════════════════════
// 14. LEAVE SCHEMAS
// ═══════════════════════════════════════════════════════
describe("leaveRequestSchema", () => {
  it("accepts valid leave request", () => {
    expectValid(leaveRequestSchema, {
      student_id: "s1",
      from_date: "2026-03-01",
      to_date: "2026-03-03",
      reason: "Sick leave",
    });
  });

  it("rejects missing reason", () => {
    expectInvalid(leaveRequestSchema, {
      student_id: "s1",
      from_date: "2026-03-01",
      to_date: "2026-03-03",
    });
  });

  it("rejects missing student_id", () => {
    expectInvalid(leaveRequestSchema, {
      from_date: "2026-03-01",
      to_date: "2026-03-03",
      reason: "Sick",
    });
  });
});

describe("leaveActionSchema", () => {
  it("accepts approve action", () => {
    expectValid(leaveActionSchema, { leave_id: "l1", status: "approved" });
  });

  it("accepts reject action", () => {
    expectValid(leaveActionSchema, { leave_id: "l1", status: "rejected" });
  });

  it("rejects invalid status", () => {
    expectInvalid(leaveActionSchema, { leave_id: "l1", status: "pending" });
  });
});

// ═══════════════════════════════════════════════════════
// 15. NOTIFICATION SCHEMA
// ═══════════════════════════════════════════════════════
describe("notificationSchema", () => {
  it("accepts valid notification", () => {
    expectValid(notificationSchema, {
      title: "School Closed",
      message: "School will be closed tomorrow",
    });
  });

  it("defaults type to announcement", () => {
    const r = expectValid(notificationSchema, {
      title: "Test",
      message: "Test msg",
    });
    expect(r.data.type).toBe("announcement");
  });

  it("rejects missing title", () => {
    expectInvalid(notificationSchema, { message: "Test" });
  });

  it("rejects missing message", () => {
    expectInvalid(notificationSchema, { title: "Test" });
  });
});

// ═══════════════════════════════════════════════════════
// 16. HOLIDAY SCHEMAS
// ═══════════════════════════════════════════════════════
describe("holidaySchema", () => {
  it("accepts valid holiday", () => {
    expectValid(holidaySchema, {
      date: "2026-01-26",
      name: "Republic Day",
      type: "national",
    });
  });

  it("accepts all valid types", () => {
    for (const t of ["national", "regional", "school", "exam", "event"]) {
      expectValid(holidaySchema, { date: "2026-01-01", name: "H", type: t });
    }
  });

  it("rejects missing date", () => {
    expectInvalid(holidaySchema, { name: "Test", type: "national" });
  });

  it("rejects invalid type", () => {
    expectInvalid(holidaySchema, {
      date: "2026-01-01",
      name: "Test",
      type: "custom",
    });
  });
});

describe("updateHolidaySchema", () => {
  it("accepts valid update", () => {
    expectValid(updateHolidaySchema, { holiday_id: "h1", name: "New Name" });
  });

  it("rejects missing holiday_id", () => {
    expectInvalid(updateHolidaySchema, { name: "Test" });
  });
});

// ═══════════════════════════════════════════════════════
// 17. TIMETABLE SCHEMAS
// ═══════════════════════════════════════════════════════
describe("timetableSchema", () => {
  const valid = {
    class_name: "Class 10",
    day: "Monday",
    period: 1,
    start_time: "09:00",
    end_time: "09:45",
    subject: "Math",
  };

  it("accepts valid timetable entry", () => {
    expectValid(timetableSchema, valid);
  });

  it("accepts period as string", () => {
    expectValid(timetableSchema, { ...valid, period: "1" });
  });

  it("rejects missing subject", () => {
    expectInvalid(timetableSchema, { ...valid, subject: undefined });
  });

  it("rejects missing day", () => {
    expectInvalid(timetableSchema, { ...valid, day: undefined });
  });
});

describe("updateTimetableSchema", () => {
  it("accepts valid update", () => {
    expectValid(updateTimetableSchema, {
      timetable_id: "tt1",
      subject: "Science",
    });
  });

  it("rejects missing timetable_id", () => {
    expectInvalid(updateTimetableSchema, { subject: "Science" });
  });
});

// ═══════════════════════════════════════════════════════
// 18. ROOM SCHEMAS
// ═══════════════════════════════════════════════════════
describe("addRoomSchema", () => {
  it("accepts valid room", () => {
    expectValid(addRoomSchema, { room_name: "Lab 1", room_type: "lab" });
  });

  it("accepts full room data", () => {
    expectValid(addRoomSchema, {
      room_name: "Lab 1",
      room_type: "lab",
      capacity: 30,
      floor: "2nd",
      facilities: "Projector, AC",
    });
  });

  it("rejects missing room_name", () => {
    expectInvalid(addRoomSchema, { room_type: "lab" });
  });

  it("rejects missing room_type", () => {
    expectInvalid(addRoomSchema, { room_name: "Lab" });
  });
});

describe("bookRoomSchema", () => {
  it("accepts valid booking", () => {
    expectValid(bookRoomSchema, {
      room_name: "Lab 1",
      date: "2026-03-01",
      start_time: "09:00",
      end_time: "10:00",
    });
  });

  it("rejects missing date", () => {
    expectInvalid(bookRoomSchema, {
      room_name: "Lab 1",
      start_time: "09:00",
      end_time: "10:00",
    });
  });
});

// ═══════════════════════════════════════════════════════
// 19. VISITOR SCHEMA
// ═══════════════════════════════════════════════════════
describe("visitorSchema", () => {
  it("accepts valid visitor", () => {
    expectValid(visitorSchema, {
      visitor_name: "John Doe",
      purpose: "Parent meeting",
    });
  });

  it("accepts full visitor data", () => {
    expectValid(visitorSchema, {
      visitor_name: "John Doe",
      visitor_phone: "9876543210",
      visitor_email: "john@example.com",
      purpose: "Parent meeting",
      host_name: "Mr. Smith",
      host_type: "teacher",
      id_proof: "ID123",
      notes: "Scheduled visit",
      pre_register: true,
    });
  });

  it("rejects missing visitor_name", () => {
    expectInvalid(visitorSchema, { purpose: "Meeting" });
  });

  it("rejects missing purpose", () => {
    expectInvalid(visitorSchema, { visitor_name: "John" });
  });
});

// ═══════════════════════════════════════════════════════
// 20. EMERGENCY ALERT SCHEMA
// ═══════════════════════════════════════════════════════
describe("emergencyAlertSchema", () => {
  const valid = {
    type: "fire",
    title: "Fire Alert",
    message: "Evacuate building",
    severity: "critical" as const,
  };

  it("accepts valid alert", () => {
    expectValid(emergencyAlertSchema, valid);
  });

  it("accepts all severity levels", () => {
    for (const s of ["critical", "high", "medium", "low"]) {
      expectValid(emergencyAlertSchema, { ...valid, severity: s });
    }
  });

  it("rejects missing title", () => {
    expectInvalid(emergencyAlertSchema, { ...valid, title: undefined });
  });

  it("rejects invalid severity", () => {
    expectInvalid(emergencyAlertSchema, { ...valid, severity: "minor" });
  });
});

// ═══════════════════════════════════════════════════════
// 21. SETTINGS SCHEMA
// ═══════════════════════════════════════════════════════
describe("settingsSchema", () => {
  it("accepts valid settings", () => {
    expectValid(settingsSchema, {
      settings: { theme: "dark", language: "en" },
    });
  });

  it("rejects non-object settings", () => {
    expectInvalid(settingsSchema, { settings: "dark" });
  });
});

// ═══════════════════════════════════════════════════════
// 22. QR ATTENDANCE SCHEMAS
// ═══════════════════════════════════════════════════════
describe("qrGenerateSchema", () => {
  it("accepts valid generate request", () => {
    expectValid(qrGenerateSchema, {
      action: "generate",
      class_name: "Class 10",
    });
  });

  it("defaults duration_minutes to 30", () => {
    const r = expectValid(qrGenerateSchema, {
      action: "generate",
      class_name: "Class 10",
    });
    expect(r.data.duration_minutes).toBe(30);
  });

  it("rejects wrong action", () => {
    expectInvalid(qrGenerateSchema, {
      action: "scan",
      class_name: "Class 10",
    });
  });
});

describe("qrScanSchema", () => {
  it("accepts valid scan", () => {
    expectValid(qrScanSchema, {
      action: "scan",
      token: "abc",
      student_id: "s1",
    });
  });

  it("rejects wrong action", () => {
    expectInvalid(qrScanSchema, {
      action: "generate",
      token: "abc",
      student_id: "s1",
    });
  });
});

// ═══════════════════════════════════════════════════════
// 23. PROFILE / PASSWORD CHANGE
// ═══════════════════════════════════════════════════════
describe("changePasswordSchema", () => {
  it("accepts valid password change", () => {
    expectValid(changePasswordSchema, {
      currentPassword: "OldPass1",
      newPassword: "NewPass1",
    });
  });

  it("rejects empty current password", () => {
    expectInvalid(changePasswordSchema, {
      currentPassword: "",
      newPassword: "NewPass1",
    });
  });

  it("rejects weak new password", () => {
    expectInvalid(changePasswordSchema, {
      currentPassword: "OldPass1",
      newPassword: "weak",
    });
  });
});

describe("profileUpdateSchema", () => {
  it("accepts valid profile update", () => {
    expectValid(profileUpdateSchema, { name: "New Name" });
  });

  it("accepts phone update", () => {
    expectValid(profileUpdateSchema, { phone: "9876543210" });
  });
});

// ═══════════════════════════════════════════════════════
// 24. TEACHER ATTENDANCE SCHEMAS
// ═══════════════════════════════════════════════════════
describe("teacherAttendanceRecordSchema", () => {
  it("accepts valid record", () => {
    expectValid(teacherAttendanceRecordSchema, {
      teacher_id: "t1",
      status: "present",
    });
  });

  it("accepts all valid statuses", () => {
    for (const s of ["present", "absent", "late", "leave", "half-day"]) {
      expectValid(teacherAttendanceRecordSchema, {
        teacher_id: "t1",
        status: s,
      });
    }
  });

  it("rejects invalid status", () => {
    expectInvalid(teacherAttendanceRecordSchema, {
      teacher_id: "t1",
      status: "vacation",
    });
  });
});

describe("markTeacherAttendanceSchema", () => {
  it("accepts valid teacher attendance", () => {
    expectValid(markTeacherAttendanceSchema, {
      date: "2026-03-01",
      records: [{ teacher_id: "t1", status: "present" }],
    });
  });

  it("rejects empty records", () => {
    expectInvalid(markTeacherAttendanceSchema, {
      date: "2026-03-01",
      records: [],
    });
  });
});

// ═══════════════════════════════════════════════════════
// 25. SALARY SCHEMAS
// ═══════════════════════════════════════════════════════
describe("salaryGenerateSchema", () => {
  it("accepts valid salary generation", () => {
    expectValid(salaryGenerateSchema, { month: 3, year: 2026 });
  });

  it("rejects month below 1", () => {
    expectInvalid(salaryGenerateSchema, { month: 0, year: 2026 });
  });

  it("rejects month above 12", () => {
    expectInvalid(salaryGenerateSchema, { month: 13, year: 2026 });
  });

  it("rejects year below 2000", () => {
    expectInvalid(salaryGenerateSchema, { month: 1, year: 1999 });
  });
});

describe("salaryUpdateSchema", () => {
  it("accepts valid salary update", () => {
    expectValid(salaryUpdateSchema, {
      salary_id: "sal1",
      status: "paid",
    });
  });

  it("rejects missing salary_id", () => {
    expectInvalid(salaryUpdateSchema, { status: "paid" });
  });

  it("rejects invalid status", () => {
    expectInvalid(salaryUpdateSchema, {
      salary_id: "sal1",
      status: "cancelled",
    });
  });
});

// ═══════════════════════════════════════════════════════
// 26. TRANSPORT SCHEMA
// ═══════════════════════════════════════════════════════
describe("transportSchema", () => {
  const valid = {
    vehicle_number: "AP-01-AB-1234",
    vehicle_type: "bus" as const,
    capacity: 40,
    driver_name: "Ram",
    route_name: "Route 1",
  };

  it("accepts valid transport", () => {
    expectValid(transportSchema, valid);
  });

  it("accepts all vehicle types", () => {
    for (const t of ["bus", "van", "auto", "other"]) {
      expectValid(transportSchema, { ...valid, vehicle_type: t });
    }
  });

  it("accepts with route stops", () => {
    expectValid(transportSchema, {
      ...valid,
      route_stops: [
        { stop_name: "Stop A", pickup_time: "07:00", order: 1 },
        { stop_name: "Stop B", pickup_time: "07:15", order: 2 },
      ],
    });
  });

  it("rejects missing vehicle_number", () => {
    expectInvalid(transportSchema, { ...valid, vehicle_number: undefined });
  });

  it("rejects missing driver_name", () => {
    expectInvalid(transportSchema, { ...valid, driver_name: undefined });
  });

  it("rejects capacity < 1", () => {
    expectInvalid(transportSchema, { ...valid, capacity: 0 });
  });
});

// ═══════════════════════════════════════════════════════
// 27. LIBRARY SCHEMAS
// ═══════════════════════════════════════════════════════
describe("libraryBookSchema", () => {
  it("accepts valid book", () => {
    expectValid(libraryBookSchema, { title: "Physics 101", author: "Dr. A" });
  });

  it("accepts full book data", () => {
    expectValid(libraryBookSchema, {
      title: "Physics 101",
      author: "Dr. A",
      isbn: "978-0-123-45678-9",
      category: "science",
      publisher: "XYZ",
      publish_year: 2023,
      edition: "3rd",
      copies: 5,
      location: "Shelf A1",
    });
  });

  it("rejects missing title", () => {
    expectInvalid(libraryBookSchema, { author: "Dr. A" });
  });

  it("rejects missing author", () => {
    expectInvalid(libraryBookSchema, { title: "Physics" });
  });
});

describe("bookIssueSchema", () => {
  it("accepts valid issue", () => {
    expectValid(bookIssueSchema, {
      book_id: "b1",
      borrower_id: "s1",
      borrower_type: "student",
      due_date: "2026-04-01",
    });
  });

  it("accepts all borrower types", () => {
    for (const t of ["student", "teacher", "staff"]) {
      expectValid(bookIssueSchema, {
        book_id: "b1",
        borrower_id: "b1",
        borrower_type: t,
        due_date: "2026-04-01",
      });
    }
  });

  it("rejects invalid borrower_type", () => {
    expectInvalid(bookIssueSchema, {
      book_id: "b1",
      borrower_id: "b1",
      borrower_type: "parent",
      due_date: "2026-04-01",
    });
  });
});

describe("bookReturnSchema", () => {
  it("accepts valid return", () => {
    expectValid(bookReturnSchema, { issue_id: "i1" });
  });

  it("accepts return with fine", () => {
    expectValid(bookReturnSchema, { issue_id: "i1", fine: 50 });
  });

  it("rejects missing issue_id", () => {
    expectInvalid(bookReturnSchema, {});
  });
});

describe("updateLibraryBookSchema", () => {
  it("accepts valid update", () => {
    expectValid(updateLibraryBookSchema, {
      book_id: "b1",
      title: "New Title",
    });
  });

  it("rejects missing book_id", () => {
    expectInvalid(updateLibraryBookSchema, { title: "Test" });
  });

  it("rejects invalid status", () => {
    expectInvalid(updateLibraryBookSchema, {
      book_id: "b1",
      status: "destroyed",
    });
  });
});

// ═══════════════════════════════════════════════════════
// 28. HOSTEL SCHEMAS
// ═══════════════════════════════════════════════════════
describe("hostelSchema", () => {
  it("accepts valid hostel", () => {
    expectValid(hostelSchema, { name: "Boys Hostel A", type: "boys" });
  });

  it("accepts all types", () => {
    for (const t of ["boys", "girls", "mixed"]) {
      expectValid(hostelSchema, { name: "Hostel " + t, type: t });
    }
  });

  it("rejects missing name", () => {
    expectInvalid(hostelSchema, { type: "boys" });
  });

  it("rejects invalid type", () => {
    expectInvalid(hostelSchema, { name: "Test", type: "co-ed" });
  });
});

describe("hostelAllocationSchema", () => {
  it("accepts valid allocation", () => {
    expectValid(hostelAllocationSchema, {
      hostel_id: "h1",
      room_number: "101",
      student_id: "s1",
      check_in_date: "2026-06-01",
    });
  });

  it("rejects missing hostel_id", () => {
    expectInvalid(hostelAllocationSchema, {
      room_number: "101",
      student_id: "s1",
      check_in_date: "2026-06-01",
    });
  });
});

describe("updateHostelSchema", () => {
  it("accepts valid update", () => {
    expectValid(updateHostelSchema, {
      hostel_id: "h1",
      name: "New Name",
    });
  });

  it("rejects missing hostel_id", () => {
    expectInvalid(updateHostelSchema, { name: "Test" });
  });

  it("rejects invalid status", () => {
    expectInvalid(updateHostelSchema, {
      hostel_id: "h1",
      status: "closed",
    });
  });
});

// ═══════════════════════════════════════════════════════
// 29. PROMOTION SCHEMA
// ═══════════════════════════════════════════════════════
describe("promotionSchema", () => {
  it("accepts valid promotion", () => {
    expectValid(promotionSchema, {
      academic_year: "2025-2026",
      from_class: "Class 9",
      to_class: "Class 10",
      student_ids: ["s1", "s2"],
    });
  });

  it("accepts all valid statuses", () => {
    for (const s of ["promoted", "retained", "graduated", "transferred"]) {
      expectValid(promotionSchema, {
        academic_year: "2025-2026",
        from_class: "9",
        to_class: "10",
        student_ids: ["s1"],
        status: s,
      });
    }
  });

  it("rejects empty student_ids", () => {
    expectInvalid(promotionSchema, {
      academic_year: "2025-2026",
      from_class: "9",
      to_class: "10",
      student_ids: [],
    });
  });
});

// ═══════════════════════════════════════════════════════
// 30. FACULTY WORKLOAD SCHEMAS
// ═══════════════════════════════════════════════════════
describe("facultyWorkloadSchema", () => {
  it("accepts valid workload", () => {
    expectValid(facultyWorkloadSchema, { teacher_id: "t1" });
  });

  it("accepts full workload", () => {
    expectValid(facultyWorkloadSchema, {
      teacher_id: "t1",
      academic_year: "2025-2026",
      department_id: "d1",
      subjects: [
        {
          subject_id: "sub1",
          class_name: "Class 10",
          type: "theory",
          hours_per_week: 4,
        },
      ],
      max_hours_per_week: 20,
    });
  });

  it("rejects missing teacher_id", () => {
    expectInvalid(facultyWorkloadSchema, {});
  });
});

describe("updateWorkloadSchema", () => {
  it("accepts valid update", () => {
    expectValid(updateWorkloadSchema, {
      workload_id: "w1",
      max_hours_per_week: 25,
    });
  });

  it("rejects missing workload_id", () => {
    expectInvalid(updateWorkloadSchema, { max_hours_per_week: 20 });
  });

  it("rejects hours > 50", () => {
    expectInvalid(updateWorkloadSchema, {
      workload_id: "w1",
      max_hours_per_week: 51,
    });
  });
});

// ═══════════════════════════════════════════════════════
// 31. BACKUP SCHEMA
// ═══════════════════════════════════════════════════════
describe("backupSchema", () => {
  it("accepts valid backup (defaults)", () => {
    expectValid(backupSchema, {});
  });

  it("accepts full backup config", () => {
    expectValid(backupSchema, {
      action: "create",
      name: "Daily Backup",
      type: "full",
      collections: ["students", "users", "attendance"],
    });
  });

  it("accepts all backup types", () => {
    for (const t of ["full", "incremental", "manual"]) {
      expectValid(backupSchema, { type: t });
    }
  });

  it("rejects invalid collection name", () => {
    expectInvalid(backupSchema, { collections: ["invalid_collection"] });
  });
});

// ═══════════════════════════════════════════════════════
// 32. FILE UPLOAD SCHEMA
// ═══════════════════════════════════════════════════════
describe("fileUploadSchema", () => {
  it("accepts valid upload", () => {
    expectValid(fileUploadSchema, {
      entity_type: "student",
      entity_id: "s1",
    });
  });

  it("accepts all entity types", () => {
    for (const t of ["student", "teacher", "school", "document"]) {
      expectValid(fileUploadSchema, { entity_type: t, entity_id: "e1" });
    }
  });

  it("rejects invalid entity_type", () => {
    expectInvalid(fileUploadSchema, {
      entity_type: "parent",
      entity_id: "p1",
    });
  });
});

// ═══════════════════════════════════════════════════════
// 33. USER MANAGEMENT SCHEMAS
// ═══════════════════════════════════════════════════════
describe("createUserSchema", () => {
  const valid = {
    name: "Test User",
    email: "user@test.com",
    password: "User1234",
    role: "teacher" as const,
  };

  it("accepts valid user", () => {
    expectValid(createUserSchema, valid);
  });

  it("accepts all roles", () => {
    for (const r of ["admin", "teacher", "student", "parent"]) {
      expectValid(createUserSchema, { ...valid, role: r });
    }
  });

  it("rejects invalid role", () => {
    expectInvalid(createUserSchema, { ...valid, role: "superadmin" });
  });

  it("rejects name too short", () => {
    expectInvalid(createUserSchema, { ...valid, name: "A" });
  });

  it("rejects invalid email", () => {
    expectInvalid(createUserSchema, { ...valid, email: "notvalid" });
  });
});

describe("updateUserSchema", () => {
  it("accepts valid update", () => {
    expectValid(updateUserSchema, { id: "u1", name: "Updated" });
  });

  it("rejects missing id", () => {
    expectInvalid(updateUserSchema, { name: "Test" });
  });
});

describe("userActionSchema", () => {
  it("accepts reset_password action", () => {
    expectValid(userActionSchema, {
      action: "reset_password",
      user_id: "u1",
      new_password: "NewPass12",
    });
  });

  it("accepts unlock action", () => {
    expectValid(userActionSchema, { action: "unlock", user_id: "u1" });
  });

  it("accepts activate action", () => {
    expectValid(userActionSchema, { action: "activate", user_id: "u1" });
  });

  it("accepts deactivate action", () => {
    expectValid(userActionSchema, { action: "deactivate", user_id: "u1" });
  });

  it("accepts bulk_activate action", () => {
    expectValid(userActionSchema, {
      action: "bulk_activate",
      user_ids: ["u1", "u2"],
    });
  });

  it("accepts bulk_deactivate action", () => {
    expectValid(userActionSchema, {
      action: "bulk_deactivate",
      user_ids: ["u1", "u2"],
    });
  });

  it("rejects bulk with empty array", () => {
    expectInvalid(userActionSchema, {
      action: "bulk_activate",
      user_ids: [],
    });
  });

  it("rejects invalid action", () => {
    expectInvalid(userActionSchema, {
      action: "delete",
      user_id: "u1",
    });
  });

  it("rejects reset_password with short password", () => {
    expectInvalid(userActionSchema, {
      action: "reset_password",
      user_id: "u1",
      new_password: "short",
    });
  });
});

// ═══════════════════════════════════════════════════════
// 34. SUBJECT ATTENDANCE SCHEMA
// ═══════════════════════════════════════════════════════
describe("subjectAttendanceSchema", () => {
  const valid = {
    date: "2026-03-01",
    subject_id: "sub1",
    class_name: "Class 10",
    period: 1,
    records: [{ student_id: "s1", status: "present" as const }],
  };

  it("accepts valid subject attendance", () => {
    expectValid(subjectAttendanceSchema, valid);
  });

  it("accepts all session types", () => {
    for (const t of ["lecture", "lab", "practical", "tutorial"]) {
      expectValid(subjectAttendanceSchema, { ...valid, type: t });
    }
  });

  it("rejects empty records", () => {
    expectInvalid(subjectAttendanceSchema, { ...valid, records: [] });
  });

  it("rejects period < 1", () => {
    expectInvalid(subjectAttendanceSchema, { ...valid, period: 0 });
  });

  it("rejects missing subject_id", () => {
    expectInvalid(subjectAttendanceSchema, { ...valid, subject_id: undefined });
  });
});
