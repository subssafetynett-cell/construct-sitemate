/** Same rules as backend plainTextCompany.js */
export const PLAIN_COMPANY_RE = /^[\p{L}\p{N}\p{M}\s'.\-&,()/]+$/u;
export const MAX_COMPANY_LEN = 200;

/** @returns {string|null} error message or null if valid */
export function plainCompanyError(value, label = "Company name") {
  if (typeof value !== "string") return `${label} must be plain text`;
  const s = value.trim();
  if (!s) return `${label} is required`;
  if (s.length > MAX_COMPANY_LEN) return `${label} must be at most ${MAX_COMPANY_LEN} characters`;
  if (/[\u0000-\u001F\u007F]/.test(s)) return `${label} contains invalid characters`;
  if (/[<>]/.test(s) || /javascript:/i.test(s) || /\bon\w+\s*=/i.test(s)) {
    return `${label} cannot contain HTML or script-like content`;
  }
  if (!PLAIN_COMPANY_RE.test(s)) {
    return `${label} may only contain letters, numbers, spaces, and . ' - & , ( ) /`;
  }
  return null;
}
