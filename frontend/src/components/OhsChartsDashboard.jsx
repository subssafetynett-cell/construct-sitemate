import React, { useMemo } from "react";
import { Box } from "@mui/material";
import { BarChart3, Shield, Users } from "lucide-react";
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
  buildClassificationChartSeries,
  buildEmployeeHeadcountSeries,
  buildInjuriesTrendSeries,
  buildInvestmentPayrollSeries,
  buildInvestmentTrendSeries,
  buildMonthlySeriesForRow,
  buildPayrollTrendSeries,
  buildTurnoverTrendSeries,
  getChartableStatRows,
  hasEmployeeHeadcountData,
  hasInjuriesTrendData,
  hasInvestmentPayrollData,
  hasInvestmentTrendData,
  hasOhsChartData,
  hasPayrollTrendData,
  hasTurnoverTrendData,
  summarizeScorecard,
} from "../utils/ohsDashboardUtils";

const T = DASHBOARD_THEME;
const OHS_HEADER = "#1e40af";
const TURNOVER_COLOR = "#f59e0b";
const INJURIES_COLOR = "#dc2626";
const INVESTMENT_COLOR = "#2563eb";
const PAYROLL_COLOR = "#7c3aed";
const MALE_COLOR = "#2563eb";
const FEMALE_COLOR = "#ec4899";
const RANK_COLOR = "#1d4ed8";
const AGE_COLOR = "#0891b2";

const axisTick = { fontSize: 11, fill: T.inkFaint };
const gridStroke = "#e5e7eb";

