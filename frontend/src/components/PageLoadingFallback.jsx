import React from "react";
import { Box, Skeleton } from "@mui/material";

/**
 * Route-level Suspense fallback — shows layout-shaped placeholders instead of a blank screen.
 */
export default function PageLoadingFallback() {
  return (
    <Box
      sx={{
        minHeight: "60vh",
        p: { xs: 2, md: 4 },
        maxWidth: 1200,
        mx: "auto",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <Skeleton variant="text" width="40%" height={36} sx={{ mb: 2 }} />
      <Skeleton variant="text" width="60%" height={20} sx={{ mb: 3 }} />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2, mb: 3 }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rounded" height={88} />
        ))}
      </Box>
      <Skeleton variant="rounded" height={280} sx={{ mb: 2 }} />
      <Skeleton variant="rounded" height={200} />
    </Box>
  );
}
