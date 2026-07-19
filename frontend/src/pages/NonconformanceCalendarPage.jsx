import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { AlertTriangle, ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import PageContent from "../components/PageContent";
import { fetchNonconformances } from "../services/api";

const DAY_MS = 86400000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function name(user) {
  return `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.email || "Unknown";
}

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function dayKey(value) {
  return startOfDay(value).getTime();
}

function eventColor(row) {
  const today = startOfDay(new Date());
  if (row.status === "closed") return { bg: "#dcfce7", color: "#15803d", border: "#22c55e" };
  if (startOfDay(row.dueDate) < today) return { bg: "#fee2e2", color: "#b91c1c", border: "#ef4444" };
  if (["draft", "reopened", "under_review"].includes(row.status)) return { bg: "#ffedd5", color: "#c2410c", border: "#f97316" };
  return { bg: "#dbeafe", color: "#1d4ed8", border: "#3b82f6" };
}

function EventChip({ row, onOpen, dense = false }) {
  const colors = eventColor(row);
  return (
    <Box
      role="button"
      tabIndex={0}
      title={`${row.ncNumber} — ${row.title}`}
      onClick={(event) => {
        event.stopPropagation();
        onOpen(row.id);
      }}
      onKeyDown={(event) => event.key === "Enter" && onOpen(row.id)}
      sx={{
        px: 0.75,
        py: dense ? 0.25 : 0.5,
        borderRadius: 1,
        cursor: "pointer",
        bgcolor: colors.bg,
        color: colors.color,
        borderLeft: `3px solid ${colors.border}`,
        fontSize: dense ? 11 : 12,
        fontWeight: 700,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        "&:hover": { filter: "brightness(0.96)" },
      }}
    >
      {row.ncNumber}
    </Box>
  );
}

function DueList({ title, icon, rows, emptyText, labelFor, labelColors, onOpen }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
      <Box sx={{ px: 2, py: 1.5, bgcolor: "#f8fafc", borderBottom: "1px solid #e5e7eb", display: "flex", gap: 1, alignItems: "center" }}>
        {icon}
        <Typography sx={{ fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", fontSize: 13, color: "#475569" }}>
          {title}
        </Typography>
      </Box>
      <Box sx={{ px: 2 }}>
        {rows.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 2, fontSize: 14 }}>{emptyText}</Typography>
        ) : (
          rows.map((row, index) => (
            <React.Fragment key={row.id}>
              {index > 0 ? <Divider sx={{ borderStyle: "dashed" }} /> : null}
              <Box
                role="button"
                tabIndex={0}
                onClick={() => onOpen(row.id)}
                onKeyDown={(event) => event.key === "Enter" && onOpen(row.id)}
                sx={{
                  py: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1.5,
                  cursor: "pointer",
                  "&:hover": { bgcolor: "#f8fafc" },
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 14 }}>{row.ncNumber}</Typography>
                  <Typography color="text.secondary" sx={{ fontSize: 13 }} noWrap>
                    {row.title} — {name(row.assignee)}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={labelFor(row)}
                  sx={{
                    bgcolor: labelColors.bg,
                    color: labelColors.color,
                    fontWeight: 800,
                    borderRadius: 1,
                    textTransform: "uppercase",
                    fontSize: 11,
                    flexShrink: 0,
                  }}
                />
              </Box>
            </React.Fragment>
          ))
        )}
      </Box>
    </Paper>
  );
}

export default function NonconformanceCalendarPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    assignee: "",
    reporter: "",
    priority: "",
    from: "",
    to: "",
  });

  useEffect(() => {
    fetchNonconformances()
      .then((res) => setRows(res?.data || []))
      .catch((err) => setError(err?.response?.data?.message || "Could not load calendar events."))
      .finally(() => setLoading(false));
  }, []);

  const assignees = useMemo(
    () => [...new Map(rows.map((row) => [row.assigneeId, row.assignee])).entries()],
    [rows]
  );
  const reporters = useMemo(
    () => [...new Map(rows.map((row) => [row.reporterId, row.reporter])).entries()],
    [rows]
  );
  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (filters.status && row.status !== filters.status) return false;
        if (filters.assignee && row.assigneeId !== filters.assignee) return false;
        if (filters.reporter && row.reporterId !== filters.reporter) return false;
        if (filters.priority && row.priority !== filters.priority) return false;
        const due = new Date(row.dueDate);
        if (filters.from && due < new Date(`${filters.from}T00:00:00`)) return false;
        if (filters.to && due > new Date(`${filters.to}T23:59:59`)) return false;
        return true;
      }),
    [rows, filters]
  );

  const eventsByDay = useMemo(() => {
    const map = new Map();
    filtered.forEach((row) => {
      const key = dayKey(row.dueDate);
      map.set(key, [...(map.get(key) || []), row]);
    });
    return map;
  }, [filtered]);

  const today = startOfDay(new Date());
  const open = filtered.filter((row) => row.status !== "closed");
  const overdue = open
    .filter((row) => startOfDay(row.dueDate) <= today)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const dueSoon = open
    .filter((row) => {
      const days = Math.round((startOfDay(row.dueDate) - today) / DAY_MS);
      return days > 0 && days <= 14;
    })
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  // Days rendered by the calendar for the current view and cursor position.
  const calendarDays = useMemo(() => {
    if (view === "day") return [cursor];
    if (view === "week") {
      const weekStart = new Date(cursor.getTime() - cursor.getDay() * DAY_MS);
      return Array.from({ length: 7 }, (_, index) => new Date(weekStart.getTime() + index * DAY_MS));
    }
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gridStart = new Date(monthStart.getTime() - monthStart.getDay() * DAY_MS);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const weeks = Math.ceil((monthStart.getDay() + monthEnd.getDate()) / 7);
    return Array.from({ length: weeks * 7 }, (_, index) => new Date(gridStart.getTime() + index * DAY_MS));
  }, [view, cursor]);

  const periodLabel =
    view === "month"
      ? cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })
      : view === "week"
        ? `Week of ${new Date(cursor.getTime() - cursor.getDay() * DAY_MS).toLocaleDateString()}`
        : cursor.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const shift = (direction) => {
    setCursor((current) => {
      if (view === "month") return new Date(current.getFullYear(), current.getMonth() + direction, 1);
      return new Date(current.getTime() + direction * (view === "week" ? 7 : 1) * DAY_MS);
    });
  };

  const update = (key) => (event) => setFilters((current) => ({ ...current, [key]: event.target.value }));
  const openNc = (id) => navigate(`/nc/${id}`);

  const overdueLabel = (row) => {
    const days = Math.round((today - startOfDay(row.dueDate)) / DAY_MS);
    return days === 0 ? "Due today" : `${days} day${days === 1 ? "" : "s"} over`;
  };
  const dueSoonLabel = (row) => {
    const days = Math.round((startOfDay(row.dueDate) - today) / DAY_MS);
    return `In ${days} day${days === 1 ? "" : "s"}`;
  };

  return (
    <Layout disablePadding>
      <PageContent>
        <Button
          startIcon={<ArrowLeft size={17} />}
          onClick={() => navigate("/nonconformance")}
          sx={{ mb: 1.5, textTransform: "none", fontWeight: 700, color: "text.secondary" }}
        >
          Back to Nonconformances
        </Button>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 3 }}>
          <Box sx={{ display: "flex", gap: 1.2, alignItems: "center" }}>
            <CalendarDays size={24} color="#2563eb" />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>Nonconformance Calendar</Typography>
              <Typography color="text.secondary">Due dates and workflow state at a glance.</Typography>
            </Box>
          </Box>
          <ButtonGroup>
            {["month", "week", "day"].map((option) => (
              <Button key={option} variant={view === option ? "contained" : "outlined"} onClick={() => setView(option)} sx={{ textTransform: "capitalize" }}>
                {option}
              </Button>
            ))}
          </ButtonGroup>
        </Box>
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 1.5 }}>
            <FormControl size="small"><InputLabel>Status</InputLabel><Select label="Status" value={filters.status} onChange={update("status")}><MenuItem value="">All</MenuItem>{["assigned", "draft", "response_submitted", "under_review", "reopened", "closed"].map((item) => <MenuItem key={item} value={item}>{item.replaceAll("_", " ")}</MenuItem>)}</Select></FormControl>
            <FormControl size="small"><InputLabel>Assignee</InputLabel><Select label="Assignee" value={filters.assignee} onChange={update("assignee")}><MenuItem value="">All</MenuItem>{assignees.map(([id, user]) => <MenuItem key={id} value={id}>{name(user)}</MenuItem>)}</Select></FormControl>
            <FormControl size="small"><InputLabel>Reporter</InputLabel><Select label="Reporter" value={filters.reporter} onChange={update("reporter")}><MenuItem value="">All</MenuItem>{reporters.map(([id, user]) => <MenuItem key={id} value={id}>{name(user)}</MenuItem>)}</Select></FormControl>
            <FormControl size="small"><InputLabel>Priority</InputLabel><Select label="Priority" value={filters.priority} onChange={update("priority")}><MenuItem value="">All</MenuItem>{["low", "medium", "high", "critical"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select></FormControl>
            <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={filters.from} onChange={update("from")} />
            <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={filters.to} onChange={update("to")} />
          </Box>
        </Paper>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 2fr) minmax(280px, 1fr)" }, gap: 2, alignItems: "start" }}>
            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
              <Box sx={{ px: 2, py: 1.5, bgcolor: "#f8fafc", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
                <Typography sx={{ fontWeight: 800 }}>{periodLabel}</Typography>
                <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                  <IconButton size="small" onClick={() => shift(-1)} sx={{ border: "1px solid #e5e7eb", borderRadius: 2 }} aria-label="Previous">
                    <ChevronLeft size={17} />
                  </IconButton>
                  <Button size="small" onClick={() => setCursor(startOfDay(new Date()))} sx={{ textTransform: "none", fontWeight: 700 }}>
                    Today
                  </Button>
                  <IconButton size="small" onClick={() => shift(1)} sx={{ border: "1px solid #e5e7eb", borderRadius: 2 }} aria-label="Next">
                    <ChevronRight size={17} />
                  </IconButton>
                </Box>
              </Box>
              {view !== "day" ? (
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #e5e7eb" }}>
                  {WEEKDAYS.map((day) => (
                    <Typography key={day} align="center" sx={{ py: 0.75, fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                      {day}
                    </Typography>
                  ))}
                </Box>
              ) : null}
              <Box sx={{ display: "grid", gridTemplateColumns: view === "day" ? "1fr" : "repeat(7, 1fr)" }}>
                {calendarDays.map((date) => {
                  const events = eventsByDay.get(date.getTime()) || [];
                  const isToday = date.getTime() === today.getTime();
                  const inMonth = view !== "month" || date.getMonth() === cursor.getMonth();
                  return (
                    <Box
                      key={date.getTime()}
                      sx={{
                        minHeight: view === "day" ? 160 : 96,
                        p: 0.75,
                        borderTop: "1px solid #f1f5f9",
                        borderRight: "1px solid #f1f5f9",
                        bgcolor: inMonth ? "#fff" : "#fafafa",
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: isToday ? 800 : 600,
                          color: isToday ? "#fff" : inMonth ? "#334155" : "#94a3b8",
                          bgcolor: isToday ? "#2563eb" : "transparent",
                          borderRadius: "50%",
                          width: 22,
                          height: 22,
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        {date.getDate()}
                      </Typography>
                      {(view === "month" ? events.slice(0, 3) : events).map((row) => (
                        <EventChip key={row.id} row={row} onOpen={openNc} dense={view === "month"} />
                      ))}
                      {view === "month" && events.length > 3 ? (
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>
                          +{events.length - 3} more
                        </Typography>
                      ) : null}
                    </Box>
                  );
                })}
              </Box>
            </Paper>
            <Box sx={{ display: "grid", gap: 2 }}>
              <DueList
                title="Overdue"
                icon={<AlertTriangle size={16} color="#dc2626" />}
                rows={overdue}
                emptyText="Nothing is overdue."
                labelFor={overdueLabel}
                labelColors={{ bg: "#1f2937", color: "#fff" }}
                onOpen={openNc}
              />
              <DueList
                title="Due Soon"
                icon={<Clock3 size={16} color="#c2410c" />}
                rows={dueSoon}
                emptyText="Nothing is due in the next 14 days."
                labelFor={dueSoonLabel}
                labelColors={{ bg: "#fff", color: "#334155" }}
                onOpen={openNc}
              />
            </Box>
          </Box>
        )}
      </PageContent>
    </Layout>
  );
}
