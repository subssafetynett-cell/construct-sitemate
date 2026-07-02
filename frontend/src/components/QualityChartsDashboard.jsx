import React, { useMemo } from "react";
import { Box } from "@mui/material";
import { BarChart3, Scale, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
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
  buildAttendancePieData,
  buildBoardCompositionBars,
  buildBoardGenderPieData,
  buildLawsuitsWhistleblowerSeries,
  buildMeetingsTrendSeries,
  buildQualityMonthlySeries,
  computeAttendanceRate,
  getChartableQualityRows,
  hasAttendancePieData,
  hasBoardCompositionData,
  hasBoardGenderPieData,
  hasLawsuitsWhistleblowerData,
  hasMeetingsTrendData,
  hasQualityChartData,
  summarizeQualityScorecard,
} from "../utils/qualityDashboardUtils";

const T = DASHBOARD_THEME;
const QUALITY_HEADER = "#6d28d9";
const PURPLE = "#7c3aed";
const LAWSUITS_COLOR = "#dc2626";
const WHISTLEBLOWER_COLOR = "#eab308";
const MEETINGS_COLOR = "#7c3aed";
const BOARD_BAR_COLOR = "#2563eb";

const ATTENDANCE_COLORS = ["#16a34a", "#f59e0b"];
const GENDER_COLORS = ["#2563eb", "#ec4899"];

const axisTick = { fontSize: 11, fill: T.inkFaint };
const gridStroke = "#e5e7eb";

