function normalizeSitepackId(value) {
  if (value == null) return null;
  const t = String(value).trim();
  return t !== "" ? t : null;
}

function matchesSitepackScope(record, { siteId, subfolderId }) {
  const answers =
    record?.answers && typeof record.answers === "object" ? record.answers : {};
  const rSiteId = answers.siteId ?? record.siteId;
  const rSubfolderId = normalizeSitepackId(answers.subfolderId ?? record.subfolderId);
  const wantSite = normalizeSitepackId(siteId);
  const wantSubfolder = normalizeSitepackId(subfolderId);

  if (wantSite && normalizeSitepackId(rSiteId) !== wantSite) return false;
  if (wantSubfolder) return rSubfolderId === wantSubfolder;
  // Site-only filter: include responses in any subfolder (matches JSON contains { siteId }).
  if (wantSite) return true;
  return !rSubfolderId;
}

module.exports = {
  normalizeSitepackId,
  matchesSitepackScope,
};
