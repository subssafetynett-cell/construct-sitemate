import jsPDF from "jspdf";
import { loadBrandLogos } from "./pdfGenerator";

const MARGIN_X = 14;
const HEADER_INSET = 24;
const FOOTER_INSET = 14;

const RESPONSE_FIELDS = [
  ["correctionDone", "What correction has been done to eliminate the nonconformity?"],
  ["rootCause", "What is the root cause?"],
  ["correctiveAction", "What corrective action has been taken to eliminate the root cause?"],
];

const DEFAULT_CONCERN_SCHEMA = [
  {
    number: "1",
    heading: "Project details",
    fields: [
      ["report_date", "Report date"],
      ["customer_reference", "Customer reference"],
      ["project_name", "Project name"],
      ["customer_name", "Customer name"],
    ],
  },
  {
    number: "2",
    heading: "Management & contacts",
    fields: [
      ["fujitec_manager", "Manager"],
      ["fujitec_supervisor", "Supervisor"],
      ["responsible_person", "Responsible engineer(s)"],
      ["site_contact", "Site contact"],
    ],
  },
  {
    number: "3",
    heading: "Location details",
    fields: [
      ["full_address", "Full address"],
      ["exact_location", "Exact location of incident"],
    ],
  },
  {
    number: "4",
    heading: "Incident classification",
    special: "incidents",
    fields: [],
  },
  {
    number: "5",
    heading: "Observations & suggestions",
    fields: [
      ["observation_details", "Observation details"],
      ["observation_photo", "Observation photo", "photo"],
      ["corrective_action", "Corrective action proposed"],
      ["suggestion_photo", "Supporting photo", "photo"],
    ],
  },
  {
    number: "6",
    heading: "Nonconformance",
    fields: [
      ["noncon_action", "Correction action"],
      ["noncon_category", "Category"],
      ["noncon_priority", "Priority"],
      ["noncon_responsible", "Assignee (responsible person)"],
      ["noncon_date", "Due date"],
      ["noncon_photo", "Nonconformance photo", "photo"],
    ],
  },
];

