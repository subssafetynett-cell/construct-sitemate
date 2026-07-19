import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { BarChart3, CalendarDays, CheckCircle2, Download, Eye, FileText, Inbox, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import PageContent from "../components/PageContent";
import { useAuth } from "../context/AuthContext";
import { fetchNonconformance, fetchNonconformances } from "../services/api";
import { downloadNonconformancePdf, downloadNonconformanceWord } from "../utils/ncPdf";

const STATUS = {
  assigned: { label: "Assigned", bg: "#dbeafe", color: "#1d4ed8" },
  draft: { label: "Draft", bg: "#fef3c7", color: "#b45309" },
  response_submitted: { label: "Response Submitted", bg: "#ffedd5", color: "#c2410c" },
  under_review: { label: "Under Review", bg: "#ffedd5", color: "#c2410c" },
  reopened: { label: "Reopened", bg: "#ffedd5", color: "#c2410c" },
  closed: { label: "Closed", bg: "#dcfce7", color: "#15803d" },
};

export function NcStatusChip({ status }) {
  const meta = STATUS[status] || { label: status, bg: "#f1f5f9", color: "#475569" };
  return (
    <Chip
      size="small"
      label={meta.label}
      sx={{ bgcolor: meta.bg, color: meta.color, fontWeight: 700, border: `1px solid ${meta.color}33` }}
    />
  );
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function NcTable({ rows, empty, onOpen, onDownloadMenu, downloadingId, page = 0, rowsPerPage = 10 }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!rows.length) {
    return <Typography sx={{ color: "#64748b", py: 3 }}>{empty}</Typography>;
  }
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {["Sl No", "NC #", "Title", "Priority", "Due date", "Status", ""].map((heading) => (
              <TableCell key={heading || "actions"} sx={{ fontWeight: 700, color: "#64748b" }}>
                {heading}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => {
            const due = new Date(row.dueDate);
            const overdue = row.status !== "closed" && due < today;
            return (
              <TableRow key={row.id} hover onClick={() => onOpen(row.id)} sx={{ cursor: "pointer" }}>
                <TableCell sx={{ fontWeight: 500, color: "#64748b", width: 64 }}>
                  {page * rowsPerPage + index + 1}
                </TableCell>
                <TableCell sx={{ fontWeight: 800, color: "#2563eb" }}>{row.ncNumber}</TableCell>
                <TableCell>
                  <Typography sx={{ fontWeight: 650 }}>{row.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{row.category}</Typography>
                </TableCell>
                <TableCell sx={{ textTransform: "capitalize" }}>{row.priority}</TableCell>
                <TableCell sx={{ color: overdue ? "#dc2626" : "inherit", fontWeight: overdue ? 800 : 400 }}>
                  {formatDate(row.dueDate)} {overdue ? "• Overdue" : ""}
                </TableCell>
                <TableCell><NcStatusChip status={row.status} /></TableCell>
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                  <IconButton
                    size="small"
                    title="Download"
                    disabled={downloadingId === row.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDownloadMenu(event, row.id);
                    }}
                  >
                    <Download size={17} />
                  </IconButton>
                  <IconButton size="small" title="Open">
                    <Eye size={17} />
                  </IconButton>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function userDisplayName(user) {
  return `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.email || "";
}

export default function NonconformanceDashboardPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const userId = String(currentUser?.id || currentUser?._id || "");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadMenu, setDownloadMenu] = useState({ anchor: null, ncId: null });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const hasFilters = Boolean(search.trim()) || statusFilter !== "all" || priorityFilter !== "all";

  const download = async (ncId, format) => {
    setDownloadMenu({ anchor: null, ncId: null });
    setDownloadingId(ncId);
    try {
      // List rows are trimmed; both report exports need the complete concern
      // form and latest NC response.
      const res = await fetchNonconformance(ncId);
      if (format === "word") {
        await downloadNonconformanceWord(res?.data);
      } else {
        await downloadNonconformancePdf(res?.data);
      }
    } catch (err) {
      console.error("NC report download failed:", err);
      setError(err?.response?.data?.message || "Could not generate the report. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  const openDownloadMenu = (event, ncId) => {
    setDownloadMenu({ anchor: event.currentTarget, ncId });
  };

  useEffect(() => {
    fetchNonconformances()
      .then((res) => setRows(res?.data || []))
      .catch((err) => setError(err?.response?.data?.message || "Could not load nonconformances."))
      .finally(() => setLoading(false));
  }, []);

  const matchesFilters = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (row, { ignoreStatus = false } = {}) => {
      if (!ignoreStatus && statusFilter !== "all" && row.status !== statusFilter) return false;
      if (priorityFilter !== "all" && row.priority !== priorityFilter) return false;
      if (!query) return true;
      const haystack = [
        row.ncNumber,
        row.title,
        row.category,
        userDisplayName(row.assignee),
        userDisplayName(row.reporter),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    };
  }, [search, statusFilter, priorityFilter]);

  const assigned = useMemo(
    () => rows.filter((row) => String(row.assigneeId) === userId && row.status !== "closed" && matchesFilters(row)),
    [rows, userId, matchesFilters]
  );
  const pendingReview = useMemo(
    () => rows.filter((row) => String(row.reporterId) === userId && row.status === "under_review" && matchesFilters(row)),
    [rows, userId, matchesFilters]
  );
  // The status select is hidden on the Closed tab, so a leftover selection
  // from another tab must not empty this list.
  const closed = useMemo(
    () => rows.filter(
      (row) =>
        row.status === "closed" &&
        (String(row.assigneeId) === userId || String(row.reporterId) === userId) &&
        matchesFilters(row, { ignoreStatus: true })
    ),
    [rows, userId, matchesFilters]
  );
  const activeRows = activeTab === 0 ? assigned : activeTab === 1 ? pendingReview : closed;
  const paginatedRows = activeRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const activeEmptyMessage = hasFilters
    ? "No nonconformances match your search or filters."
    : activeTab === 0
      ? "Nothing is currently assigned to you."
      : activeTab === 1
        ? "No responses are waiting for your review."
        : "No closed nonconformances.";

  // Return to the first page whenever filtering changes enough to remove the
  // current page.
  useEffect(() => {
    const lastPage = Math.max(0, Math.ceil(activeRows.length / rowsPerPage) - 1);
    if (page > lastPage) setPage(lastPage);
  }, [activeRows.length, page, rowsPerPage]);

  return (
    <Layout disablePadding>
      <PageContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 3 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>Nonconformances</Typography>
            <Typography color="text.secondary">Assigned findings, response reviews, and due dates.</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              startIcon={<BarChart3 size={17} />}
              onClick={() => navigate("/nc-dashboard")}
            >
              Dashboard
            </Button>
            <Button
              variant="outlined"
              startIcon={<CalendarDays size={17} />}
              onClick={() => navigate("/nc-calendar")}
            >
              Calendar
            </Button>
          </Box>
        </Box>
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
        ) : (
          <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
            <Tabs
              value={activeTab}
              onChange={(e, value) => {
                setActiveTab(value);
                setPage(0);
              }}
              sx={{ borderBottom: "1px solid #e5e7eb", px: 1.5 }}
            >
              <Tab
                icon={<Inbox size={17} />}
                iconPosition="start"
                label={`Assigned to Me (${assigned.length})`}
                sx={{ fontWeight: 700, textTransform: "none", minHeight: 56 }}
              />
              <Tab
                icon={<Eye size={17} />}
                iconPosition="start"
                label={`Pending My Review (${pendingReview.length})`}
                sx={{ fontWeight: 700, textTransform: "none", minHeight: 56 }}
              />
              <Tab
                icon={<CheckCircle2 size={17} />}
                iconPosition="start"
                label={`Closed (${closed.length})`}
                sx={{ fontWeight: 700, textTransform: "none", minHeight: 56 }}
              />
            </Tabs>
            <Box sx={{ px: 2.5, pt: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                {activeTab === 0
                  ? "Nonconformances requiring your response."
                  : activeTab === 1
                    ? "Submitted responses waiting for your decision."
                    : "Closed nonconformances. Reporters can open an item to reopen it."}
              </Typography>
            </Box>
            <Box sx={{ px: 2.5, pt: 1.5, display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
              <TextField
                size="small"
                placeholder="Search NC #, title, category, or person..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
                sx={{ minWidth: { xs: "100%", sm: 300 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} />
                    </InputAdornment>
                  ),
                }}
              />
              {activeTab !== 2 ? (
                <TextField
                  select
                  size="small"
                  label="Status"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setPage(0);
                  }}
                  sx={{ minWidth: 170 }}
                >
                  <MenuItem value="all">All statuses</MenuItem>
                  {Object.entries(STATUS)
                    .filter(([value]) => value !== "closed")
                    .map(([value, meta]) => (
                      <MenuItem key={value} value={value}>{meta.label}</MenuItem>
                    ))}
                </TextField>
              ) : null}
              <TextField
                select
                size="small"
                label="Priority"
                value={priorityFilter}
                onChange={(event) => {
                  setPriorityFilter(event.target.value);
                  setPage(0);
                }}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="all">All priorities</MenuItem>
                {["low", "medium", "high", "critical"].map((value) => (
                  <MenuItem key={value} value={value} sx={{ textTransform: "capitalize" }}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </MenuItem>
                ))}
              </TextField>
              {hasFilters ? (
                <Button
                  size="small"
                  startIcon={<X size={15} />}
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setPriorityFilter("all");
                    setPage(0);
                  }}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  Clear
                </Button>
              ) : null}
            </Box>
            <Box sx={{ px: 2.5, pb: 1 }}>
              <NcTable
                rows={paginatedRows}
                empty={activeEmptyMessage}
                onOpen={(id) => navigate(`/nc/${id}`)}
                onDownloadMenu={openDownloadMenu}
                downloadingId={downloadingId}
                page={page}
                rowsPerPage={rowsPerPage}
              />
            </Box>
            <TablePagination
              component="div"
              count={activeRows.length}
              page={page}
              onPageChange={(_, nextPage) => setPage(nextPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(Number(event.target.value));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25]}
              sx={{ borderTop: "1px solid #e5e7eb" }}
            />
          </Paper>
        )}
        <Menu
          anchorEl={downloadMenu.anchor}
          open={Boolean(downloadMenu.anchor)}
          onClose={() => setDownloadMenu({ anchor: null, ncId: null })}
        >
          <MenuItem onClick={() => download(downloadMenu.ncId, "pdf")}>
            <Download size={17} style={{ marginRight: 10 }} />
            Download PDF
          </MenuItem>
          <MenuItem onClick={() => download(downloadMenu.ncId, "word")}>
            <FileText size={17} style={{ marginRight: 10 }} />
            Download Word
          </MenuItem>
        </Menu>
      </PageContent>
    </Layout>
  );
}
