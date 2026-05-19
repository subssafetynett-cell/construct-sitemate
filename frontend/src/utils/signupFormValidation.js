import { plainNameError } from "./plainName";
import { plainCompanyError } from "./plainCompany";
import { newPasswordError } from "./passwordPolicy";

/** Matches backend: Joi.string().alphanum().min(3).max(30) */
const USERNAME_RE = /^[a-zA-Z0-9]+$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 30;

/** Matches backend: /^\+?\d{7,15}$/ on whitespace-stripped value */
const MOBILE_RE = /^\+?\d{7,15}$/;

const JOB_TITLE_MAX = 120;

function hasDangerousMarkup(s) {
  return /[<>]/.test(s) || /javascript:/i.test(s) || /\bon\w+\s*=/i.test(s);
}

/**
 * Reasonable checks without rejecting every address Joi accepts.
 * @param {unknown} raw
 * @returns {string|null} error message or null if valid
 */
export function emailFieldError(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return "Email is required";
  if (/\s/.test(t) || /[<>"]/.test(t)) return "Enter a valid email address";
  if (t.length > 254) return "Email must be at most 254 characters";
  const at = t.indexOf("@");
  if (at <= 0 || at !== t.lastIndexOf("@")) return "Enter a valid email address";
  const local = t.slice(0, at);
  const domain = t.slice(at + 1);
  if (!local || local.length > 64) return "Enter a valid email address";
  if (!domain || domain.length > 253 || !domain.includes(".")) return "Enter a valid email address";
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return "Enter a valid email address";
  }
  if (domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) {
    return "Enter a valid email address";
  }
  return null;
}

/**
 * Full client-side signup validation (mirror backend rules where possible).
 * @param {object} form — same shape as SignupPage state
 * @returns {Record<string, string>} field key → error message (empty object = valid)
 */
export function validateSignupForm(form) {
  const e = {};

  const u = String(form.username ?? "").trim();
  if (!u) e.username = "Username is required";
  else if (u.length < USERNAME_MIN) e.username = `Username must be at least ${USERNAME_MIN} characters`;
  else if (u.length > USERNAME_MAX) e.username = `Username must be at most ${USERNAME_MAX} characters`;
  else if (!USERNAME_RE.test(u)) e.username = "Username must contain only letters and numbers (no spaces or symbols)";

  const fnErr = plainNameError(form.firstName, "First name");
  if (fnErr) e.firstName = fnErr;
  const lnErr = plainNameError(form.lastName, "Last name");
  if (lnErr) e.lastName = lnErr;

  const em = emailFieldError(form.email);
  if (em) e.email = em;

  const empErr = plainCompanyError(form.employer, "Company name");
  if (empErr) e.employer = empErr;

  const jt = String(form.jobTitle ?? "").trim();
  if (jt.length > JOB_TITLE_MAX) e.jobTitle = `Job title must be at most ${JOB_TITLE_MAX} characters`;
  else if (jt && hasDangerousMarkup(jt)) e.jobTitle = "Job title cannot contain HTML or script-like content";

  const mobileNorm = String(form.mobile ?? "").replace(/\s+/g, "");
  if (!mobileNorm) e.mobile = "Mobile number is required";
  else if (!MOBILE_RE.test(mobileNorm)) {
    e.mobile = "Enter 7–15 digits only; you may start with + (e.g. +447911123456)";
  }

  const pw = form.password ?? "";
  const pwErr = newPasswordError(pw);
  if (pwErr) e.password = pwErr;

  const pc = form.passwordConfirm ?? "";
  if (!pc) e.passwordConfirm = "Please confirm password";
  else if (pw !== pc) e.passwordConfirm = "Passwords do not match";

  return e;
}
