/**
 * Organisation / company names: plain text only (no HTML or markup).
 * Allows letters, numbers, and common business punctuation.
 */
const MAX_LEN = 200;
const PLAIN_COMPANY_RE = /^[\p{L}\p{N}\p{M}\s'.\-&,()/]+$/u;

function validatePlainCompanyName(raw, fieldLabel = "Company name") {
  if (typeof raw !== "string") {
    return { ok: false, message: `${fieldLabel} must be plain text` };
  }
  const s = raw.trim();
  if (!s) {
    return { ok: false, message: `${fieldLabel} is required` };
  }
  if (s.length > MAX_LEN) {
    return { ok: false, message: `${fieldLabel} must be at most ${MAX_LEN} characters` };
  }
  if (/[\u0000-\u001F\u007F]/.test(s)) {
    return { ok: false, message: `${fieldLabel} contains invalid characters` };
  }
  if (/[<>]/.test(s) || /javascript:/i.test(s) || /\bon\w+\s*=/i.test(s)) {
    return {
      ok: false,
      message: `${fieldLabel} cannot contain HTML or script-like content`,
    };
  }
  if (!PLAIN_COMPANY_RE.test(s)) {
    return {
      ok: false,
      message: `${fieldLabel} may only contain letters, numbers, spaces, and . ' - & , ( ) /`,
    };
  }
  return { ok: true, value: s };
}

module.exports = { validatePlainCompanyName, PLAIN_COMPANY_RE, MAX_COMPANY_LEN: MAX_LEN };
