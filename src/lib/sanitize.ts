// ─── Input Sanitization Utility ──────────────────────────────────────────────
// Strips HTML tags and dangerous content from user input to prevent XSS.
// Apply to all free-text fields before database storage.

/**
 * Strip HTML tags from a string to prevent stored XSS.
 * Preserves plain text content while removing all HTML elements.
 */
export function stripHtml(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .trim();
}

/**
 * Sanitize a string by removing potentially dangerous characters/patterns.
 * Use for names, titles, and short text fields.
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== "string") return "";
  return stripHtml(input)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove control characters
    .trim();
}

/**
 * Sanitize an object's string fields recursively.
 * Useful for sanitizing entire request bodies.
 * @param obj - Object with string fields to sanitize
 * @param fields - Array of field names to sanitize (sanitizes all string fields if omitted)
 */
export function sanitizeFields<T extends Record<string, unknown>>(
  obj: T,
  fields?: string[],
): T {
  const result = { ...obj };
  const keysToSanitize = fields || Object.keys(result);

  for (const key of keysToSanitize) {
    const value = result[key];
    if (typeof value === "string") {
      (result as Record<string, unknown>)[key] = sanitizeText(value);
    }
  }

  return result;
}

/**
 * Sanitize common user-facing fields in a request body.
 * Call this on validated data before writing to database.
 */
export function sanitizeUserInput(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const textFields = [
    "name",
    "school_name",
    "address",
    "subject",
    "classes",
    "class_name",
    "parent_name",
    "description",
    "title",
    "message",
    "purpose",
    "notes",
    "equipment_needed",
    "attendees",
  ];
  return sanitizeFields(data, textFields);
}