function userName(user) {
  return `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.email || "Unknown user";
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function normalizeSchema(schema) {
  if (!Array.isArray(schema) || !schema.length) return DEFAULT_CONCERN_SCHEMA;
  return schema.map((section, index) => ({
    number: section.number || String(index + 1),
    heading: section.heading || section.label || `Section ${index + 1}`,
    special: section.special,
    fields: (section.fields || []).map((field) => [
      field.id,
      field.label || String(field.id || "").replaceAll("_", " "),
      field.type,
    ]),
  }));
}

function formatFieldValue(answers, id, type) {
  if (type === "photo") {
    const fileName = answers?.[`${id}_name`];
    const description = answers?.[`${id}_description`];
    const attached = answers?.[id] || answers?.[`${id}_preview`];
    return [fileName || (attached ? "File attached" : "No file provided"), description]
      .filter(Boolean)
      .join(" — ");
  }
  const value = answers?.[id];
  if (Array.isArray(value)) return value.filter(Boolean).join(", ") || "N/A";
  if (value && typeof value === "object") return "File attached";
  return value === 0 || value === false ? String(value) : String(value || "N/A");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function reportData(nc) {
  const answers = nc?.sourceFormResponse?.answers || {};
  // SHEQ reports store their data under answers.formData rather than the
  // concern-form field ids, so render those as plain NC details instead.
  const isConcernSource = Boolean(nc?.sourceFormResponse) && !answers.formData;
  return {
    answers,
    schema: normalizeSchema(answers.form_schema),
    isClosed: nc?.status === "closed",
    isConcernSource,
    response: (nc?.responses || []).find((item) => !item.isDraft) || nc?.responses?.[0],
  };
}

function drawLogo(pdf, logo, x, y, maxW, maxH, align) {
  if (!logo?.dataUrl) return;
  const ratio = logo.width / Math.max(logo.height, 1);
  let h = maxH;
  let w = h * ratio;
  if (w > maxW) {
    w = maxW;
    h = w / ratio;
  }
  pdf.addImage(logo.dataUrl, "PNG", align === "right" ? x - w : x, y, w, h, undefined, "FAST");
}

/**
 * Concern-form PDF export with the NC response appended. Audit history is
 * intentionally excluded from downloaded records.
 */
export async function downloadNonconformancePdf(nc) {
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN_X * 2;
  const maxY = pageHeight - FOOTER_INSET;
  let y = HEADER_INSET;

  const ensureSpace = (needed) => {
    if (y + needed > maxY) {
      pdf.addPage();
      y = HEADER_INSET;
    }
  };

  const writeWrapped = (text, { size = 10, style = "normal", color = [17, 24, 39], gap = 1.5 } = {}) => {
    pdf.setFont("helvetica", style);
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(String(text || "—"), contentWidth);
    const lineHeight = size * 0.42;
    lines.forEach((line) => {
      ensureSpace(lineHeight);
      pdf.text(line, MARGIN_X, y);
      y += lineHeight;
    });
    y += gap;
  };

  const sectionHeading = (text) => {
    ensureSpace(14);
    y += 4;
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN_X, y - 2, pageWidth - MARGIN_X, y - 2);
    writeWrapped(text, { size: 12, style: "bold", color: [0, 48, 73], gap: 2.5 });
  };

  const labelValue = (label, value) => {
    writeWrapped(label, { size: 8.5, style: "bold", color: [100, 116, 139], gap: 0.5 });
    writeWrapped(value, { size: 10, gap: 2.5 });
  };

  const { answers, schema, isClosed, isConcernSource, response } = reportData(nc);
  const statusLabel = isClosed ? "Closed" : "Opened";
  const statusColor = isClosed ? [21, 128, 61] : [220, 38, 38];

  writeWrapped(answers.report_heading || nc.title || "Concern form", {
    size: 15,
    style: "bold",
    gap: 1,
  });
  writeWrapped(nc.ncNumber, {
    size: 10,
    style: "bold",
    color: [100, 116, 139],
    gap: 1,
  });
  writeWrapped("Status", {
    size: 8.5,
    style: "bold",
    color: [100, 116, 139],
    gap: 0.5,
  });
  writeWrapped(statusLabel, { size: 10, style: "bold", color: statusColor, gap: 2.5 });

  if (isConcernSource) {
    schema.forEach((section) => {
      sectionHeading(`${section.number} · ${String(section.heading).toUpperCase()}`);
      section.fields.forEach(([id, label, type]) => {
        labelValue(label, formatFieldValue(answers, id, type));
      });
      if (section.special === "incidents") {
        const incidents = [
          ...(Array.isArray(answers.incidents) ? answers.incidents : []),
          ...(answers.incidents_other ? [answers.incidents_other] : []),
        ].filter(Boolean);
        labelValue("Selected incident(s)", incidents.join(", ") || "None selected");
      }
    });
    if (answers.signature || answers.signature_preview) {
      sectionHeading("Signature");
      writeWrapped("Signature provided with the original concern form.");
    }
  } else {
    sectionHeading("Nonconformance details");
    labelValue("Title", nc.title);
    labelValue("Category", nc.category);
    labelValue("Priority", String(nc.priority || "").replace(/^./, (c) => c.toUpperCase()));
    labelValue("Due date", formatDate(nc.dueDate));
    labelValue("Reporter", userName(nc.reporter));
    labelValue("Assignee (responsible person)", userName(nc.assignee));
    labelValue("Description", nc.description);
  }

  sectionHeading("Assignee nonconformance response");
  if (response) {
    RESPONSE_FIELDS.forEach(([key, label]) => labelValue(label, response[key]));
    const attachments = response.attachments || [];
    labelValue(
      "Evidence",
      attachments.length ? attachments.map((file) => file.fileName).join(", ") : "No evidence attached."
    );
  } else {
    writeWrapped("No response has been submitted yet.", { color: [100, 116, 139] });
  }

  const logos = await loadBrandLogos();
  const downloadedOn = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const totalPages = pdf.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page);
    drawLogo(pdf, logos?.left, MARGIN_X, 6, 48, 10, "left");
    drawLogo(pdf, logos?.right, pageWidth - MARGIN_X, 6, 48, 10, "right");
    pdf.setDrawColor(230, 230, 230);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN_X, HEADER_INSET - 4, pageWidth - MARGIN_X, HEADER_INSET - 4);
    pdf.line(MARGIN_X, pageHeight - FOOTER_INSET + 3, pageWidth - MARGIN_X, pageHeight - FOOTER_INSET + 3);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(90, 90, 90);
    pdf.text(downloadedOn, MARGIN_X, pageHeight - FOOTER_INSET + 7.5);
    pdf.text(`Page ${page} of ${totalPages}`, pageWidth - MARGIN_X, pageHeight - FOOTER_INSET + 7.5, { align: "right" });
  }

  pdf.save(`${nc.ncNumber || "nonconformance"}.pdf`);
}

/**
 * Word export using the same concern-form sections, status and latest response
 * as the PDF export above.
 */
export async function downloadNonconformanceWord(nc) {
  const { answers, schema, isClosed, isConcernSource, response } = reportData(nc);
  const statusLabel = isClosed ? "Closed" : "Opened";
  const statusColor = isClosed ? "#15803d" : "#dc2626";
  const logos = await loadBrandLogos().catch(() => null);
  const logoCell = (logo, align) =>
    logo?.dataUrl
      ? `<td style="width:50%;text-align:${align};border:none"><img src="${logo.dataUrl}" style="height:38px;width:auto" /></td>`
      : `<td style="width:50%;border:none"></td>`;
  const fieldHtml = (label, value) => `
    <div class="field">
      <div class="label">${escapeHtml(label)}</div>
      <div class="value">${escapeHtml(value).replaceAll("\n", "<br />")}</div>
    </div>`;

  let body = "";
  if (isConcernSource) {
    body = schema
      .map((section) => {
        const fields = section.fields
          .map(([id, label, type]) => fieldHtml(label, formatFieldValue(answers, id, type)))
          .join("");
        const incidents =
          section.special === "incidents"
            ? fieldHtml(
                "Selected incident(s)",
                [
                  ...(Array.isArray(answers.incidents) ? answers.incidents : []),
                  ...(answers.incidents_other ? [answers.incidents_other] : []),
                ]
                  .filter(Boolean)
                  .join(", ") || "None selected"
              )
            : "";
        return `<section><h2>${escapeHtml(section.number)} · ${escapeHtml(
          String(section.heading).toUpperCase()
        )}</h2>${fields}${incidents}</section>`;
      })
      .join("");
  } else {
    body = `<section><h2>NONCONFORMANCE DETAILS</h2>
      ${fieldHtml("Title", nc.title)}
      ${fieldHtml("Category", nc.category)}
      ${fieldHtml("Priority", nc.priority)}
      ${fieldHtml("Due date", formatDate(nc.dueDate))}
      ${fieldHtml("Reporter", userName(nc.reporter))}
      ${fieldHtml("Assignee (responsible person)", userName(nc.assignee))}
      ${fieldHtml("Description", nc.description)}
    </section>`;
  }

  const responseHtml = response
    ? `${RESPONSE_FIELDS.map(([key, label]) => fieldHtml(label, response[key])).join("")}
       ${fieldHtml(
         "Evidence",
         response.attachments?.length
           ? response.attachments.map((file) => file.fileName).join(", ")
           : "No evidence attached."
       )}`
    : `<p class="muted">No response has been submitted yet.</p>`;

  const documentHtml = `<!doctype html>
  <html xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:w="urn:schemas-microsoft-com:office:word"
        xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(nc.ncNumber || "Nonconformance")}</title>
    <style>
      @page { size: A4; margin: 18mm 15mm; }
      body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 10.5pt; }
      table.header { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
      h1 { font-size: 20pt; margin: 0 0 5px; color: #0f172a; }
      .nc-number { color: #64748b; font-weight: bold; margin-bottom: 10px; }
      .status-label, .label { color: #64748b; font-size: 8.5pt; font-weight: bold; text-transform: uppercase; }
      .status { color: ${statusColor}; font-size: 11pt; font-weight: bold; margin: 2px 0 12px; }
      section { margin-top: 16px; page-break-inside: avoid; }
      h2 { color: #003049; font-size: 12pt; border-top: 1px solid #e2e8f0; padding-top: 9px; }
      .field { margin: 0 0 10px; }
      .value { margin-top: 3px; white-space: pre-wrap; }
      .muted { color: #64748b; }
    </style>
  </head>
  <body>
    <table class="header"><tr>${logoCell(logos?.left, "left")}${logoCell(logos?.right, "right")}</tr></table>
    <h1>${escapeHtml(answers.report_heading || nc.title || "Concern form")}</h1>
    <div class="nc-number">${escapeHtml(nc.ncNumber || "")}</div>
    <div class="status-label">Status</div>
    <div class="status">${statusLabel}</div>
    ${body}
    <section><h2>ASSIGNEE NONCONFORMANCE RESPONSE</h2>${responseHtml}</section>
  </body>
  </html>`;

  const blob = new Blob(["\ufeff", documentHtml], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${nc.ncNumber || "nonconformance"}.doc`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