function OhsChartSection({ icon: Icon, title, children, exportMode = false, breakBefore = false }) {
  const inner = (
    <Box sx={{ mb: exportMode ? 0 : 3 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2,
          py: 1.25,
          bgcolor: OHS_HEADER,
          color: "#fff",
          borderRadius: "8px 8px 0 0",
          border: `1px solid ${OHS_HEADER}`,
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

function ChartPanel({ title, subtitle, children, emptyMessage, exportMode = false }) {
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

function DistributionChart({ title, data, color, exportMode = false }) {
  const hasData = data.some((row) => row.value > 0);

  if (!hasData) {
    return (
      <ChartPanel title={title} emptyMessage="Enter classification values to see this chart." />
    );
  }

  return (
    <ChartPanel title={title}>
      <DashboardChartBox height={260} pdfChart={exportMode}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
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
              width={100}
              tick={{ fontSize: 11, fill: T.inkMid }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<DashboardChartTooltip />} cursor={{ fill: "rgba(37, 99, 235, 0.06)" }} />
            <Bar dataKey="value" name="Count" fill={color} radius={[0, 4, 4, 0]} barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </DashboardChartBox>
    </ChartPanel>
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
        Occupational health & safety performance charts
      </p>
      <p style={{ margin: "6px 0 0", fontSize: 13, color: T.inkMid }}>
        Enter monthly statistics and employee classification data above to generate turnover, injury,
        and workforce trends.
      </p>
    </Box>
  );
}

export default function OhsChartsDashboard({ statRows, classification, targets, exportMode = false }) {
  const turnoverData = useMemo(() => buildTurnoverTrendSeries(statRows), [statRows]);
  const injuriesData = useMemo(() => buildInjuriesTrendSeries(statRows), [statRows]);
  const investmentData = useMemo(() => buildInvestmentTrendSeries(statRows), [statRows]);
  const payrollData = useMemo(() => buildPayrollTrendSeries(statRows), [statRows]);
  const investmentPayrollData = useMemo(() => buildInvestmentPayrollSeries(statRows), [statRows]);
  const headcountData = useMemo(() => buildEmployeeHeadcountSeries(statRows), [statRows]);
  const classificationSeries = useMemo(
    () => buildClassificationChartSeries(classification),
    [classification]
  );

  const summary = useMemo(() => summarizeScorecard(statRows, targets), [statRows, targets]);
  const monthlyChartRows = useMemo(() => getChartableStatRows(statRows), [statRows]);

  const showTurnover = hasTurnoverTrendData(statRows);
  const showInjuries = hasInjuriesTrendData(statRows);
  const showInvestment = hasInvestmentTrendData(statRows);
  const showPayroll = hasPayrollTrendData(statRows);
  const showInvestmentPayroll = hasInvestmentPayrollData(statRows);
  const showHeadcount = hasEmployeeHeadcountData(statRows);
  const showRank = classificationSeries.rank.some((row) => row.value > 0);
  const showAge = classificationSeries.age.some((row) => row.value > 0);
  const hasChartData = hasOhsChartData(statRows, classification);

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
        buildSeries={buildMonthlySeriesForRow}
        barColor="#2563eb"
        headerColor={OHS_HEADER}
        exportMode={exportMode}
        breakBefore
      />

      <OhsChartSection icon={Shield} title="Occupational — Turnover & Injury Trends" exportMode={exportMode}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
            gap: 2,
          }}
        >
          <ChartPanel
            title="Monthly Turnover Trend (£M)"
            emptyMessage="Enter turnover monthly values to see this trend."
            exportMode={exportMode}
          >
            {showTurnover ? (
              <DashboardChartBox height={300} pdfChart={exportMode}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={turnoverData} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                    <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={axisTick}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals
                      label={{
                        value: "£M",
                        angle: -90,
                        position: "insideLeft",
                        offset: 10,
                        style: { fontSize: 11, fill: T.ink, fontWeight: 700 },
                      }}
                    />
                    <Tooltip content={<DashboardChartTooltip />} />
                    <Legend
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      iconType="line"
                      wrapperStyle={{ fontSize: 12, paddingLeft: 12 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="Turnover £M"
                      stroke={TURNOVER_COLOR}
                      strokeWidth={3}
                      dot={{ r: 3, fill: TURNOVER_COLOR, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </DashboardChartBox>
            ) : null}
          </ChartPanel>

          <ChartPanel
            title="Monthly Injuries Trend"
            subtitle="Number of injuries per month"
            emptyMessage="Enter injury monthly values to see this trend."
            exportMode={exportMode}
          >
            {showInjuries ? (
              <DashboardChartBox height={300} pdfChart={exportMode}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={injuriesData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
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
                      dataKey="value"
                      name="Injuries"
                      stroke={INJURIES_COLOR}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: INJURIES_COLOR, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </DashboardChartBox>
            ) : null}
          </ChartPanel>
        </Box>
      </OhsChartSection>

      <OhsChartSection icon={Shield} title="Occupational — Investment, Payroll & Workforce" exportMode={exportMode}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
            gap: 2,
            mb: showHeadcount || showInvestment || showPayroll ? 2 : 0,
          }}
        >
          <ChartPanel
            title="Monthly Investment & Payroll"
            subtitle="£M per month"
            emptyMessage="Enter investment and payroll monthly values."
            exportMode={exportMode}
          >
            {showInvestmentPayroll ? (
              <DashboardChartBox height={280} pdfChart={exportMode}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={investmentPayrollData}
                    margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                    <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={axisTick}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals
                      label={{
                        value: "£M",
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
                      dataKey="investment"
                      name="Investment (£M)"
                      stroke={INVESTMENT_COLOR}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: INVESTMENT_COLOR, strokeWidth: 0 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="payroll"
                      name="Payroll (£M)"
                      stroke={PAYROLL_COLOR}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: PAYROLL_COLOR, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </DashboardChartBox>
            ) : null}
          </ChartPanel>

          <ChartPanel
            title="Male & Female Employees"
            subtitle="Headcount per month"
            emptyMessage="Enter male and female employee monthly values."
            exportMode={exportMode}
          >
            {showHeadcount ? (
              <DashboardChartBox height={280} pdfChart={exportMode}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={headcountData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
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
                      dataKey="male"
                      name="Male Employees"
                      stroke={MALE_COLOR}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: MALE_COLOR, strokeWidth: 0 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="female"
                      name="Female Employees"
                      stroke={FEMALE_COLOR}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: FEMALE_COLOR, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </DashboardChartBox>
            ) : null}
          </ChartPanel>
        </Box>

        {(showInvestment || showPayroll) && !showInvestmentPayroll ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
              gap: 2,
            }}
          >
            {showInvestment ? (
              <ChartPanel title="Monthly Investment Trend" subtitle="£M per month">
                <DashboardChartBox height={260}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={investmentData} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                      <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
                      <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals />
                      <Tooltip content={<DashboardChartTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        name="Investment (£M)"
                        stroke={INVESTMENT_COLOR}
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: INVESTMENT_COLOR, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </DashboardChartBox>
              </ChartPanel>
            ) : null}

            {showPayroll ? (
              <ChartPanel title="Monthly Payroll Trend" subtitle="£M per month">
                <DashboardChartBox height={260}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={payrollData} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                      <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
                      <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals />
                      <Tooltip content={<DashboardChartTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        name="Payroll (£M)"
                        stroke={PAYROLL_COLOR}
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: PAYROLL_COLOR, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </DashboardChartBox>
              </ChartPanel>
            ) : null}
          </Box>
        ) : null}
      </OhsChartSection>

      {showRank || showAge ? (
        <OhsChartSection icon={Users} title="Occupational — Employee Classification" exportMode={exportMode}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
              gap: 2,
            }}
          >
            {showRank ? (
              <DistributionChart
                title="Employee Rank Distribution"
                data={classificationSeries.rank}
                color={RANK_COLOR}
                exportMode={exportMode}
              />
            ) : (
              <ChartPanel
                title="Employee Rank Distribution"
                emptyMessage="Enter rank classification values."
              />
            )}
            {showAge ? (
              <DistributionChart
                title="Employee Age Distribution"
                data={classificationSeries.age}
                color={AGE_COLOR}
                exportMode={exportMode}
              />
            ) : (
              <ChartPanel
                title="Employee Age Distribution"
                emptyMessage="Enter age classification values."
              />
            )}
          </Box>
        </OhsChartSection>
      ) : null}
    </Box>
  );
}
