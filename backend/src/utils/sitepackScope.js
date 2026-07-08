function normalizeSitepackId(value) {
  if (value == null) return null;
  const t = String(value).trim();
  return t !== "" ? t : null;
}

function resolveRecordSitepackIds(record) {
  const answers =
    record?.answers && typeof record.answers === "object" ? record.answers : {};
  return {
    siteId: normalizeSitepackId(answers.siteId ?? record?.siteId),
    subfolderId: normalizeSitepackId(answers.subfolderId ?? record?.subfolderId),
  };
}

/** Persisted columns derived from answers JSON (kept in sync on save/update). */
function sitepackColumnsForAnswers(answers) {
  const { siteId, subfolderId } = resolveRecordSitepackIds({ answers });
  return { siteId, subfolderId };
}

/**
 * Prefer indexed FormResponse.siteId / subfolderId columns.
 * Avoid OR with answers JSON path filters — those force full JSON scans and
 * can OOM / 500 when answers contain large base64 images (Friday Pack logos).
 */
function buildSitepackFieldEquals(field, value) {
  return { [field]: value };
}

function matchesSitepackScope(record, { siteId, subfolderId }) {
  const { siteId: rSiteId, subfolderId: rSubfolderId } = resolveRecordSitepackIds(record);
  const wantSite = normalizeSitepackId(siteId);
  const wantSubfolder = normalizeSitepackId(subfolderId);

  if (wantSite && rSiteId !== wantSite) return false;
  if (wantSubfolder) return rSubfolderId === wantSubfolder;
  // Site-only filter: include responses in any subfolder (matches JSON contains { siteId }).
  if (wantSite) return true;
  return !rSubfolderId;
}

function buildSitepackScopeWhere({ siteId, subfolderId }) {
  const wantSite = normalizeSitepackId(siteId);
  const wantSubfolder = normalizeSitepackId(subfolderId);
  if (!wantSite && !wantSubfolder) return null;

  const clauses = [];
  if (wantSite) {
    clauses.push(buildSitepackFieldEquals("siteId", wantSite));
  }
  if (wantSubfolder) {
    clauses.push(buildSitepackFieldEquals("subfolderId", wantSubfolder));
  }
  if (clauses.length === 1) return clauses[0];
  return { AND: clauses };
}

module.exports = {
  normalizeSitepackId,
  resolveRecordSitepackIds,
  sitepackColumnsForAnswers,
  matchesSitepackScope,
  buildSitepackScopeWhere,
};
