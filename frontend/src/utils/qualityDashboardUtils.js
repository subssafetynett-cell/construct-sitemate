import {
  OHS_MONTHS,
  emptyOhsMonths,
  formatOhsActualValue,
  formatOhsYtdDisplay,
  hasOhsMonthData,
  parseOhsNum,
  sumOhsYtd,
} from "./ohsDashboardUtils";

export const QUALITY_MONTHS = OHS_MONTHS;

export function emptyQualityMonths() {
  return emptyOhsMonths();
}

export const QUALITY_DEFAULT_KPIS = [
  { id: "board", indicator: "Board of Governors", ytdMethod: "average" },
  { id: "male-board", indicator: "Male Board Members", ytdMethod: "average" },
  { id: "female-board", indicator: "Female Board Members", ytdMethod: "average" },
  { id: "meetings", indicator: "Number of Board Meetings", ytdMethod: "sum" },
  { id: "lawsuits", indicator: "Lawsuits", ytdMethod: "sum" },
  { id: "whistleblower", indicator: "Whistleblower Cases", ytdMethod: "sum" },
];

export const QUALITY_ATTENDANCE_FIELDS = [
  { key: "membersAttended", label: "Members Attended" },
  { key: "membersAbsent", label: "Members Absent" },
];

export const QUALITY_SCORECARD_DEFINITIONS = [
  {
    id: "meetings",
    indicator: "Board Meetings Held",
    unit: "No.",
    statRowId: "stat-meetings",
    ytdMethod: "sum",
    lowerBetter: false,
  },
  {
    id: "attendance",
    indicator: "Attendance Rate",
    unit: "%",
    derive: "attendanceRate",
    lowerBetter: false,
  },
  {
    id: "lawsuits",
    indicator: "Lawsuits (YTD)",
    unit: "Cases",
    statRowId: "stat-lawsuits",
    ytdMethod: "sum",
    lowerBetter: true,
  },
  {
    id: "whistleblower",
    indicator: "Whistleblower Cases",
    unit: "Cases",
    statRowId: "stat-whistleblower",
    ytdMethod: "sum",
    lowerBetter: true,
  },
  {
    id: "female-board",
    indicator: "Female Board Members",
    unit: "Members",
    statRowId: "stat-female-board",
    ytdMethod: "average",
    lowerBetter: false,
  },
];

const KPI_BY_ROW_ID = Object.fromEntries(
  QUALITY_DEFAULT_KPIS.map((kpi) => [`stat-${kpi.id}`, kpi])
);

export function createDefaultQualityStatRows() {
  return QUALITY_DEFAULT_KPIS.map((kpi) => ({
    id: `stat-${kpi.id}`,
    indicator: kpi.indicator,
    months: emptyQualityMonths(),
    ytdMethod: kpi.ytdMethod,
  }));
}

export function createEmptyAttendanceSnapshot() {
  return Object.fromEntries(QUALITY_ATTENDANCE_FIELDS.map((f) => [f.key, ""]));
}

export function normalizeAttendanceSnapshot(value) {
  const empty = createEmptyAttendanceSnapshot();
  if (!value || typeof value !== "object") return empty;
  return { ...empty, ...value };
}

export function shouldSeedDefaultQualityKpis(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return true;
  const expectedIds = new Set(QUALITY_DEFAULT_KPIS.map((k) => `stat-${k.id}`));
  if (!rows.every((row) => expectedIds.has(row.id))) return true;
  return rows.every(
    (row) => !String(row.indicator || "").trim() && !hasOhsMonthData(row.months)
  );
}

export function isQualityStatRow(statRow) {
  const label = String(statRow?.indicator || "").trim();
  return Boolean(label || hasOhsMonthData(statRow?.months));
}

export function averageYtd(months) {
  const values = QUALITY_MONTHS.map((m) => parseOhsNum(months?.[m.key])).filter((v) => v != null);
  if (values.length === 0) return { total: 0, hasData: false };
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return { total: avg, hasData: true };
}

