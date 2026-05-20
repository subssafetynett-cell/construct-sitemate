const GENERAL_FORM_VISIBILITY = {
  PUBLIC: "public",
  PRIVATE: "private",
};

const SHEQ_CATEGORIES = new Set(["SHEQ Installation", "SHEQ Inspection"]);

function isSheqCategory(category) {
  return SHEQ_CATEGORIES.has(category);
}

function normalizeVisibility(value) {
  return value === GENERAL_FORM_VISIBILITY.PRIVATE
    ? GENERAL_FORM_VISIBILITY.PRIVATE
    : GENERAL_FORM_VISIBILITY.PUBLIC;
}

function getVisibilityFromAnswers(answers) {
  if (!answers || typeof answers !== "object") {
    return GENERAL_FORM_VISIBILITY.PUBLIC;
  }
  return normalizeVisibility(answers.visibility);
}

function siteContextPresent(answers) {
  const siteId = answers?.siteId;
  return siteId != null && String(siteId).trim() !== "";
}

/**
 * Read access: own submissions always; others' only if public and same company.
 * SHEQ reports are shared across the submitter's company even when linked to a site.
 */
function canViewFormResponse(row, userId, clientId, options = {}) {
  const { globalAccess = false } = options;
  if (!row) return false;
  if (row.submittedById === userId) return true;

  if (getVisibilityFromAnswers(row.answers) === GENERAL_FORM_VISIBILITY.PRIVATE) {
    return false;
  }

  if (globalAccess) {
    return true;
  }

  const submitterClientId = row.submittedBy?.clientId;
  const sameCompany =
    Boolean(clientId && submitterClientId) && clientId === submitterClientId;

  if (isSheqCategory(row.category)) {
    return sameCompany;
  }

  if (siteContextPresent(row.answers)) {
    return row.submittedById === userId;
  }
  if (!clientId || !submitterClientId) return false;
  return sameCompany;
}

function sanitizeVisibilityOnSave(answers, body = {}) {
  const merged = { ...(answers || {}) };
  if (siteContextPresent(merged) || siteContextPresent(body)) {
    delete merged.visibility;
    return merged;
  }
  const raw = body.visibility ?? merged.visibility;
  merged.visibility = normalizeVisibility(raw);
  return merged;
}

module.exports = {
  GENERAL_FORM_VISIBILITY,
  normalizeVisibility,
  getVisibilityFromAnswers,
  canViewFormResponse,
  sanitizeVisibilityOnSave,
  siteContextPresent,
  isSheqCategory,
};
