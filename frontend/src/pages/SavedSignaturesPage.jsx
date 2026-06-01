import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  IconButton,
  Snackbar,
  Alert,
  Stack,
  CircularProgress,
} from "@mui/material";
import { PenLine, Plus, Trash2, Save } from "lucide-react";
import Layout from "../components/Layout";
import SignatureCapture from "../components/SignatureCapture";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import {
  loadSavedSignaturesWithMigration,
  syncSavedSignatures,
} from "../utils/savedSignatureLibrary";

const makeId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `sig-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export default function SavedSignaturesPage() {
  const { isDarkMode } = useTheme();
  const { currentUser } = useAuth();
  const userId = currentUser?.id || currentUser?._id || "me";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { signatures, migrated, offline } =
          await loadSavedSignaturesWithMigration(userId);
        if (cancelled) return;
        if (signatures.length > 0) {
          setItems(
            signatures.map((row) => ({
              id: row.id || makeId(),
              label: typeof row.label === "string" ? row.label : "",
              image:
                typeof row.image === "string" && row.image ? row.image : null,
              confirmed: Boolean(row.image),
            }))
          );
          if (migrated) {
            setSnack({
              open: true,
              message:
                "Signatures from this browser were synced to your account.",
              severity: "success",
            });
          } else if (offline) {
            setSnack({
              open: true,
              message:
                "Could not reach the server. Showing signatures saved on this device only.",
              severity: "warning",
            });
          }
        } else {
          setItems([{ id: makeId(), label: "Signature 1", image: null, confirmed: false }]);
        }
      } catch {
        if (!cancelled) {
          setItems([{ id: makeId(), label: "Signature 1", image: null, confirmed: false }]);
          setSnack({
            open: true,
            message: "Could not load saved signatures. You can still add and save new ones.",
            severity: "warning",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const persist = useCallback(async () => {
    setSaving(true);
    try {
      const saved = await syncSavedSignatures(items);
      setItems(
        saved.map((row) => ({
          id: row.id || makeId(),
          label: typeof row.label === "string" ? row.label : "",
          image: typeof row.image === "string" && row.image ? row.image : null,
          confirmed: Boolean(row.image),
        }))
      );
      setSnack({
        open: true,
        message: "Saved to your account. Available on any device when you sign in.",
        severity: "success",
      });
    } catch (e) {
      console.error(e);
      const message =
        e?.response?.data?.message ||
        "Could not save signatures. Check your connection and try again.";
      setSnack({ open: true, message, severity: "error" });
    } finally {
      setSaving(false);
    }
  }, [items]);

  const addRow = () => {
    setItems((prev) => [
      ...prev,
      { id: makeId(), label: `Signature ${prev.length + 1}`, image: null, confirmed: false },
    ]);
  };

  const removeRow = (id) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  };

  const updateRow = (id, patch) => {
    setItems((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, ...patch, confirmed: false } : r
      )
    );
  };

  const deleteSavedSignature = async (id) => {
    const next = items.map((r) =>
      r.id === id ? { ...r, image: null, confirmed: false } : r
    );
    setItems(next);
    setSaving(true);
    try {
      const saved = await syncSavedSignatures(next);
      setItems(
        saved.map((row) => ({
          id: row.id || makeId(),
          label: typeof row.label === "string" ? row.label : "",
          image: typeof row.image === "string" && row.image ? row.image : null,
          confirmed: Boolean(row.image),
        }))
      );
      setSnack({ open: true, message: "Signature deleted.", severity: "success" });
    } catch (e) {
      console.error(e);
      setSnack({
        open: true,
        message: e?.response?.data?.message || "Could not delete signature.",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const isSavedView = (row) => Boolean(row.confirmed && row.image);

  const headingColor = isDarkMode ? "#F9FAFB" : "#111827";
  const subColor = isDarkMode ? "#9CA3AF" : "#6B7280";

  if (loading) {
    return (
      <Layout pageTitle="Saved signatures">
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress sx={{ color: "#E89F17" }} />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Saved signatures">
      <Box sx={{ width: "100%", minWidth: 0, py: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          <Box
            sx={{
              p: 1.25,
              borderRadius: 2,
              bgcolor: "rgba(232, 159, 23, 0.12)",
              color: "#E89F17",
              display: "flex",
            }}
          >
            <PenLine size={22} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: headingColor }}>
              Saved signatures
            </Typography>
            <Typography sx={{ color: subColor, fontSize: "0.95rem", mt: 0.5 }}>
              Draw or upload each signature, give it a name, then save. Stored in your account and available when filling in forms.
            </Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 3 }}>
          {items.some((r) => !r.confirmed) && (
          <Button
            variant="contained"
            startIcon={<Save size={18} />}
            onClick={persist}
            disabled={loading || saving}
            sx={{
              bgcolor: "#E89F17",
              textTransform: "none",
              fontWeight: 600,
              "&:hover": { bgcolor: "#cc8b14" },
            }}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<Plus size={18} />}
            onClick={addRow}
            disabled={loading}
            sx={{ textTransform: "none", borderColor: isDarkMode ? "#4B5563" : "#E5E7EB", color: headingColor }}
          >
            Add signature
          </Button>
        </Stack>

        <Stack spacing={2.5}>
          {items.map((row, index) => (
            <Paper
              key={row.id}
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: `1px solid ${isDarkMode ? "#374151" : "#E5E7EB"}`,
                bgcolor: isDarkMode ? "#1B212C" : "#FFFFFF",
              }}
            >
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} sx={{ mb: isSavedView(row) ? 1.5 : 2 }}>
                <Typography sx={{ fontWeight: 600, color: headingColor }}>
                  {row.label?.trim() || `Signature ${index + 1}`}
                </Typography>
                {!isSavedView(row) && (
                  <IconButton
                    size="small"
                    aria-label="Remove slot"
                    disabled={loading || items.length <= 1}
                    onClick={() => removeRow(row.id)}
                    sx={{ color: isDarkMode ? "#F87171" : "#DC2626" }}
                  >
                    <Trash2 size={18} />
                  </IconButton>
                )}
              </Stack>
              {isSavedView(row) ? (
                <Box>
                  <Box
                    component="img"
                    src={row.image}
                    alt={row.label || "Signature"}
                    sx={{
                      width: "100%",
                      maxHeight: 140,
                      objectFit: "contain",
                      mb: 2,
                      border: `1px solid ${isDarkMode ? "#374151" : "#E5E7EB"}`,
                      borderRadius: 2,
                      bgcolor: "#fff",
                      p: 1,
                    }}
                  />
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Trash2 size={18} />}
                    disabled={loading || saving}
                    onClick={() => deleteSavedSignature(row.id)}
                    sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                    Delete
                  </Button>
                </Box>
              ) : (
                <>
                  <TextField
                    label="Name (e.g. Site manager, Visitor)"
                    fullWidth
                    size="small"
                    value={row.label}
                    disabled={loading}
                    onChange={(e) => updateRow(row.id, { label: e.target.value })}
                    sx={{ mb: 2 }}
                    InputProps={{ sx: { borderRadius: 2 } }}
                  />
                  <SignatureCapture
                    key={`${row.id}-${row.confirmed ? "saved" : "edit"}`}
                    value={row.image}
                    onChange={(url) => updateRow(row.id, { image: url })}
                    readOnly={loading}
                    savedLibraryEnabled={false}
                    autoApplyDrawing
                    helperText="Draw with your mouse or finger, or upload an image. When finished, click Save at the top."
                  />
                </>
              )}
            </Paper>
          ))}
        </Stack>
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={5000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))} sx={{ width: "100%" }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Layout>
  );
}
