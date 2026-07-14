/** postMessage type when an embedded fill iframe finishes (save / leave). */
export const CONTEXTUAL_FORM_DONE = "sitemate:monitoring-form-done";

/** Append embedded=true so leave/save notifies the parent list page. */
export function withEmbeddedFill(url) {
  if (!url) return "";
  if (/(?:^|[?&])embedded=true(?:&|$)/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}embedded=true`;
}
