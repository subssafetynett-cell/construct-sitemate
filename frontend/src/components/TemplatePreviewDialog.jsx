import React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
} from "@mui/material";
import { useTheme } from "../context/ThemeContext";

export default function TemplatePreviewDialog({ open, url, title = "Form preview", onClose }) {
    const { isDarkMode } = useTheme();
    const headingColor = isDarkMode ? "#F9FAFB" : "#111827";
    const subColor = isDarkMode ? "#9CA3AF" : "#6B7280";
    const borderColor = isDarkMode ? "#374151" : "#E5E7EB";

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="lg"
            PaperProps={{
                sx: {
                    height: "85vh",
                    borderRadius: 3,
                    bgcolor: isDarkMode ? "#1B212C" : "#FFFFFF",
                    border: `1px solid ${borderColor}`,
                    display: "flex",
                    flexDirection: "column",
                },
            }}
        >
            <DialogTitle sx={{ fontWeight: 700, color: headingColor, pb: 1 }}>
                {title}
                <Typography variant="body2" sx={{ color: subColor, mt: 0.5, fontWeight: 400 }}>
                    Read-only preview
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ p: 0, flex: 1, overflow: "hidden" }}>
                {url ? (
                    <iframe
                        src={url}
                        title={title}
                        style={{ border: "none", width: "100%", height: "100%" }}
                    />
                ) : null}
            </DialogContent>
            <DialogActions
                sx={{
                    px: 3,
                    py: 2,
                    borderTop: `1px solid ${borderColor}`,
                    bgcolor: isDarkMode ? "#111827" : "#F9FAFB",
                }}
            >
                <Button onClick={onClose} sx={{ textTransform: "none", fontWeight: 600, color: subColor }}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}
