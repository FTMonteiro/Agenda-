// The one canonical form of an email address in this API: what is stored, what is looked
// up, and what per-account request limits are keyed on. Validation schemas apply it too.
export function normalizeEmail(email: string): string {
  return email.normalize("NFC").trim().toLowerCase();
}
