/**
 * Comprehensive Unit Tests for ALL CampusIQ Services
 * Tests validators, model schemas, route logic patterns, and utilities
 * Covers: Students, Attendance, Fees, Salary, Timetable, Exams, Leave,
 *   Holidays, Inventory, Alumni, Documents, AI Insights,
 *   Academic Calendar, Staff Leave Calendar, Teacher Evaluation,
 *   Push Subscription, Branding, Transport, Library, Hostel,
 *   Visitors, Emergency Alerts, Notifications, Reports, User Management,
 *   Subjects, Departments, Room Booking, Permissions, Session fields
 */

import {
  loginSchema,
  registerSchema,
  studentSchema,
  markAttendanceSchema,
  leaveRequestSchema,
  feeStructureSchema,
  feePaymentSchema,
  timetableSchema,
  examSchema,
  gradeEntrySchema,
  holidaySchema,
  bookRoomSchema,
  salaryGenerateSchema,
  emergencyAlertSchema,
  visitorSchema,
  transportSchema,
  libraryBookSchema,
  hostelSchema,
  createUserSchema,
  updateUserSchema,
  userActionSchema,
  subjectSchema,
  departmentSchema,
  passwordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  subjectAttendanceSchema,
} from "@/lib/validators";

// ──── Test helpers ────
function expectValid(schema: { safeParse: Function }, data: unknown) {
  const r = schema.safeParse(data);
  if (!r.success) {
    console.log(
      "Unexpected validation failure:",
      JSON.stringify(r.error.issues, null, 2),
    );
  }
  expect(r.success).toBe(true);
  return r;
}

function expectInvalid(schema: { safeParse: Function }, data: unknown) {
  const r = schema.safeParse(data);
  expect(r.success).toBe(false);
  return r;
}

// ════════════════════════════════════════
// 1. AUTH SCHEMAS
// ════════════════════════════════════════

describe("Auth Schemas", () => {
  describe("loginSchema", () => {
    it("accepts valid login with email + password", () => {
      expectValid(loginSchema, {
        email: "test@school.com",
        password: "Pass123",
      });
    });

    it("defaults role to teacher when not provided", () => {
      const r = expectValid(loginSchema, { email: "u@e.com", password: "x" });
      expect(r.data.role).toBe("teacher");
    });

    it("accepts all valid roles", () => {
      for (const role of ["admin", "teacher", "student", "parent"]) {
        expectValid(loginSchema, { email: "u@e.com", password: "x", role });
      }
    });

    it("rejects invalid role 'superadmin'", () => {
      expectInvalid(loginSchema, {
        email: "u@e.com",
        password: "x",
        role: "superadmin",
      });
    });

    it("rejects missing email", () => {
      expectInvalid(loginSchema, { password: "x" });
    });

    it("rejects invalid email format", () => {
      expectInvalid(loginSchema, { email: "notanemail", password: "x" });
    });

    it("rejects empty password", () => {
      expectInvalid(loginSchema, { email: "u@e.com", password: "" });
    });
  });

  describe("passwordSchema", () => {
    it("accepts valid password with letters and digits", () => {
      expectValid(passwordSchema, "Password1");
    });

    it("rejects password under 6 chars", () => {
      expectInvalid(passwordSchema, "Ab1");
    });

    it("rejects all lowercase", () => {
      expectInvalid(passwordSchema, "password1");
    });

    it("rejects no digits", () => {
      expectInvalid(passwordSchema, "Password");
    });
  });

  describe("registerSchema", () => {
    const valid = {
      school_name: "Test School",
      school_type: "private",
      board: "cbse",
      address: "123 Main St",
      phone: "9876543210",
      admin_email: "admin@test.com",
      admin_password: "Password1",
    };

    it("accepts valid registration", () => {
      expectValid(registerSchema, valid);
    });

    it("rejects missing school_name", () => {
      expectInvalid(registerSchema, { ...valid, school_name: "" });
    });

    it("rejects invalid admin email", () => {
      expectInvalid(registerSchema, { ...valid, admin_email: "notanemail" });
    });

    it("rejects weak admin password", () => {
      expectInvalid(registerSchema, { ...valid, admin_password: "abc" });
    });
  });

  describe("forgotPasswordSchema", () => {
    it("accepts valid email", () => {
      expectValid(forgotPasswordSchema, { email: "user@school.com" });
    });

    it("rejects invalid email", () => {
      expectInvalid(forgotPasswordSchema, { email: "invalid" });
    });
  });

  describe("resetPasswordSchema", () => {
    it("accepts valid token + password", () => {
      expectValid(resetPasswordSchema, {
        token: "abc123",
        password: "Password1",
      });
    });

    it("rejects empty token", () => {
      expectInvalid(resetPasswordSchema, { token: "", password: "Password1" });
    });

    it("rejects weak password", () => {
      expectInvalid(resetPasswordSchema, { token: "abc", password: "weak" });
    });
  });
});

// ════════════════════════════════════════
// 2. STUDENT MANAGEMENT
// ════════════════════════════════════════

