import {
  cn,
  formatDate,
  formatDateForStorage,
  parseStorageDate,
  generateId,
  escapeRegex,
  getStatusColor,
  calculateAttendancePercentage,
  getMonthDays,
  getClassFromString,
  validateEmail,
  validatePhone,
  capitalizeFirst,
  truncate,
} from "@/lib/utils";

// ──── cn (class merge) ────
describe("cn", () => {
  it("should merge class names", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("should resolve tailwind conflicts (last wins)", () => {
    const result = cn("px-4", "px-6");
    expect(result).toBe("px-6");
  });

  it("should handle conditional classes", () => {
    expect(cn("base", false && "hidden", "extra")).toBe("base extra");
  });

  it("should return empty string for no inputs", () => {
    expect(cn()).toBe("");
  });
});

// ──── formatDate ────
describe("formatDate", () => {
  it("should format a Date object with default format", () => {
    const date = new Date("2026-02-10T00:00:00");
    expect(formatDate(date)).toBe("10 Feb 2026");
  });

  it("should format a date string", () => {
    expect(formatDate("2026-01-01", "yyyy")).toBe("2026");
  });

  it("should accept a custom format string", () => {
    const date = new Date("2026-06-15T00:00:00");
    expect(formatDate(date, "MM/dd/yyyy")).toBe("06/15/2026");
  });
});

// ──── formatDateForStorage ────
describe("formatDateForStorage", () => {
  it("should return yyyy-MM-dd format", () => {
    const date = new Date("2026-03-05T12:00:00");
    expect(formatDateForStorage(date)).toBe("2026-03-05");
  });
});

// ──── parseStorageDate ────
describe("parseStorageDate", () => {
  it("should parse a yyyy-MM-dd string into a Date", () => {
    const date = parseStorageDate("2026-07-20");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6); // 0-indexed
    expect(date.getDate()).toBe(20);
  });
});

// ──── generateId ────
describe("generateId", () => {
  it("should generate a zero-padded id", () => {
    expect(generateId("STU", 5)).toBe("STU005");
  });

  it("should not pad numbers with 3+ digits", () => {
    expect(generateId("T", 123)).toBe("T123");
  });

  it("should handle large numbers", () => {
    expect(generateId("ID", 1000)).toBe("ID1000");
  });
});

// ──── escapeRegex ────
describe("escapeRegex", () => {
  it("should escape special regex characters", () => {
    expect(escapeRegex("hello.world")).toBe("hello\\.world");
  });

  it("should escape brackets and parens", () => {
    expect(escapeRegex("test[1](2)")).toBe("test\\[1\\]\\(2\\)");
  });

  it("should leave normal strings unchanged", () => {
    expect(escapeRegex("hello")).toBe("hello");
  });
});

// ──── getStatusColor ────
describe("getStatusColor", () => {
  it('should return green classes for "present"', () => {
    expect(getStatusColor("present")).toContain("green");
  });

  it('should return red classes for "absent"', () => {
    expect(getStatusColor("absent")).toContain("red");
  });

  it('should return amber classes for "late"', () => {
    expect(getStatusColor("late")).toContain("amber");
  });

  it("should return default gray for unknown status", () => {
    expect(getStatusColor("unknown")).toBe("bg-gray-100 text-gray-800");
  });
});

// ──── calculateAttendancePercentage ────
describe("calculateAttendancePercentage", () => {
  it("should return correct percentage", () => {
    expect(calculateAttendancePercentage(18, 20)).toBe(90);
  });

  it("should return 0 when total is 0", () => {
    expect(calculateAttendancePercentage(0, 0)).toBe(0);
  });

  it("should return 100 for perfect attendance", () => {
    expect(calculateAttendancePercentage(30, 30)).toBe(100);
  });

  it("should round to nearest integer", () => {
    expect(calculateAttendancePercentage(1, 3)).toBe(33);
  });
});

// ──── getMonthDays ────
describe("getMonthDays", () => {
  it("should return 31 for January", () => {
    expect(getMonthDays(1, 2026)).toBe(31);
  });

  it("should return 28 for Feb in non-leap year", () => {
    expect(getMonthDays(2, 2026)).toBe(28);
  });

  it("should return 29 for Feb in leap year", () => {
    expect(getMonthDays(2, 2024)).toBe(29);
  });
});

// ──── getClassFromString ────
describe("getClassFromString", () => {
  it("should split comma-separated classes", () => {
    expect(getClassFromString("10-A, 10-B, 11-A")).toEqual([
      "10-A",
      "10-B",
      "11-A",
    ]);
  });

  it("should handle single class", () => {
    expect(getClassFromString("12-C")).toEqual(["12-C"]);
  });
});

// ──── validateEmail ────
describe("validateEmail", () => {
  it("should return true for valid email", () => {
    expect(validateEmail("user@example.com")).toBe(true);
  });

  it("should return false for missing @", () => {
    expect(validateEmail("userexample.com")).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(validateEmail("")).toBe(false);
  });
});

// ──── validatePhone ────
describe("validatePhone", () => {
  it("should return true for 10-digit number", () => {
    expect(validatePhone("9876543210")).toBe(true);
  });

  it("should return true for number with dashes", () => {
    expect(validatePhone("987-654-3210")).toBe(true);
  });

  it("should return false for short number", () => {
    expect(validatePhone("12345")).toBe(false);
  });
});

// ──── capitalizeFirst ────
describe("capitalizeFirst", () => {
  it("should capitalize first letter", () => {
    expect(capitalizeFirst("hello")).toBe("Hello");
  });

  it("should handle already capitalized", () => {
    expect(capitalizeFirst("Hello")).toBe("Hello");
  });

  it("should handle empty string", () => {
    expect(capitalizeFirst("")).toBe("");
  });
});

// ──── truncate ────
describe("truncate", () => {
  it("should truncate long strings and add ellipsis", () => {
    expect(truncate("Hello World", 5)).toBe("Hello...");
  });

  it("should return original if within length", () => {
    expect(truncate("Hi", 10)).toBe("Hi");
  });

  it("should handle exact length", () => {
    expect(truncate("Hello", 5)).toBe("Hello");
  });
});
