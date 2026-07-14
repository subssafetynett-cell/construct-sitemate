import {
  FRIDAY_PACK_FORMS_CATEGORY,
  GENERAL_FORMS_CATEGORY,
} from "./generalFormSubmissions";

/** Query flag when opening a template from /general-forms (Templates page). */
export const TEMPLATES_PAGE_SOURCE = "templates";

export const TEMPLATES_PAGE_TAB_SAVED = "saved";

function isLibraryOnlyCategory(category) {
  const c = (category || "").trim();
  return !c || c === GENERAL_FORMS_CATEGORY || c === FRIDAY_PACK_FORMS_CATEGORY;
}

/**
 * True only when editing/saving a reusable template from /general-forms.
 * Fills started from Performance Monitoring, Reporting Concerns, or Site Pack
 * must not use this path — even if `source=templates` leaked into the URL.
 */
export function isTemplatesPageEditContext(searchParams) {
  if (!searchParams) return false;
  if (searchParams.get("source") !== TEMPLATES_PAGE_SOURCE) return false;
  // Contextual fills pass these; Templates-page edits do not.
  if (searchParams.get("siteId")) return false;
  if (searchParams.get("monitoringSection")) return false;
  if (searchParams.get("listPath")) return false;
  return true;
}

/** Site pack / monitoring / reporting concern fill (not Templates library edit). */
export function isContextualFormFill(searchParams) {
  if (!searchParams) return false;
  if (isTemplatesPageEditContext(searchParams)) return false;
  if (searchParams.get("siteId")) return true;
  if (searchParams.get("monitoringSection")) return true;
  if (searchParams.get("listPath")) return true;
  return !isLibraryOnlyCategory(searchParams.get("category"));
}

/**
 * Ensure Templates-page saves stay on Templates only:
 * force General forms category and strip site / monitoring context.
 */
export function prepareTemplatesPageSave(payload, searchParams, templateModuleTitle = "") {
  if (!isTemplatesPageEditContext(searchParams)) {
    if (!payload || typeof payload !== "object") {
      return { payload, category: undefined, isTemplatesPage: false };
    }
    if (payload.savedFromTemplatesPage == null) {
      return { payload, category: undefined, isTemplatesPage: false };
    }
    const next = { ...payload };
    delete next.savedFromTemplatesPage;
    return { payload: next, category: undefined, isTemplatesPage: false };
  }

  const next = { ...(payload || {}) };
  delete next.siteId;
  delete next.subfolderId;
  delete next.monitoringSection;
  next.savedFromTemplatesPage = true;
  if (templateModuleTitle) {
    next.templateModuleTitle = templateModuleTitle;
  }

  return {
    payload: next,
    category: GENERAL_FORMS_CATEGORY,
    isTemplatesPage: true,
  };
}

export function appendTemplatesPageMetadata(payload, searchParams, templateModuleTitle = "") {
  const prepared = prepareTemplatesPageSave(payload, searchParams, templateModuleTitle);
  return prepared.payload;
}

export function templatesPageListUrl() {
  return `/general-forms?tab=${TEMPLATES_PAGE_TAB_SAVED}`;
}

export function templateSaveButtonLabel({ saving = false, downloading = false } = {}) {
  if (downloading) return "Downloading PDF...";
  if (saving) return "Saving...";
  return "Save";
}
