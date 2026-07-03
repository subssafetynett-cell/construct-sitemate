import {
  OHS_MONTHS,
  emptyOhsMonths,
  formatOhsActualValue,
  formatOhsYtdDisplay,
  hasOhsMonthData,
  parseOhsNum,
  resolveOhsLowerBetter,
  sumOhsYtd,
} from "./ohsDashboardUtils";
import { getKpiDropdownRows } from "./kpiChartUtils";
import {
  buildScorecardRowsFromDefinitions,
} from "./kpiScorecardUtils";

export const FS_MONTHS = OHS_MONTHS;

export function emptyFsMonths() {
  return emptyOhsMonths();
}

export const FS_DEFAULT_KPIS = [
  { id: "ccp-deviations", indicator: "CCP Deviations (No.)", ytdMethod: "sum" },
  { id: "non-conformances", indicator: "Non-conformances Raised (No.)", ytdMethod: "sum" },
  { id: "corrective-actions", indicator: "Corrective Actions Closed (No.)", ytdMethod: "sum" },
  { id: "training", indicator: "Food Safety Training Completion (%)", ytdMethod: "average" },
  { id: "internal-audits", indicator: "Internal Food Safety Audits (No.)", ytdMethod: "sum" },
  { id: "external-audits", indicator: "External Food Safety Audits (No.)", ytdMethod: "sum" },
  { id: "complaints", indicator: "Customer Complaints — Food Safety (No.)", ytdMethod: "sum" },
  { id: "recalls", indicator: "Product Recalls / Withdrawals (No.)", ytdMethod: "sum" },
  { id: "temperature", indicator: "Temperature Monitoring Breaches (No.)", ytdMethod: "sum" },
  { id: "hygiene", indicator: "Hygiene Inspections Completed (No.)", ytdMethod: "sum" },
];

export const FS_INCIDENT_CATEGORIES = [
  { key: "biological", label: "Biological" },
  { key: "chemical", label: "Chemical" },
  { key: "physical", label: "Physical" },
  { key: "allergen", label: "Allergen" },
  { key: "crossContamination", label: "Cross-contamination" },
  { key: "temperature", label: "Temperature" },
  { key: "hygiene", label: "Hygiene" },
  { key: "pest", label: "Pest Activity" },
  { key: "complaint", label: "Complaint" },
  { key: "other", label: "Other" },
];

export const FS_SCORECARD_DEFINITIONS = [
  {
    id: "non-conformances",
    indicator: "Non-conformances (YTD)",
    unit: "No.",
    statRowId: "stat-non-conformances",
    ytdMethod: "sum",
    lowerBetter: true,
  },
  {
    id: "ccp-deviations",
    indicator: "CCP Deviations",
    unit: "No.",
    statRowId: "stat-ccp-deviations",
    ytdMethod: "sum",
    lowerBetter: true,
  },
  {
    id: "corrective-actions",
    indicator: "Corrective Actions Closed",
    unit: "No.",
    statRowId: "stat-corrective-actions",
    ytdMethod: "sum",
    lowerBetter: false,
  },
  {
    id: "training",
    indicator: "Training Completion %",
    unit: "%",
    statRowId: "stat-training",
    ytdMethod: "average",
    lowerBetter: false,
  },
  {
    id: "internal-audits",
    indicator: "Internal Audits",
    unit: "No.",
    statRowId: "stat-internal-audits",
    ytdMethod: "sum",
    lowerBetter: false,
  },
  {
    id: "complaints",
    indicator: "Customer Complaints (YTD)",
    unit: "No.",
    statRowId: "stat-complaints",
    ytdMethod: "sum",
    lowerBetter: true,
  },
  {
    id: "temperature",
    indicator: "Temperature Breaches",
    unit: "No.",
    statRowId: "stat-temperature",
    ytdMethod: "sum",
    lowerBetter: true,
  },
  {
    id: "recalls",
    indicator: "Product Recalls",
    unit: "No.",
    statRowId: "stat-recalls",
    ytdMethod: "sum",
    lowerBetter: true,
  },
];

const KPI_BY_ROW_ID = Object.fromEntries(FS_DEFAULT_KPIS.map((kpi) => [`stat-${kpi.id}`, kpi]));

export function createDefaultFsStatRows() {
  return FS_DEFAULT_KPIS.map((kpi) => ({
    id: `stat-${kpi.id}`,
    indicator: kpi.indicator,
    months: emptyFsMonths(),
    ytdMethod: kpi.ytdMethod,
  }));
}

export function createEmptyIncidentSnapshot() {
  return Object.fromEntries(FS_INCIDENT_CATEGORIES.map((cat) => [cat.key, ""]));
}

export function normalizeIncidentSnapshot(value) {
  const empty = createEmptyIncidentSnapshot();
  if (!value || typeof value !== "object") return empty;
  return { ...empty, ...value };
}

export function shouldSeedDefaultFsKpis(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return true;
  const expectedIds = new Set(FS_DEFAULT_KPIS.map((k) => `stat-${k.id}`));
  if (!rows.every((row) => expectedIds.has(row.id))) return true;
  return rows.every(
    (row) => !String(row.indicator || "").trim() && !hasOhsMonthData(row.months)
  );
}

