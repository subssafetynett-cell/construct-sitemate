import React, { useRef, useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  CircularProgress,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  fetchSavedSignaturesWithImages,
  readSavedSignaturesFromLocalStorage,
} from "../utils/savedSignatureLibrary";

function getCanvasCoords(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function SignatureDrawingPad({
  heightCss,
  onApply,
  strokeColor = "#111827",
  autoApply = false,
  hideUseButton = false,
}) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastRef = useRef(null);
  const hasInkRef = useRef(false);
  const [, bump] = useState(0);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const w = Math.max(120, Math.floor(parent.clientWidth));
    const h = heightCss;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    hasInkRef.current = false;
    lastRef.current = null;
    bump((n) => n + 1);
  }, [heightCss, strokeColor]);

  useEffect(() => {
    resizeCanvas();
    const ro = new ResizeObserver(() => resizeCanvas());
    const el = canvasRef.current?.parentElement;
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [resizeCanvas]);

  const drawSegment = useCallback((x, y) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const last = lastRef.current;
    if (last) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      hasInkRef.current = true;
    }
    lastRef.current = { x, y };
  }, []);

  const onPointerDown = (e) => {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    drawingRef.current = true;
    const { x, y } = getCanvasCoords(canvas, e.clientX, e.clientY);
    lastRef.current = { x, y };
  };

  const onPointerMove = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getCanvasCoords(canvas, e.clientX, e.clientY);
    drawSegment(x, y);
  };

  const applyPad = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasInkRef.current) return;
    onApply(canvas.toDataURL("image/png"));
  };

  const tryAutoApply = () => {
    if (autoApply && hasInkRef.current) applyPad();
  };

  const endStroke = (e) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastRef.current = null;
    if (canvasRef.current && e?.pointerId != null) {
      try {
        canvasRef.current.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    tryAutoApply();
  };

  const clearPad = () => {
    resizeCanvas();
    if (autoApply) onApply(null);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          bgcolor: "#fff",
          touchAction: "none",
          cursor: "crosshair",
          overflow: "hidden",
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLeave={(e) => {
            if (drawingRef.current) endStroke(e);
          }}
        />
      </Box>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }} alignItems="center">
        <Button size="small" variant="outlined" onClick={clearPad} sx={{ textTransform: "none" }}>
          Clear
        </Button>
        {!hideUseButton && !autoApply && (
        <Button size="small" variant="contained" onClick={applyPad} sx={{ textTransform: "none", bgcolor: "#E89F17", "&:hover": { bgcolor: "#cc8b14" } }}>
          Use signature
        </Button>
        )}
      </Stack>
    </Box>
  );
}