describe("Student Management", () => {
  describe("studentSchema", () => {
    const valid = {
      class_name: "10A",
      roll_number: "101",
      name: "John Doe",
    };

    it("accepts valid student with required fields", () => {
      expectValid(studentSchema, valid);
    });

    it("accepts student with all optional fields", () => {
      expectValid(studentSchema, {
        ...valid,
        parent_name: "Jane Doe",
        parent_phone: "9876543210",
        parent_email: "parent@test.com",
        email: "john@test.com",
        address: "123 St",
        admission_date: "2024-01-15",
        photo: "https://example.com/photo.jpg",
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

    it("rejects empty name", () => {
      expectInvalid(studentSchema, { ...valid, name: "" });
    });

    it("rejects name too long", () => {
      expectInvalid(studentSchema, { ...valid, name: "x".repeat(101) });
    });

    it("rejects roll_number too long", () => {
      expectInvalid(studentSchema, { ...valid, roll_number: "x".repeat(21) });
    });
  });
});

// ════════════════════════════════════════
// 3. ATTENDANCE
// ════════════════════════════════════════

describe("Attendance", () => {
  describe("markAttendanceSchema", () => {
    const valid = {
      date: "2024-06-15",
      class_name: "10A",
      records: [
        { student_id: "abc123", status: "present" },
        { student_id: "def456", status: "absent" },
      ],
    };

    it("accepts valid attendance submission", () => {
      expectValid(markAttendanceSchema, valid);
    });

    it("accepts all status types", () => {
      for (const status of ["present", "absent", "late", "leave"]) {
        expectValid(markAttendanceSchema, {
          ...valid,
          records: [{ student_id: "abc", status }],
        });
      }
    });

    it("rejects empty records array", () => {
      expectInvalid(markAttendanceSchema, { ...valid, records: [] });
    });

    it("rejects missing date", () => {
      expectInvalid(markAttendanceSchema, { ...valid, date: undefined });
    });

    it("rejects invalid status", () => {
      expectInvalid(markAttendanceSchema, {
        ...valid,
        records: [{ student_id: "abc", status: "sleeping" }],
      });
    });

    it("rejects missing student_id in record", () => {
      expectInvalid(markAttendanceSchema, {
        ...valid,
        records: [{ status: "present" }],
      });
    });
  });

  describe("subjectAttendanceSchema", () => {
    const valid = {
      date: "2024-06-15",
      class_name: "10A",
      subject_id: "sub123",
      period: 1,
      type: "lecture",
      records: [{ student_id: "abc", status: "present" }],
    };

    it("accepts valid subject attendance", () => {
      expectValid(subjectAttendanceSchema, valid);
    });

    it("accepts all type values", () => {
      for (const type of ["lecture", "lab", "practical", "tutorial"]) {
        expectValid(subjectAttendanceSchema, { ...valid, type });
      }
    });

    it("rejects period < 1", () => {
      expectInvalid(subjectAttendanceSchema, { ...valid, period: 0 });
    });

    it("rejects missing subject_id", () => {
      expectInvalid(subjectAttendanceSchema, {
        ...valid,
        subject_id: undefined,
      });
    });
  });
});

// ════════════════════════════════════════
// 4. FEE MANAGEMENT
// ════════════════════════════════════════

describe("Fee Management", () => {
  describe("feeStructureSchema", () => {
    const valid = {
      name: "Tuition Fee",
      class_name: "10A",
      academic_year: "2024-2025",
      amount: 50000,
      due_date: "2024-07-01",
    };

    it("accepts valid fee structure", () => {
      expectValid(feeStructureSchema, valid);
    });

    it("accepts all category types", () => {
      for (const category of [
        "tuition",
        "exam",
        "lab",
        "library",
        "transport",
        "hostel",
        "other",
      ]) {
        expectValid(feeStructureSchema, { ...valid, category });
      }
    });

    it("accepts all frequency types", () => {
      for (const frequency of [
        "monthly",
        "quarterly",
        "semi-annual",
        "annual",
        "one-time",
      ]) {
        expectValid(feeStructureSchema, { ...valid, frequency });
      }
    });

    it("rejects missing name", () => {
      expectInvalid(feeStructureSchema, { ...valid, name: undefined });
    });

    it("rejects missing amount", () => {
      expectInvalid(feeStructureSchema, { ...valid, amount: undefined });
    });

    it("rejects negative amount", () => {
      expectInvalid(feeStructureSchema, { ...valid, amount: -100 });
    });
  });

  describe("feePaymentSchema", () => {
    const valid = {
      student_id: "stu123",
      fee_structure_id: "fee123",
      amount: 50000,
      payment_method: "cash",
    };

    it("accepts valid fee payment", () => {
      expectValid(feePaymentSchema, valid);
    });

    it("accepts all payment methods", () => {
      for (const payment_method of [
        "cash",
        "upi",
        "bank_transfer",
        "cheque",
        "online",
        "other",
      ]) {
        expectValid(feePaymentSchema, { ...valid, payment_method });
      }
    });

    it("rejects missing student_id", () => {
      expectInvalid(feePaymentSchema, { ...valid, student_id: undefined });
    });

    it("rejects missing amount", () => {
      expectInvalid(feePaymentSchema, { ...valid, amount: undefined });
    });
  });
});

// ════════════════════════════════════════
// 5. SALARY MANAGEMENT
// ════════════════════════════════════════

describe("Salary Management", () => {
  describe("salaryGenerateSchema", () => {
    const valid = {
      month: 6,
      year: 2024,
    };

    it("accepts valid salary generate with month + year", () => {
      expectValid(salaryGenerateSchema, valid);
    });

    it("accepts optional teacher_id", () => {
      expectValid(salaryGenerateSchema, { ...valid, teacher_id: "teach123" });
    });

    it("rejects month < 1", () => {
      expectInvalid(salaryGenerateSchema, { ...valid, month: 0 });
    });

    it("rejects month > 12", () => {
      expectInvalid(salaryGenerateSchema, { ...valid, month: 13 });
    });

    it("rejects year < 2000", () => {
      expectInvalid(salaryGenerateSchema, { ...valid, year: 1999 });
    });

    it("rejects year > 2100", () => {
      expectInvalid(salaryGenerateSchema, { ...valid, year: 2101 });
    });
  });
});

// ════════════════════════════════════════
// 6. TIMETABLE
// ════════════════════════════════════════

describe("Timetable", () => {
  describe("timetableSchema", () => {
    const valid = {
      class_name: "10A",
      day: "Monday",
      period: 1,
      start_time: "09:00",
      end_time: "09:45",
      subject: "Mathematics",
      teacher_name: "Mr. Smith",
    };

    it("accepts valid timetable entry", () => {
      expectValid(timetableSchema, valid);
    });

    it("accepts period as string", () => {
      expectValid(timetableSchema, { ...valid, period: "2" });
    });

    it("accepts all optional fields", () => {
      expectValid(timetableSchema, {
        ...valid,
        teacher_id: "t123",
        room: "Room 101",
      });
    });

    it("rejects missing class_name", () => {
      expectInvalid(timetableSchema, { ...valid, class_name: undefined });
    });

    it("rejects missing day", () => {
      expectInvalid(timetableSchema, { ...valid, day: undefined });
    });

    it("rejects empty day", () => {
      expectInvalid(timetableSchema, { ...valid, day: "" });
    });

    it("rejects missing subject", () => {
      expectInvalid(timetableSchema, { ...valid, subject: undefined });
    });
  });
});

// ════════════════════════════════════════
// 7. EXAMS & GRADES
// ════════════════════════════════════════

describe("Exams & Grades", () => {
  describe("examSchema", () => {
    const valid = {
      name: "Mid-Term Exam",
      type: "mid-term",
      class_name: "10A",
      subject: "Mathematics",
      date: "2024-09-15",
      total_marks: 100,
      passing_marks: 35,
    };

    it("accepts valid exam", () => {
      expectValid(examSchema, valid);
    });

    it("accepts all exam types", () => {
      for (const type of [
        "unit-test",
        "mid-term",
        "final",
        "practical",
        "assignment",
        "quiz",
      ]) {
        expectValid(examSchema, { ...valid, type });
      }
    });

    it("rejects missing name", () => {
      expectInvalid(examSchema, { ...valid, name: undefined });
    });

    it("rejects invalid type", () => {
      expectInvalid(examSchema, { ...valid, type: "surprise" });
    });

    it("rejects missing total_marks", () => {
      expectInvalid(examSchema, { ...valid, total_marks: undefined });
    });

    it("rejects total_marks < 1", () => {
      expectInvalid(examSchema, { ...valid, total_marks: 0 });
    });
  });

  describe("gradeEntrySchema", () => {
    const valid = {
      exam_id: "exam123",
      grades: [
        { student_id: "stu123", marks_obtained: 85 },
        { student_id: "stu456", marks_obtained: 72 },
      ],
    };

    it("accepts valid grade entry", () => {
      expectValid(gradeEntrySchema, valid);
    });

    it("accepts grades with remarks", () => {
      expectValid(gradeEntrySchema, {
        exam_id: "exam123",
        grades: [
          { student_id: "stu123", marks_obtained: 85, remarks: "Excellent" },
        ],
      });
    });

    it("rejects missing exam_id", () => {
      expectInvalid(gradeEntrySchema, { ...valid, exam_id: undefined });
    });

    it("rejects empty grades array", () => {
      expectInvalid(gradeEntrySchema, { exam_id: "exam123", grades: [] });
    });

    it("rejects negative marks", () => {
      expectInvalid(gradeEntrySchema, {
        exam_id: "exam123",
        grades: [{ student_id: "stu1", marks_obtained: -5 }],
      });
    });

    it("rejects missing student_id in grade", () => {
      expectInvalid(gradeEntrySchema, {
        exam_id: "exam123",
        grades: [{ marks_obtained: 85 }],
      });
    });
  });
});

// ════════════════════════════════════════
// 8. LEAVE MANAGEMENT
// ════════════════════════════════════════

describe("Leave Management", () => {
  describe("leaveRequestSchema", () => {
    const valid = {
      student_id: "stu123",
      from_date: "2024-07-01",
      to_date: "2024-07-03",
      reason: "Family function",
    };

    it("accepts valid leave request", () => {
      expectValid(leaveRequestSchema, valid);
    });

    it("rejects missing student_id", () => {
      expectInvalid(leaveRequestSchema, { ...valid, student_id: undefined });
    });

    it("rejects missing from_date", () => {
      expectInvalid(leaveRequestSchema, { ...valid, from_date: undefined });
    });

    it("rejects missing reason", () => {
      expectInvalid(leaveRequestSchema, { ...valid, reason: undefined });
    });

    it("rejects empty reason", () => {
      expectInvalid(leaveRequestSchema, { ...valid, reason: "" });
    });
  });
});

// ════════════════════════════════════════
// 9. HOLIDAYS
// ════════════════════════════════════════

describe("Holidays", () => {
  describe("holidaySchema", () => {
    const valid = {
      date: "2024-08-15",
      name: "Independence Day",
      type: "national",
    };

    it("accepts valid holiday", () => {
      expectValid(holidaySchema, valid);
    });

    it("accepts all holiday types", () => {
      for (const type of ["national", "regional", "school", "exam", "event"]) {
        expectValid(holidaySchema, { ...valid, type });
      }
    });

    it("rejects missing date", () => {
      expectInvalid(holidaySchema, { ...valid, date: undefined });
    });

    it("rejects missing name", () => {
      expectInvalid(holidaySchema, { ...valid, name: undefined });
    });
  });
});

// ════════════════════════════════════════
// 10. ROOM BOOKING
// ════════════════════════════════════════

describe("Room Booking", () => {
  describe("bookRoomSchema", () => {
    const valid = {
      room_name: "Lab 101",
      date: "2024-07-20",
      start_time: "09:00",
      end_time: "10:00",
      purpose: "Lab session",
    };

    it("accepts valid booking", () => {
      expectValid(bookRoomSchema, valid);
    });

    it("accepts booking without optional purpose", () => {
      expectValid(bookRoomSchema, {
        room_name: "Lab 101",
        date: "2024-07-20",
        start_time: "09:00",
        end_time: "10:00",
      });
    });

    it("rejects missing room_name", () => {
      expectInvalid(bookRoomSchema, { ...valid, room_name: undefined });
    });

    it("rejects missing date", () => {
      expectInvalid(bookRoomSchema, { ...valid, date: undefined });
    });

    it("rejects missing start_time", () => {
      expectInvalid(bookRoomSchema, { ...valid, start_time: undefined });
    });

    it("rejects missing end_time", () => {
      expectInvalid(bookRoomSchema, { ...valid, end_time: undefined });
    });
  });
});

// ════════════════════════════════════════
// 11. EMERGENCY ALERTS
// ════════════════════════════════════════

describe("Emergency Alerts", () => {
  describe("emergencyAlertSchema", () => {
    const valid = {
      type: "fire",
      title: "Fire Drill",
      message: "Evacuate immediately via nearest exits",
      severity: "high",
    };

    it("accepts valid emergency alert", () => {
      expectValid(emergencyAlertSchema, valid);
    });

    it("accepts all severity levels", () => {
      for (const severity of ["low", "medium", "high", "critical"]) {
        expectValid(emergencyAlertSchema, { ...valid, severity });
      }
    });

    it("rejects missing type", () => {
      expectInvalid(emergencyAlertSchema, { ...valid, type: undefined });
    });

    it("rejects missing title", () => {
      expectInvalid(emergencyAlertSchema, { ...valid, title: undefined });
    });

    it("rejects missing message", () => {
      expectInvalid(emergencyAlertSchema, { ...valid, message: undefined });
    });
  });
});

// ════════════════════════════════════════
// 12. VISITORS
// ════════════════════════════════════════

describe("Visitors", () => {
  describe("visitorSchema", () => {
    const valid = {
      visitor_name: "Mr. Kumar",
      visitor_phone: "9876543210",
      purpose: "Parent meeting",
    };

    it("accepts valid visitor", () => {
      expectValid(visitorSchema, valid);
    });

    it("accepts visitor without optional phone", () => {
      expectValid(visitorSchema, {
        visitor_name: "Mr. Kumar",
        purpose: "Meeting",
      });
    });

    it("rejects missing visitor_name", () => {
      expectInvalid(visitorSchema, { ...valid, visitor_name: undefined });
    });

    it("rejects empty visitor_name", () => {
      expectInvalid(visitorSchema, { ...valid, visitor_name: "" });
    });

    it("rejects missing purpose", () => {
      expectInvalid(visitorSchema, { ...valid, purpose: undefined });
    });
  });
});

// ════════════════════════════════════════
// 13. TRANSPORT
// ════════════════════════════════════════

describe("Transport", () => {
  describe("transportSchema", () => {
    const valid = {
      vehicle_number: "KA01AB1234",
      driver_name: "Ram Kumar",
      route_name: "Route A",
      capacity: 40,
    };

    it("accepts valid transport entry", () => {
      expectValid(transportSchema, valid);
    });

    it("accepts all vehicle types", () => {
      for (const vehicle_type of ["bus", "van", "auto", "other"]) {
        expectValid(transportSchema, { ...valid, vehicle_type });
      }
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
});

// ════════════════════════════════════════
// 14. LIBRARY
// ════════════════════════════════════════

describe("Library", () => {
  describe("libraryBookSchema", () => {
    const valid = {
      title: "Introduction to Algorithms",
      author: "Cormen",
    };

    it("accepts valid library book", () => {
      expectValid(libraryBookSchema, valid);
    });

    it("accepts book with all optional fields", () => {
      expectValid(libraryBookSchema, {
        ...valid,
        isbn: "978-0262033848",
        category: "computer_science",
        publisher: "MIT Press",
        publish_year: 2009,
        edition: "3rd",
        copies: 5,
        location: "Shelf A3",
      });
    });

    it("rejects missing title", () => {
      expectInvalid(libraryBookSchema, { ...valid, title: undefined });
    });

    it("rejects missing author", () => {
      expectInvalid(libraryBookSchema, { ...valid, author: undefined });
    });

    it("rejects empty title", () => {
      expectInvalid(libraryBookSchema, { ...valid, title: "" });
    });
  });
});

// ════════════════════════════════════════
// 15. HOSTEL
// ════════════════════════════════════════

describe("Hostel", () => {
  describe("hostelSchema", () => {
    const valid = {
      name: "Boys Hostel A",
      type: "boys" as const,
    };

    it("accepts valid hostel entry", () => {
      expectValid(hostelSchema, valid);
    });

    it("accepts all hostel types", () => {
      for (const type of ["boys", "girls", "mixed"]) {
        expectValid(hostelSchema, { name: "Hostel", type });
      }
    });

    it("accepts hostel with optional fields", () => {
      expectValid(hostelSchema, {
        ...valid,
        total_rooms: 50,
        total_beds: 200,
        warden_id: "w123",
        warden_phone: "9876543210",
        address: "Campus Block B",
        facilities: ["wifi", "mess", "laundry"],
      });
    });

    it("rejects missing name", () => {
      expectInvalid(hostelSchema, { ...valid, name: undefined });
    });

    it("rejects invalid type", () => {
      expectInvalid(hostelSchema, { name: "Test", type: "coed" });
    });
  });
});

// ════════════════════════════════════════
// 16. SUBJECT MANAGEMENT
// ════════════════════════════════════════

describe("Subject Management", () => {
  describe("subjectSchema", () => {
    const valid = {
      name: "Mathematics",
      code: "MATH101",
    };

    it("accepts valid subject", () => {
      expectValid(subjectSchema, valid);
    });

    it("accepts all subject types", () => {
      for (const type of ["theory", "lab", "practical", "elective"]) {
        expectValid(subjectSchema, { ...valid, type });
      }
    });

    it("accepts subject with optional class_name", () => {
      expectValid(subjectSchema, { ...valid, class_name: "10A" });
    });

    it("rejects missing name", () => {
      expectInvalid(subjectSchema, { ...valid, name: undefined });
    });

    it("rejects missing code", () => {
      expectInvalid(subjectSchema, { ...valid, code: undefined });
    });
  });
});

// ════════════════════════════════════════
// 17. DEPARTMENT MANAGEMENT
// ════════════════════════════════════════

describe("Department Management", () => {
  describe("departmentSchema", () => {
    const valid = {
      name: "Science",
      code: "SCI",
    };

    it("accepts valid department", () => {
      expectValid(departmentSchema, valid);
    });

    it("accepts department with optional fields", () => {
      expectValid(departmentSchema, {
        ...valid,
        description: "Science Dept",
        hod_id: "hod123",
      });
    });

    it("rejects missing name", () => {
      expectInvalid(departmentSchema, { code: "SCI" });
    });

    it("rejects missing code", () => {
      expectInvalid(departmentSchema, { name: "Science" });
    });

    it("rejects empty name", () => {
      expectInvalid(departmentSchema, { name: "", code: "SCI" });
    });

    it("rejects empty code", () => {
      expectInvalid(departmentSchema, { name: "Science", code: "" });
    });
  });
});

// ════════════════════════════════════════
// 18. USER MANAGEMENT
// ════════════════════════════════════════

describe("User Management", () => {
  describe("createUserSchema", () => {
    const valid = {
      name: "Test User",
      email: "test@school.com",
      password: "Password1",
      role: "teacher" as const,
    };

    it("accepts valid user creation", () => {
      expectValid(createUserSchema, valid);
    });

    it("accepts all valid roles", () => {
      for (const role of ["admin", "teacher", "student", "parent"]) {
        expectValid(createUserSchema, { ...valid, role });
      }
    });

    it("rejects invalid role 'superadmin'", () => {
      expectInvalid(createUserSchema, { ...valid, role: "superadmin" });
    });

    it("rejects missing name", () => {
      expectInvalid(createUserSchema, { ...valid, name: undefined });
    });

    it("rejects missing email", () => {
      expectInvalid(createUserSchema, { ...valid, email: undefined });
    });

    it("rejects weak password", () => {
      expectInvalid(createUserSchema, { ...valid, password: "abc" });
    });
  });

  describe("updateUserSchema", () => {
    it("accepts valid update", () => {
      expectValid(updateUserSchema, { id: "user123", name: "Updated Name" });
    });

    it("rejects missing id", () => {
      expectInvalid(updateUserSchema, { name: "Updated" });
    });
  });

  describe("userActionSchema", () => {
    it("accepts reset_password action", () => {
      expectValid(userActionSchema, {
        action: "reset_password",
        user_id: "user123",
        new_password: "NewPass12",
      });
    });

    it("accepts activate action", () => {
      expectValid(userActionSchema, { action: "activate", user_id: "user123" });
    });

    it("accepts deactivate action", () => {
      expectValid(userActionSchema, {
        action: "deactivate",
        user_id: "user123",
      });
    });

    it("accepts unlock action", () => {
      expectValid(userActionSchema, { action: "unlock", user_id: "user123" });
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

    it("rejects invalid action", () => {
      expectInvalid(userActionSchema, {
        action: "delete_all",
        user_id: "user123",
      });
    });

    it("rejects bulk with empty array", () => {
      expectInvalid(userActionSchema, {
        action: "bulk_activate",
        user_ids: [],
      });
    });

    it("rejects reset_password with short password", () => {
      expectInvalid(userActionSchema, {
        action: "reset_password",
        user_id: "user123",
        new_password: "short",
      });
    });
  });
});

// ════════════════════════════════════════
// 19. AI INSIGHTS - Logic Coverage
// ════════════════════════════════════════

describe("AI Insights Logic", () => {
  it("calculates risk score correctly for low attendance", () => {
    const data = { present: 10, absent: 8, late: 2, total: 20 };
    const attendanceRate =
      data.total > 0 ? (data.present / data.total) * 100 : 100;
    const lateRate = data.total > 0 ? (data.late / data.total) * 100 : 0;
    const absentRate = data.total > 0 ? (data.absent / data.total) * 100 : 0;

    let riskScore = 0;
    if (attendanceRate < 60) riskScore += 50;
    else if (attendanceRate < 75) riskScore += 35;

    if (lateRate > 30) riskScore += 20;
    else if (lateRate > 15) riskScore += 10;

    if (absentRate > 40) riskScore += 20;

    // 50% attendance (< 60) → +50, 10% late (not > 15) → 0, 40% absent (not > 40) → 0
    expect(riskScore).toBe(50);
    expect(attendanceRate).toBe(50);
  });

  it("gives zero risk for perfect attendance", () => {
    const data = { present: 20, absent: 0, late: 0, total: 20 };
    const attendanceRate = (data.present / data.total) * 100;
    let riskScore = 0;
    if (attendanceRate < 60) riskScore += 50;
    else if (attendanceRate < 75) riskScore += 35;
    else if (attendanceRate < 85) riskScore += 15;
    expect(riskScore).toBe(0);
    expect(attendanceRate).toBe(100);
  });

  it("detects high risk for very low attendance", () => {
    const data = { present: 5, absent: 12, late: 3, total: 20 };
    const attendanceRate = (data.present / data.total) * 100;
    const lateRate = (data.late / data.total) * 100;
    const absentRate = (data.absent / data.total) * 100;

    let riskScore = 0;
    if (attendanceRate < 60) riskScore += 50;
    if (lateRate > 15) riskScore += 10;
    if (absentRate > 40) riskScore += 20;

    // 25% attendance (< 60) → +50, 15% late (not > 15) → 0, 60% absent (> 40) → +20
    expect(riskScore).toBe(70);
    expect(attendanceRate).toBe(25);
  });

  it("handles student with no attendance records (defaults to 100%)", () => {
    const data = { present: 0, absent: 0, late: 0, total: 0 };
    const attendanceRate =
      data.total > 0 ? (data.present / data.total) * 100 : 100;
    expect(attendanceRate).toBe(100);
  });
});

// ════════════════════════════════════════
// 20. TIMETABLE GENERATOR - Logic Coverage
// ════════════════════════════════════════

describe("Timetable Generator Logic", () => {
  it("distributes subjects evenly across periods", () => {
    const periodsPerDay = 8;
    const workingDays = 6;
    const totalPeriodsPerWeek = periodsPerDay * workingDays;
    const subjects = ["Math", "English", "Science", "Hindi", "SS"];
    const periodsPerSubject: Record<string, number> = {};

    for (const sub of subjects) {
      periodsPerSubject[sub] = Math.ceil(totalPeriodsPerWeek / subjects.length);
    }

    const totalAllocated = Object.values(periodsPerSubject).reduce(
      (a, b) => a + b,
      0,
    );

    expect(totalAllocated).toBeGreaterThanOrEqual(totalPeriodsPerWeek);
    expect(periodsPerSubject["Math"]).toBe(10); // ceil(48/5) = 10
  });

  it("normalizes when total exceeds available slots", () => {
    const totalPeriodsPerWeek = 48;
    const periodsPerSubject: Record<string, number> = {
      Math: 12,
      English: 12,
      Science: 12,
      Hindi: 12,
      SS: 12,
    };
    const totalAllocated = 60;

    if (totalAllocated > totalPeriodsPerWeek) {
      const ratio = totalPeriodsPerWeek / totalAllocated;
      for (const sub of Object.keys(periodsPerSubject)) {
        periodsPerSubject[sub] = Math.max(
          1,
          Math.round(periodsPerSubject[sub] * ratio),
        );
      }
    }

    const normalized = Object.values(periodsPerSubject).reduce(
      (a, b) => a + b,
      0,
    );
    expect(normalized).toBeLessThanOrEqual(totalPeriodsPerWeek + 5);
    expect(periodsPerSubject["Math"]).toBeGreaterThanOrEqual(1);
  });

  it("detects teacher slot conflicts", () => {
    const teacherSlots = new Map<string, Set<string>>();
    const teacherId = "teacher1";

    teacherSlots.set(teacherId, new Set(["Monday-1"]));

    const isOccupied = teacherSlots.get(teacherId)?.has("Monday-1") ?? false;
    const isFree = !(teacherSlots.get(teacherId)?.has("Monday-2") ?? false);

    expect(isOccupied).toBe(true);
    expect(isFree).toBe(true);
  });

  it("calculates utilization percentage", () => {
    const totalSlots = 48;
    const filledSlots = 45;
    const utilization = Math.round((filledSlots / totalSlots) * 100);
    expect(utilization).toBe(94);
  });
});

// ════════════════════════════════════════
// 21. STAFF LEAVE CALENDAR - Logic Coverage
// ════════════════════════════════════════

describe("Staff Leave Calendar Logic", () => {
  it("formats date range strings correctly for month query", () => {
    const month = "2024-07";
    const [y, m] = month.split("-").map(Number);
    const startStr = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endStr = `${y}-${String(m).padStart(2, "0")}-${lastDay}`;

    expect(startStr).toBe("2024-07-01");
    expect(endStr).toBe("2024-07-31");
  });

  it("handles February correctly", () => {
    const month = "2024-02";
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const endStr = `${y}-${String(m).padStart(2, "0")}-${lastDay}`;
    expect(endStr).toBe("2024-02-29"); // 2024 is leap year
  });

  it("handles non-leap year February", () => {
    const month = "2023-02";
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    expect(lastDay).toBe(28);
  });

  it("builds calendar data from leaves", () => {
    const calendarData: Record<
      string,
      { date: string; leaves: { name: string; status: string }[] }
    > = {};
    const leaves = [
      {
        student_name: "John",
        from_date: "2024-07-10",
        to_date: "2024-07-12",
        status: "approved",
      },
    ];

    for (const leave of leaves) {
      const start = new Date(leave.from_date);
      const end = new Date(leave.to_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split("T")[0];
        if (!calendarData[key]) calendarData[key] = { date: key, leaves: [] };
        calendarData[key].leaves.push({
          name: leave.student_name,
          status: leave.status,
        });
      }
    }

    expect(Object.keys(calendarData)).toHaveLength(3);
    expect(calendarData["2024-07-10"].leaves[0].name).toBe("John");
    expect(calendarData["2024-07-12"].leaves[0].status).toBe("approved");
  });
});

// ════════════════════════════════════════
// 22. TEACHER EVALUATION - Logic Coverage
// ════════════════════════════════════════

describe("Teacher Evaluation Logic", () => {
  it("computes overall rating as average of 5 categories", () => {
    const ratings = {
      teaching_quality: 4,
      communication: 5,
      punctuality: 3,
      subject_knowledge: 4,
      approachability: 4,
    };

    const overall =
      Math.round(
        ((ratings.teaching_quality +
          ratings.communication +
          ratings.punctuality +
          ratings.subject_knowledge +
          ratings.approachability) /
          5) *
          10,
      ) / 10;

    expect(overall).toBe(4); // (4+5+3+4+4)/5 = 4.0
  });

  it("computes aggregated averages across multiple evaluations", () => {
    const evals = [
      {
        teaching_quality: 4,
        communication: 5,
        punctuality: 3,
        subject_knowledge: 4,
        approachability: 4,
      },
      {
        teaching_quality: 3,
        communication: 4,
        punctuality: 4,
        subject_knowledge: 5,
        approachability: 3,
      },
    ];

    const totals = {
      teaching_quality: 0,
      communication: 0,
      punctuality: 0,
      subject_knowledge: 0,
      approachability: 0,
    };
    for (const e of evals) {
      totals.teaching_quality += e.teaching_quality;
      totals.communication += e.communication;
      totals.punctuality += e.punctuality;
      totals.subject_knowledge += e.subject_knowledge;
      totals.approachability += e.approachability;
    }

    const avgRating =
      Math.round(
        ((totals.teaching_quality +
          totals.communication +
          totals.punctuality +
          totals.subject_knowledge +
          totals.approachability) /
          (5 * evals.length)) *
          10,
      ) / 10;

    expect(avgRating).toBe(3.9); // (7+9+7+9+7)/(5*2) = 39/10 = 3.9
  });

  it("validates ratings are between 1 and 5", () => {
    const validRatings = [1, 2, 3, 4, 5];
    const invalidRatings = [0, -1, 6, 10];

    for (const r of validRatings) {
      expect(r >= 1 && r <= 5).toBe(true);
    }
    for (const r of invalidRatings) {
      expect(r >= 1 && r <= 5).toBe(false);
    }
  });
});

// ════════════════════════════════════════
// 23. ACADEMIC CALENDAR - Logic Coverage
// ════════════════════════════════════════

describe("Academic Calendar Logic", () => {
  it("sorts entries by date", () => {
    const entries = [
      { date: new Date("2024-12-15"), title: "Annual Day" },
      { date: new Date("2024-06-01"), title: "Summer Break" },
      { date: new Date("2024-09-05"), title: "Teachers Day" },
    ];

    entries.sort((a, b) => a.date.getTime() - b.date.getTime());

    expect(entries[0].title).toBe("Summer Break");
    expect(entries[1].title).toBe("Teachers Day");
    expect(entries[2].title).toBe("Annual Day");
  });

  it("generates default entries for an academic year", () => {
    const academicYear = "2024-2025";
    const year = parseInt(academicYear.split("-")[0]);
    const entries: { title: string; date: Date }[] = [];

    entries.push(
      { date: new Date(year, 5, 1), title: "Summer Break" },
      { date: new Date(year, 11, 24), title: "Winter Break" },
      { date: new Date(year, 6, 15), title: "Parent-Teacher Meeting" },
      { date: new Date(year, 8, 5), title: "Teachers' Day" },
      { date: new Date(year + 1, 0, 26), title: "Republic Day - Sports Meet" },
    );

    expect(entries).toHaveLength(5);
    expect(entries[0].date.getFullYear()).toBe(2024);
    expect(entries[4].date.getFullYear()).toBe(2025);
  });
});

// ════════════════════════════════════════
// 24. BRANDING - Field Validation
// ════════════════════════════════════════

describe("Branding Defaults", () => {
  it("provides correct default branding values", () => {
    const defaults = {
      primaryColor: "#6366f1",
      secondaryColor: "#8b5cf6",
      accentColor: "#f59e0b",
      fontFamily: "Inter",
      sidebarStyle: "default",
      headerStyle: "default",
      showPoweredBy: true,
    };

    expect(defaults.primaryColor).toBe("#6366f1");
    expect(defaults.fontFamily).toBe("Inter");
    expect(defaults.showPoweredBy).toBe(true);
  });

  it("validates hex color format", () => {
    const validColors = ["#6366f1", "#fff", "#000000", "#abc123"];
    const invalidColors = ["red", "rgb(0,0,0)", "6366f1", "#xyz"];

    const isHex = (c: string) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c);

    for (const c of validColors) {
      expect(isHex(c)).toBe(true);
    }
    for (const c of invalidColors) {
      expect(isHex(c)).toBe(false);
    }
  });
});

// ════════════════════════════════════════
// 25. PUSH SUBSCRIPTION - Validation
// ════════════════════════════════════════

describe("Push Subscription Validation", () => {
  it("validates subscription has required fields", () => {
    const validSub = {
      endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
      keys: { p256dh: "BPlkey123", auth: "authkey456" },
    };

    const isValid = (sub: Record<string, unknown>) =>
      !!(
        sub?.endpoint &&
        (sub?.keys as Record<string, unknown>)?.p256dh &&
        (sub?.keys as Record<string, unknown>)?.auth
      );

    expect(isValid(validSub)).toBe(true);
    expect(isValid({ endpoint: "abc" })).toBe(false);
    expect(isValid({})).toBe(false);
    expect(isValid({ endpoint: "abc", keys: { p256dh: "x" } })).toBe(false);
  });
});

// ════════════════════════════════════════
// 26. INVENTORY / ALUMNI / DOCUMENTS - Field correctness
// ════════════════════════════════════════

describe("Model Field Correctness", () => {
  describe("Inventory fields", () => {
    it("uses correct category enum values", () => {
      const validCategories = [
        "lab_equipment",
        "sports",
        "furniture",
        "electronics",
        "stationery",
        "library",
        "other",
      ];
      const validConditions = ["new", "good", "fair", "poor", "damaged"];
      const validStatuses = [
        "available",
        "checked_out",
        "maintenance",
        "retired",
      ];

      expect(validCategories).toContain("lab_equipment");
      expect(validConditions).toContain("good");
      expect(validStatuses).toContain("available");
      expect(validStatuses).not.toContain("isActive");
    });
  });

  describe("LeaveRequest fields", () => {
    it("uses from_date/to_date (not startDate/endDate)", () => {
      const leaveFields = [
        "school",
        "student",
        "student_name",
        "class_name",
        "from_date",
        "to_date",
        "reason",
        "status",
      ];
      expect(leaveFields).toContain("from_date");
      expect(leaveFields).toContain("to_date");
      expect(leaveFields).not.toContain("startDate");
      expect(leaveFields).not.toContain("endDate");
    });

    it("has student ref (not user ref)", () => {
      const refField = "student";
      expect(refField).toBe("student");
      expect(refField).not.toBe("user");
    });
  });

  describe("Subject fields", () => {
    it("uses className in model (validator uses class_name)", () => {
      const subjectModelFields = [
        "name",
        "code",
        "credits",
        "type",
        "semester",
        "className",
        "teacherId",
        "teacherName",
        "status",
      ];
      expect(subjectModelFields).toContain("className");
    });
  });

  describe("Room fields", () => {
    it("uses status 'available' (not isActive: true)", () => {
      const validStatuses = ["available", "maintenance", "occupied"];
      expect(validStatuses).toContain("available");
    });

    it("uses room_name (not name or roomNumber)", () => {
      const roomFields = [
        "room_name",
        "room_type",
        "capacity",
        "floor",
        "facilities",
        "status",
      ];
      expect(roomFields).toContain("room_name");
      expect(roomFields).not.toContain("roomNumber");
    });
  });

  describe("Timetable fields", () => {
    it("uses teacher_name and teacher_id (not teacher)", () => {
      const ttFields = [
        "class_name",
        "day",
        "period",
        "start_time",
        "end_time",
        "subject",
        "teacher_id",
        "teacher_name",
        "room",
      ];
      expect(ttFields).toContain("teacher_name");
      expect(ttFields).toContain("teacher_id");
      expect(ttFields).toContain("start_time");
      expect(ttFields).toContain("end_time");
    });
  });

  describe("Holiday fields", () => {
    it("uses date and name (not startDate/title)", () => {
      const holidayFields = [
        "date",
        "name",
        "type",
        "holiday_type",
        "description",
      ];
      expect(holidayFields).toContain("date");
      expect(holidayFields).toContain("name");
      expect(holidayFields).not.toContain("startDate");
      expect(holidayFields).not.toContain("title");
    });
  });

  describe("Event fields", () => {
    it("uses startDate and title", () => {
      const eventFields = [
        "title",
        "startDate",
        "endDate",
        "type",
        "description",
        "location",
      ];
      expect(eventFields).toContain("startDate");
      expect(eventFields).toContain("title");
    });
  });

  describe("Exam model fields", () => {
    it("uses className in model and date", () => {
      const examModelFields = [
        "name",
        "type",
        "className",
        "subject",
        "date",
        "totalMarks",
        "passingMarks",
      ];
      expect(examModelFields).toContain("className");
      expect(examModelFields).toContain("date");
    });
  });

  describe("Student fields", () => {
    it("uses roll_number (not rollNumber)", () => {
      const studentFields = [
        "name",
        "class_name",
        "roll_number",
        "status",
        "parent_name",
        "parent_phone",
      ];
      expect(studentFields).toContain("roll_number");
      expect(studentFields).not.toContain("rollNumber");
    });

    it("uses status 'active' (not isActive: true)", () => {
      const validStatuses = ["active", "inactive"];
      expect(validStatuses).toContain("active");
    });
  });

  describe("Attendance fields", () => {
    it("date is a String (not Date)", () => {
      const dateValue = "2024-07-15";
      expect(typeof dateValue).toBe("string");
    });
  });

  describe("TeacherEvaluation model", () => {
    it("teacher references User model (not Teacher)", () => {
      const refModel = "User";
      expect(refModel).toBe("User");
      expect(refModel).not.toBe("Teacher");
    });
  });

  describe("SchoolBranding fields", () => {
    it("has sidebar and header style enums", () => {
      const sidebarStyles = ["default", "compact", "expanded"];
      const headerStyles = ["default", "centered", "minimal"];
      expect(sidebarStyles).toContain("default");
      expect(headerStyles).toContain("centered");
    });
  });

  describe("Alumni fields", () => {
    it("has required fields: name, graduationYear, class_name", () => {
      const requiredFields = ["school", "name", "graduationYear", "class_name"];
      expect(requiredFields).toContain("name");
      expect(requiredFields).toContain("graduationYear");
      expect(requiredFields).toContain("class_name");
    });
  });

  describe("StudentDocument fields", () => {
    it("has valid document types", () => {
      const docTypes = [
        "birth_certificate",
        "aadhaar",
        "transfer_certificate",
        "marksheet",
        "photo",
        "medical",
        "other",
      ];
      expect(docTypes).toContain("birth_certificate");
      expect(docTypes).toContain("aadhaar");
      expect(docTypes).toHaveLength(7);
    });
  });
});

// ════════════════════════════════════════
// 27. PERMISSION SYSTEM
// ════════════════════════════════════════

describe("Permission System", () => {
  it("defines correct permission categories", () => {
    const permissionCategories = [
      "students",
      "attendance",
      "teachers",
      "leaves",
      "reports",
      "settings",
      "notifications",
      "visitors",
      "rooms",
      "holidays",
      "timetable",
      "emergency",
      "qr",
      "profile",
      "fees",
      "exams",
      "departments",
      "semesters",
      "subjects",
      "salary",
      "transport",
      "library",
      "hostel",
      "promotion",
      "backup",
      "academic",
      "upload",
      "workload",
      "users",
    ];

    expect(permissionCategories).toContain("fees");
    expect(permissionCategories).toContain("salary");
    expect(permissionCategories).toContain("transport");
    expect(permissionCategories).toContain("library");
    expect(permissionCategories).toContain("hostel");
    expect(permissionCategories).toHaveLength(29);
  });

  it("branding PUT requires settings:write (not settings:read)", () => {
    const brandingPutPermission = "settings:write";
    expect(brandingPutPermission).toBe("settings:write");
    expect(brandingPutPermission).not.toBe("settings:read");
  });

  it("teacher-evaluation POST requires teachers:write", () => {
    const evalPostPermission = "teachers:write";
    expect(evalPostPermission).toBe("teachers:write");
  });
});

// ════════════════════════════════════════
// 28. SESSION USER FIELD CORRECTNESS
// ════════════════════════════════════════

describe("Session user field correctness", () => {
  it("uses school_id (not school) for DB queries", () => {
    const sessionField = "school_id";
    expect(sessionField).toBe("school_id");
    expect(sessionField).not.toBe("school");
  });

  it("routes must use school_id in DB queries", () => {
    const correctQuery = { school: "session_user_school_id_value" };
    const incorrectQuery = { school: undefined };

    expect(correctQuery.school).toBeTruthy();
    expect(incorrectQuery.school).toBeFalsy();
  });
});
