/**
 * Default class/grade options by institution category.
 *
 * When an institution is registered with a specific `school_type`,
 * these default options are shown in class dropdowns so admins don't
 * have to manually create them. Any custom classes added via students
 * are merged on top of these defaults.
 */

export type InstitutionCategory =
  | "school"
  | "college"
  | "university"
  | "institute"
  | "coaching";

/**
 * Predefined class options for each institution category.
 * These are shown as defaults in all class/grade dropdowns.
 */
export const CLASS_OPTIONS_BY_CATEGORY: Record<string, string[]> = {
  // ── School (K-12) ─────────────────────────────────────────────────────────
  school: [
    "Nursery",
    "LKG",
    "UKG",
    "Class 1",
    "Class 2",
    "Class 3",
    "Class 4",
    "Class 5",
    "Class 6",
    "Class 7",
    "Class 8",
    "Class 9",
    "Class 10",
    "Class 11",
    "Class 12",
  ],

  // ── College ────────────────────────────────────────────────────────────────
  college: [
    "1st Year",
    "2nd Year",
    "3rd Year",
    "4th Year",
    "Semester 1",
    "Semester 2",
    "Semester 3",
    "Semester 4",
    "Semester 5",
    "Semester 6",
    "Semester 7",
    "Semester 8",
  ],

  // ── University ─────────────────────────────────────────────────────────────
  university: [
    "B.A. 1st Year",
    "B.A. 2nd Year",
    "B.A. 3rd Year",
    "B.Sc. 1st Year",
    "B.Sc. 2nd Year",
    "B.Sc. 3rd Year",
    "B.Com. 1st Year",
    "B.Com. 2nd Year",
    "B.Com. 3rd Year",
    "B.Tech 1st Year",
    "B.Tech 2nd Year",
    "B.Tech 3rd Year",
    "B.Tech 4th Year",
    "M.A. 1st Year",
    "M.A. 2nd Year",
    "M.Sc. 1st Year",
    "M.Sc. 2nd Year",
    "M.Tech 1st Year",
    "M.Tech 2nd Year",
    "MBA 1st Year",
    "MBA 2nd Year",
    "Ph.D.",
  ],

  // ── Institute ──────────────────────────────────────────────────────────────
  institute: [
    "Level 1",
    "Level 2",
    "Level 3",
    "Level 4",
    "Level 5",
    "Foundation",
    "Intermediate",
    "Advanced",
    "Diploma Year 1",
    "Diploma Year 2",
    "Diploma Year 3",
    "Certificate Course",
  ],

  // ── Coaching Center ────────────────────────────────────────────────────────
  coaching: [
    "Class 6 Batch",
    "Class 7 Batch",
    "Class 8 Batch",
    "Class 9 Batch",
    "Class 10 Batch",
    "Class 11 Batch",
    "Class 12 Batch",
    "JEE Foundation",
    "JEE Mains",
    "JEE Advanced",
    "NEET",
    "UPSC",
    "CAT",
    "GATE",
    "Bank Exams",
    "SSC",
  ],
};

/**
 * Get the default class options for a given institution category.
 * Falls back to generic options if category is not recognized.
 */
export function getDefaultClassOptions(category: string): string[] {
  const key = (category || "").toLowerCase().trim();
  return CLASS_OPTIONS_BY_CATEGORY[key] || CLASS_OPTIONS_BY_CATEGORY.school;
}

/**
 * Merge predefined defaults with existing (student-derived) classes.
 * Returns a de-duplicated, naturally sorted list.
 */
export function mergeClassOptions(
  defaults: string[],
  existing: string[],
): string[] {
  const merged = new Set([...defaults, ...existing]);
  return Array.from(merged).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
}

/**
 * Human-readable labels for the generic "class" field, per category.
 * Used in UI labels like "Select class" → "Select year" for colleges.
 */
export const CLASS_LABEL_BY_CATEGORY: Record<string, string> = {
  school: "Class",
  college: "Year / Semester",
  university: "Program / Year",
  institute: "Level / Course",
  coaching: "Batch",
};

/**
 * Get the human-readable label for the class field.
 */
export function getClassLabel(category: string): string {
  const key = (category || "").toLowerCase().trim();
  return CLASS_LABEL_BY_CATEGORY[key] || "Class";
}
