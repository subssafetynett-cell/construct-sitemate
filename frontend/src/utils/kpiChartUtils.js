import { hasOhsMonthData } from "./ohsDashboardUtils";

/** Short label for chart legend (truncated if long). */
export function monthlyChartSeriesName(indicator) {
  const label = String(indicator || "").trim();
  if (!label) return "Value";
  const short = label.replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (short.length <= 14) return short;
  return `${short.slice(0, 12)}…`;
}

/** Centered chart title, e.g. "Monthly Headcount". */
export function monthlyChartTitle(indicator) {
  const label = String(indicator || "").trim();
  if (!label) return "Monthly Indicator";
  const short = label.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return `Monthly ${short}`;
}

export function getKpiChartableRows(statRows) {
  return (statRows || []).filter(
    (row) => String(row.indicator || "").trim() && hasOhsMonthData(row.months)
  );
}

/** Sort chart rows alphabetically by indicator label. */
export function sortKpiChartRows(rows) {
  return [...(rows || [])].sort((a, b) =>
    String(a.indicator || "").localeCompare(String(b.indicator || ""), undefined, {
      sensitivity: "base",
    })
  );
}

function niceStep(maxVal) {
  if (maxVal <= 0) return 2;
  const raw = maxVal / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  let nice;
  if (normalized <= 1) nice = 1;
  else if (normalized <= 2) nice = 2;
  else if (normalized <= 5) nice = 5;
  else nice = 10;
  return nice * magnitude;
}

/** Y-axis top tick for consistent bar chart scale. */
export function computeYAxisMax(data) {
  const maxVal = Math.max(0, ...(data || []).map((d) => d.value ?? 0));
  if (maxVal === 0) return 10;
  const step = niceStep(maxVal);
  return Math.ceil(maxVal / step) * step;
}
