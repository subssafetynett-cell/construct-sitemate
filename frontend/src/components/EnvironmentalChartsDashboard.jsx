import React, { useMemo } from "react";
import { Box } from "@mui/material";
import { BarChart3, Leaf, Recycle } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DASHBOARD_THEME,
  DashboardChartBox,
  DashboardChartTooltip,
  DashboardMiniStat,
} from "./dashboard/dashboardUi";
import KpiMonthlyChartsSection from "./dashboard/KpiMonthlyChartsSection";
import {
  buildCo2EnergyTrendSeries,
  buildEnvMonthlySeries,
  buildFuelTrendSeries,
  buildGhgScopeStackedSeries,
  buildPaperTrendSeries,
  buildRenewableMixSeries,
  buildWasteChartSeries,
  getChartableEnvRows,
  hasCo2EnergyTrendData,
  hasEnvironmentalChartData,
  hasFuelTrendData,
  hasGhgScopeData,
  hasPaperTrendData,
  hasRenewableMixData,
  hasWasteData,
  summarizeEnvironmentalScorecard,
} from "../utils/environmentalDashboardUtils";

const T = DASHBOARD_THEME;
const ENV_GREEN = "#15803d";
const ENV_HEADER = "#166534";
const CO2_COLOR = "#16a34a";
const ENERGY_COLOR = "#f59e0b";
const SCOPE1_COLOR = "#16a34a";
const SCOPE2_COLOR = "#f59e0b";
const SCOPE3_COLOR = "#2563eb";
const FUEL_COLOR = "#d97706";
const PAPER_COLOR = "#0284c7";
const RENEWABLE_COLOR = "#22c55e";
const NON_RENEWABLE_COLOR = "#94a3b8";

const axisTick = { fontSize: 11, fill: T.inkFaint };
const gridStroke = "#e5e7eb";

function EnvChartSection({ icon: Icon, title, children, exportMode = false, breakBefore = false }) {
  const inner = (
    <Box sx={{ mb: exportMode ? 0 : 3 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2,
          py: 1.25,
          bgcolor: ENV_HEADER,
          color: "#fff",
          borderRadius: "8px 8px 0 0",
          border: `1px solid ${ENV_HEADER}`,
          borderBottom: "none",
        }}
      >
        <Icon size={18} strokeWidth={2.5} />
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
        {children}
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

function ChartPanel({ title, subtitle, children, emptyMessage }) {
  return (
    <Box
      sx={{
        border: "1px solid #e5e7eb",
        borderRadius: 2,
        bgcolor: "#fff",
        p: 2,
        minWidth: 0,
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: T.ink }}>{title}</p>
      {subtitle ? (
        <p style={{ margin: "0 0 14px", fontSize: 12, color: T.inkMid }}>{subtitle}</p>
      ) : (
        <div style={{ marginBottom: 14 }} />
      )}
      {children || (
        <p style={{ margin: 0, fontSize: 13, color: T.inkMid }}>{emptyMessage}</p>
      )}
    </Box>
  );
}

function EmptyChartsPlaceholder() {
  return (
    <Box
      sx={{
        mb: 3,
        p: 3,
        bgcolor: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 2,
        textAlign: "center",
      }}
    >
      <BarChart3 size={28} color={T.inkFaint} style={{ marginBottom: 8 }} />
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: T.ink }}>
        Environmental performance charts
      </p>
      <p style={{ margin: "6px 0 0", fontSize: 13, color: T.inkMid }}>
        Enter monthly statistics and waste data above to generate CO2, energy, scope, and fuel
        trends.
      </p>
    </Box>
  );
}

