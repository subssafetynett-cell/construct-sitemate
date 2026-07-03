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

export const LR_MONTHS = OHS_MONTHS;

export function emptyLrMonths() {
  return emptyOhsMonths();
}

export const LR_DEFAULT_KPIS = [
  { id: "loler-exams", indicator: "LOLER Thorough Examinations Completed (No.)", ytdMethod: "sum" },
  { id: "puwer-inspections", indicator: "PUWER Inspections Completed (No.)", ytdMethod: "sum" },
  { id: "defects-raised", indicator: "Defects / Non-conformances Raised (No.)", ytdMethod: "sum" },
  { id: "defects-closed", indicator: "Defects Closed Within Target (No.)", ytdMethod: "sum" },
  { id: "breakdowns", indicator: "Breakdown / Call-outs (No.)", ytdMethod: "sum" },
  { id: "rescue-drills", indicator: "Emergency Rescue Drills Completed (No.)", ytdMethod: "sum" },
  { id: "compliance-rate", indicator: "Lift Equipment Compliance Rate (%)", ytdMethod: "average" },
  { id: "rams-reviews", indicator: "RAMS / Lift Plan Reviews Completed (No.)", ytdMethod: "sum" },
  { id: "weekly-checks", indicator: "Alimak / Hoist Weekly Checks Completed (No.)", ytdMethod: "sum" },
  { id: "enforcement", indicator: "Regulatory Notices / Enforcement Actions (No.)", ytdMethod: "sum" },
];

export const LR_INCIDENT_CATEGORIES = [
  { key: "mechanical", label: "Mechanical Failure" },
  { key: "electrical", label: "Electrical Fault" },
  { key: "safetyDevice", label: "Safety Device Failure" },
  { key: "entrapment", label: "Entrapment / Rescue" },
  { key: "loler", label: "LOLER Non-compliance" },
  { key: "puwer", label: "PUWER Non-compliance" },
  { key: "shaftPit", label: "Shaft / Pit Hazard" },
  { key: "documentation", label: "Documentation Gap" },
  { key: "other", label: "Other" },
];

export const LR_SCORECARD_DEFINITIONS = [
  {
    id: "loler-exams",
    indicator: "LOLER Examinations (YTD)",
    unit: "No.",
    statRowId: "stat-loler-exams",
    ytdMethod: "sum",
    lowerBetter: false,
  },
  {
    id: "puwer-inspections",
    indicator: "PUWER Inspections (YTD)",
    unit: "No.",
    statRowId: "stat-puwer-inspections",
    ytdMethod: "sum",
    lowerBetter: false,
  },
  {
    id: "defects-raised",
    indicator: "Defects Raised (YTD)",
    unit: "No.",
    statRowId: "stat-defects-raised",
    ytdMethod: "sum",
    lowerBetter: true,
  },
  {
    id: "defects-closed",
    indicator: "Defects Closed Within Target",
    unit: "No.",
    statRowId: "stat-defects-closed",
    ytdMethod: "sum",
    lowerBetter: false,
  },
  {
    id: "breakdowns",
    indicator: "Breakdowns / Call-outs (YTD)",
    unit: "No.",
    statRowId: "stat-breakdowns",
    ytdMethod: "sum",
    lowerBetter: true,
  },
  {
    id: "compliance-rate",
    indicator: "Equipment Compliance %",
    unit: "%",
    statRowId: "stat-compliance-rate",
    ytdMethod: "average",
    lowerBetter: false,
  },
  {
    id: "weekly-checks",
    indicator: "Weekly Checks Completed",
    unit: "No.",
    statRowId: "stat-weekly-checks",
    ytdMethod: "sum",
    lowerBetter: false,
  },
  {
    id: "enforcement",
    indicator: "Enforcement Actions (YTD)",
    unit: "No.",
    statRowId: "stat-enforcement",
    ytdMethod: "sum",
    lowerBetter: true,
  },
];

const KPI_BY_ROW_ID = Object.fromEntries(LR_DEFAULT_KPIS.map((kpi) => [`stat-${kpi.id}`, kpi]));

