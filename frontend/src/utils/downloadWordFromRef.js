import { shouldSkipBrandLogos, loadBrandLogos } from "./pdfGenerator";

/**
 * Export a rendered form DOM node as a Word-compatible .doc (HTML blob).
 * Mirrors the concern/report Word export used on GenericReportPage.
 */
export async function downloadWordFromRef(printRef, fileName = "document", onComplete = null, options = {}) {
  try {
    const root = printRef?.current;
    if (!root) {
      throw new Error("No print reference provided for Word generation.");
    }

    const contentHtml = root.innerHTML;
    const docTitle = options.title || fileName || "Document";

    let logoHeaderHtml = "";
    if (!shouldSkipBrandLogos(options)) {
      try {
        const logos = await loadBrandLogos();
        if (logos?.left?.dataUrl || logos?.right?.dataUrl) {
          const logoCell = (logo, align, heightPx = 40) =>
            logo?.dataUrl
              ? `<td style="width:50%;text-align:${align};vertical-align:middle;border:none;padding:0;"><img src="${logo.dataUrl}" style="height:${heightPx}px;width:auto;" /></td>`
              : `<td style="width:50%;border:none;padding:0;"></td>`;
          logoHeaderHtml = `<table style="width:100%;border:none;border-collapse:collapse;margin-bottom:16px;"><tr>${logoCell(logos.left, "left", 40)}${logoCell(logos.right, "right", options.rightLogoHeightPx || 48)}</tr></table>`;
        }
      } catch (logoErr) {
        console.warn("Could not embed header logos in Word export", logoErr);
      }
    }

    const wordDocument = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${String(docTitle).replace(/</g, "&lt;")}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
    @page { size: A4; margin: 20mm 15mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 12pt; }
    img { max-width: 100%; }
    table { border-collapse: collapse; width: 100%; }
</style>
</head>
<body>${logoHeaderHtml}${contentHtml}</body>
</html>`;

    const safeName = String(fileName || "document").replace(/[^\w\s.-]+/g, "_").trim() || "document";
    const blob = new Blob(["\ufeff", wordDocument], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeName}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (onComplete) onComplete();
  } catch (err) {
    console.error("Word generation failed:", err);
    if (onComplete) onComplete(err);
  }
}
