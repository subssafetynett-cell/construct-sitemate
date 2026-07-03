import {
  extractUnitFromIndicator,
  formatOhsActualValue,
  resolveOhsLowerBetter,
} from "./ohsDashboardUtils";

/** Merge scorecard target fields saved under legacy def id and stat row id. */
export function mergeScorecardTargetSaved(targets = {}, statRowId, legacyDefId) {
  return {
    ...(legacyDefId ? targets[legacyDefId] || {} : {}),
    ...(targets[statRowId] || {}),
  };
}

export function buildScorecardRowFromStat(
  row,
  targets = {},
  { computeActual, def, legacyDefId, resolveLowerBetter = resolveOhsLowerBetter } = {}
) {
  const saved = mergeScorecardTargetSaved(targets, row.id, legacyDefId);
  const indicator = String(row.indicator || "").trim();
  const actual = computeActual(row);

  return {
    id: row.id,
    indicator: indicator || saved.indicator || def?.indicator || "",
    target: saved.target ?? "",
    actual,
    unit: saved.unit ?? (extractUnitFromIndicator(indicator) || def?.unit || ""),
    note: saved.note ?? "",
    lowerBetter: def?.lowerBetter ?? resolveLowerBetter(indicator),
    derived: false,
  };
}

export function buildDerivedScorecardRow(def, targets = {}, actual) {
  const saved = targets[def.id] || {};
  return {
    id: def.id,
    indicator: saved.indicator ?? def.indicator,
    target: saved.target ?? "",
    actual,
    unit: saved.unit ?? def.unit,
    note: saved.note ?? "",
    lowerBetter: def.lowerBetter,
    derived: true,
  };
}

/** Insert a derived scorecard row after a statistics row (falls back to append). */
export function insertScorecardRowAfter(rows, newRow, afterStatRowId) {
  if (!afterStatRowId) return [...rows, newRow];
  const idx = rows.findIndex((row) => row.id === afterStatRowId);
  if (idx < 0) return [...rows, newRow];
  return [...rows.slice(0, idx + 1), newRow, ...rows.slice(idx + 1)];
}

export function definitionsByStatRowId(definitions = []) {
  return Object.fromEntries(
    definitions.filter((def) => def.statRowId).map((def) => [def.statRowId, def])
  );
}

export function buildScorecardRowFromDefinition(
  def,
  statRows,
  targets = {},
  { computeActualForStatRow, resolveLowerBetter = resolveOhsLowerBetter } = {}
) {
  const statRow = def.statRowId
    ? (statRows || []).find((row) => row.id === def.statRowId)
    : null;

  if (statRow) {
    return buildScorecardRowFromStat(statRow, targets, {
      def,
      legacyDefId: def.id,
      computeActual: (row) => computeActualForStatRow(row, def),
      resolveLowerBetter: (indicator) =>
        def?.lowerBetter ?? resolveLowerBetter(indicator),
    });
  }

  const rowId = def.statRowId || def.id;
  const saved = mergeScorecardTargetSaved(targets, rowId, def.id);
  return {
    id: rowId,
    indicator: saved.indicator ?? def.indicator,
    target: saved.target ?? "",
    actual: "",
    unit: saved.unit ?? def.unit ?? "",
    note: saved.note ?? "",
    lowerBetter: def.lowerBetter ?? resolveLowerBetter(def.indicator),
    derived: false,
  };
}

/**
 * Build scorecard rows from definitions so standard indicators always appear,
 * then append any user-added statistics rows that are not covered by a definition.
 */
export function buildScorecardRowsFromDefinitions(
  definitions,
  statRows,
  targets = {},
  { computeActualForStatRow, resolveLowerBetter = resolveOhsLowerBetter } = {}
) {
  const statRowsList = statRows || [];
  const definitionStatRowIds = new Set(
    definitions.filter((def) => def.statRowId && !def.derive).map((def) => def.statRowId)
  );

  const rows = definitions
    .filter((def) => !def.derive)
    .map((def) =>
      buildScorecardRowFromDefinition(def, statRowsList, targets, {
        computeActualForStatRow,
        resolveLowerBetter,
      })
    );

  const extraRows = statRowsList
    .filter((row) => !definitionStatRowIds.has(row.id))
    .map((row) =>
      buildScorecardRowFromStat(row, targets, {
        computeActual: (r) => computeActualForStatRow(r),
        resolveLowerBetter,
      })
    );

  return [...rows, ...extraRows];
}
