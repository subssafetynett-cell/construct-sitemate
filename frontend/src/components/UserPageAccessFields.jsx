import React from "react";
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  FormGroup,
  FormControlLabel as MuiCheckboxLabel,
  Checkbox,
  Divider,
} from "@mui/material";

/**
 * Shared UI for configuring view-only page access on a user.
 */
export default function UserPageAccessFields({
  viewOnly,
  onViewOnlyChange,
  selectedPages,
  onTogglePage,
  pageCatalog = [],
  isDarkMode = false,
  disabled = false,
  forceViewOnly = false,
}) {
  const effectiveViewOnly = forceViewOnly || viewOnly;

  return (
    <Box sx={{ mt: 2 }}>
      {!forceViewOnly && (
        <>
          <Divider sx={{ mb: 2, borderColor: isDarkMode ? "#374151" : "#E5E7EB" }} />
          <FormControlLabel
            control={
              <Switch
                checked={viewOnly}
                onChange={(e) => onViewOnlyChange(e.target.checked)}
                disabled={disabled}
              />
            }
            label={
              <Box>
                <Typography sx={{ fontWeight: 600, color: isDarkMode ? "#F9FAFB" : "#111827" }}>
                  View-only access
                </Typography>
                <Typography variant="caption" sx={{ color: isDarkMode ? "#9CA3AF" : "#6B7280" }}>
                  User can only view selected pages; create, edit, and delete are blocked.
                </Typography>
              </Box>
            }
          />
        </>
      )}

      {effectiveViewOnly && (
        <Box sx={{ mt: forceViewOnly ? 0 : 2, pl: 0.5 }}>
          <FormGroup
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
                md: "1fr 1fr 1fr",
                lg: "1fr 1fr 1fr 1fr",
              },
              gap: 0.5,
            }}
          >
            {pageCatalog.map((page) => (
              <MuiCheckboxLabel
                key={page.key}
                control={
                  <Checkbox
                    size="small"
                    checked={selectedPages.includes(page.key)}
                    onChange={() => onTogglePage(page.key)}
                    disabled={disabled}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ color: isDarkMode ? "#D1D5DB" : "#4B5563" }}>
                    {page.label}
                  </Typography>
                }
              />
            ))}
          </FormGroup>
          {selectedPages.length === 0 && (
            <Typography variant="caption" color="error" sx={{ mt: 1, display: "block" }}>
              Select at least one page.
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
