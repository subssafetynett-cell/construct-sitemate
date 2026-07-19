import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { ArrowLeft, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Layout from "../components/Layout";
import PageContent from "../components/PageContent";
import { fetchNonconformances } from "../services/api";

const STATUS_LABELS = {
  assigned: "Assigned",
  draft: "Draft",
  response_submitted: "Response Submitted",
  under_review: "Under Review",
  reopened: "Reopened",
  closed: "Closed",
};

const STATUS_CHART_COLORS = {
  assigned: "#3b82f6",
  draft: "#eab308",
  response_submitted: "#fb923c",
  under_review: "#f97316",
  reopened: "#ef4444",
  closed: "#22c55e",
};

const PRIORITY_CHART_COLORS = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#dc2626",
};

function monthKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export default function NonconformanceAnalyticsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("all");
  const overviewRef = useRef(null);

  useEffect(() => {
    fetchNonconformances()
      .then((res) => setRows(res?.data || []))
      .catch((err) => setError(err?.response?.data?.message || "Could not load nonconformances."))
      .finally(() => setLoading(false));
  }, []);

  const monthOptions = useMemo(() => {
    const keys = new Set();
    rows.forEach((row) => {
      const created = monthKey(row.createdAt);
      if (created) keys.add(created);
      if (row.status === "closed") {
        const closed = monthKey(row.closedAt || row.updatedAt);
        if (closed) keys.add(closed);
      }
    });
    return [...keys].sort().reverse();
  }, [rows]);

  // Stats and status/priority charts follow the selected month (based on when
  // the NC was created); the monthly trend chart always shows all months.
  const filteredRows = useMemo(
    () =>
      selectedMonth === "all"
        ? rows
        : rows.filter((row) => monthKey(row.createdAt) === selectedMonth),
    [rows, selectedMonth]
  );

  const statusChartData = useMemo(
    () =>
      Object.entries(STATUS_LABELS)
        .map(([value, label]) => ({
          name: label,
          value: filteredRows.filter((row) => row.status === value).length,
          color: STATUS_CHART_COLORS[value] || "#64748b",
        }))
        .filter((entry) => entry.value > 0),
    [filteredRows]
  );

  const priorityChartData = useMemo(
    () =>
      ["low", "medium", "high", "critical"].map((priority) => ({
        name: priority.charAt(0).toUpperCase() + priority.slice(1),
        count: filteredRows.filter((row) => row.priority === priority).length,
        color: PRIORITY_CHART_COLORS[priority],
      })),
    [filteredRows]
  );

  const monthlyChartData = useMemo(
    () =>
      [...monthOptions].reverse().map((key) => {
        const createdInMonth = rows.filter((row) => monthKey(row.createdAt) === key).length;
        const closedInMonth = rows.filter(
          (row) => row.status === "closed" && monthKey(row.closedAt || row.updatedAt) === key
        ).length;
        return {
          name: monthLabel(key),
          key,
          Created: createdInMonth,
          Closed: closedInMonth,
        };
      }),
    [rows, monthOptions]
  );

  const overviewStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const open = filteredRows.filter((row) => row.status !== "closed");
    return {
      total: filteredRows.length,
      open: open.length,
      closed: filteredRows.length - open.length,
      overdue: open.filter((row) => row.dueDate && new Date(row.dueDate) < today).length,
    };
  }, [filteredRows]);

  const downloadDashboard = async () => {
    if (!overviewRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(overviewRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const image = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(0, 48, 73);
      pdf.text("Nonconformance dashboard", margin, margin + 4);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      const monthText = selectedMonth === "all" ? "All months" : monthLabel(selectedMonth);
      pdf.text(
        `${monthText} — generated ${new Date().toLocaleDateString("en-GB")} ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`,
        margin,
        margin + 10
      );

      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2 - 14;
      const ratio = canvas.width / canvas.height;
      let imgWidth = maxWidth;
      let imgHeight = imgWidth / ratio;
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = imgHeight * ratio;
      }
      pdf.addImage(image, "PNG", margin, margin + 14, imgWidth, imgHeight, undefined, "FAST");
      const fileSuffix = selectedMonth === "all" ? new Date().toISOString().slice(0, 10) : selectedMonth;
      pdf.save(`nonconformance-dashboard-${fileSuffix}.pdf`);
    } catch (err) {
      console.error("Dashboard download failed:", err);
      setError("Could not download the dashboard. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Layout disablePadding>
      <PageContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 3 }}>
          <Box>
            <Button
              size="small"
              startIcon={<ArrowLeft size={16} />}
              onClick={() => navigate("/nonconformance")}
              sx={{ textTransform: "none", fontWeight: 700, mb: 0.5, ml: -1 }}
            >
              Back to Nonconformances
            </Button>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>Nonconformance Dashboard</Typography>
            <Typography color="text.secondary">
              Monthly overview of nonconformance status and priority. Use the month filter to focus on a specific period.
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center", alignSelf: "flex-start" }}>
            <TextField
              select
              size="small"
              label="Month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="all">All months</MenuItem>
              {monthOptions.map((key) => (
                <MenuItem key={key} value={key}>{monthLabel(key)}</MenuItem>
              ))}
            </TextField>
            <Button
              variant="contained"
              startIcon={downloading ? <CircularProgress size={15} sx={{ color: "#fff" }} /> : <Download size={16} />}
              disabled={downloading || loading || rows.length === 0}
              onClick={downloadDashboard}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              {downloading ? "Preparing…" : "Download dashboard"}
            </Button>
          </Box>
        </Box>
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
        ) : (
          <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
            <Box ref={overviewRef} sx={{ p: 2.5, bgcolor: "#fff" }}>
              <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>
                {selectedMonth === "all" ? "All months" : monthLabel(selectedMonth)}
              </Typography>
              <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2.5 }}>
                {[
                  { label: "Total", value: overviewStats.total, color: "#0f172a", bg: "#f1f5f9" },
                  { label: "Open", value: overviewStats.open, color: "#c2410c", bg: "#ffedd5" },
                  { label: "Closed", value: overviewStats.closed, color: "#15803d", bg: "#dcfce7" },
                  { label: "Overdue", value: overviewStats.overdue, color: "#dc2626", bg: "#fee2e2" },
                ].map((stat) => (
                  <Box
                    key={stat.label}
                    sx={{
                      flex: "1 1 140px",
                      minWidth: 140,
                      borderRadius: 2,
                      p: 2,
                      bgcolor: stat.bg,
                    }}
                  >
                    <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b" }}>
                      {stat.label}
                    </Typography>
                    <Typography sx={{ fontSize: "1.8rem", fontWeight: 800, color: stat.color }}>
                      {stat.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
              {rows.length === 0 ? (
                <Typography sx={{ color: "#64748b", py: 2 }}>
                  Charts will appear once nonconformances are recorded.
                </Typography>
              ) : filteredRows.length === 0 ? (
                <Typography sx={{ color: "#64748b", py: 2 }}>
                  No nonconformances were created in {monthLabel(selectedMonth)}.
                </Typography>
              ) : (
                <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                  <Box sx={{ flex: "1 1 380px", minWidth: 320 }}>
                    <Typography sx={{ fontWeight: 700, color: "#334155", mb: 1 }}>By status</Typography>
                    <Box sx={{ width: "100%", height: 320 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={statusChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={105}
                            paddingAngle={2}
                            label={({ name, value }) => `${name} (${value})`}
                            labelLine={false}
                          >
                            {statusChartData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                          <Legend verticalAlign="bottom" height={30} />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </Box>
                  <Box sx={{ flex: "1 1 380px", minWidth: 320 }}>
                    <Typography sx={{ fontWeight: 700, color: "#334155", mb: 1 }}>By priority</Typography>
                    <Box sx={{ width: "100%", height: 320 }}>
                      <ResponsiveContainer>
                        <BarChart data={priorityChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#475569" }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#475569" }} />
                          <RechartsTooltip />
                          <Bar dataKey="count" name="Nonconformances" radius={[6, 6, 0, 0]} maxBarSize={72}>
                            {priorityChartData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Box>
                </Box>
              )}
              {rows.length > 0 && monthlyChartData.length > 0 ? (
                <Box sx={{ mt: 3 }}>
                  <Typography sx={{ fontWeight: 700, color: "#334155", mb: 1 }}>Month by month</Typography>
                  <Box sx={{ width: "100%", height: 300 }}>
                    <ResponsiveContainer>
                      <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#475569" }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#475569" }} />
                        <RechartsTooltip />
                        <Legend verticalAlign="bottom" height={30} />
                        <Bar dataKey="Created" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={48} />
                        <Bar dataKey="Closed" fill="#22c55e" radius={[6, 6, 0, 0]} maxBarSize={48} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>
              ) : null}
            </Box>
          </Paper>
        )}
      </PageContent>
    </Layout>
  );
}
