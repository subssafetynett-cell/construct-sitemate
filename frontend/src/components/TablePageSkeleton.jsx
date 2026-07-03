import React from "react";
import { Box, Skeleton } from "@mui/material";

export default function TablePageSkeleton({ rows = 6, columns = 5 }) {
  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ display: "flex", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
        <Skeleton variant="rounded" width={220} height={40} />
        <Skeleton variant="rounded" width={120} height={40} />
      </Box>
      <Skeleton variant="rounded" height={44} sx={{ mb: 1 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={52} sx={{ mb: 0.75 }} />
      ))}
    </Box>
  );
}
