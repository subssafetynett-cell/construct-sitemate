export const GENERAL_FORM_VISIBILITY = {
  PUBLIC: "public",
  PRIVATE: "private",
};

export function normalizeGeneralFormVisibility(value) {
  return value === GENERAL_FORM_VISIBILITY.PUBLIC
    ? GENERAL_FORM_VISIBILITY.PUBLIC
    : GENERAL_FORM_VISIBILITY.PRIVATE;
}

export function getSubmissionVisibility(submission) {
  return normalizeGeneralFormVisibility(submission?.answers?.visibility);
}

export function hasExplicitGeneralFormVisibility(answers) {
  if (!answers || typeof answers !== "object") return false;
  const v = answers.visibility;
  return (
    v === GENERAL_FORM_VISIBILITY.PUBLIC || v === GENERAL_FORM_VISIBILITY.PRIVATE
  );
}

/** Who can see this submission in client-side lists (server enforces the same rules). */
export function isGeneralFormVisibleToUser(submission, currentUserId) {
  if (!submission) return false;
  const submitterId = submission.submittedById || submission.submittedBy?.id;
  return Boolean(submitterId && submitterId === currentUserId);
}

export function visibilityLabel(visibility) {
  return normalizeGeneralFormVisibility(visibility) === GENERAL_FORM_VISIBILITY.PRIVATE
    ? "Private"
    : "Public";
}

/** Attach visibility when saving from General Forms (not site pack). */
export function withGeneralFormVisibility(payload, visibility, { hasSiteContext = false } = {}) {
  if (hasSiteContext) return payload;
  return {
    ...payload,
    visibility: normalizeGeneralFormVisibility(visibility),
  };
}