export function createDefaultLrStatRows() {
  return LR_DEFAULT_KPIS.map((kpi) => ({
    id: `stat-${kpi.id}`,
    indicator: kpi.indicator,
    months: emptyLrMonths(),
    ytdMethod: kpi.ytdMethod,
  }));
}

export function createEmptyIncidentSnapshot() {
  return Object.fromEntries(LR_INCIDENT_CATEGORIES.map((cat) => [cat.key, ""]));
}

export function normalizeIncidentSnapshot(value) {
  const empty = createEmptyIncidentSnapshot();
  if (!value || typeof value !== "object") return empty;
  return { ...empty, ...value };
}

export function shouldSeedDefaultLrKpis(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return true;
  const expectedIds = new Set(LR_DEFAULT_KPIS.map((k) => `stat-${k.id}`));
  if (!rows.every((row) => expectedIds.has(row.id))) return true;
  return rows.every(
    (row) => !String(row.indicator || "").trim() && !hasOhsMonthData(row.months)
  );
}

export function isLrStatRow(statRow) {
  const label = String(statRow?.indicator || "").trim();
  return Boolean(label || hasOhsMonthData(statRow?.months));
}

function averageYtd(months) {
  const values = LR_MONTHS.map((m) => parseOhsNum(months?.[m.key])).filter((v) => v != null);
  if (values.length === 0) return { total: 0, hasData: false };
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return { total: avg, hasData: true };
}

export function computeLrYtd(row) {
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

export function formatLrVariance(target, actual) {
  const t = parseOhsNum(target);
  const a = parseOhsNum(actual);
  if (t == null || a == null || t === 0) return null;
  return ((a - t) / t) * 100;
}

export function lrVarianceStyle(pct, lowerBetter, inkFaint = "#9ca3af") {
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

export function lrScorecardVarianceStatus(target, actual, lowerBetter) {
  const t = parseOhsNum(target);
  const a = parseOhsNum(actual);

  if (t == null || target === "") {
    return { variance: null, style: lrVarianceStyle(null, lowerBetter), status: "pending" };
  }
  if (a == null || actual === "") {
    return { variance: null, style: lrVarianceStyle(null, lowerBetter), status: "pending" };
  }

  const variance = formatLrVariance(target, actual);
  const style = lrVarianceStyle(variance, lowerBetter);
  return {
    variance,
    style,
    status: style.onTrack ? "onTrack" : "offTarget",
  };
}

export function buildLiftRegulationsScorecardRows(statRows, targets = {}) {
  return buildScorecardRowsFromDefinitions(
    LR_SCORECARD_DEFINITIONS,
    statRows,
    targets,
    {
      computeActualForStatRow: (row) => computeLrYtd(row).actual,
      resolveLowerBetter: resolveOhsLowerBetter,
    }
  );
}

export function getChartableLrRows(statRows) {
  return getKpiDropdownRows(statRows);
}

export function buildLrMonthlySeries(row) {
  return LR_MONTHS.map((m) => ({
    month: m.label,
    value: parseOhsNum(row.months?.[m.key]) ?? 0,
  }));
}

export function buildIncidentChartSeries(incidents) {
  return LR_INCIDENT_CATEGORIES.map((cat) => ({
    name: cat.label,
    value: parseOhsNum(incidents?.[cat.key]) ?? 0,
  }));
}

export function buildIncidentSummary(incidents) {
  const rows = LR_INCIDENT_CATEGORIES.map((cat) => ({
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

export function hasLiftRegulationsChartData(statRows, incidents) {
  return getChartableLrRows(statRows).length > 0 || hasIncidentData(incidents);
}

export function summarizeLiftRegulationsScorecard(statRows, targets = {}) {
  const rows = buildLiftRegulationsScorecardRows(statRows, targets);
  let onTrack = 0;
  let offTarget = 0;
  let pending = 0;

  for (const row of rows) {
    const { status } = lrScorecardVarianceStatus(row.target, row.actual, row.lowerBetter);
    if (status === "onTrack") onTrack += 1;
    else if (status === "offTarget") offTarget += 1;
    else pending += 1;
  }

  return { onTrack, offTarget, pending, total: rows.length };
}
