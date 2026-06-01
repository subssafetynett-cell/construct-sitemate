const {
  APP_PAGES,
  PAGE_KEYS,
  ALWAYS_ON_KEYS,
  VIEW_ONLY_FORBIDDEN_PAGE_KEYS,
} = require("../constants/pageAccess");

function isViewOnlyUser(user) {
  return String(user?.accessMode || "standard").toLowerCase() === "view_only";
}

function normalizeAllowedPages(input, { forViewOnly = false } = {}) {
  if (input == null) return [];
  const raw = Array.isArray(input) ? input : [];
  const unique = [...new Set(raw.map((k) => String(k).trim()).filter(Boolean))];
  return unique.filter((k) => {
    if (!PAGE_KEYS.includes(k)) return false;
    if (forViewOnly && VIEW_ONLY_FORBIDDEN_PAGE_KEYS.has(k)) return false;
    return true;
  });
}

function mergeWithAlwaysOn(pages, options = {}) {
  const set = new Set([
    ...normalizeAllowedPages(pages, options),
    ...ALWAYS_ON_KEYS,
  ]);
  return [...set];
}

function pathnameToPageKey(pathname) {
  const path = String(pathname || "").split("?")[0].replace(/\/+$/, "") || "/";
  for (const page of APP_PAGES) {
    for (const prefix of page.paths) {
      if (path === prefix || path.startsWith(`${prefix}/`)) {
        return page.key;
      }
    }
  }
  return null;
}

function userCanAccessPageKey(user, pageKey) {
  if (!pageKey) return true;
  if (ALWAYS_ON_KEYS.has(pageKey)) return true;
  if (!isViewOnlyUser(user)) return true;
  if (VIEW_ONLY_FORBIDDEN_PAGE_KEYS.has(pageKey)) return false;
  const allowed = mergeWithAlwaysOn(user.allowedPages, { forViewOnly: true });
  return allowed.includes(pageKey);
}

function userCanAccessPath(user, pathname) {
  const key = pathnameToPageKey(pathname);
  if (!key) return !isViewOnlyUser(user);
  return userCanAccessPageKey(user, key);
}

function formatUserAccessFields(user) {
  const accessMode = user?.accessMode || "standard";
  const allowedPages =
    accessMode === "view_only"
      ? mergeWithAlwaysOn(user?.allowedPages, { forViewOnly: true })
      : null;
  return {
    accessMode,
    allowedPages,
    viewOnly: accessMode === "view_only",
  };
}

const VIEW_ONLY_WRITE_ALLOWLIST = [
  /^\/api\/auth\/login$/i,
  /^\/api\/auth\/signup$/i,
  /^\/api\/auth\/verify-email/i,
  /^\/api\/auth\/forgot-password/i,
  /^\/api\/auth\/reset-password/i,
  /^\/api\/auth\/2fa/i,
];

function isViewOnlyWriteAllowed(req) {
  const path = req.originalUrl?.split("?")[0] || req.path || "";
  return VIEW_ONLY_WRITE_ALLOWLIST.some((re) => re.test(path));
}

function isMutatingMethod(method) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "").toUpperCase());
}

module.exports = {
  APP_PAGES,
  PAGE_KEYS,
  ALWAYS_ON_KEYS,
  VIEW_ONLY_FORBIDDEN_PAGE_KEYS,
  isViewOnlyUser,
  normalizeAllowedPages,
  mergeWithAlwaysOn,
  pathnameToPageKey,
  userCanAccessPageKey,
  userCanAccessPath,
  formatUserAccessFields,
  isViewOnlyWriteAllowed,
  isMutatingMethod,
};
