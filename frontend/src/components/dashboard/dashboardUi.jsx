import React from "react";

export const DASHBOARD_THEME = {
  bg: "#f4f4f2",
  surface: "#ffffff",
  border: "#e5e5e2",
  ink: "#141413",
  inkMid: "#5c5c59",
  inkFaint: "#8a8a86",
  blue: "#2563eb",
  green: "#16a34a",
  amber: "#d97706",
  red: "#dc2626",
  purple: "#7c3aed",
  brand: "#E89F17",
  radiusLg: "12px",
  shadow: "0 1px 2px rgba(0,0,0,0.05)",
};

const T = DASHBOARD_THEME;

const COLOR_MAP = {
  blue: { bg: "#eff6ff", icon: "#2563eb", border: "#bfdbfe" },
  green: { bg: "#f0fdf4", icon: "#16a34a", border: "#bbf7d0" },
  red: { bg: "#fef2f2", icon: "#dc2626", border: "#fecaca" },
  amber: { bg: "#fffbeb", icon: "#d97706", border: "#fde68a" },
  purple: { bg: "#f5f3ff", icon: "#7c3aed", border: "#ddd6fe" },
  brand: { bg: "#fff8eb", icon: "#E89F17", border: "#fde68a" },
  navy: { bg: "#eff6ff", icon: "#0B4DA6", border: "#bfdbfe" },
};

export function DashboardCard({ children, style = {} }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radiusLg,
        boxShadow: T.shadow,
        padding: "20px 22px",
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function DashboardStatCard({ icon: Icon, color = "blue", label, value, loading }) {
  const c = COLOR_MAP[color] || COLOR_MAP.blue;
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radiusLg,
        boxShadow: T.shadow,
        padding: "18px 20px",
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        minWidth: 0,
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: c.bg,
          border: `1px solid ${c.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={20} color={c.icon} strokeWidth={2} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 600,
            color: T.inkFaint,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </p>
        {loading ? (
          <div
            style={{
              width: 56,
              height: 26,
              background: "#ecece9",
              borderRadius: 6,
              marginTop: 8,
            }}
          />
        ) : (
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 28,
              fontWeight: 700,
              color: T.ink,
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            {value ?? 0}
          </p>
        )}
      </div>
    </div>
  );
}

export function DashboardSectionHeader({ icon: Icon, title, hint }) {
  return (
    <div style={{ marginBottom: hint ? 16 : 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {Icon ? <Icon size={18} color={T.inkMid} strokeWidth={2} /> : null}
        <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{title}</span>
      </div>
      {hint ? (
        <p style={{ margin: "6px 0 0 26px", fontSize: 12, color: T.inkFaint }}>{hint}</p>
      ) : null}
    </div>
  );
}

export function DashboardChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const header = row?.fullName ?? label;
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: "10px 12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      }}
    >
      {header ? (
        <p style={{ margin: "0 0 6px", fontSize: 11, color: T.inkFaint, fontWeight: 600 }}>{header}</p>
      ) : null}
      {payload.map((entry, i) => (
        <p key={i} style={{ margin: 0, fontSize: 13, color: T.ink, fontWeight: 600 }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export function DashboardChartBox({ height, children, pdfChart = false }) {
  return (
    <div
      data-pdf-chart={pdfChart ? true : undefined}
      style={{ width: "100%", minWidth: 0, height, position: "relative" }}
    >
      {children}
    </div>
  );
}

export function DashboardMiniStat({ label, value, loading, tone = "neutral" }) {
  const tones = {
    blue: { border: `${T.blue}33`, bg: "#eff6ff", label: T.blue },
    green: { border: "#bbf7d0", bg: "#f0fdf4", label: "#16a34a" },
    red: { border: "#fecaca", bg: "#fef2f2", label: "#dc2626" },
    neutral: { border: T.border, bg: "#fafaf8", label: T.inkFaint },
    brand: { border: "#fde68a", bg: "#fff8eb", label: T.brand },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 8,
        border: `1px solid ${t.border}`,
        background: t.bg,
      }}
    >
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: t.label }}>{label}</p>
      <p style={{ margin: "6px 0 0", fontSize: 26, fontWeight: 700, color: T.ink }}>
        {loading ? "—" : value ?? 0}
      </p>
    </div>
  );
}

export function DashboardSkeleton({ height = 220 }) {
  return (
    <div
      style={{
        height,
        borderRadius: 8,
        background: "linear-gradient(90deg, #ecece9 25%, #f5f5f3 50%, #ecece9 75%)",
        backgroundSize: "200% 100%",
        animation: "dashboard-skeleton-shimmer 1.2s ease-in-out infinite",
      }}
    />
  );
}