export default function EnvironmentalChartsDashboard({ statRows, waste, targets, exportMode = false }) {
  const co2EnergyData = useMemo(() => buildCo2EnergyTrendSeries(statRows), [statRows]);
  const scopeData = useMemo(() => buildGhgScopeStackedSeries(statRows), [statRows]);
  const fuelData = useMemo(() => buildFuelTrendSeries(statRows), [statRows]);
  const paperData = useMemo(() => buildPaperTrendSeries(statRows), [statRows]);
  const renewableData = useMemo(() => buildRenewableMixSeries(statRows), [statRows]);
  const wasteData = useMemo(() => buildWasteChartSeries(waste), [waste]);

  const summary = useMemo(
    () => summarizeEnvironmentalScorecard(statRows, targets),
    [statRows, targets]
  );
  const monthlyChartRows = useMemo(() => getChartableEnvRows(statRows), [statRows]);

  const showCo2Energy = hasCo2EnergyTrendData(statRows);
  const showScope = hasGhgScopeData(statRows);
  const showFuel = hasFuelTrendData(statRows);
  const showPaper = hasPaperTrendData(statRows);
  const showRenewable = hasRenewableMixData(statRows);
  const showWaste = hasWasteData(waste);
  const hasChartData = hasEnvironmentalChartData(statRows, waste);

  if (!hasChartData) {
    return exportMode ? null : <EmptyChartsPlaceholder />;
  }

  return (
    <Box sx={{ mb: exportMode ? 0 : 3 }}>
      {!exportMode ? (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 1.5,
          mb: 2.5,
        }}
      >
        <DashboardMiniStat label="KPIs tracked" value={summary.total} tone="neutral" />
        <DashboardMiniStat label="On track" value={summary.onTrack} tone="green" />
        <DashboardMiniStat label="Off target" value={summary.offTarget} tone="red" />
        <DashboardMiniStat label="Awaiting target" value={summary.pending} tone="brand" />
      </Box>
      ) : null}

      <KpiMonthlyChartsSection
        title="Monthly KPI Statistics"
        rows={monthlyChartRows}
        buildSeries={buildEnvMonthlySeries}
        barColor="#2563eb"
        headerColor={ENV_HEADER}
        exportMode={exportMode}
        breakBefore
      />

      <EnvChartSection icon={Leaf} title="Environmental — CO2, Energy & Fuel Trends" exportMode={exportMode}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
            gap: 2,
          }}
        >
          <ChartPanel
            title="Monthly CO2 Emissions & Energy Consumption"
            emptyMessage="Enter CO2 and energy monthly values to see this trend."
          >
            {showCo2Energy ? (
              <DashboardChartBox pdfChart={exportMode} height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={co2EnergyData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                    <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={axisTick}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      label={{
                        value: "Value",
                        angle: -90,
                        position: "insideLeft",
                        offset: 10,
                        style: { fontSize: 11, fill: T.inkFaint },
                      }}
                    />
                    <Tooltip content={<DashboardChartTooltip />} />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="co2"
                      name="CO2 Emissions (Tons)"
                      stroke={CO2_COLOR}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: CO2_COLOR, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="energy"
                      name="Energy Consumption (MWh)"
                      stroke={ENERGY_COLOR}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: ENERGY_COLOR, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </DashboardChartBox>
            ) : null}
          </ChartPanel>

          <ChartPanel
            title="GHG Scope Emissions (tCO2e)"
            emptyMessage="Enter Scope 1–3 monthly values to see stacked emissions."
          >
            {showScope ? (
              <DashboardChartBox pdfChart={exportMode} height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scopeData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                    <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<DashboardChartTooltip />} />
                    <Legend
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      iconType="square"
                      wrapperStyle={{ fontSize: 11, paddingLeft: 12 }}
                    />
                    <Bar
                      dataKey="scope1"
                      name="Scope 1"
                      stackId="ghg"
                      fill={SCOPE1_COLOR}
                      radius={[0, 0, 0, 0]}
                      maxBarSize={40}
                    />
                    <Bar
                      dataKey="scope2"
                      name="Scope 2"
                      stackId="ghg"
                      fill={SCOPE2_COLOR}
                      maxBarSize={40}
                    />
                    <Bar
                      dataKey="scope3"
                      name="Scope 3"
                      stackId="ghg"
                      fill={SCOPE3_COLOR}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </DashboardChartBox>
            ) : null}
          </ChartPanel>
        </Box>
      </EnvChartSection>

      <EnvChartSection icon={Leaf} title="Environmental — Fuel, Paper & Energy Mix" exportMode={exportMode}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
            gap: 2,
            mb: showWaste ? 2 : 0,
          }}
        >
          <ChartPanel
            title="Monthly Fuel Consumption"
            subtitle="Litres per month"
            emptyMessage="Enter fuel consumption monthly values."
          >
            {showFuel ? (
              <DashboardChartBox pdfChart={exportMode} height={280}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={fuelData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                    <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<DashboardChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="Fuel (Litres)"
                      stroke={FUEL_COLOR}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: FUEL_COLOR, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </DashboardChartBox>
            ) : null}
          </ChartPanel>

          <ChartPanel
            title="Monthly Paper Consumption"
            subtitle="Tons per month"
            emptyMessage="Enter paper consumption monthly values."
          >
            {showPaper ? (
              <DashboardChartBox pdfChart={exportMode} height={280}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={paperData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                    <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<DashboardChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="Paper (Tons)"
                      stroke={PAPER_COLOR}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: PAPER_COLOR, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </DashboardChartBox>
            ) : null}
          </ChartPanel>
        </Box>

        <ChartPanel
          title="Renewable vs Non-Renewable Energy"
          subtitle="MWh per month"
          emptyMessage="Enter renewable and non-renewable energy monthly values."
        >
          {showRenewable ? (
            <DashboardChartBox pdfChart={exportMode} height={280}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={renewableData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                  <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<DashboardChartTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="renewable"
                    name="Renewable (MWh)"
                    stroke={RENEWABLE_COLOR}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: RENEWABLE_COLOR, strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="nonRenewable"
                    name="Non-Renewable (MWh)"
                    stroke={NON_RENEWABLE_COLOR}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: NON_RENEWABLE_COLOR, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </DashboardChartBox>
          ) : null}
        </ChartPanel>
      </EnvChartSection>

      {showWaste ? (
        <EnvChartSection icon={Recycle} title="Environmental — Waste & Materials" exportMode={exportMode}>
          <ChartPanel title="Waste Generation by Material" subtitle="Annual snapshot (KGs)">
            <DashboardChartBox pdfChart={exportMode} height={320}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={wasteData}
                  margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  barCategoryGap={10}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridStroke} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={92}
                    tick={{ fontSize: 11, fill: T.inkMid }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<DashboardChartTooltip />} cursor={{ fill: "rgba(22, 163, 74, 0.06)" }} />
                  <Bar dataKey="value" name="KGs" fill={ENV_GREEN} radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </DashboardChartBox>
          </ChartPanel>
        </EnvChartSection>
      ) : null}
    </Box>
  );
}
