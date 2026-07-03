import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  Building2,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ClipboardList,
  TrendingUp,
  Shield,
  BarChart3,
  ListOrdered,
} from "lucide-react";
import { useSectionDashboardStatsQuery } from "../hooks/useDashboardQueries";
import {
  DASHBOARD_THEME,
  DashboardCard,
  DashboardChartBox,
  DashboardChartTooltip,
  DashboardMiniStat,
  DashboardSectionHeader,
  DashboardSkeleton,
  DashboardStatCard,
} from "./dashboard/dashboardUi";

const T = DASHBOARD_THEME;

function sectionStatCards(sectionKey, stats) {
  const s = stats || {};
  const cards = [
    { key: "sites", icon: Building2, label: "Total sites", value: s.totalSites, color: "blue" },
    { key: "forms", icon: FileText, label: "Forms completed", value: s.totalFormsCompleted, color: "green" },
    { key: "month", icon: TrendingUp, label: "This month", value: s.formsThisMonth, color: "brand" },
    { key: "noncon", icon: AlertTriangle, label: "Nonconformances", value: s.totalNonconformances, color: "red" },
    { key: "pending", icon: Clock, label: "Pending actions", value: s.pendingNonconformances, color: "amber" },
    { key: "sent", icon: CheckCircle2, label: "Responses sent", value: s.sentNonconformances, color: "green" },
    { key: "my-open", icon: ClipboardList, label: "Assigned to you", value: s.myOpenActions, color: "purple" },
  ];

  if (sectionKey === "ohs") {
    cards.splice(3, 0, {
      key: "sheq",
      icon: Shield,
      label: "SHEQ forms",
      value: s.sheqForms,
      color: "navy",
    });
    cards.splice(4, 0, {
      key: "concerns",
      icon: AlertTriangle,
      label: "H&S concern reports",
      value: s.concernReports,
      color: "red",
    });
  } else if (sectionKey === "environmental" || sectionKey === "quality") {
    cards.splice(3, 0, {
      key: "concerns",
      icon: AlertTriangle,
      label: sectionKey === "environmental" ? "Sustainability reports" : "Quality reports",
      value: s.concernReports,
      color: "red",
    });
  }

  return cards;
}

export default function MonitoringDashboardOverview({ sectionKey }) {
  const {
    data,
    isLoading: loading,
    error: queryError,
  } = useSectionDashboardStatsQuery(sectionKey);
  const error =
    queryError?.response?.data?.message ||
    queryError?.message ||
    (data && !data.success ? data.message || "Could not load overview" : "");

  const cards = useMemo(
    () => sectionStatCards(sectionKey, data?.stats),
    [sectionKey, data?.stats]
  );

  const areaData = data?.charts?.areaChartData || [];
  const barData = (data?.charts?.barChartData || []).map((row) => ({
    ...row,
    fullName: row.name,
    name: row.name?.length > 22 ? `${row.name.substring(0, 22)}…` : row.name,
  }));
  const recent = data?.recentSubmissions || [];
  const stats = data?.stats || {};
  const maxAreaValue = Math.max(1, ...areaData.map((d) => d.completed || 0));
  const maxBar = Math.max(1, ...barData.map((d) => d.value || 0));
  const scopeLabel = data?.scope?.label || "Your data";

  return (
    <div>
      {error && !loading ? (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            borderRadius: 8,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {cards.map((card) => (
          <DashboardStatCard
            key={card.key}
            icon={card.icon}
            color={card.color}
            label={card.label}
            value={card.value}
            loading={loading}
          />
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 520px), 1fr))",
          gap: 16,
        }}
      >
        <DashboardCard>
          <DashboardSectionHeader
            icon={TrendingUp}
            title="Forms completed (last 6 months)"
            hint={`${scopeLabel} — monthly submission trend.`}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 10,
              marginBottom: 18,
            }}
          >
            <DashboardMiniStat
              label="Total forms completed"
              value={stats.totalFormsCompleted}
              loading={loading}
              tone="green"
            />
            <DashboardMiniStat
              label="This month"
              value={stats.formsThisMonth}
              loading={loading}
              tone="brand"
            />
            <DashboardMiniStat
              label="Total sites"
              value={stats.totalSites}
              loading={loading}
              tone="blue"
            />
          </div>

          {loading ? (
            <DashboardSkeleton height={300} />
          ) : areaData.length === 0 ? (
            <div
              style={{
                height: 280,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: T.inkFaint,
                fontSize: 14,
              }}
            >
              No submissions yet.
            </div>
          ) : (
            <DashboardChartBox height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`sectionAreaGrad-${sectionKey}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={T.brand} stopOpacity={0.22} />
                      <stop offset="95%" stopColor={T.brand} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={T.border} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: T.inkFaint, fontSize: 12 }}
                    padding={{ left: 8, right: 8 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    domain={[0, Math.max(4, maxAreaValue + 1)]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: T.inkFaint, fontSize: 12 }}
                    width={36}
                  />
                  <Tooltip content={<DashboardChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Forms"
                    stroke={T.brand}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill={`url(#sectionAreaGrad-${sectionKey})`}
                    dot={{ r: 3, fill: T.brand }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </DashboardChartBox>
          )}
        </DashboardCard>

        <DashboardCard>
          <DashboardSectionHeader
            icon={BarChart3}
            title="By form type"
            hint="Top form types by submission count."
          />

          {loading ? (
            <DashboardSkeleton height={300} />
          ) : barData.length === 0 ? (
            <div
              style={{
                height: 280,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: T.inkFaint,
                fontSize: 14,
              }}
            >
              No data yet.
            </div>
          ) : (
            <DashboardChartBox height={Math.min(420, Math.max(280, barData.length * 44))}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={barData}
                  margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  barCategoryGap={10}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={T.border} />
                  <XAxis
                    type="number"
                    domain={[0, maxBar]}
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: T.inkFaint }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={148}
                    tick={{ fontSize: 12, fill: T.inkMid }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={<DashboardChartTooltip />}
                    cursor={{ fill: "rgba(37, 99, 235, 0.06)" }}
                  />
                  <Bar dataKey="value" name="Count" fill={T.blue} radius={[0, 6, 6, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </DashboardChartBox>
          )}
        </DashboardCard>

        <DashboardCard style={{ gridColumn: "1 / -1" }}>
          <DashboardSectionHeader
            icon={ListOrdered}
            title="Recent submissions"
            hint="Latest forms submitted in this monitoring area."
          />

          {loading ? (
            <DashboardSkeleton height={120} />
          ) : recent.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: T.inkFaint, padding: "8px 0" }}>
              No recent forms in this section.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recent.map((row) => (
                <div
                  key={row.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    padding: "12px 14px",
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    background: "#fafaf8",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        fontWeight: 600,
                        color: T.ink,
                      }}
                    >
                      {row.title}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: T.inkFaint }}>{row.category}</p>
                  </div>
                  <span style={{ fontSize: 12, color: T.inkFaint, whiteSpace: "nowrap", flexShrink: 0 }}>
                    {row.date}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
      </div>
    </div>
  );
}
