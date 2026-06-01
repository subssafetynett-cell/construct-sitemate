import { PAGE_PATH_PREFIXES } from "../constants/pageAccess";

const ALWAYS_ON = new Set(
  PAGE_PATH_PREFIXES.filter((p) => p.alwaysOn).map((p) => p.key)
);

/** View-only users cannot open these even if an admin grants the page key (role-gated routes). */
export const VIEW_ONLY_FORBIDDEN_PAGE_KEYS = new Set([
  "clients",
  "users",
  "user-view-access",
]);

export function isViewOnlyUser(user) {
  return (
    user?.viewOnly === true ||
    String(user?.accessMode || "standard").toLowerCase() === "view_only"
  );
}

export function getAllowedPageKeys(user) {
  if (!isViewOnlyUser(user)) return null;
  const raw = Array.isArray(user?.allowedPages) ? user.allowedPages : [];
  return [...new Set([...raw, ...ALWAYS_ON])];
}

export function pathnameToPageKey(pathname) {
  const path = String(pathname || "").split("?")[0].replace(/\/+$/, "") || "/";
  for (const page of PAGE_PATH_PREFIXES) {
    for (const prefix of page.paths) {
      if (path === prefix || path.startsWith(`${prefix}/`)) {
        return page.key;
      }
    }
  }
  return null;
}

export function canAccessPageKey(user, pageKey) {
  if (!pageKey) return true;
  if (ALWAYS_ON.has(pageKey)) return true;
  if (!isViewOnlyUser(user)) return true;
  if (VIEW_ONLY_FORBIDDEN_PAGE_KEYS.has(pageKey)) return false;
  const allowed = getAllowedPageKeys(user);
  return allowed?.includes(pageKey) ?? false;
}

export function canAccessPath(user, pathname) {
  const key = pathnameToPageKey(pathname);
  if (!key) return !isViewOnlyUser(user);
  return canAccessPageKey(user, key);
}
