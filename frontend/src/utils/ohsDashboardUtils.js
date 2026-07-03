import { getKpiDropdownRows } from "./kpiChartUtils";

export const OHS_MONTHS = [
  { key: "jan", label: "Jan" },
  { key: "feb", label: "Feb" },
  { key: "mar", label: "Mar" },
  { key: "apr", label: "Apr" },
  { key: "may", label: "May" },
  { key: "jun", label: "Jun" },
  { key: "jul", label: "Jul" },
  { key: "aug", label: "Aug" },
  { key: "sep", label: "Sep" },
  { key: "oct", label: "Oct" },
  { key: "nov", label: "Nov" },
  { key: "dec", label: "Dec" },
];

export function emptyOhsMonths() {
  return Object.fromEntries(OHS_MONTHS.map((m) => [m.key, ""]));
}

/** Standard OHS statistics indicators. */
export const OHS_DEFAULT_KPIS = [
  { id: "employees-current", indicator: "Employees — Current Year" },
  { id: "employees-previous", indicator: "Employees — Previous Year" },
  { id: "male-employees", indicator: "Male Employees" },
  { id: "female-employees", indicator: "Female Employees" },
  { id: "turnover", indicator: "Turnover (£M)" },
  { id: "injuries", indicator: "Number of Injuries" },
  { id: "investment", indicator: "Investment (£M)" },
  { id: "payroll", indicator: "Payroll (£M)" },
  { id: "taxes-claims", indicator: "Taxes & Claims (£M)" },
  { id: "donations", indicator: "Donations & Sponsorship (£M)" },
];

export const OHS_EMPLOYEE_RANK_CATEGORIES = [
  { key: "management", label: "Management" },
  { key: "managers", label: "Managers" },
  { key: "engineers", label: "Engineers" },
  { key: "supervisors", label: "Supervisors" },
  { key: "assistants", label: "Assistants" },
  { key: "labour", label: "Labour" },
];

export const OHS_EMPLOYEE_AGE_CATEGORIES = [
  { key: "age30to50", label: "30–50 Years" },
  { key: "above50", label: "Above 50" },
  { key: "below30", label: "Below 30" },
  { key: "retiring", label: "Retiring <3 Yrs" },
];

const LEGACY_INDICATOR_PATTERN =
  /LTIFR|TRIR|Hours Worked \(Hrs\)|Toolbox Talks|Near-miss Reports|Safety Audits Completed/i;

export function createEmptyClassification() {
  return {
    rank: Object.fromEntries(OHS_EMPLOYEE_RANK_CATEGORIES.map((cat) => [cat.key, ""])),
    age: Object.fromEntries(OHS_EMPLOYEE_AGE_CATEGORIES.map((cat) => [cat.key, ""])),
  };
}

export function normalizeClassification(value) {
  const empty = createEmptyClassification();
  if (!value || typeof value !== "object") return empty;

  return {
    rank: { ...empty.rank, ...(value.rank && typeof value.rank === "object" ? value.rank : {}) },
    age: { ...empty.age, ...(value.age && typeof value.age === "object" ? value.age : {}) },
  };
}

export function createDefaultStatRows() {
  return OHS_DEFAULT_KPIS.map((kpi) => ({
    id: `stat-${kpi.id}`,
    indicator: kpi.indicator,
    months: emptyOhsMonths(),
  }));
}

export function shouldSeedDefaultKpis(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return true;
  if (rows.some((row) => LEGACY_INDICATOR_PATTERN.test(String(row.indicator || "")))) return true;
  return rows.every(
    (row) => !String(row.indicator || "").trim() && !hasOhsMonthData(row.months)
  );
}

