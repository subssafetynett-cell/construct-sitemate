/** Category used when saving from /general-forms (no site pack). */
export const GENERAL_FORMS_CATEGORY = "General forms";

/** Category used when saving from site pack → Friday Pack Forms module. */
export const FRIDAY_PACK_FORMS_CATEGORY = "Friday Pack Forms";

export const GENERAL_FORM_TEMPLATE_TITLES = [
  "Tool Box Talk Register",
  "RAMS Briefing Form",
  "Site Induction Register",
  "Management Site Inspection Report",
  "Daily Safe Start Briefing Sheet",
  "Audit Action Form",
  "Site Induction Form",
  "LOLER Inspection Form",
  "PUWER Inspection Form",
  "Alimak Weekly Check",
];

const TEMPLATE_TITLE_SET = new Set(GENERAL_FORM_TEMPLATE_TITLES);

export function submissionHasSiteContext(sub) {
  const siteId = sub?.answers?.siteId ?? sub?.siteId;
  return siteId != null && String(siteId).trim() !== "";
}

/**
 * Site-pack Friday Pack fills, including legacy rows saved before category/subfolder
 * metadata was always written consistently.
 */
export function isFridayPackSiteSubmission(sub) {
  const category = (sub?.category || "").trim();
  if (category === FRIDAY_PACK_FORMS_CATEGORY) return true;
  if (!submissionHasSiteContext(sub)) return false;
  if (category && category !== GENERAL_FORMS_CATEGORY) {
    const title = sub?.form?.title;
    if (title && TEMPLATE_TITLE_SET.has(title)) return true;
    return false;
  }
  return true;
}

/**
 * API list params for Friday Pack forms at a site.
 * Do not append a trailing comma — that used to expand the backend filter to
 * every null/empty-category row and intermittently 500'd on large payloads.
 */
export function fridayPackFormListFetchParams(siteId) {
  const params = {
    category: `${FRIDAY_PACK_FORMS_CATEGORY},${GENERAL_FORMS_CATEGORY}`,
  };
  if (siteId != null && String(siteId).trim() !== "") {
    params.siteId = String(siteId).trim();
  }
  return params;
}

/** Friday Pack list views are personal — each user sees only their own site-pack form fills. */
export function isFridayPackFormForUser(sub, userId) {
  if (!isFridayPackSiteSubmission(sub)) return false;
  if (!userId) return false;
  return userOwnsFormSubmission(sub, userId);
}

/** Whether a form response belongs in a site-pack category list (e.g. Friday Pack). */
export function belongsInSitepackCategory(record, categoryTitle) {
  if (!record) return false;
  const cat = (record.category || "").trim();
  if (cat === categoryTitle) return true;
  if (categoryTitle === FRIDAY_PACK_FORMS_CATEGORY) {
    return isFridayPackSiteSubmission(record);
  }
  return false;
}

export function userOwnsFormSubmission(sub, userId) {
  if (!userId) return false;
  const ownerId = sub?.submittedById ?? sub?.submittedBy?.id;
  if (ownerId == null || ownerId === "") return false;
  return String(ownerId) === String(userId);
}

/** List rows already returned by the API are visibility-scoped server-side. */
export function includeFridayPackListRow(sub) {
  return isFridayPackSiteSubmission(sub);
}

/**
 * Submissions that belong on the General Forms "Manage Submissions" list
 * (template edits saved from /general-forms, not Friday Pack site submissions).
 */
export function isGeneralFormsPageSubmission(sub) {
  if (submissionHasSiteContext(sub)) return false;

  const category = (sub.category || "").trim();
  if (category === FRIDAY_PACK_FORMS_CATEGORY) return false;

  if (sub?.answers?.savedFromTemplatesPage === true) {
    return category === GENERAL_FORMS_CATEGORY || category === "";
  }

  const title = sub?.form?.title;
  if (!title || !TEMPLATE_TITLE_SET.has(title)) return false;

  if (category === GENERAL_FORMS_CATEGORY || category === "") return true;

  return false;
}

/**
 * Saved templates to pick when starting a Friday Pack form from a general-form version.
 */
export function isSavedGeneralFormTemplate(sub) {
  return isGeneralFormsPageSubmission(sub);
}
