import React, { useEffect, useMemo, useState } from "react";
import { Box, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { BarChart3 } from "lucide-react";
import KpiMonthlyBarChart from "./KpiMonthlyBarChart";
import KpiMonthlyChartsGrid from "./KpiMonthlyChartsGrid";
import { monthlyChartSeriesName, monthlyChartTitle, sortKpiChartRows } from "../../utils/kpiChartUtils";

export default function KpiMonthlyChartsSection({
  title = "Monthly KPI Statistics",
  rows,
  buildSeries,
  barColor = "#2563eb",
  headerColor = "#1e40af",
  exportMode = false,
  breakBefore = false,
}) {
  const sortedRows = useMemo(() => sortKpiChartRows(rows), [rows]);
  const [selectedId, setSelectedId] = useState(() => sortedRows[0]?.id ?? "");

  useEffect(() => {
    if (!sortedRows.length) {
      setSelectedId("");
      return;
    }
    if (!sortedRows.some((row) => row.id === selectedId)) {
      setSelectedId(sortedRows[0].id);
    }
  }, [sortedRows, selectedId]);

  const selectedRow = useMemo(
    () => sortedRows.find((row) => row.id === selectedId) ?? sortedRows[0] ?? null,
    [sortedRows, selectedId]
  );

  if (!sortedRows.length) return null;

  const chartContent = exportMode ? (
    <KpiMonthlyChartsGrid
      rows={sortedRows}
      buildSeries={buildSeries}
      barColor={barColor}
      exportMode={exportMode}
    />
  ) : (
    <>
      <Box sx={{ mb: 2, maxWidth: 480 }}>
        <FormControl fullWidth size="small">
          <InputLabel id="kpi-indicator-select-label">Indicator</InputLabel>
          <Select
            labelId="kpi-indicator-select-label"
            id="kpi-indicator-select"
            value={selectedRow?.id ?? ""}
            label="Indicator"
            onChange={(e) => setSelectedId(e.target.value)}
            sx={{ bgcolor: "#fff" }}
          >
            {sortedRows.map((row) => (
              <MenuItem key={row.id} value={row.id}>
                {String(row.indicator || "").trim() || "Untitled indicator"}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {selectedRow ? (
        <KpiMonthlyBarChart
          title={monthlyChartTitle(selectedRow.indicator)}
          data={buildSeries(selectedRow)}
          seriesName={monthlyChartSeriesName(selectedRow.indicator)}
          color={barColor}
          height={360}
          exportMode={false}
        />
      ) : null}
    </>
  );

  const inner = (
    <Box sx={{ mb: exportMode ? 0 : 3 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2,
          py: 1.25,
          bgcolor: headerColor,
          color: "#fff",
          borderRadius: "8px 8px 0 0",
          border: `1px solid ${headerColor}`,
          borderBottom: "none",
        }}
      >
        <BarChart3 size={18} strokeWidth={2.5} />
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.02em" }}>{title}</span>
      </Box>
      <Box
        sx={{
          bgcolor: "#fff",
          border: "1px solid #d1d5db",
          borderRadius: "0 0 8px 8px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          p: { xs: 2, md: 2.5 },
        }}
      >
        {chartContent}
      </Box>
    </Box>
  );

  if (!exportMode) return inner;

  return (
    <div
      data-pdf-block
      {...(breakBefore ? { "data-pdf-break-before": true } : {})}
      style={{ marginBottom: 0 }}
    >
      {inner}
    </div>
  );
}
