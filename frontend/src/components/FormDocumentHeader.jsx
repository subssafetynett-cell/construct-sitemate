import React from "react";
import { Box } from "@mui/material";
import FormLogoHeaderColumn from "./FormLogoHeaderColumn";
import {
  FORM_BRAND_LOGO_LEFT,
  FORM_BRAND_LOGO_RIGHT,
} from "../utils/formBrandLogos";

export const formDocumentHeaderRowSx = {
  display: "flex",
  flexWrap: { xs: "wrap", md: "nowrap" },
  width: "100%",
};

export const formHeaderCenterColumnSx = (borderColor) => ({
  width: { xs: "100%", md: "40%" },
  flex: { xs: "1 1 100%", md: "0 0 40%" },
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  borderRight: `1px solid ${borderColor}`,
});

/**
 * Three-column document header: left logo | center metadata | right logo.
 * Empty slots fall back to Safety nett (left) and Construct Lifts (right).
 */
export default function FormDocumentHeader({
  borderColor = "#CCC",
  readOnly = false,
  exportMode = false,
  leftImageSrc,
  onLeftImageChange,
  leftCompanyLogoUrl = FORM_BRAND_LOGO_LEFT,
  rightImageSrc,
  onRightImageChange,
  rightCompanyLogoUrl = FORM_BRAND_LOGO_RIGHT,
  uploadLabel = "Upload Logo",
  children,
  sx,
}) {
  return (
    <Box sx={{ ...formDocumentHeaderRowSx, border: `1px solid ${borderColor}`, ...sx }}>
      <FormLogoHeaderColumn
        imageSrc={leftImageSrc}
        onImageChange={onLeftImageChange}
        companyLogoUrl={leftCompanyLogoUrl || FORM_BRAND_LOGO_LEFT}
        readOnly={readOnly}
        exportMode={exportMode}
        side="left"
        borderColor={borderColor}
        uploadLabel={uploadLabel}
      />
      <Box sx={formHeaderCenterColumnSx(borderColor)}>{children}</Box>
      <FormLogoHeaderColumn
        imageSrc={rightImageSrc}
        onImageChange={onRightImageChange}
        companyLogoUrl={rightCompanyLogoUrl || FORM_BRAND_LOGO_RIGHT}
        readOnly={readOnly}
        exportMode={exportMode}
        side="right"
        borderColor={borderColor}
        uploadLabel={uploadLabel}
      />
    </Box>
  );
}
