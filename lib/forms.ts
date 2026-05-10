/**
 * Form schema types — used by both the form builder admin and the public
 * form renderer at /form/[slug].
 */

export type FormFieldType =
  | "text"
  | "email"
  | "phone"
  | "textarea"
  | "select"
  | "checkbox"
  | "radio"
  | "url"
  | "number"
  | "date";

export type FormField = {
  /** Unique-within-form, used as the JSON key on submissions */
  name: string;
  /** Visible label shown above the input */
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  /** For select / radio types */
  options?: { value: string; label: string }[];
};

export type FormSpec = {
  fields: FormField[];
};

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: "Single-line text",
  email: "Email",
  phone: "Phone",
  textarea: "Long text (paragraph)",
  select: "Dropdown",
  checkbox: "Checkbox",
  radio: "Radio buttons",
  url: "URL",
  number: "Number",
  date: "Date",
};

/**
 * Slugify a label into a safe field name.
 *   "Your Phone Number" → "your_phone_number"
 */
export function fieldNameFromLabel(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "field";
}

/**
 * Recognise the common "name", "email", "phone", "message" fields by their
 * label or name so the inbox can show them in dedicated columns.
 */
export function extractCommon(submission: Record<string, unknown>): {
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
} {
  let name: string | null = null;
  let email: string | null = null;
  let phone: string | null = null;
  let message: string | null = null;

  for (const [k, v] of Object.entries(submission)) {
    const key = k.toLowerCase();
    const val = typeof v === "string" ? v : "";
    if (!name && /(^|_)name(_|$)/.test(key)) name = val;
    if (!email && /email/.test(key)) email = val;
    if (!phone && /(phone|tel|mobile)/.test(key)) phone = val;
    if (!message && /(message|notes|details|comments)/.test(key)) message = val;
  }
  return { name, email, phone, message };
}
