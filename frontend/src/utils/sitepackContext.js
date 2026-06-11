import {
  FRIDAY_PACK_FORMS_CATEGORY,
  GENERAL_FORMS_CATEGORY,
} from "./generalFormSubmissions";

export function normalizeSitepackId(value) {
  if (value == null) return null;
  const t = String(value).trim();
  return t !== "" ? t : null;
}

/** Category for saves when opened from site pack (Friday Pack module) vs /general-forms. */
export function resolveFormCategoryFromSearchParams(searchParams) {
  const explicit = searchParams.get("category")?.trim();
  if (explicit) return explicit;
  if (normalizeSitepackId(searchParams.get("siteId"))) {
    return FRIDAY_PACK_FORMS_CATEGORY;
  }
  return GENERAL_FORMS_CATEGORY;
}

export function resolveSitepackModuleTitle(category, { siteId, subfolderId } = {}) {
  if (!siteId) return category || null;
  if (category && category !== GENERAL_FORMS_CATEGORY) return category;
  if (subfolderId) return FRIDAY_PACK_FORMS_CATEGORY;
  return category || FRIDAY_PACK_FORMS_CATEGORY;
}

export function appendSitepackToAnswers(payload, { siteId, subfolderId }) {
  const out = { ...payload };
  const sid = normalizeSitepackId(siteId);
  const sfid = normalizeSitepackId(subfolderId);
  if (sid) out.siteId = sid;
  if (sfid) out.subfolderId = sfid;
  return out;
}

export function matchesSitepackScope(record, { siteId, subfolderId }) {
  const rSiteId = record.answers?.siteId ?? record.siteId;
  const rSubfolderId = normalizeSitepackId(
    record.answers?.subfolderId ?? record.subfolderId
  );
  const wantSite = normalizeSitepackId(siteId);
  const wantSubfolder = normalizeSitepackId(subfolderId);

  if (wantSite && normalizeSitepackId(rSiteId) !== wantSite) return false;
  if (wantSubfolder) return rSubfolderId === wantSubfolder;
  if (wantSite) return true;
  return !rSubfolderId;
}

export function sitepackNavState({ siteId, subfolderId, moduleTitle }) {
  const state = {};
  if (siteId) state.siteId = siteId;
  if (subfolderId) state.subfolderId = subfolderId;
  if (moduleTitle) state.moduleTitle = moduleTitle;
  return state;
}

export function sitepackSearchParams({ siteId, subfolderId, category, extra = {} }) {
  const params = { ...extra };
  const sid = normalizeSitepackId(siteId);
  const sfid = normalizeSitepackId(subfolderId);
  if (sid) params.siteId = sid;
  if (sfid) params.subfolderId = sfid;
  if (category) params.category = category;
  return params;
}
