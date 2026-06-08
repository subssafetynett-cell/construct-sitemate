/** Categories grouped for dashboard stat cards (must match GenericReportPage pageTitle). */
const REPORT_CONCERN_CATEGORIES = [
  "Health & Safety concern",
  "Sustainability concern",
  "Quality concern",
  "Positive observation",
];

const INSPECTION_CATEGORIES = [
  "Weekly supervisor health & safety inspection",
  "Weekly supervisor reports",
];

function normalizeCategoryKey(name) {
  return String(name || "").trim().toLowerCase();
}

function countGroupedCategories(categoryCounts, allowedCategories) {
  const allowed = new Set(allowedCategories.map(normalizeCategoryKey));
  return Object.entries(categoryCounts || {}).reduce((sum, [name, count]) => {
    if (allowed.has(normalizeCategoryKey(name))) {
      return sum + (count || 0);
    }
    return sum;
  }, 0);
}

module.exports = {
  REPORT_CONCERN_CATEGORIES,
  INSPECTION_CATEGORIES,
  countGroupedCategories,
};
