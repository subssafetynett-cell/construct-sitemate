import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DASHBOARD_THEME, DashboardChartBox, DashboardChartTooltip } from "./dashboardUi";
import { computeYAxisMax } from "../../utils/kpiChartUtils";

const T = DASHBOARD_THEME;
const DEFAULT_BAR = "#2563eb";
const GRID = "#e5e7eb";
const AXIS_TICK = { fontSize: 11, fill: T.inkFaint };

export default function KpiMonthlyBarChart({
  title,
  data,
  seriesName = "Value",
  color = DEFAULT_BAR,
  height = 300,
  exportMode = false,
}) {
  const yMax = useMemo(() => computeYAxisMax(data), [data]);
  const tickCount = 5;

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        background: "#fff",
        padding: 16,
        minWidth: 0,
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <p
        style={{
          margin: "0 0 12px",
          fontSize: 14,
          fontWeight: 700,
          color: T.ink,
          textAlign: "center",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </p>
      <DashboardChartBox height={height} pdfChart={exportMode}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 72, left: 4, bottom: 8 }}
            barCategoryGap="18%"
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
            <XAxis
              dataKey="month"
              tick={AXIS_TICK}
              axisLine={{ stroke: GRID }}
              tickLine={false}
              interval={0}
            />
            <YAxis
              domain={[0, yMax]}
              tickCount={tickCount}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              allowDecimals={yMax < 10}
            />
            <Tooltip content={<DashboardChartTooltip />} cursor={{ fill: `${color}14` }} />
            <Legend
              layout="vertical"
              verticalAlign="middle"
              align="right"
              iconType="square"
              iconSize={10}
              wrapperStyle={{ fontSize: 12, paddingLeft: 4, lineHeight: "18px" }}
            />
            <Bar
              dataKey="value"
              name={seriesName}
              fill={color}
              radius={[2, 2, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </DashboardChartBox>
    </div>
  );
}
