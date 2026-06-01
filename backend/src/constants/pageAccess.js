/**
 * Canonical page keys for view-only access control.
 * Each key maps to one or more frontend routes (prefix match).
 */
const APP_PAGES = [
  { key: "dashboard", label: "Dashboard", paths: ["/dashboard", "/concern-reports", "/audit-reports"] },
  { key: "clients", label: "Clients", paths: ["/clients"] },
  { key: "users", label: "Users", paths: ["/users"] },
  { key: "user-view-access", label: "View access", paths: ["/user-view-access"] },
  { key: "view-invite", label: "View invitation", paths: ["/view-invite"], alwaysOn: true },
  { key: "create-sites", label: "Create sites", paths: ["/create-sites"] },
  { key: "sitepack-management", label: "Sitepack management", paths: ["/sitepack-management"] },
  { key: "general-forms", label: "General forms", paths: ["/general-forms"] },
  { key: "saved-signatures", label: "Saved signatures", paths: ["/saved-signatures"] },
  { key: "forms", label: "Form builder", paths: ["/forms", "/form-build", "/create-form"] },
  { key: "company", label: "Company", paths: ["/company"] },
  { key: "report-health-safety", label: "Health & Safety concern", paths: ["/report-health-safety"] },
  { key: "report-environmental", label: "Sustainability concern", paths: ["/report-environmental"] },
  { key: "report-quality", label: "Quality concern", paths: ["/report-quality"] },
  { key: "report-positive", label: "Positive observation", paths: ["/report-positive"] },
  { key: "concern-positive-report", label: "Concern & positive report", paths: ["/concern-positive-report"] },
  { key: "weekly-supervisor", label: "Weekly supervisor inspection", paths: ["/weekly-supervisor", "/weekly-reports"] },
  { key: "sheq", label: "SHEQ inspection", paths: ["/sheq-inspection", "/sheq-report", "/sheq-install-form"] },
  { key: "shq-installation", label: "SHEQ installation", paths: ["/shq-installation"] },
  { key: "lift-sector", label: "Lift sector analysis", paths: ["/lift-sector-client", "/lift-sector-site"] },
  { key: "frida-forms", label: "Friday pack forms", paths: ["/frida-forms"] },
  { key: "profile", label: "Profile", paths: ["/profile"], alwaysOn: true },
  { key: "account-settings", label: "Account settings", paths: ["/account-settings"], alwaysOn: true },
];

const PAGE_KEYS = APP_PAGES.map((p) => p.key);
const ALWAYS_ON_KEYS = new Set(APP_PAGES.filter((p) => p.alwaysOn).map((p) => p.key));

/** Cannot be granted to view-only users (role-gated admin routes). */
const VIEW_ONLY_FORBIDDEN_PAGE_KEYS = new Set([
  "clients",
  "users",
  "user-view-access",
]);

module.exports = {
  APP_PAGES,
  PAGE_KEYS,
  ALWAYS_ON_KEYS,
  VIEW_ONLY_FORBIDDEN_PAGE_KEYS,
};
