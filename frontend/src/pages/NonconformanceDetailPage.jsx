import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { ArrowLeft, CheckCircle2, Clock3, Download, FileUp, Flag, Inbox, RotateCcw, X, XCircle } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import PageContent from "../components/PageContent";
import { useAuth } from "../context/AuthContext";
import {
  acceptNonconformance,
  fetchNcAssignableUsers,
  fetchNonconformance,
  forceNonconformanceStatus,
  reassignNonconformance,
  rejectNonconformance,
  reopenNonconformance,
  saveNonconformanceResponse,
  uploadNonconformanceAttachments,
} from "../services/api";
import { downloadNonconformancePdf } from "../utils/ncPdf";
import { NcStatusChip } from "./NonconformanceDashboardPage";

const FIELDS = [
  ["correctionDone", "What correction has been done to eliminate the nonconformity?"],
  ["rootCause", "What is the root cause?"],
  ["correctiveAction", "What corrective action has been taken to eliminate the root cause?"],
];

function userName(user) {
  return `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.email || "Unknown user";
}

function dateTime(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

function HistoryTimeline({ entries }) {
  return (
    <Box sx={{ pl: 1 }}>
      {entries.map((entry, index) => (
        <Box key={entry.id} sx={{ display: "flex", gap: 2, minHeight: 86 }}>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Box sx={{ width: 32, height: 32, borderRadius: "50%", bgcolor: "#eff6ff", color: "#2563eb", display: "grid", placeItems: "center" }}>
              {entry.action === "created" ? <Flag size={15} /> : entry.action === "assigned" ? <Inbox size={15} /> : <Clock3 size={15} />}
            </Box>
            {index < entries.length - 1 ? <Box sx={{ width: 2, flex: 1, bgcolor: "#e2e8f0" }} /> : null}
          </Box>
          <Box sx={{ pb: 2 }}>
            <Typography sx={{ fontWeight: 750, textTransform: "capitalize" }}>{entry.action.replaceAll("_", " ")}</Typography>
            <Typography variant="caption" color="text.secondary">{userName(entry.actor)} · {dateTime(entry.createdAt)}</Typography>
            {entry.notes ? <Typography sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>{entry.notes}</Typography> : null}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function Evidence({ attachments }) {
  if (!attachments?.length) return <Typography color="text.secondary">No evidence attached.</Typography>;
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
      {attachments.map((file) => (
        <Chip
          key={file.id}
          component="a"
          href={file.fileUrl}
          target="_blank"
          clickable
          label={file.fileName}
          icon={<FileUp size={15} />}
        />
      ))}
    </Box>
  );
}

export default function NonconformanceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, role } = useAuth();
  const userId = String(currentUser?.id || currentUser?._id || "");
  const [nc, setNc] = useState(null);
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState({ correctionDone: "", rootCause: "", correctiveAction: "" });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [adminDialog, setAdminDialog] = useState(null);
  const [adminReason, setAdminReason] = useState("");
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [assignableUsers, setAssignableUsers] = useState([]);

  const download = async () => {
    if (!nc || downloading) return;
    setDownloading(true);
    try {
      await downloadNonconformancePdf(nc);
    } catch (err) {
      console.error("NC PDF download failed:", err);
      setMessage({ severity: "error", text: "Could not generate the PDF. Please try again." });
    } finally {
      setDownloading(false);
    }
  };

  const load = useCallback(async () => {
    const res = await fetchNonconformance(id);
    const row = res?.data;
    setNc(row);
    const latest = row?.responses?.[0];
    if (latest) {
      setForm({
        correctionDone: latest.correctionDone || "",
        rootCause: latest.rootCause || "",
        correctiveAction: latest.correctiveAction || "",
      });
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => setMessage({ severity: "error", text: err?.response?.data?.message || "Could not load this nonconformance." }))
      .finally(() => setLoading(false));
  }, [load]);

  const isAssignee = String(nc?.assigneeId || "") === userId;
  const isReporter = String(nc?.reporterId || "") === userId;
  const canRespond = isAssignee && ["assigned", "draft", "reopened"].includes(nc?.status);
  const canReview = isReporter && nc?.status === "under_review";
  const canReopen = isReporter && nc?.status === "closed";
  const isAdmin = role === "company_admin" || role === "superadmin";
  const submittedResponse = useMemo(
    () => nc?.responses?.find((response) => !response.isDraft) || null,
    [nc]
  );
  const rejectionReason = useMemo(
    () => nc?.history?.find((entry) => entry.action === "rejection_reason")?.notes || "",
    [nc]
  );

  const openReassign = async () => {
    setAdminReason("");
    setNewAssigneeId("");
    setSaving(true);
    try {
      const result = await fetchNcAssignableUsers(id);
      setAssignableUsers(result?.data || []);
      setAdminDialog("reassign");
    } catch (err) {
      setMessage({ severity: "error", text: err?.response?.data?.message || "Could not load assignees." });
    } finally {
      setSaving(false);
    }
  };

  const applyReassign = async () => {
    setSaving(true);
    try {
      await reassignNonconformance(id, newAssigneeId, adminReason.trim());
      await load();
      setAdminDialog(null);
      setMessage({ severity: "success", text: "Nonconformance reassigned." });
    } catch (err) {
      setMessage({ severity: "error", text: err?.response?.data?.message || "Could not reassign the nonconformance." });
    } finally {
      setSaving(false);
    }
  };

  const applyForceStatus = async () => {
    setSaving(true);
    try {
      await forceNonconformanceStatus(id, newStatus, adminReason.trim());
      await load();
      setAdminDialog(null);
      setMessage({ severity: "success", text: "Status overridden." });
    } catch (err) {
      setMessage({ severity: "error", text: err?.response?.data?.message || "Could not override the status." });
    } finally {
      setSaving(false);
    }
  };

  const save = async (submit) => {
    if (submit && FIELDS.some(([key]) => !String(form[key] || "").trim())) {
      setMessage({ severity: "error", text: "Complete all three response fields before sending." });
      return;
    }
    setSaving(true);
    try {
      const draft = await saveNonconformanceResponse(id, { ...form, isDraft: true });
      if (files.length) {
        const draftId = draft?.data?.id;
        if (!draftId) {
          throw new Error("The draft was saved but no draft id was returned, so evidence could not be uploaded.");
        }
        await uploadNonconformanceAttachments(id, draftId, files);
      }
      if (submit) {
        await saveNonconformanceResponse(id, { ...form, isDraft: false });
      }
      setFiles([]);
      await load();
      setMessage({ severity: "success", text: submit ? "Response sent to the Reporter." : "Draft saved." });
    } catch (err) {
      setMessage({
        severity: "error",
        text: err?.response?.data?.message || err?.message || "Could not save the response.",
      });
    } finally {
      setSaving(false);
    }
  };

  const accept = async () => {
    setSaving(true);
    try {
      await acceptNonconformance(id);
      await load();
      setMessage({ severity: "success", text: "Response accepted and nonconformance closed." });
    } catch (err) {
      setMessage({ severity: "error", text: err?.response?.data?.message || "Could not close the nonconformance." });
    } finally {
      setSaving(false);
    }
  };

  const reject = async () => {
    if (!reason.trim()) return;
    setSaving(true);
    try {
      await rejectNonconformance(id, reason.trim());
      setRejectOpen(false);
      setReason("");
      await load();
      setMessage({ severity: "success", text: "Response rejected and nonconformance reopened." });
    } catch (err) {
      setMessage({ severity: "error", text: err?.response?.data?.message || "Could not reopen the nonconformance." });
    } finally {
      setSaving(false);
    }
  };

  const reopen = async () => {
    if (!reason.trim()) return;
    setSaving(true);
    try {
      await reopenNonconformance(id, reason.trim());
      setReopenOpen(false);
      setReason("");
      await load();
      setMessage({ severity: "success", text: "Nonconformance reopened and returned to the Assignee." });
    } catch (err) {
      setMessage({ severity: "error", text: err?.response?.data?.message || "Could not reopen the nonconformance." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Layout><Box sx={{ display: "flex", justifyContent: "center", py: 10 }}><CircularProgress /></Box></Layout>;
  }

  return (
    <Layout disablePadding>
      <PageContent>
        {message ? <Alert severity={message.severity} onClose={() => setMessage(null)} sx={{ mb: 2 }}>{message.text}</Alert> : null}
        {!nc ? null : (
          <>
            <Button
              startIcon={<ArrowLeft size={17} />}
              onClick={() => navigate(location.state?.from || "/nonconformance")}
              sx={{ mb: 1.5, textTransform: "none", fontWeight: 700, color: "text.secondary" }}
            >
              Back to Nonconformances
            </Button>
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 2 }}>
              <Box>
                <Typography variant="overline" color="text.secondary">{nc.ncNumber}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>{nc.title}</Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                <NcStatusChip status={nc.status} />
                {isAdmin ? (
                  <>
                    <Button variant="outlined" onClick={openReassign} disabled={saving}>
                      Reassign
                    </Button>
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={() => {
                        setAdminReason("");
                        setNewStatus("");
                        setAdminDialog("status");
                      }}
                      disabled={saving}
                    >
                      Force Status
                    </Button>
                  </>
                ) : null}
                <Button
                  variant="outlined"
                  startIcon={<Download size={17} />}
                  onClick={download}
                  disabled={downloading}
                >
                  {downloading ? "Preparing PDF..." : "Download PDF"}
                </Button>
                {canReopen ? (
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<RotateCcw size={17} />}
                    onClick={() => {
                      setReason("");
                      setReopenOpen(true);
                    }}
                  >
                    Reopen
                  </Button>
                ) : null}
              </Box>
            </Box>
            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
              <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ px: 2, borderBottom: "1px solid #e5e7eb" }}>
                <Tab label={canReview ? "Review Response" : canRespond ? "Respond to Findings" : "Details"} />
                <Tab label="History" icon={<Clock3 size={16} />} iconPosition="start" />
              </Tabs>

              {tab === 0 ? (
                <Box sx={{ p: { xs: 2, md: 3 } }}>
                  {nc.status === "reopened" && rejectionReason ? (
                    <Alert severity="warning" sx={{ mb: 3 }}>
                      <strong>Reopened by Reporter:</strong> {rejectionReason}
                    </Alert>
                  ) : null}

                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Original concern</Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2, mb: 2 }}>
                    <Box><Typography variant="caption" color="text.secondary">Category</Typography><Typography>{nc.category}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">Priority</Typography><Typography sx={{ textTransform: "capitalize" }}>{nc.priority}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">Due date</Typography><Typography>{new Date(nc.dueDate).toLocaleDateString()}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">Reporter</Typography><Typography>{userName(nc.reporter)}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">Assignee</Typography><Typography>{userName(nc.assignee)}</Typography></Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary">Description</Typography>
                  <Typography sx={{ whiteSpace: "pre-wrap", mb: 3 }}>{nc.description}</Typography>
                  <Divider sx={{ mb: 3 }} />

                  {canRespond ? (
                    <>
                      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Respond to Findings</Typography>
                      {FIELDS.map(([key, label]) => (
                        <TextField
                          key={key}
                          fullWidth
                          required
                          multiline
                          minRows={3}
                          label={label}
                          value={form[key]}
                          onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                          sx={{ mb: 2 }}
                        />
                      ))}
                      <Button component="label" variant="outlined" startIcon={<FileUp size={17} />}>
                        Add evidence
                        <input
                          hidden
                          multiple
                          type="file"
                          onChange={(event) => setFiles((current) => [...current, ...Array.from(event.target.files || [])])}
                        />
                      </Button>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, my: 2 }}>
                        {files.map((file, index) => (
                          <Chip
                            key={`${file.name}-${index}`}
                            label={file.name}
                            onDelete={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                            deleteIcon={<X size={15} />}
                          />
                        ))}
                      </Box>
                      {nc.responses?.[0]?.isDraft ? <Evidence attachments={nc.responses[0].attachments} /> : null}
                      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: 3 }}>
                        <Button variant="outlined" disabled={saving} onClick={() => save(false)}>Save as Draft</Button>
                        <Button variant="contained" disabled={saving} onClick={() => save(true)}>Save &amp; Send to Reporter</Button>
                      </Box>
                    </>
                  ) : submittedResponse ? (
                    <>
                      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>{canReview ? "Review Response" : `Response v${submittedResponse.version}`}</Typography>
                      {FIELDS.map(([key, label]) => (
                        <Box key={key} sx={{ mb: 2 }}>
                          <Typography variant="caption" color="text.secondary">{label}</Typography>
                          <Typography sx={{ whiteSpace: "pre-wrap" }}>{submittedResponse[key]}</Typography>
                        </Box>
                      ))}
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Evidence</Typography>
                      <Evidence attachments={submittedResponse.attachments} />
                      {canReview ? (
                        <Box sx={{ display: "flex", gap: 1.5, mt: 3, flexWrap: "wrap" }}>
                          <Button color="success" variant="contained" startIcon={<CheckCircle2 size={17} />} disabled={saving} onClick={accept}>Accept &amp; Close</Button>
                          <Button color="error" variant="contained" startIcon={<XCircle size={17} />} disabled={saving} onClick={() => setRejectOpen(true)}>Reject &amp; Reopen</Button>
                        </Box>
                      ) : null}
                    </>
                  ) : <Typography color="text.secondary">No response has been submitted.</Typography>}
                </Box>
              ) : (
                <Box sx={{ p: { xs: 2, md: 3 } }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>History</Typography>
                  <HistoryTimeline entries={[...(nc.history || [])].reverse()} />
                </Box>
              )}
            </Paper>
          </>
        )}

        <Dialog open={rejectOpen} onClose={() => !saving && setRejectOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Reject &amp; Reopen</DialogTitle>
          <DialogContent>
            <Typography color="text.secondary" sx={{ mb: 2 }}>Explain what must be corrected. The Assignee will receive this reason by email and in-app notification.</Typography>
            <TextField
              autoFocus
              required
              fullWidth
              multiline
              minRows={4}
              label="Reason for rejection"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRejectOpen(false)} disabled={saving}>Cancel</Button>
            <Button color="error" variant="contained" onClick={reject} disabled={saving || !reason.trim()}>Confirm Rejection</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={reopenOpen} onClose={() => !saving && setReopenOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Reopen Nonconformance</DialogTitle>
          <DialogContent>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Explain why this closed nonconformance needs further action. The Assignee will be notified.
            </Typography>
            <TextField
              autoFocus
              required
              fullWidth
              multiline
              minRows={4}
              label="Reason for reopening"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReopenOpen(false)} disabled={saving}>Cancel</Button>
            <Button color="warning" variant="contained" onClick={reopen} disabled={saving || !reason.trim()}>
              Confirm Reopen
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={adminDialog === "reassign"} onClose={() => !saving && setAdminDialog(null)} fullWidth maxWidth="sm">
          <DialogTitle>Reassign Nonconformance</DialogTitle>
          <DialogContent>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Select a new responsible person. Both the current and new assignee will be notified.
            </Typography>
            <TextField
              select
              required
              fullWidth
              label="New assignee"
              value={newAssigneeId}
              onChange={(event) => setNewAssigneeId(event.target.value)}
              sx={{ mb: 2 }}
            >
              {assignableUsers
                .filter((user) => user.id !== nc?.assigneeId)
                .map((user) => (
                  <MenuItem key={user.id} value={user.id}>{userName(user)}</MenuItem>
                ))}
            </TextField>
            <TextField
              required
              fullWidth
              multiline
              minRows={3}
              label="Reason for reassignment"
              value={adminReason}
              onChange={(event) => setAdminReason(event.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAdminDialog(null)} disabled={saving}>Cancel</Button>
            <Button variant="contained" onClick={applyReassign} disabled={saving || !newAssigneeId || !adminReason.trim()}>
              {saving ? "Reassigning..." : "Reassign"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={adminDialog === "status"} onClose={() => !saving && setAdminDialog(null)} fullWidth maxWidth="sm">
          <DialogTitle>Force Status</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              This is an administrative override and will be recorded in the audit history.
            </Alert>
            <TextField
              select
              required
              fullWidth
              label="New status"
              value={newStatus}
              onChange={(event) => setNewStatus(event.target.value)}
              sx={{ mb: 2 }}
            >
              {["assigned", "draft", "response_submitted", "under_review", "reopened", "closed"]
                .filter((status) => status !== nc?.status)
                .map((status) => (
                  <MenuItem key={status} value={status}>{status.replaceAll("_", " ")}</MenuItem>
                ))}
            </TextField>
            <TextField
              required
              fullWidth
              multiline
              minRows={3}
              label="Reason for status override"
              value={adminReason}
              onChange={(event) => setAdminReason(event.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAdminDialog(null)} disabled={saving}>Cancel</Button>
            <Button color="warning" variant="contained" onClick={applyForceStatus} disabled={saving || !newStatus || !adminReason.trim()}>
              {saving ? "Updating..." : "Force Status"}
            </Button>
          </DialogActions>
        </Dialog>
      </PageContent>
    </Layout>
  );
}
