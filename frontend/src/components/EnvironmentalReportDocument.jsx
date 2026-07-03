import React, { useMemo } from "react";
import {
  ENV_MONTHS,
  ENV_WASTE_CATEGORIES,
  buildEnvironmentalScorecardRows,
  buildWasteSummary,
  envScorecardVarianceStatus,
  formatOhsYtdDisplay,
  hasOhsMonthData,
  isEnvStatRow,
  sumOhsYtd,
} from "../utils/environmentalDashboardUtils";

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

export default function EnvironmentalReportDocument({
  statRows,
  waste,
  targets,
  organisationName,
  savedAt,
}) {
  const reportRows = useMemo(() => statRows.filter(isEnvStatRow), [statRows]);
  const scorecardRows = useMemo(
    () => buildEnvironmentalScorecardRows(statRows, targets),
    [statRows, targets]
  );
  const wasteSummary = useMemo(() => buildWasteSummary(waste), [waste]);

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
          Environmental Management Report
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
              background: "#16a34a",
              color: "#fff",
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            SECTION 1 — ENVIRONMENTAL STATISTICS
          </div>
          <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", border: "1px solid #d1d5db" }}>
            <thead>
              <tr>
                <th style={{ ...thDark, width: 28, background: "#fef9c3", color: "#a16207" }}>#</th>
                <th style={{ ...thDark, textAlign: "left" }}>Indicator</th>
                {ENV_MONTHS.map((m) => (
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
                const hasData = hasOhsMonthData(row.months);
                const ytd = sumOhsYtd(row.months);
                return (
                  <tr key={row.id} style={{ background: index % 2 === 0 ? "#fff" : "#fafaf8" }}>
                    <td style={{ ...cell, textAlign: "center", background: "#fef9c3", fontWeight: 700 }}>
                      {index + 1}
                    </td>
                    <td style={{ ...cell, textAlign: "left" }}>
                      {String(row.indicator || "").trim() || "—"}
                    </td>
                    {ENV_MONTHS.map((m) => (
                      <td key={m.key} style={{ ...cell, textAlign: "center", color: "#1d4ed8", fontWeight: 600 }}>
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
                      {formatOhsYtdDisplay(ytd, hasData)}
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
          WASTE GENERATION & DISPOSAL — ANNUAL SNAPSHOT (KGs)
        </div>
        <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", border: "1px solid #d1d5db" }}>
          <thead>
            <tr>
              {ENV_WASTE_CATEGORIES.map((cat) => (
                <th key={cat.key} style={thDark}>
                  {cat.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {ENV_WASTE_CATEGORIES.map((cat) => (
                <td
                  key={cat.key}
                  style={{
                    ...cell,
                    textAlign: "center",
                    background: "#dcfce7",
                    color: "#15803d",
                    fontWeight: 700,
                  }}
                >
                  {waste?.[cat.key] || "—"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {wasteSummary.hasData ? (
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
            WASTE BREAKDOWN — % OF TOTAL
          </div>
          <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", border: "1px solid #d1d5db" }}>
            <thead>
              <tr>
                <th style={{ ...thDark, textAlign: "left" }}>Waste type</th>
                <th style={{ ...thDark, width: 90 }}>Weight (KGs)</th>
                <th style={{ ...thDark, width: 80, borderRight: "none" }}>% of total</th>
              </tr>
            </thead>
            <tbody>
              {wasteSummary.rows.map((row, index) => (
                <tr key={row.key} style={{ background: index % 2 === 0 ? "#fff" : "#fafaf8" }}>
                  <td style={{ ...cell, textAlign: "left" }}>{row.label}</td>
                  <td style={{ ...cell, textAlign: "right", fontWeight: 600 }}>{row.kg}</td>
                  <td style={{ ...cell, borderRight: "none", textAlign: "right" }}>{row.pct}</td>
                </tr>
              ))}
              <tr style={{ background: "#f3f4f6", fontWeight: 700 }}>
                <td style={{ ...cell, textAlign: "left" }}>Total</td>
                <td style={{ ...cell, textAlign: "right" }}>{wasteSummary.total}</td>
                <td style={{ ...cell, borderRight: "none", textAlign: "right" }}>100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}

      <div data-pdf-block>
        <div
          style={{
            background: "#16a34a",
            color: "#fff",
            padding: "8px 12px",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.05em",
          }}
        >
          ENVIRONMENTAL SCORECARD
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
              const { style: v, status: statusKey } = envScorecardVarianceStatus(
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
