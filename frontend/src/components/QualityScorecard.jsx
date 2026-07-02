import React, { useMemo } from "react";
import { Box } from "@mui/material";
import { Scale } from "lucide-react";
import { DASHBOARD_THEME } from "./dashboard/dashboardUi";
import KpiStatusBadge, { kpiStatusCellStyle } from "./dashboard/KpiStatusBadge";
import {
  buildQualityScorecardRows,
  qualityScorecardVarianceStatus,
} from "../utils/qualityDashboardUtils";

const T = DASHBOARD_THEME;
const PURPLE = "#7c3aed";

const thStyle = {
  padding: "10px 12px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#fff",
  background: "#111827",
  borderRight: "1px solid #374151",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: 0,
  borderRight: "1px solid #d1d5db",
  borderBottom: "1px solid #d1d5db",
  verticalAlign: "middle",
};

function cellInputStyle({ editable, tone }) {
  const toneStyles = {
    target: { bg: "#fffbeb", color: "#c2410c", fontWeight: 600 },
    actual: { bg: "#eff6ff", color: "#1d4ed8", fontWeight: 600 },
    default: { bg: "#fff", color: T.ink, fontWeight: 400 },
    readonly: { bg: "#f9fafb", color: T.inkMid, fontWeight: 500 },
    note: { bg: "#fff", color: T.inkMid, fontWeight: 400 },
  };
  const t = toneStyles[tone] || toneStyles.default;

  return {
    width: "100%",
    border: "none",
    outline: "none",
    background: t.bg,
    fontFamily: "inherit",
    fontSize: 13,
    fontWeight: t.fontWeight,
    padding: "10px 12px",
    boxSizing: "border-box",
    color: t.color,
    cursor: editable ? "text" : "default",
  };
}

function ScorecardCell({ value, onChange, placeholder, editable = true, tone = "readonly", align = "left" }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={!editable}
      style={{ ...cellInputStyle({ editable, tone }), textAlign: align }}
    />
  );
}

export default function QualityScorecard({ statRows, targets, attendance, onUpdateTarget }) {
  const rows = useMemo(
    () => buildQualityScorecardRows(statRows, targets, attendance),
    [statRows, targets, attendance]
  );

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          borderRadius: "8px 8px 0 0",
          overflow: "hidden",
          border: "1px solid #c4b5fd",
          borderBottom: "none",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 2,
            py: 1.25,
            bgcolor: PURPLE,
            color: "#fff",
          }}
        >
          <Scale size={18} strokeWidth={2.5} />
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.06em" }}>
            QUALITY SCORECARD
          </span>
        </Box>
      </Box>

      <Box
        sx={{
          overflowX: "auto",
          border: "1px solid #d1d5db",
          borderRadius: "0 0 8px 8px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 980,
            background: "#fff",
          }}
        >
          <thead>
            <tr>
              <th style={thStyle}>Indicator</th>
              <th style={{ ...thStyle, width: 110, textAlign: "right" }}>Target</th>
              <th style={{ ...thStyle, width: 110, textAlign: "right" }}>Actual (YTD)</th>
              <th style={{ ...thStyle, width: 90 }}>Unit</th>
              <th style={{ ...thStyle, width: 100, textAlign: "right" }}>Variance</th>
              <th style={{ ...thStyle, width: 110 }}>Status</th>
              <th style={{ ...thStyle, width: 160, borderRight: "none" }}>Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const { style: v, status } = qualityScorecardVarianceStatus(
                row.target,
                row.actual,
                row.lowerBetter
              );
              const rowBg = index % 2 === 0 ? "#fff" : "#fafaf8";

              return (
                <tr key={row.id} style={{ background: rowBg }}>
                  <td style={tdStyle}>
                    <ScorecardCell
                      value={row.indicator}
                      onChange={(val) => onUpdateTarget(row.id, "indicator", val)}
                      placeholder="Indicator"
                      editable
                      tone="default"
                    />
                  </td>
                  <td style={tdStyle}>
                    <ScorecardCell
                      value={row.target}
                      onChange={(val) => onUpdateTarget(row.id, "target", val)}
                      placeholder="0"
                      editable
                      tone="target"
                      align="right"
                    />
                  </td>
                  <td style={tdStyle}>
                    <ScorecardCell value={row.actual} editable={false} tone="actual" align="right" />
                  </td>
                  <td style={tdStyle}>
                    <ScorecardCell
                      value={row.unit}
                      onChange={(val) => onUpdateTarget(row.id, "unit", val)}
                      placeholder="Unit"
                      editable
                      tone="readonly"
                    />
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      background: v.bg,
                      textAlign: "right",
                      fontWeight: 700,
                      fontSize: 13,
                      color: v.color,
                      padding: "10px 12px",
                    }}
                  >
                    {v.label}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                      padding: "10px 8px",
                      ...kpiStatusCellStyle(status, rowBg),
                    }}
                  >
                    <KpiStatusBadge status={status} />
                  </td>
                  <td style={{ ...tdStyle, borderRight: "none" }}>
                    <ScorecardCell
                      value={row.note}
                      onChange={(val) => onUpdateTarget(row.id, "note", val)}
                      placeholder="Note"
                      editable
                      tone="note"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Box>
    </Box>
  );
}
