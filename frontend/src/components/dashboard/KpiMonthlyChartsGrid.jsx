import React, { useMemo } from "react";
import { Box } from "@mui/material";
import KpiMonthlyBarChart from "./KpiMonthlyBarChart";
import { monthlyChartSeriesName, monthlyChartTitle, sortKpiChartRows } from "../../utils/kpiChartUtils";

export default function KpiMonthlyChartsGrid({
  rows,
  buildSeries,
  barColor = "#2563eb",
  exportMode = false,
  chartHeight = 300,
}) {
  const sortedRows = useMemo(() => sortKpiChartRows(rows), [rows]);

  if (!sortedRows.length) return null;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          md: "repeat(2, 1fr)",
          xl: "repeat(3, 1fr)",
        },
        gap: 2,
      }}
    >
      {sortedRows.map((row) => (
        <KpiMonthlyBarChart
          key={row.id}
          title={monthlyChartTitle(row.indicator)}
          data={buildSeries(row)}
          seriesName={monthlyChartSeriesName(row.indicator)}
          color={barColor}
          height={chartHeight}
          exportMode={exportMode}
        />
      ))}
    </Box>
  );
}
