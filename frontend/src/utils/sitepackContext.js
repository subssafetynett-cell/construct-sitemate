export function normalizeSitepackId(value) {
  if (value == null) return null;
  const t = String(value).trim();
  return t !== "" ? t : null;
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
  if (normalizeSitepackId(rSiteId) !== normalizeSitepackId(siteId)) return false;
  const rSubfolderId = normalizeSitepackId(record.answers?.subfolderId);
  const wantSubfolder = normalizeSitepackId(subfolderId);
  if (wantSubfolder) return rSubfolderId === wantSubfolder;
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
