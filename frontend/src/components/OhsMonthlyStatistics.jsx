import React, { useCallback } from "react";
import { Box, Button, IconButton } from "@mui/material";
import { BarChart3, Plus, Trash2, Users } from "lucide-react";
import { DASHBOARD_THEME } from "./dashboard/dashboardUi";
import {
  OHS_EMPLOYEE_AGE_CATEGORIES,
  OHS_EMPLOYEE_RANK_CATEGORIES,
  OHS_MONTHS,
  emptyOhsMonths,
  formatOhsYtdDisplay,
  hasOhsMonthData,
  sumOhsYtd,
} from "../utils/ohsDashboardUtils";

const T = DASHBOARD_THEME;

function newStatRow() {
  return {
    id: `stat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    indicator: "",
    months: emptyOhsMonths(),
  };
}

const thDark = {
  padding: "10px 8px",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#fff",
  background: "#111827",
  borderRight: "1px solid #374151",
  whiteSpace: "nowrap",
  textAlign: "center",
};

const tdBase = {
  padding: 0,
  borderRight: "1px solid #d1d5db",
  borderBottom: "1px solid #d1d5db",
  verticalAlign: "middle",
};

function MonthInput({ value, onChange }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="—"
      style={{
        width: "100%",
        border: "none",
        outline: "none",
        background: "#eff6ff",
        color: "#1d4ed8",
        fontWeight: 600,
        fontFamily: "inherit",
        fontSize: 12,
        padding: "8px 6px",
        boxSizing: "border-box",
        textAlign: "center",
      }}
    />
  );
}

function SectionBanner({ icon: Icon, title, color = "#16a34a" }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 2,
        py: 1.25,
        bgcolor: color,
        color: "#fff",
        borderRadius: "8px 8px 0 0",
        border: `1px solid ${color}`,
        borderBottom: "none",
      }}
    >
      <Icon size={18} strokeWidth={2.5} />
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.05em" }}>{title}</span>
    </Box>
  );
}

function DistributionTable({ categories, values, onChange }) {
  return (
    <Box
      sx={{
        overflowX: "auto",
        border: "1px solid #d1d5db",
        borderRadius: "0 0 8px 8px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        mb: 3,
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: 720,
          background: "#fff",
        }}
      >
        <thead>
          <tr>
            {categories.map((cat) => (
              <th key={cat.key} style={thDark}>
                {cat.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {categories.map((cat) => (
              <td key={cat.key} style={tdBase}>
                <input
                  type="text"
                  value={values[cat.key] || ""}
                  onChange={(e) => onChange(cat.key, e.target.value)}
                  placeholder="0"
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: "#eff6ff",
                    color: "#2563eb",
                    fontWeight: 600,
                    fontFamily: "inherit",
                    fontSize: 13,
                    padding: "12px 8px",
                    boxSizing: "border-box",
                    textAlign: "center",
                  }}
                />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </Box>
  );
}

export default function OhsMonthlyStatistics({
  rows,
  onRowsChange,
  classification,
  onClassificationChange,
}) {
  const updateMonth = useCallback(
    (rowId, monthKey, value) => {
      onRowsChange((prev) =>
        prev.map((row) =>
          row.id === rowId ? { ...row, months: { ...row.months, [monthKey]: value } } : row
        )
      );
    },
    [onRowsChange]
  );

  const updateIndicator = useCallback(
    (rowId, value) => {
      onRowsChange((prev) =>
        prev.map((row) => (row.id === rowId ? { ...row, indicator: value } : row))
      );
    },
    [onRowsChange]
  );

  const addRow = () => onRowsChange((prev) => [...prev, newStatRow()]);

  const removeRow = (id) => {
    onRowsChange((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.id !== id)));
  };

  const updateRank = (key, value) => {
    onClassificationChange((prev) => ({
      ...prev,
      rank: { ...prev.rank, [key]: value },
    }));
  };

  const updateAge = (key, value) => {
    onClassificationChange((prev) => ({
      ...prev,
      age: { ...prev.age, [key]: value },
    }));
  };

  return (
    <Box sx={{ mb: 3 }}>
      <SectionBanner icon={BarChart3} title="SECTION 1 — OHS STATISTICS" />

      <Box
        sx={{
          overflowX: "auto",
          border: "1px solid #d1d5db",
          borderRadius: "0 0 8px 8px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          mb: 3,
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 1100,
            background: "#fff",
          }}
        >
          <thead>
            <tr>
              <th style={{ ...thDark, width: 36, background: "#fef9c3", color: "#a16207" }}>#</th>
              <th style={{ ...thDark, textAlign: "left", minWidth: 260 }}>Indicator</th>
              {OHS_MONTHS.map((m) => (
                <th key={m.key} style={{ ...thDark, width: 64 }}>
                  {m.label}
                </th>
              ))}
              <th style={{ ...thDark, width: 72, background: "#14532d", borderRight: "none" }}>
                YTD
              </th>
              <th style={{ ...thDark, width: 36, borderRight: "none" }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const hasData = hasOhsMonthData(row.months);
              const ytd = sumOhsYtd(row.months);
              return (
                <tr key={row.id} style={{ background: index % 2 === 0 ? "#fff" : "#fafaf8" }}>
                  <td
                    style={{
                      ...tdBase,
                      textAlign: "center",
                      background: "#fef9c3",
                      color: "#a16207",
                      fontWeight: 700,
                      fontSize: 12,
                      padding: "8px 4px",
                    }}
                  >
                    {index + 1}
                  </td>
                  <td style={tdBase}>
                    <input
                      type="text"
                      value={row.indicator || ""}
                      onChange={(e) => updateIndicator(row.id, e.target.value)}
                      placeholder="Indicator name"
                      style={{
                        width: "100%",
                        border: "none",
                        outline: "none",
                        background: "#fff",
                        color: T.ink,
                        fontWeight: 500,
                        fontFamily: "inherit",
                        fontSize: 12,
                        padding: "8px 10px",
                        boxSizing: "border-box",
                      }}
                    />
                  </td>
                  {OHS_MONTHS.map((m) => (
                    <td key={m.key} style={tdBase}>
                      <MonthInput
                        value={row.months[m.key] || ""}
                        onChange={(v) => updateMonth(row.id, m.key, v)}
                      />
                    </td>
                  ))}
                  <td
                    style={{
                      ...tdBase,
                      borderRight: "none",
                      background: "#dcfce7",
                      color: "#15803d",
                      fontWeight: 700,
                      fontSize: 12,
                      textAlign: "center",
                      padding: "8px 6px",
                    }}
                  >
                    {formatOhsYtdDisplay(ytd, hasData)}
                  </td>
                  <td style={{ ...tdBase, borderRight: "none", textAlign: "center" }}>
                    <IconButton
                      size="small"
                      aria-label="Remove row"
                      onClick={() => removeRow(row.id)}
                      sx={{ color: "#9ca3af" }}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Box>

      <Box sx={{ mb: 1.5, display: "flex", justifyContent: "flex-start" }}>
        <Button
          startIcon={<Plus size={16} />}
          onClick={addRow}
          size="small"
          sx={{ textTransform: "none", color: T.inkMid }}
        >
          Add statistic row
        </Button>
      </Box>

      <SectionBanner
        icon={Users}
        title="Employee Rank Distribution"
        color="#111827"
      />
      <DistributionTable
        categories={OHS_EMPLOYEE_RANK_CATEGORIES}
        values={classification.rank}
        onChange={updateRank}
      />

      <SectionBanner icon={Users} title="Employee Age Distribution" color="#111827" />
      <DistributionTable
        categories={OHS_EMPLOYEE_AGE_CATEGORIES}
        values={classification.age}
        onChange={updateAge}
      />

      <p style={{ margin: "10px 0 0", fontSize: 12, color: T.inkFaint }}>
        Enter monthly values for each indicator. Employee rank and age distributions are entered
        separately; the scorecard and charts update automatically from your YTD totals.
      </p>
    </Box>
  );
}
