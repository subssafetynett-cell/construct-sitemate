import React from "react";
import { TextField, Typography } from "@mui/material";

/**
 * Optional description for uploaded evidence. Renders nothing when empty in read-only / PDF export.
 */
export default function ImageEvidenceDescriptionField({
    value,
    onChange,
    readOnly = false,
    exportMode = false,
    placeholder = "Describe this evidence (optional)",
    sx = {},
}) {
    const text = value ?? "";
    const trimmed = text.trim();

    if (readOnly || exportMode) {
        if (!trimmed) return null;
        return (
            <Typography
                component="p"
                sx={{
                    fontSize: exportMode ? "0.75rem" : "0.8rem",
                    color: "#374151",
                    mt: 0.75,
                    mb: 0,
                    lineHeight: 1.4,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                    ...sx,
                }}
            >
                {trimmed}
            </Typography>
        );
    }

    return (
        <TextField
            fullWidth
            size="small"
            multiline
            minRows={2}
            maxRows={6}
            placeholder={placeholder}
            value={text}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            className="pdf-hide-on-export"
            sx={{ mt: 1, ...sx }}
            slotProps={{
                htmlInput: {
                    "aria-label": "Evidence description",
                },
                input: {
                    sx: {
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                        lineHeight: 1.4,
                        alignItems: "flex-start",
                    },
                },
            }}
        />
    );
}
