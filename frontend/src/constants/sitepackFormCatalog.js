import { AlertTriangle, ClipboardCheck } from "lucide-react";

/** Categories saved on FormResponse.category for sidebar / report pages. */
export const SITEPACK_REPORT_MODULES = [
  {
    title: "Health & Safety concern",
    route: "/report-health-safety",
    groupId: "report-concern",
  },
  {
    title: "Sustainability concern",
    route: "/report-environmental",
    groupId: "report-concern",
  },
  {
    title: "Quality concern",
    route: "/report-quality",
    groupId: "report-concern",
  },
  {
    title: "Positive observation",
    route: "/report-positive",
    groupId: "report-concern",
  },
  {
    title: "Weekly supervisor health & safety inspection",
    route: "/weekly-supervisor",
    groupId: "health-inspection",
  },
];

export const SITEPACK_FORM_GROUPS = [
  {
    id: "report-concern",
    heading: "Report concern",
    icon: AlertTriangle,
  },
  {
    id: "health-inspection",
    heading: "Health and Safety inspection",
    icon: ClipboardCheck,
  },
];

const REPORT_MODULE_TITLES = new Set(SITEPACK_REPORT_MODULES.map((m) => m.title));
const REPORT_ROUTES = Object.fromEntries(
  SITEPACK_REPORT_MODULES.map((m) => [m.title, m.route])
);

export function isSitepackReportModule(title) {
  return REPORT_MODULE_TITLES.has(title);
}

export function getSitepackReportRoute(category) {
  return REPORT_ROUTES[category] || null;
}

export function reportModulesForGroup(groupId) {
  return SITEPACK_REPORT_MODULES.filter((m) => m.groupId === groupId);
}
