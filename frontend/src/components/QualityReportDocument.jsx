import React, { useMemo } from "react";
import {
  QUALITY_ATTENDANCE_FIELDS,
  QUALITY_MONTHS,
  buildQualityScorecardRows,
  computeQualityYtd,
  isQualityStatRow,
  qualityScorecardVarianceStatus,
} from "../utils/qualityDashboardUtils";

const thDark = {
  padding: "8px 6px",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#fff",
  background: "#111827",
  borderRight: "1px solid #374151",
  textAlign: "center",
};

const cell = {
  padding: "6px 8px",
  fontSize: 11,
  borderRight: "1px solid #d1d5db",
  borderBottom: "1px solid #d1d5db",
  color: "#111827",
};

export default function QualityReportDocument({
  statRows,
  attendance,
  targets,
  organisationName,
  savedAt,
}) {
  const reportRows = useMemo(() => statRows.filter(isQualityStatRow), [statRows]);
  const scorecardRows = useMemo(
    () => buildQualityScorecardRows(statRows, targets, attendance),
    [statRows, targets, attendance]
  );

  const reportDate = savedAt
    ? new Date(savedAt).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

  const year = new Date().getFullYear();

  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        background: "#fff",
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        color: "#111827",
        padding: 24,
      }}
    >
      <div data-pdf-block style={{ marginBottom: 20 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700 }}>
          Quality Management Report
        </h1>
        <p style={{ margin: 0, fontSize: 12, color: "#4b5563" }}>
          {organisationName ? `${organisationName} · ` : ""}
          Reporting year {year} · Generated {reportDate}
        </p>
      </div>

      {reportRows.length > 0 ? (
        <div data-pdf-block style={{ marginBottom: 24 }}>
          <div
            style={{
              background: "#7c3aed",
              color: "#fff",
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            SECTION 1 — QUALITY STATISTICS
          </div>
          <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", border: "1px solid #d1d5db" }}>
            <thead>
              <tr>
                <th style={{ ...thDark, width: 28, background: "#fef9c3", color: "#a16207" }}>#</th>
                <th style={{ ...thDark, textAlign: "left" }}>Indicator</th>
                {QUALITY_MONTHS.map((m) => (
                  <th key={m.key} style={{ ...thDark }}>
                    {m.label}
                  </th>
                ))}
                <th style={{ ...thDark, width: 56, background: "#14532d", borderRight: "none" }}>
                  YTD
                </th>
              </tr>
            </thead>
            <tbody>
              {reportRows.map((row, index) => {
                const ytd = computeQualityYtd(row);
                return (
                  <tr key={row.id} style={{ background: index % 2 === 0 ? "#fff" : "#fafaf8" }}>
                    <td style={{ ...cell, textAlign: "center", background: "#fef9c3", fontWeight: 700 }}>
                      {index + 1}
                    </td>
                    <td style={{ ...cell, textAlign: "left" }}>
                      {String(row.indicator || "").trim() || "—"}
                    </td>
                    {QUALITY_MONTHS.map((m) => (
                      <td
                        key={m.key}
                        style={{
                          ...cell,
                          textAlign: "center",
                          color: "#6d28d9",
                          fontWeight: 600,
                          background: "#ede9fe",
                        }}
                      >
                        {row.months?.[m.key] || "—"}
                      </td>
                    ))}
                    <td
                      style={{
                        ...cell,
                        borderRight: "none",
                        textAlign: "center",
                        background: "#dcfce7",
                        color: "#15803d",
                        fontWeight: 700,
                      }}
                    >
                      {ytd.display}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <div data-pdf-block style={{ marginBottom: 24 }}>
        <div
          style={{
            background: "#111827",
            color: "#fff",
            padding: "8px 12px",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.05em",
          }}
        >
          BOARD ATTENDANCE RATE
        </div>
        <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", border: "1px solid #d1d5db" }}>
          <thead>
            <tr>
              {QUALITY_ATTENDANCE_FIELDS.map((field) => (
                <th key={field.key} style={thDark}>
                  {field.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {QUALITY_ATTENDANCE_FIELDS.map((field) => (
                <td
                  key={field.key}
                  style={{
                    ...cell,
                    textAlign: "center",
                    background: "#ede9fe",
                    color: "#6d28d9",
                    fontWeight: 700,
                  }}
                >
                  {attendance?.[field.key] ? `${attendance[field.key]}%` : "—"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div data-pdf-block>
        <div
          style={{
            background: "#7c3aed",
            color: "#fff",
            padding: "8px 12px",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.05em",
          }}
        >
          QUALITY SCORECARD
        </div>
        <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", border: "1px solid #d1d5db" }}>
          <thead>
            <tr>
              <th style={{ ...thDark, textAlign: "left" }}>Indicator</th>
              <th style={{ ...thDark, width: 72 }}>Target</th>
              <th style={{ ...thDark, width: 72 }}>Actual (YTD)</th>
              <th style={{ ...thDark, width: 64 }}>Unit</th>
              <th style={{ ...thDark, width: 72 }}>Variance</th>
              <th style={{ ...thDark, width: 80 }}>Status</th>
              <th style={{ ...thDark, width: 120, borderRight: "none" }}>Note</th>
            </tr>
          </thead>
          <tbody>
            {scorecardRows.map((row, index) => {
              const { style: v, status: statusKey } = qualityScorecardVarianceStatus(
                row.target,
                row.actual,
                row.lowerBetter
              );
              const status =
                statusKey === "pending"
                  ? "—"
                  : statusKey === "onTrack"
                    ? "On Track"
                    : "Off Target";

              return (
                <tr key={row.id} style={{ background: index % 2 === 0 ? "#fff" : "#fafaf8" }}>
                  <td style={{ ...cell, textAlign: "left" }}>{row.indicator}</td>
                  <td style={{ ...cell, textAlign: "right", color: "#c2410c", fontWeight: 600 }}>
                    {row.target || "—"}
                  </td>
                  <td style={{ ...cell, textAlign: "right", color: "#1d4ed8", fontWeight: 600 }}>
                    {row.actual || "—"}
                  </td>
                  <td style={{ ...cell, textAlign: "center" }}>{row.unit || "—"}</td>
                  <td
                    style={{
                      ...cell,
                      textAlign: "right",
                      fontWeight: 700,
                      background: v.bg,
                      color: v.color,
                    }}
                  >
                    {v.label}
                  </td>
                  <td
                    style={{
                      ...cell,
                      textAlign: "center",
                      fontWeight: 600,
                      color: v.onTrack == null ? "#6b7280" : v.onTrack ? "#15803d" : "#b91c1c",
                    }}
                  >
                    {status}
                  </td>
                  <td style={{ ...cell, borderRight: "none", fontSize: 10 }}>{row.note || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
