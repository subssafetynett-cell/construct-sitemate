import React from "react";
import { Alert, Box } from "@mui/material";
import { useAuth } from "../context/AuthContext";

export default function ViewOnlyBanner() {
  const { isViewOnly } = useAuth();
  if (!isViewOnly) return null;

  return (
    <Box sx={{ px: 2, pt: 1.5, pb: 0 }}>
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        You have view-only access. You can browse allowed pages but cannot save or change data.
      </Alert>
    </Box>
  );
}