function SavedSignaturePickerDialog({ open, onClose, onPick, userId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    (async () => {
      try {
        const remote = await fetchSavedSignaturesWithImages();
        if (!cancelled) setItems(remote);
      } catch {
        const local = readSavedSignaturesFromLocalStorage(userId);
        if (!cancelled) {
          setItems(local);
          setLoadError(local.length === 0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>Select saved signature</DialogTitle>
      <DialogContent dividers sx={{ maxHeight: "65vh" }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={32} sx={{ color: "#E89F17" }} />
          </Box>
        ) : loadError ? (
          <Typography color="text.secondary">
            Could not load saved signatures. Check your connection or open the Saved signatures page to add some.
          </Typography>
        ) : items.length === 0 ? (
          <Box>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              No saved signatures yet. Create them on the Saved signatures page, click Save there, then return here.
            </Typography>
            <Button variant="contained" component={RouterLink} to="/saved-signatures" onClick={onClose} sx={{ textTransform: "none", bgcolor: "#E89F17", "&:hover": { bgcolor: "#cc8b14" } }}>
              Open Saved signatures
            </Button>
          </Box>
        ) : (
          <List dense disablePadding>
            {items.map((entry) => (
              <ListItemButton
                key={entry.id}
                onClick={() => {
                  onPick(entry.image);
                  onClose();
                }}
                sx={{ borderRadius: 1, mb: 0.5, alignItems: "center" }}
              >
                <ListItemAvatar sx={{ minWidth: 72 }}>
                  <Box
                    component="img"
                    src={entry.image}
                    alt=""
                    sx={{
                      width: 64,
                      height: 40,
                      objectFit: "contain",
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                      bgcolor: "#fff",
                    }}
                  />
                </ListItemAvatar>
                <ListItemText primary={entry.label || "Untitled"} secondary="Tap to use this signature" />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        {items.length > 0 && (
          <Button component={RouterLink} to="/saved-signatures" onClick={onClose} sx={{ textTransform: "none" }}>
            Manage saved
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

/**
 * Shows a drawn signature (mouse / touch / pen) and optional image upload.
 * value: data URL or http(s) URL or empty
 * onChange: (dataUrl: string | null) => void
 * savedLibraryEnabled: show "Select saved signature" from the Saved signatures page (server-backed).
 */
export default function SignatureCapture({
  value,
  onChange,
  readOnly = false,
  compact = false,
  helperText = "Draw with your mouse or finger, then tap “Use signature”. You can upload an image, or use “Select saved signature” if you saved some on the Saved signatures page.",
  strokeColor = "#111827",
  savedLibraryEnabled = true,
  autoApplyDrawing = false,
}) {
  const { currentUser } = useAuth();
  const userId = currentUser?.id || currentUser?._id || "me";
  const [pickerOpen, setPickerOpen] = useState(false);
  const heightCss = compact ? 72 : 120;

  const hasImageValue = (v) =>
    v &&
    typeof v === "string" &&
    (v.startsWith("data:image/") ||
      v.startsWith("http://") ||
      v.startsWith("https://") ||
      v.startsWith("blob:"));

  /** Saved-signatures page: show stored/uploaded image once; pad only while drawing. */
  const [showDrawingPad, setShowDrawingPad] = useState(
    () => !autoApplyDrawing || !hasImageValue(value)
  );

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onChange(typeof reader.result === "string" ? reader.result : null);
      if (autoApplyDrawing) setShowDrawingPad(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const openPicker = () => setPickerOpen(true);

  const selectActions = savedLibraryEnabled ? (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: compact ? 0.75 : 1 }} alignItems="center">
      <Button size="small" variant="outlined" onClick={openPicker} sx={{ textTransform: "none" }}>
        Select saved signature
      </Button>
    </Stack>
  ) : null;

  if (readOnly) {
    if (!value) {
      return (
        <Box
          sx={{
            width: "100%",
            minHeight: compact ? 40 : 60,
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        />
      );
    }
    return (
      <Box component="img" src={value} alt="Signature" sx={{ width: "100%", maxHeight: compact ? 48 : 80, objectFit: "contain" }} />
    );
  }

  const hasImage = hasImageValue(value);

  if (autoApplyDrawing && hasImage && !showDrawingPad) {
    return (
      <Box sx={{ width: "100%" }}>
        {!compact && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            {helperText}
          </Typography>
        )}
        <Box
          component="img"
          src={value}
          alt="Signature"
          sx={{
            width: "100%",
            maxHeight: compact ? 56 : 120,
            objectFit: "contain",
            mb: 1,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            bgcolor: "#fff",
          }}
        />
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          <Button
            size="small"
            variant="text"
            onClick={() => {
              onChange(null);
              setShowDrawingPad(true);
            }}
            sx={{ textTransform: "none" }}
          >
            Remove
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setShowDrawingPad(true)}
            sx={{ textTransform: "none" }}
          >
            Draw again
          </Button>
          <Button size="small" variant="outlined" component="label" sx={{ textTransform: "none" }}>
            Replace with image
            <input type="file" hidden accept="image/*" onChange={handleFile} />
          </Button>
        </Stack>
      </Box>
    );
  }

  if (hasImage && !autoApplyDrawing) {
    return (
      <Box sx={{ width: "100%" }}>
        <Box component="img" src={value} alt="Signature" sx={{ width: "100%", maxHeight: compact ? 56 : 80, objectFit: "contain", mb: 0.5 }} />
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          <Button size="small" variant="text" onClick={() => onChange(null)} sx={{ textTransform: "none" }}>
            Remove
          </Button>
          <Button size="small" variant="outlined" component="label" sx={{ textTransform: "none" }}>
            Replace with image
            <input type="file" hidden accept="image/*" onChange={handleFile} />
          </Button>
          {savedLibraryEnabled && (
            <Button size="small" variant="outlined" onClick={openPicker} sx={{ textTransform: "none" }}>
              Replace with saved
            </Button>
          )}
        </Stack>
        {savedLibraryEnabled && (
          <SavedSignaturePickerDialog open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={onChange} userId={userId} />
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      {!compact && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          {helperText}
        </Typography>
      )}
      <SignatureDrawingPad
        heightCss={heightCss}
        strokeColor={strokeColor}
        onApply={onChange}
        autoApply={autoApplyDrawing}
        hideUseButton={autoApplyDrawing}
      />
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center" sx={{ mt: 0.5 }}>
        <Button size="small" variant="text" component="label" sx={{ textTransform: "none" }}>
          Upload image instead
          <input type="file" hidden accept="image/*" onChange={handleFile} />
        </Button>
      </Stack>
      {selectActions}
      {savedLibraryEnabled && (
        <SavedSignaturePickerDialog open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={onChange} userId={userId} />
      )}
    </Box>
  );
}