export function computeQualityYtd(row) {
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

export function computeAttendanceRate(attendance) {
  const attended = parseOhsNum(attendance?.membersAttended);
  const absent = parseOhsNum(attendance?.membersAbsent);

  if (attended == null && absent == null) {
    return { value: "", hasData: false };
  }

  if (attended != null && absent != null) {
    const total = attended + absent;
    if (total === 0) return { value: "0", hasData: true };
    const pct = (attended / total) * 100;
    return {
      value: Number.isInteger(pct) ? String(pct) : pct.toFixed(1),
      hasData: true,
    };
  }

  if (attended != null) {
    return { value: String(attended), hasData: true };
  }

  if (absent != null) {
    const pct = Math.max(0, 100 - absent);
    return { value: String(pct), hasData: true };
  }

  return { value: "", hasData: false };
}

export function formatQualityVariance(target, actual) {
  const t = parseOhsNum(target);
  const a = parseOhsNum(actual);
  if (t == null || a == null || t === 0) return null;
  return ((a - t) / t) * 100;
}

export function qualityVarianceStyle(pct, lowerBetter, inkFaint = "#9ca3af") {
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

export function qualityScorecardVarianceStatus(target, actual, lowerBetter) {
  const t = parseOhsNum(target);
  const a = parseOhsNum(actual);

  if (t == null || target === "") {
    return { variance: null, style: qualityVarianceStyle(null, lowerBetter), status: "pending" };
  }
  if (a == null || actual === "") {
    return { variance: null, style: qualityVarianceStyle(null, lowerBetter), status: "pending" };
  }

  const variance = formatQualityVariance(target, actual);
  const style = qualityVarianceStyle(variance, lowerBetter);
  return {
    variance,
    style,
    status: style.onTrack ? "onTrack" : "offTarget",
  };
}

function statActualForScorecard(statRows, def) {
  const row = statRows.find((r) => r.id === def.statRowId);
  if (!row) return "";
  return computeQualityYtd(row).actual;
}

export function buildQualityScorecardRows(statRows, targets = {}, attendance = {}) {
  return QUALITY_SCORECARD_DEFINITIONS.map((def) => {
    const saved = targets[def.id] || {};
    let actual = "";

    if (def.derive === "attendanceRate") {
      const { value, hasData } = computeAttendanceRate(attendance);
      actual = hasData ? value : "";
    } else {
      actual = statActualForScorecard(statRows, def);
    }

    return {
      id: def.id,
      indicator: saved.indicator ?? def.indicator,
      target: saved.target ?? "",
      actual,
      unit: saved.unit ?? def.unit,
      note: saved.note ?? "",
      lowerBetter: def.lowerBetter,
    };
  });
}

export function getChartableQualityRows(statRows) {
  return statRows.filter((row) => {
    const { hasData } = computeQualityYtd(row);
    return String(row.indicator || "").trim() && hasData;
  });
}

export function buildQualityMonthlySeries(row) {
  return QUALITY_MONTHS.map((m) => ({
    month: m.label,
    value: parseOhsNum(row.months?.[m.key]) ?? 0,
  }));
}

function findQualityStatRow(statRows, rowId) {
  return statRows.find((row) => row.id === rowId) || null;
}

export function buildLawsuitsWhistleblowerSeries(statRows) {
  const lawsuits = findQualityStatRow(statRows, "stat-lawsuits");
  const whistleblower = findQualityStatRow(statRows, "stat-whistleblower");

  return QUALITY_MONTHS.map((m) => ({
    month: m.label,
    lawsuits: parseOhsNum(lawsuits?.months?.[m.key]) ?? 0,
    whistleblower: parseOhsNum(whistleblower?.months?.[m.key]) ?? 0,
  }));
}

export function buildMeetingsTrendSeries(statRows) {
  const meetings = findQualityStatRow(statRows, "stat-meetings");
  return buildQualityMonthlySeries(meetings || { months: {} });
}

export function buildBoardCompositionBars(statRows) {
  const board = computeQualityYtd(findQualityStatRow(statRows, "stat-board") || { months: {} });
  const male = computeQualityYtd(findQualityStatRow(statRows, "stat-male-board") || { months: {} });
  const female = computeQualityYtd(
    findQualityStatRow(statRows, "stat-female-board") || { months: {} }
  );

  return [
    { name: "Board of Governors", value: board.hasData ? board.total : 0 },
    { name: "Male Board Members", value: male.hasData ? male.total : 0 },
    { name: "Female Board Members", value: female.hasData ? female.total : 0 },
  ];
}

export function buildAttendancePieData(attendance) {
  const attended = parseOhsNum(attendance?.membersAttended) ?? 0;
  const absent = parseOhsNum(attendance?.membersAbsent) ?? 0;
  return [
    { name: "Members Attended", value: attended },
    { name: "Members Absent", value: absent },
  ];
}

export function buildBoardGenderPieData(statRows) {
  const male = computeQualityYtd(findQualityStatRow(statRows, "stat-male-board") || { months: {} });
  const female = computeQualityYtd(
    findQualityStatRow(statRows, "stat-female-board") || { months: {} }
  );

  return [
    { name: "Male Board Members", value: male.hasData ? male.total : 0 },
    { name: "Female Board Members", value: female.hasData ? female.total : 0 },
  ];
}

function multiSeriesHasValues(series, keys) {
  return series.some((row) => keys.some((key) => (row[key] ?? 0) > 0));
}

function trendHasValues(series) {
  return series.some((row) => row.value > 0);
}

function pieHasValues(series) {
  return series.some((row) => row.value > 0);
}

export function hasLawsuitsWhistleblowerData(statRows) {
  return multiSeriesHasValues(buildLawsuitsWhistleblowerSeries(statRows), [
    "lawsuits",
    "whistleblower",
  ]);
}

export function hasMeetingsTrendData(statRows) {
  return trendHasValues(buildMeetingsTrendSeries(statRows));
}

export function hasBoardCompositionData(statRows) {
  return pieHasValues(buildBoardCompositionBars(statRows));
}

export function hasBoardGenderPieData(statRows) {
  return pieHasValues(buildBoardGenderPieData(statRows));
}

export function hasAttendancePieData(attendance) {
  return pieHasValues(buildAttendancePieData(attendance));
}

export function hasQualityChartData(statRows, attendance) {
  return (
    hasLawsuitsWhistleblowerData(statRows) ||
    hasMeetingsTrendData(statRows) ||
    hasBoardCompositionData(statRows) ||
    hasBoardGenderPieData(statRows) ||
    hasAttendancePieData(attendance)
  );
}

export function summarizeQualityScorecard(statRows, targets = {}, attendance = {}) {
  const rows = buildQualityScorecardRows(statRows, targets, attendance);
  let onTrack = 0;
  let offTarget = 0;
  let pending = 0;

  for (const row of rows) {
    const { status } = qualityScorecardVarianceStatus(row.target, row.actual, row.lowerBetter);
    if (status === "onTrack") onTrack += 1;
    else if (status === "offTarget") offTarget += 1;
    else pending += 1;
  }

  return { onTrack, offTarget, pending, total: rows.length };
}

export { formatOhsYtdDisplay, hasOhsMonthData };