export function parseOhsNum(value) {
  if (value === "" || value == null) return null;
  const n = Number.parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function sumOhsYtd(months) {
  return OHS_MONTHS.reduce((sum, m) => sum + (parseOhsNum(months?.[m.key]) ?? 0), 0);
}

export function hasOhsMonthData(months) {
  return OHS_MONTHS.some((m) => {
    const v = months?.[m.key];
    return v !== "" && v != null;
  });
}

export function formatOhsYtdDisplay(total, hasData) {
  if (!hasData) return "—";
  if (total === 0) return "0";
  return Number.isInteger(total) ? String(total) : total.toFixed(1);
}

export function formatOhsActualValue(total, hasData) {
  if (!hasData) return "";
  if (total === 0) return "0";
  return Number.isInteger(total) ? String(total) : total.toFixed(1);
}

/** Pull unit from trailing parentheses, e.g. "CO₂ Emissions (Tons)" → "Tons". */
export function extractUnitFromIndicator(indicator) {
  const match = String(indicator || "").match(/\(([^)]+)\)\s*$/);
  return match ? match[1].trim() : "";
}

export function isOhsScorecardRow(statRow) {
  const label = String(statRow?.indicator || "").trim();
  return Boolean(label || hasOhsMonthData(statRow?.months));
}

/** Whether a lower actual vs target is better for this indicator. */
export function resolveOhsLowerBetter(indicator) {
  const text = String(indicator || "").toLowerCase();

  if (
    /near[- ]?miss|training completion|audit|inspection|toolbox|observation|ppe|renewable|employee|donation|investment|turnover|payroll/.test(
      text
    )
  ) {
    return false;
  }

  if (
    /injur|ltifr|trir|lost time|days lost|emission|consumption|incident|fatality|lti\b|frequency rate|recordable|first aid|tax|claim/.test(
      text
    )
  ) {
    return true;
  }

  if (/per\s+(m\s*hrs|million|200k)/.test(text)) return true;

  return true;
}

export function formatOhsVariance(target, actual) {
  const t = parseOhsNum(target);
  const a = parseOhsNum(actual);
  if (t == null || a == null || t === 0) return null;
  return ((a - t) / t) * 100;
}

