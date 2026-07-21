const { reqUserDbId } = require("./userAuthorization");

const STATIC_CONCERN_FORM_ID = "health-safety-concern-static-id";

/**
 * Whether the authenticated user may update/delete this form definition.
 * Orphan forms (no creator) and the shared static concern form are never editable.
 */
function canModifyFormRecord(form, userId) {
  if (!form || !userId) return false;
  // System concern template — used for submissions; never edit/delete the definition.
  if (form.id === STATIC_CONCERN_FORM_ID) return false;
  if (!form.createdById) return false;
  return form.createdById === userId;
}

/** Any authenticated user may read a form definition (GET /forms/:id). */
function assertAuthenticatedForm(req, form) {
  const userId = reqUserDbId(req);
  if (!userId) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }
  if (!form) {
    return { ok: false, status: 404, message: "Form not found" };
  }
  return { ok: true, userId };
}

/** Creator-only: update/delete form definitions. */
function assertCanModifyForm(req, form) {
  const auth = assertAuthenticatedForm(req, form);
  if (!auth.ok) return auth;
  if (form?.id === STATIC_CONCERN_FORM_ID) {
    return {
      ok: false,
      status: 403,
      message: "The system Concern form cannot be edited or deleted",
    };
  }
  if (!canModifyFormRecord(form, auth.userId)) {
    return {
      ok: false,
      status: 403,
      message: "You can only edit or delete your own forms",
    };
  }
  return { ok: true, userId: auth.userId };
}

/** @deprecated Use assertCanModifyForm — kept for existing imports */
const assertCanAccessForm = assertCanModifyForm;
const canAccessFormRecord = canModifyFormRecord;

module.exports = {
  STATIC_CONCERN_FORM_ID,
  canModifyFormRecord,
  canAccessFormRecord,
  assertAuthenticatedForm,
  assertCanModifyForm,
  assertCanAccessForm,
  reqUserDbId,
};