function QualityChartSection({ icon: Icon, title, children, exportMode = false, breakBefore = false }) {
  const inner = (
    <Box sx={{ mb: exportMode ? 0 : 3 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2,
          py: 1.25,
          bgcolor: QUALITY_HEADER,
          color: "#fff",
          borderRadius: "8px 8px 0 0",
          border: `1px solid ${QUALITY_HEADER}`,
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
        Quality management performance charts
      </p>
      <p style={{ margin: "6px 0 0", fontSize: 13, color: T.inkMid }}>
        Enter board statistics, attendance, and governance data above to generate composition,
        meeting, and case trend charts.
      </p>
    </Box>
  );
}

export default function QualityChartsDashboard({ statRows, attendance, targets, exportMode = false }) {
  const governanceData = useMemo(() => buildLawsuitsWhistleblowerSeries(statRows), [statRows]);
  const meetingsData = useMemo(() => buildMeetingsTrendSeries(statRows), [statRows]);
  const boardBars = useMemo(() => buildBoardCompositionBars(statRows), [statRows]);
  const genderPie = useMemo(() => buildBoardGenderPieData(statRows), [statRows]);
  const attendancePie = useMemo(() => buildAttendancePieData(attendance), [attendance]);

  const summary = useMemo(
    () => summarizeQualityScorecard(statRows, targets, attendance),
    [statRows, targets, attendance]
  );

  const attendanceRate = useMemo(() => computeAttendanceRate(attendance), [attendance]);
  const monthlyChartRows = useMemo(() => getChartableQualityRows(statRows), [statRows]);

  const showGovernance = hasLawsuitsWhistleblowerData(statRows);
  const showMeetings = hasMeetingsTrendData(statRows);
  const showBoardBars = hasBoardCompositionData(statRows);
  const showGenderPie = hasBoardGenderPieData(statRows);
  const showAttendancePie = hasAttendancePieData(attendance);
  const hasChartData = hasQualityChartData(statRows, attendance);

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
        {attendanceRate.hasData ? (
          <DashboardMiniStat label="Attendance rate" value={`${attendanceRate.value}%`} tone="neutral" />
        ) : null}
      </Box>
      ) : null}

      <KpiMonthlyChartsSection
        title="Monthly KPI Statistics"
        rows={monthlyChartRows}
        buildSeries={buildQualityMonthlySeries}
        barColor="#2563eb"
        headerColor={QUALITY_HEADER}
        exportMode={exportMode}
        breakBefore
      />

      <QualityChartSection icon={Users} title="Quality — Board Composition & Attendance" exportMode={exportMode}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
            gap: 2,
          }}
        >
          <ChartPanel
            title="Board Gender Composition"
            subtitle="YTD average headcount"
            emptyMessage="Enter male and female board member monthly values."
          >
            {showGenderPie ? (
              <DashboardChartBox pdfChart={exportMode} height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderPie}
                      dataKey="value"
                      nameKey="name"
                      cx="42%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={0}
                      paddingAngle={2}
                    >
                      {genderPie.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={GENDER_COLORS[index % GENDER_COLORS.length]}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<DashboardChartTooltip />} />
                    <Legend
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      iconType="circle"
                      wrapperStyle={{ fontSize: 12, paddingLeft: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </DashboardChartBox>
            ) : null}
          </ChartPanel>

          <ChartPanel
            title="Board Member Distribution"
            subtitle="Headcount (YTD average)"
            emptyMessage="Enter board composition monthly values."
          >
            {showBoardBars ? (
              <DashboardChartBox pdfChart={exportMode} height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={boardBars}
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                    barCategoryGap={12}
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
                      width={130}
                      tick={{ fontSize: 11, fill: T.inkMid }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<DashboardChartTooltip />} cursor={{ fill: "rgba(124, 58, 237, 0.06)" }} />
                    <Legend
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      iconType="square"
                      wrapperStyle={{ fontSize: 12, paddingLeft: 8 }}
                    />
                    <Bar
                      dataKey="value"
                      name="Headcount"
                      fill={BOARD_BAR_COLOR}
                      radius={[0, 4, 4, 0]}
                      barSize={22}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </DashboardChartBox>
            ) : null}
          </ChartPanel>
        </Box>

        {showAttendancePie ? (
          <Box sx={{ mt: 2 }}>
            <ChartPanel title="Board Attendance" subtitle="Members attended vs absent (%)">
              <DashboardChartBox pdfChart={exportMode} height={280}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attendancePie}
                      dataKey="value"
                      nameKey="name"
                      cx="42%"
                      cy="50%"
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {attendancePie.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={ATTENDANCE_COLORS[index % ATTENDANCE_COLORS.length]}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<DashboardChartTooltip />} />
                    <Legend
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      iconType="circle"
                      wrapperStyle={{ fontSize: 12, paddingLeft: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </DashboardChartBox>
            </ChartPanel>
          </Box>
        ) : null}
      </QualityChartSection>

      <QualityChartSection icon={Scale} title="Governance — Lawsuits & Whistleblower Cases" exportMode={exportMode}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
            gap: 2,
          }}
        >
          <ChartPanel
            title="Governance — Lawsuits & Whistleblower Cases"
            subtitle="Cases per month"
            emptyMessage="Enter lawsuits and whistleblower monthly values."
          >
            {showGovernance ? (
              <DashboardChartBox pdfChart={exportMode} height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={governanceData} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                    <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={axisTick}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      label={{
                        value: "Cases",
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
                      dataKey="lawsuits"
                      name="Lawsuits"
                      stroke={LAWSUITS_COLOR}
                      strokeWidth={3}
                      dot={{ r: 3, fill: LAWSUITS_COLOR, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="whistleblower"
                      name="Whistleblower"
                      stroke={WHISTLEBLOWER_COLOR}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: WHISTLEBLOWER_COLOR, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </DashboardChartBox>
            ) : null}
          </ChartPanel>

          <ChartPanel
            title="Monthly Board Meetings"
            subtitle="Meetings held per month"
            emptyMessage="Enter board meeting monthly values."
          >
            {showMeetings ? (
              <DashboardChartBox pdfChart={exportMode} height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={meetingsData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
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
                      name="Board Meetings"
                      stroke={MEETINGS_COLOR}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: MEETINGS_COLOR, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </DashboardChartBox>
            ) : null}
          </ChartPanel>
        </Box>
      </QualityChartSection>
    </Box>
  );
}
