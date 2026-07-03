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
  buildDerivedScorecardRow,
  buildScorecardRowsFromDefinitions,
  insertScorecardRowAfter,
} from "./kpiScorecardUtils";

export const ENV_MONTHS = OHS_MONTHS;

export function emptyEnvMonths() {
  return emptyOhsMonths();
}

export const ENV_DEFAULT_KPIS = [
  { id: "co2", indicator: "CO2 Emissions (Tons)" },
  { id: "paper", indicator: "Paper Consumption (Tons)" },
  { id: "fuel", indicator: "Fuel Consumption (Litres)" },
  { id: "energy", indicator: "Energy Consumption (MWh)" },
  { id: "non-renewable", indicator: "Non-Renewable Energy (MWh)" },
  { id: "renewable", indicator: "Renewable Energy (MWh)" },
  { id: "audits", indicator: "Environmental Audits/Inspections" },
  { id: "scope1", indicator: "Scope-1 Emissions (tCO2e)" },
  { id: "scope2", indicator: "Scope-2 Emissions (tCO2e)" },
  { id: "scope3", indicator: "Scope-3 Emissions (tCO2e)" },
];

export const ENV_WASTE_CATEGORIES = [
  { key: "glass", label: "Glass" },
  { key: "metal", label: "Metal" },
  { key: "rubber", label: "Rubber" },
  { key: "dust", label: "Dust" },
  { key: "organic", label: "Organic" },
  { key: "corrugated", label: "Corrugated" },
  { key: "plastic", label: "Plastic" },
  { key: "paper", label: "Paper" },
  { key: "biological", label: "Biological" },
  { key: "other", label: "Other" },
];

export const ENV_SCORECARD_DEFINITIONS = [
  {
    id: "co2",
    indicator: "CO2 Emissions",
    unit: "Tons",
    statRowId: "stat-co2",
    lowerBetter: true,
  },
  {
    id: "energy",
    indicator: "Energy Consumption",
    unit: "MWh",
    statRowId: "stat-energy",
    lowerBetter: true,
  },
  {
    id: "renewable-pct",
    indicator: "Renewable Energy %",
    unit: "%",
    derive: "renewablePct",
    lowerBetter: false,
  },
  {
    id: "fuel",
    indicator: "Fuel Consumption",
    unit: "Litres",
    statRowId: "stat-fuel",
    lowerBetter: true,
  },
  {
    id: "paper",
    indicator: "Paper Consumption",
    unit: "Tons",
    statRowId: "stat-paper",
    lowerBetter: true,
  },
  {
    id: "eco-audits",
    indicator: "Eco Audits",
    unit: "No.",
    statRowId: "stat-audits",
    lowerBetter: false,
  },
  {
    id: "scope1",
    indicator: "Scope-1 Emissions",
    unit: "tCO2e",
    statRowId: "stat-scope1",
    lowerBetter: true,
  },
  {
    id: "scope2",
    indicator: "Scope-2 Emissions",
    unit: "tCO2e",
    statRowId: "stat-scope2",
    lowerBetter: true,
  },
  {
    id: "scope3",
    indicator: "Scope-3 Emissions",
    unit: "tCO2e",
    statRowId: "stat-scope3",
    lowerBetter: true,
  },
];

export function createDefaultEnvStatRows() {
  return ENV_DEFAULT_KPIS.map((kpi) => ({
    id: `stat-${kpi.id}`,
    indicator: kpi.indicator,
    months: emptyEnvMonths(),
  }));
}

export function createEmptyWasteSnapshot() {
  return Object.fromEntries(ENV_WASTE_CATEGORIES.map((cat) => [cat.key, ""]));
}

export function normalizeWasteSnapshot(value) {
  const empty = createEmptyWasteSnapshot();
  if (!value || typeof value !== "object") return empty;
  return { ...empty, ...value };
}

export function shouldSeedDefaultEnvKpis(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return true;
  const expectedIds = new Set(ENV_DEFAULT_KPIS.map((k) => `stat-${k.id}`));
  if (!rows.every((row) => expectedIds.has(row.id))) return true;
  return rows.every(
    (row) => !String(row.indicator || "").trim() && !hasOhsMonthData(row.months)
  );
}

