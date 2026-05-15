/** Roles that may create new sites. */
export const SITE_CREATE_ROLES = ["superadmin", "company_admin"];

export function canCreateSites(role) {
  return SITE_CREATE_ROLES.includes(role);
}
