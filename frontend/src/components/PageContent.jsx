import { Box } from "@mui/material";

/** Full-width page shell with responsive horizontal padding (no max-width cap). */
export default function PageContent({ children, sx = {}, ...props }) {
  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        px: { xs: 2, sm: 3, md: 4, xl: 5 },
        py: { xs: 2.5, sm: 3, md: 3.5 },
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
}
