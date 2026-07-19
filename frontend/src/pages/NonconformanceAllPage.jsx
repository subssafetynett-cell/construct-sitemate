import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import PageContent from "../components/PageContent";
import { fetchNonconformances } from "../services/api";
import { NcStatusChip } from "./NonconformanceDashboardPage";

const PRIORITIES = ["low", "medium", "high", "critical"];
const STATUSES = [
  "assigned",
  "draft",
  "response_submitted",
  "under_review",
  "reopened",
  "closed",
];

function userName(user) {
  if (!user) return "—";
  return `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "—";
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB");
}

export default function NonconformanceAllPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    assignee: "",
    reporter: "",
    priority: "",
    category: "",
    from: "",
    to: "",
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchNonconformances()
      .then((result) => setRows(result?.data || []))
      .catch((err) =>
        setError(err?.response?.data?.message || "Could not load nonconformances.")
      )
      .finally(() => setLoading(false));
  }, []);

  const assignees = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => row.assignee?.id && map.set(row.assignee.id, row.assignee));
    return [...map.values()].sort((a, b) => userName(a).localeCompare(userName(b)));
  }, [rows]);

  const reporters = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => row.reporter?.id && map.set(row.reporter.id, row.reporter));
    return [...map.values()].sort((a, b) => userName(a).localeCompare(userName(b)));
  }, [rows]);

  const categories = useMemo(
    () => [...new Set(rows.map((row) => row.category).filter(Boolean))].sort(),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const from = filters.from ? new Date(`${filters.from}T00:00:00`) : null;
    const to = filters.to ? new Date(`${filters.to}T23:59:59`) : null;
    return rows.filter((row) => {
      const dueDate = row.dueDate ? new Date(row.dueDate) : null;
      return (
        (!filters.status || row.status === filters.status) &&
        (!filters.assignee || row.assigneeId === filters.assignee) &&
        (!filters.reporter || row.reporterId === filters.reporter) &&
        (!filters.priority || row.priority === filters.priority) &&
        (!filters.category || row.category === filters.category) &&
        (!from || (dueDate && dueDate >= from)) &&
        (!to || (dueDate && dueDate <= to))
      );
    });
  }, [rows, filters]);

  const summary = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const open = rows.filter((row) => row.status !== "closed");
    const closedRows = rows.filter((row) => row.status === "closed" && row.closedAt);
    const closeDurations = closedRows
      .map((row) => (new Date(row.closedAt) - new Date(row.createdAt)) / 86_400_000)
      .filter((days) => Number.isFinite(days) && days >= 0);
    return {
      open: open.length,
      overdue: open.filter((row) => row.dueDate && new Date(row.dueDate) < today).length,
      closedThisMonth: closedRows.filter((row) => new Date(row.closedAt) >= monthStart).length,
      averageClose:
        closeDurations.length > 0
          ? `${(closeDurations.reduce((sum, days) => sum + days, 0) / closeDurations.length).toFixed(1)} days`
          : "—",
    };
  }, [rows]);

  useEffect(() => setPage(0), [filters]);

  const updateFilter = (key) => (event) =>
    setFilters((current) => ({ ...current, [key]: event.target.value }));

  const visibleRows = filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Layout disablePadding>
      <PageContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            All Nonconformances
          </Typography>
          <Typography color="text.secondary">
            Company-wide nonconformance oversight and administration.
          </Typography>
        </Box>

        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 2, mb: 3 }}>
          {[
            { label: "Total open", value: summary.open, color: "#c2410c", bg: "#fff7ed" },
            { label: "Overdue", value: summary.overdue, color: "#dc2626", bg: "#fef2f2" },
            { label: "Closed this month", value: summary.closedThisMonth, color: "#15803d", bg: "#f0fdf4" },
            { label: "Average time to close", value: summary.averageClose, color: "#1d4ed8", bg: "#eff6ff" },
          ].map((item) => (
            <Paper key={item.label} variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: item.bg }}>
              <Typography sx={{ color: "#64748b", fontWeight: 700, fontSize: "0.8rem" }}>{item.label}</Typography>
              <Typography sx={{ color: item.color, fontWeight: 800, fontSize: "1.65rem" }}>{item.value}</Typography>
            </Paper>
          ))}
        </Box>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 1.5 }}>
            <TextField select size="small" label="Status" value={filters.status} onChange={updateFilter("status")}>
              <MenuItem value="">All statuses</MenuItem>
              {STATUSES.map((value) => <MenuItem key={value} value={value}>{value.replaceAll("_", " ")}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Assignee" value={filters.assignee} onChange={updateFilter("assignee")}>
              <MenuItem value="">All assignees</MenuItem>
              {assignees.map((user) => <MenuItem key={user.id} value={user.id}>{userName(user)}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Reporter" value={filters.reporter} onChange={updateFilter("reporter")}>
              <MenuItem value="">All reporters</MenuItem>
              {reporters.map((user) => <MenuItem key={user.id} value={user.id}>{userName(user)}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Priority" value={filters.priority} onChange={updateFilter("priority")}>
              <MenuItem value="">All priorities</MenuItem>
              {PRIORITIES.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Category" value={filters.category} onChange={updateFilter("category")}>
              <MenuItem value="">All categories</MenuItem>
              {categories.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
            </TextField>
            <TextField size="small" type="date" label="Due from" value={filters.from} onChange={updateFilter("from")} InputLabelProps={{ shrink: true }} />
            <TextField size="small" type="date" label="Due to" value={filters.to} onChange={updateFilter("to")} InputLabelProps={{ shrink: true }} />
          </Box>
        </Paper>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
        ) : (
          <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f8fafc" }}>
                    {["Number", "Title", "Reporter", "Assignee", "Priority", "Status", "Due date"].map((label) => (
                      <TableCell key={label} sx={{ fontWeight: 800 }}>{label}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleRows.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      onClick={() => navigate(`/nc/${row.id}`, { state: { from: "/nonconformance/all" } })}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell sx={{ fontWeight: 700 }}>{row.ncNumber}</TableCell>
                      <TableCell>{row.title}</TableCell>
                      <TableCell>{userName(row.reporter)}</TableCell>
                      <TableCell>{userName(row.assignee)}</TableCell>
                      <TableCell sx={{ textTransform: "capitalize" }}>{row.priority}</TableCell>
                      <TableCell><NcStatusChip status={row.status} /></TableCell>
                      <TableCell sx={{ color: row.status !== "closed" && row.dueDate && new Date(row.dueDate) < new Date() ? "#dc2626" : "inherit", fontWeight: 600 }}>
                        {formatDate(row.dueDate)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!visibleRows.length && (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: "text.secondary" }}>No nonconformances found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filteredRows.length}
              page={page}
              onPageChange={(_, value) => setPage(value)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(Number(event.target.value));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50]}
            />
          </Paper>
        )}
      </PageContent>
    </Layout>
  );
}
