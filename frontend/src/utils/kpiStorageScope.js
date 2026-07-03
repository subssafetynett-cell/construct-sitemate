import { getActingClient } from "./actingClient";

/** Stable organisation scope for KPI storage (survives logout/login). */
export function resolveKpiStorageScope(currentUser) {
  const acting = getActingClient();
  if (acting?.id) return String(acting.id);
  if (currentUser?.clientId) return String(currentUser.clientId);
  return null;
}

export function buildKpiLocalStorageKeys(scope, prefixes) {
  const suffix = scope || "default";
  return {
    stats: `${prefixes.stats}${suffix}`,
    targets: `${prefixes.targets}${suffix}`,
    meta: `${prefixes.meta}${suffix}`,
    snapshot: prefixes.snapshot ? `${prefixes.snapshot}${suffix}` : null,
  };
}