export function isEnvStatRow(statRow) {
  const label = String(statRow?.indicator || "").trim();
  return Boolean(label || hasOhsMonthData(statRow?.months));
}

function statRowYtd(statRows, rowId) {
  const row = statRows.find((r) => r.id === rowId);
  if (!row || !hasOhsMonthData(row.months)) return { value: null, hasData: false };
  return { value: sumOhsYtd(row.months), hasData: true };
}

export function computeRenewableEnergyPct(statRows) {
  const renewable = statRowYtd(statRows, "stat-renewable");
  const nonRenewable = statRowYtd(statRows, "stat-non-renewable");
  if (!renewable.hasData && !nonRenewable.hasData) {
    return { value: "", hasData: false };
  }
  const r = renewable.value ?? 0;
  const n = nonRenewable.value ?? 0;
  const total = r + n;
  if (total === 0) return { value: "0", hasData: true };
  const pct = (r / total) * 100;
  return {
    value: Number.isInteger(pct) ? String(pct) : pct.toFixed(1),
    hasData: true,
  };
}

export function formatEnvVariance(target, actual) {
  const t = parseOhsNum(target);
  const a = parseOhsNum(actual);
  if (t == null || a == null || t === 0) return null;
  return ((a - t) / t) * 100;
}

export function envVarianceStyle(pct, lowerBetter, inkFaint = "#9ca3af") {
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

export function envScorecardVarianceStatus(target, actual, lowerBetter) {
  const t = parseOhsNum(target);
  const a = parseOhsNum(actual);

  if (t == null || target === "") {
    return { variance: null, style: envVarianceStyle(null, lowerBetter), status: "pending" };
  }
  if (a == null || actual === "") {
    return { variance: null, style: envVarianceStyle(null, lowerBetter), status: "pending" };
  }

  const variance = formatEnvVariance(target, actual);
  const style = envVarianceStyle(variance, lowerBetter);
  return {
    variance,
    style,
    status: style.onTrack ? "onTrack" : "offTarget",
  };
}

export function buildEnvironmentalScorecardRows(statRows, targets = {}) {
  let rows = buildScorecardRowsFromDefinitions(
    ENV_SCORECARD_DEFINITIONS,
    statRows,
    targets,
    {
      computeActualForStatRow: (row) => {
        const hasData = hasOhsMonthData(row.months);
        const ytd = sumOhsYtd(row.months);
        return formatOhsActualValue(ytd, hasData);
      },
      resolveLowerBetter: resolveOhsLowerBetter,
    }
  );

  const renewableDef = ENV_SCORECARD_DEFINITIONS.find((def) => def.derive === "renewablePct");
  if (renewableDef) {
    const { value, hasData } = computeRenewableEnergyPct(statRows);
    const derivedRow = buildDerivedScorecardRow(
      renewableDef,
      targets,
      hasData ? value : ""
    );
    rows = insertScorecardRowAfter(rows, derivedRow, "stat-energy");
  }

  return rows;
}

export function getChartableEnvRows(statRows) {
  return getKpiDropdownRows(statRows);
}

export function buildEnvMonthlySeries(row) {
  return ENV_MONTHS.map((m) => ({
    month: m.label,
    value: parseOhsNum(row?.months?.[m.key]) ?? 0,
  }));
}

function findEnvStatRow(statRows, rowId) {
  return statRows.find((row) => row.id === rowId) || null;
}

export function buildCo2EnergyTrendSeries(statRows) {
  const co2 = findEnvStatRow(statRows, "stat-co2");
  const energy = findEnvStatRow(statRows, "stat-energy");

  return ENV_MONTHS.map((m) => ({
    month: m.label,
    co2: parseOhsNum(co2?.months?.[m.key]) ?? 0,
    energy: parseOhsNum(energy?.months?.[m.key]) ?? 0,
  }));
}

export function buildGhgScopeStackedSeries(statRows) {
  const scope1 = findEnvStatRow(statRows, "stat-scope1");
  const scope2 = findEnvStatRow(statRows, "stat-scope2");
  const scope3 = findEnvStatRow(statRows, "stat-scope3");

  return ENV_MONTHS.map((m) => ({
    month: m.label,
    scope1: parseOhsNum(scope1?.months?.[m.key]) ?? 0,
    scope2: parseOhsNum(scope2?.months?.[m.key]) ?? 0,
    scope3: parseOhsNum(scope3?.months?.[m.key]) ?? 0,
  }));
}

export function buildFuelTrendSeries(statRows) {
  return buildEnvMonthlySeries(findEnvStatRow(statRows, "stat-fuel") || { months: {} });
}

export function buildPaperTrendSeries(statRows) {
  return buildEnvMonthlySeries(findEnvStatRow(statRows, "stat-paper") || { months: {} });
}

export function buildRenewableMixSeries(statRows) {
  const renewable = findEnvStatRow(statRows, "stat-renewable");
  const nonRenewable = findEnvStatRow(statRows, "stat-non-renewable");

  return ENV_MONTHS.map((m) => ({
    month: m.label,
    renewable: parseOhsNum(renewable?.months?.[m.key]) ?? 0,
    nonRenewable: parseOhsNum(nonRenewable?.months?.[m.key]) ?? 0,
  }));
}

function seriesHasValues(rows, keys) {
  return rows.some((row) => keys.some((key) => (row[key] ?? 0) > 0));
}

export function hasCo2EnergyTrendData(statRows) {
  return seriesHasValues(buildCo2EnergyTrendSeries(statRows), ["co2", "energy"]);
}

export function hasGhgScopeData(statRows) {
  return seriesHasValues(buildGhgScopeStackedSeries(statRows), ["scope1", "scope2", "scope3"]);
}

export function hasFuelTrendData(statRows) {
  return buildFuelTrendSeries(statRows).some((row) => row.value > 0);
}

export function hasPaperTrendData(statRows) {
  return buildPaperTrendSeries(statRows).some((row) => row.value > 0);
}

export function hasRenewableMixData(statRows) {
  return seriesHasValues(buildRenewableMixSeries(statRows), ["renewable", "nonRenewable"]);
}

export function hasEnvironmentalChartData(statRows, waste) {
  return (
    getChartableEnvRows(statRows).length > 0 ||
    hasCo2EnergyTrendData(statRows) ||
    hasGhgScopeData(statRows) ||
    hasFuelTrendData(statRows) ||
    hasPaperTrendData(statRows) ||
    hasRenewableMixData(statRows) ||
    hasWasteData(waste)
  );
}

export function buildWasteChartSeries(waste) {
  return ENV_WASTE_CATEGORIES.map((cat) => ({
    name: cat.label,
    value: parseOhsNum(waste?.[cat.key]) ?? 0,
  }));
}

export function buildWasteSummary(waste) {
  const rows = ENV_WASTE_CATEGORIES.map((cat) => ({
    key: cat.key,
    label: cat.label,
    kg: parseOhsNum(waste?.[cat.key]) ?? 0,
  }));
  const total = rows.reduce((sum, row) => sum + row.kg, 0);
  const hasData = rows.some((row) => waste?.[row.key] !== "" && waste?.[row.key] != null);

  return {
    rows: rows.map((row) => ({
      ...row,
      pct: total > 0 && hasData ? `${((row.kg / total) * 100).toFixed(1)}%` : "—",
    })),
    total: hasData ? (Number.isInteger(total) ? String(total) : total.toFixed(1)) : "—",
    hasData,
  };
}

export function hasWasteData(waste) {
  return buildWasteChartSeries(waste).some((row) => row.value > 0);
}

export function summarizeEnvironmentalScorecard(statRows, targets = {}) {
  const rows = buildEnvironmentalScorecardRows(statRows, targets);
  let onTrack = 0;
  let offTarget = 0;
  let pending = 0;

  for (const row of rows) {
    const { status } = envScorecardVarianceStatus(row.target, row.actual, row.lowerBetter);
    if (status === "onTrack") onTrack += 1;
    else if (status === "offTarget") offTarget += 1;
    else pending += 1;
  }

  return { onTrack, offTarget, pending, total: rows.length };
}

export { formatOhsYtdDisplay, hasOhsMonthData, sumOhsYtd };
