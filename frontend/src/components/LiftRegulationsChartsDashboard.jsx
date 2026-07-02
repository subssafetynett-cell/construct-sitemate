import React, { useMemo } from "react";
import { Box } from "@mui/material";
import { AlertTriangle, BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DASHBOARD_THEME,
  DashboardCard,
  DashboardChartBox,
  DashboardChartTooltip,
  DashboardMiniStat,
  DashboardSectionHeader,
} from "./dashboard/dashboardUi";
import KpiMonthlyChartsSection from "./dashboard/KpiMonthlyChartsSection";
import {
  buildIncidentChartSeries,
  buildLrMonthlySeries,
  getChartableLrRows,
  hasIncidentData,
  hasLiftRegulationsChartData,
  summarizeLiftRegulationsScorecard,
} from "../utils/liftRegulationsDashboardUtils";

const T = DASHBOARD_THEME;
const BRAND = "#2563eb";
const HEADER = "#1e40af";

export default function LiftRegulationsChartsDashboard({
  statRows,
  incidents,
  targets,
  exportMode = false,
}) {
  const chartableRows = useMemo(() => getChartableLrRows(statRows), [statRows]);
  const incidentData = useMemo(() => buildIncidentChartSeries(incidents), [incidents]);

  const summary = useMemo(
    () => summarizeLiftRegulationsScorecard(statRows, targets),
    [statRows, targets]
  );

  const hasIncidentChart = hasIncidentData(incidents);
  const hasChartData = hasLiftRegulationsChartData(statRows, incidents);

  if (!hasChartData) {
    if (exportMode) return null;
    return (
      <DashboardCard style={{ marginBottom: 24 }}>
        <DashboardSectionHeader
          icon={BarChart3}
          title="Performance dashboard"
          hint="Enter lift regulations statistics and incident data to generate charts."
        />
      </DashboardCard>
    );
  }

  const charts = (
    <Box sx={{ mb: exportMode ? 0 : 3 }}>
      {!exportMode ? (
        <>
          <DashboardSectionHeader
            icon={BarChart3}
            title="Performance dashboard"
            hint="Charts update automatically from your statistics, incident snapshot, and scorecard."
          />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 1.5,
              mb: 2,
            }}
          >
            <DashboardMiniStat label="KPIs tracked" value={summary.total} tone="neutral" />
            <DashboardMiniStat label="On track" value={summary.onTrack} tone="green" />
            <DashboardMiniStat label="Off target" value={summary.offTarget} tone="red" />
            <DashboardMiniStat label="Awaiting target" value={summary.pending} tone="brand" />
          </Box>
        </>
      ) : null}

      <KpiMonthlyChartsSection
        title="Monthly KPI Statistics"
        rows={chartableRows}
        buildSeries={buildLrMonthlySeries}
        barColor={BRAND}
        headerColor={HEADER}
        exportMode={exportMode}
        breakBefore
      />

      {hasIncidentChart ? (
        <DashboardCard style={{ marginTop: exportMode ? 16 : 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <AlertTriangle size={16} color={T.inkMid} />
            <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Incident classification</span>
          </Box>
          <DashboardChartBox height={300} pdfChart={exportMode}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={incidentData}
                margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                barCategoryGap={8}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={T.border} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: T.inkFaint }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 10, fill: T.inkMid }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<DashboardChartTooltip />} cursor={{ fill: "rgba(37, 99, 235, 0.06)" }} />
                <Bar dataKey="value" name="Count" fill={BRAND} radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </DashboardChartBox>
        </DashboardCard>
      ) : null}
    </Box>
  );

  if (!exportMode) return charts;

  return (
    <div data-pdf-block data-pdf-break-before style={{ marginBottom: 0 }}>
      <Box sx={{ p: 2, border: "1px solid #d1d5db", borderRadius: 2, bgcolor: "#fff" }}>
        <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: T.ink }}>
          Lift Regulations — Performance Dashboard
        </p>
        {charts}
      </Box>
    </div>
  );
}
