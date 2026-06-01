import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Snackbar,
  Alert,
  TextField,
  CircularProgress,
} from "@mui/material";
import Layout from "../components/Layout";
import api from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import UserPageAccessFields from "../components/UserPageAccessFields";
import { APP_PAGES } from "../constants/pageAccess";
import { VIEW_ONLY_FORBIDDEN_PAGE_KEYS } from "../utils/pageAccess";

function filterSelectablePages(pages) {
  return pages.filter((p) => !VIEW_ONLY_FORBIDDEN_PAGE_KEYS.has(p.key));
}

export default function UserViewAccessPage() {
  const { isDarkMode } = useTheme();
  const { isSuperAdmin } = useAuth();

  const [email, setEmail] = useState("");
  const [lookupMsg, setLookupMsg] = useState("");
  const [checkingEmail, setCheckingEmail] = useState(false);

  const [selectedPages, setSelectedPages] = useState(["dashboard"]);
  const [pageCatalog, setPageCatalog] = useState(APP_PAGES);

  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });

  const emailValid = useMemo(
    () => /^\S+@\S+\.\S+$/.test(email.trim()),
    [email]
  );
  const showPageSelection = emailValid;

  useEffect(() => {
    api.get("/users/page-access-catalog").then((res) => {
      if (res.data?.pages?.length) {
        setPageCatalog(filterSelectablePages(res.data.pages));
      }
    }).catch(() => {});
  }, [isSuperAdmin]);

  const fieldSx = {
    mb: 2.5,
    "& .MuiOutlinedInput-root": {
      borderRadius: 3,
      bgcolor: isDarkMode ? "#111827" : "#FFFFFF",
      "& fieldset": { borderColor: isDarkMode ? "#374151" : "#E5E7EB" },
      "&.Mui-focused fieldset": { borderColor: "#0B4DA6", borderWidth: 1.5 },
    },
  };

  const lookupEmail = async () => {
    const trimmed = email.trim();
    if (!emailValid) {
      setLookupMsg("");
      return;
    }

    setCheckingEmail(true);
    try {
      const res = await api.post("/users/lookup-by-email", { email: trimmed });
      if (res.data?.exists) {
        setLookupMsg(
          res.data.user?.viewOnly || res.data.user?.accessMode === "view_only"
            ? "Existing user — a new invitation email will be sent."
            : "Existing user — they will receive a view-access invitation."
        );
      } else {
        setLookupMsg(res.data?.message || "New user — an invitation email will be sent.");
      }
    } catch (err) {
      setLookupMsg(err?.response?.data?.message || "");
    } finally {
      setCheckingEmail(false);
    }
  };

  const togglePage = (key) => {
    setSelectedPages((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const resetForm = () => {
    setEmail("");
    setLookupMsg("");
    setSelectedPages(["dashboard"]);
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();

    if (!emailValid) {
      setSnack({ open: true, msg: "Enter a valid email address.", severity: "warning" });
      return;
    }

    if (selectedPages.length === 0) {
      setSnack({ open: true, msg: "Select at least one page.", severity: "warning" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/users/invite-view-access", {
        email: email.trim(),
        allowedPages: selectedPages,
      });
      if (!res.data?.success) throw new Error(res.data?.message || "Failed");

      const msg = res.data.emailSent
        ? res.data.message || "Invitation sent."
        : `${res.data.message || "Saved."} ${res.data.emailError || "Email could not be sent."}`;

      setSnack({
        open: true,
        msg,
        severity: res.data.emailSent ? "success" : "warning",
      });
      if (res.data.emailSent) resetForm();
    } catch (err) {
      setSnack({
        open: true,
        msg: err?.response?.data?.message || err.message || "Failed to send invitation",
        severity: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <Box sx={{ width: "100%", minWidth: 0 }}>
        <Typography
          variant="h5"
          sx={{ fontWeight: 600, mb: 1, color: isDarkMode ? "#F9FAFB" : "#111827" }}
        >
          View access
        </Typography>
        <Typography
          variant="body2"
          sx={{ mb: 3, maxWidth: 900, color: isDarkMode ? "#9CA3AF" : "text.secondary" }}
        >
          Enter their email and choose pages. We send an invitation with a link and a 6-digit code.
          They verify by email, set a password, then sign in with view-only access.
        </Typography>

        <Paper
          elevation={0}
          component="form"
          onSubmit={handleSubmit}
          sx={{
            width: "100%",
            p: { xs: 2.5, sm: 3, md: 4 },
            borderRadius: 4,
            bgcolor: isDarkMode ? "#1B212C" : "#FBFBFA",
            border: isDarkMode ? "1px solid #374151" : "1px solid #E5E7EB",
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600, mb: 1, color: isDarkMode ? "#F9FAFB" : "#374151" }}
          >
            1. Email address
          </Typography>
          <Box sx={{ maxWidth: { xs: "100%", md: 560 } }}>
            <TextField
              fullWidth
              type="email"
              autoComplete="email"
              placeholder="person@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setLookupMsg("");
              }}
              onBlur={lookupEmail}
              sx={fieldSx}
              helperText={checkingEmail ? "Checking…" : lookupMsg}
            />
          </Box>

          {showPageSelection && (
            <Box sx={{ mt: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 0.5, color: isDarkMode ? "#F9FAFB" : "#374151" }}
              >
                2. Select pages they can view
              </Typography>
              <UserPageAccessFields
                viewOnly
                onViewOnlyChange={() => {}}
                selectedPages={selectedPages}
                onTogglePage={togglePage}
                pageCatalog={pageCatalog}
                isDarkMode={isDarkMode}
                forceViewOnly
              />
            </Box>
          )}

          <Box sx={{ mt: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting || !showPageSelection || selectedPages.length === 0}
              startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
              sx={{
                textTransform: "none",
                borderRadius: 50,
                px: 4,
                py: 1.2,
                bgcolor: "#0B57D0",
                fontWeight: 700,
                boxShadow: "none",
                "&:hover": { bgcolor: "#0842A0", boxShadow: "none" },
              }}
            >
              {submitting ? "Sending…" : "Send invitation"}
            </Button>
            {email && (
              <Button
                type="button"
                variant="text"
                onClick={resetForm}
                sx={{ textTransform: "none", borderRadius: 50 }}
              >
                Clear
              </Button>
            )}
          </Box>
        </Paper>
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={5000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Layout>
  );
}