export function ohsVarianceStyle(pct, lowerBetter, inkFaint = "#9ca3af") {
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

export function scorecardVarianceStatus(target, actual, lowerBetter) {
  const t = parseOhsNum(target);
  const a = parseOhsNum(actual);

  if (t == null || target === "") {
    return { variance: null, style: ohsVarianceStyle(null, lowerBetter), status: "pending" };
  }
  if (a == null || actual === "") {
    return { variance: null, style: ohsVarianceStyle(null, lowerBetter), status: "pending" };
  }

  const variance = formatOhsVariance(target, actual);
  const style = ohsVarianceStyle(variance, lowerBetter);
  return {
    variance,
    style,
    status: style.onTrack ? "onTrack" : "offTarget",
  };
}

export function buildScorecardRows(statRows, targets = {}) {
  return (statRows || []).filter(isOhsScorecardRow).map((row) => {
    const hasData = hasOhsMonthData(row.months);
    const ytd = sumOhsYtd(row.months);
    const saved = targets[row.id] || {};
    const indicator = String(row.indicator || "").trim();

    return {
      id: row.id,
      indicator,
      target: saved.target ?? "",
      actual: formatOhsActualValue(ytd, hasData),
      unit: saved.unit ?? extractUnitFromIndicator(indicator),
      lowerBetter: resolveOhsLowerBetter(indicator),
    };
  });
}

export function getChartableStatRows(statRows) {
  return getKpiDropdownRows(statRows);
}

export function buildMonthlySeriesForRow(row) {
  return OHS_MONTHS.map((m) => ({
    month: m.label,
    value: parseOhsNum(row.months?.[m.key]) ?? 0,
  }));
}

function findOhsStatRow(statRows, rowId) {
  return statRows.find((row) => row.id === rowId) || null;
}

export function buildOhsStatTrendSeries(statRows, rowId) {
  return buildMonthlySeriesForRow(findOhsStatRow(statRows, rowId) || { months: {} });
}

export function buildTurnoverTrendSeries(statRows) {
  return buildOhsStatTrendSeries(statRows, "stat-turnover");
}

export function buildInjuriesTrendSeries(statRows) {
  return buildOhsStatTrendSeries(statRows, "stat-injuries");
}

export function buildInvestmentTrendSeries(statRows) {
  return buildOhsStatTrendSeries(statRows, "stat-investment");
}

export function buildPayrollTrendSeries(statRows) {
  return buildOhsStatTrendSeries(statRows, "stat-payroll");
}

export function buildInvestmentPayrollSeries(statRows) {
  const investment = findOhsStatRow(statRows, "stat-investment");
  const payroll = findOhsStatRow(statRows, "stat-payroll");

  return OHS_MONTHS.map((m) => ({
    month: m.label,
    investment: parseOhsNum(investment?.months?.[m.key]) ?? 0,
    payroll: parseOhsNum(payroll?.months?.[m.key]) ?? 0,
  }));
}

export function buildEmployeeHeadcountSeries(statRows) {
  const male = findOhsStatRow(statRows, "stat-male-employees");
  const female = findOhsStatRow(statRows, "stat-female-employees");

  return OHS_MONTHS.map((m) => ({
    month: m.label,
    male: parseOhsNum(male?.months?.[m.key]) ?? 0,
    female: parseOhsNum(female?.months?.[m.key]) ?? 0,
  }));
}

function trendHasValues(series) {
  return series.some((row) => row.value > 0);
}

function multiSeriesHasValues(series, keys) {
  return series.some((row) => keys.some((key) => (row[key] ?? 0) > 0));
}

export function hasTurnoverTrendData(statRows) {
  return trendHasValues(buildTurnoverTrendSeries(statRows));
}

export function hasInjuriesTrendData(statRows) {
  return trendHasValues(buildInjuriesTrendSeries(statRows));
}

export function hasInvestmentTrendData(statRows) {
  return trendHasValues(buildInvestmentTrendSeries(statRows));
}

export function hasPayrollTrendData(statRows) {
  return trendHasValues(buildPayrollTrendSeries(statRows));
}

export function hasInvestmentPayrollData(statRows) {
  return multiSeriesHasValues(buildInvestmentPayrollSeries(statRows), ["investment", "payroll"]);
}

export function hasEmployeeHeadcountData(statRows) {
  return multiSeriesHasValues(buildEmployeeHeadcountSeries(statRows), ["male", "female"]);
}

export function hasOhsChartData(statRows, classification) {
  return (
    getChartableStatRows(statRows).length > 0 ||
    hasTurnoverTrendData(statRows) ||
    hasInjuriesTrendData(statRows) ||
    hasInvestmentTrendData(statRows) ||
    hasPayrollTrendData(statRows) ||
    hasEmployeeHeadcountData(statRows) ||
    hasClassificationData(classification)
  );
}

export function buildSnapshotSeries(snapshot, categories) {
  return categories.map((cat) => ({
    name: cat.label,
    value: parseOhsNum(snapshot?.[cat.key]) ?? 0,
  }));
}

export function buildClassificationChartSeries(classification) {
  return {
    rank: buildSnapshotSeries(classification?.rank, OHS_EMPLOYEE_RANK_CATEGORIES),
    age: buildSnapshotSeries(classification?.age, OHS_EMPLOYEE_AGE_CATEGORIES),
  };
}

export function hasClassificationData(classification) {
  const series = buildClassificationChartSeries(classification);
  return (
    series.rank.some((row) => row.value > 0) || series.age.some((row) => row.value > 0)
  );
}

export function summarizeScorecard(statRows, targets = {}) {
  const rows = buildScorecardRows(statRows, targets);
  let onTrack = 0;
  let offTarget = 0;
  let pending = 0;

  for (const row of rows) {
    const { status } = scorecardVarianceStatus(row.target, row.actual, row.lowerBetter);
    if (status === "onTrack") onTrack += 1;
    else if (status === "offTarget") offTarget += 1;
    else pending += 1;
  }

  return { onTrack, offTarget, pending, total: rows.length };
}