export function isFsStatRow(statRow) {
  const label = String(statRow?.indicator || "").trim();
  return Boolean(label || hasOhsMonthData(statRow?.months));
}

export function averageYtd(months) {
  const values = FS_MONTHS.map((m) => parseOhsNum(months?.[m.key])).filter((v) => v != null);
  if (values.length === 0) return { total: 0, hasData: false };
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return { total: avg, hasData: true };
}

export function computeFsYtd(row) {
  const kpi = KPI_BY_ROW_ID[row?.id];
  const method = row?.ytdMethod || kpi?.ytdMethod || "sum";

  if (method === "average") {
    const { total, hasData } = averageYtd(row?.months);
    return {
      total,
      hasData,
      display: formatOhsYtdDisplay(
        Number.isInteger(total) ? total : Number(total.toFixed(1)),
        hasData
      ),
      actual: formatOhsActualValue(total, hasData),
    };
  }

  const hasData = hasOhsMonthData(row?.months);
  const total = sumOhsYtd(row?.months);
  return {
    total,
    hasData,
    display: formatOhsYtdDisplay(total, hasData),
    actual: formatOhsActualValue(total, hasData),
  };
}

export function formatFsVariance(target, actual) {
  const t = parseOhsNum(target);
  const a = parseOhsNum(actual);
  if (t == null || a == null || t === 0) return null;
  return ((a - t) / t) * 100;
}

export function fsVarianceStyle(pct, lowerBetter, inkFaint = "#9ca3af") {
  if (pct == null) {
    return { bg: "#f9fafb", color: inkFaint, label: "—", onTrack: null };
  }
  const onTrack = lowerBetter ? pct <= 0 : pct >= 0;
  const label = `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
  if (onTrack) {
    return { bg: "#dcfce7", color: "#15803d", label, onTrack: true };
  }
  return { bg: "#fee2e2", color: "#b91c1c", label, onTrack: false };
}

export function fsScorecardVarianceStatus(target, actual, lowerBetter) {
  const t = parseOhsNum(target);
  const a = parseOhsNum(actual);

  if (t == null || target === "") {
    return { variance: null, style: fsVarianceStyle(null, lowerBetter), status: "pending" };
  }
  if (a == null || actual === "") {
    return { variance: null, style: fsVarianceStyle(null, lowerBetter), status: "pending" };
  }

  const variance = formatFsVariance(target, actual);
  const style = fsVarianceStyle(variance, lowerBetter);
  return {
    variance,
    style,
    status: style.onTrack ? "onTrack" : "offTarget",
  };
}

export function buildFoodSafetyScorecardRows(statRows, targets = {}) {
  return buildScorecardRowsFromDefinitions(
    FS_SCORECARD_DEFINITIONS,
    statRows,
    targets,
    {
      computeActualForStatRow: (row) => computeFsYtd(row).actual,
      resolveLowerBetter: resolveOhsLowerBetter,
    }
  );
}

export function getChartableFsRows(statRows) {
  return getKpiDropdownRows(statRows);
}

export function buildFsMonthlySeries(row) {
  return FS_MONTHS.map((m) => ({
    month: m.label,
    value: parseOhsNum(row.months?.[m.key]) ?? 0,
  }));
}

export function buildIncidentChartSeries(incidents) {
  return FS_INCIDENT_CATEGORIES.map((cat) => ({
    name: cat.label,
    value: parseOhsNum(incidents?.[cat.key]) ?? 0,
  }));
}

export function buildIncidentSummary(incidents) {
  const rows = FS_INCIDENT_CATEGORIES.map((cat) => ({
    key: cat.key,
    label: cat.label,
    count: parseOhsNum(incidents?.[cat.key]) ?? 0,
  }));
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const hasData = rows.some((row) => incidents?.[row.key] !== "" && incidents?.[row.key] != null);

  return {
    rows: rows.map((row) => ({
      ...row,
      pct: total > 0 && hasData ? `${((row.count / total) * 100).toFixed(1)}%` : "—",
    })),
    total: hasData ? (Number.isInteger(total) ? String(total) : total.toFixed(1)) : "—",
    hasData,
  };
}

export function hasIncidentData(incidents) {
  return buildIncidentChartSeries(incidents).some((row) => row.value > 0);
}

export function hasFoodSafetyChartData(statRows, incidents) {
  return getChartableFsRows(statRows).length > 0 || hasIncidentData(incidents);
}

export function summarizeFoodSafetyScorecard(statRows, targets = {}) {
  const rows = buildFoodSafetyScorecardRows(statRows, targets);
  let onTrack = 0;
  let offTarget = 0;
  let pending = 0;

  for (const row of rows) {
    const { status } = fsScorecardVarianceStatus(row.target, row.actual, row.lowerBetter);
    if (status === "onTrack") onTrack += 1;
    else if (status === "offTarget") offTarget += 1;
    else pending += 1;
  }

  return { onTrack, offTarget, pending, total: rows.length };
}
