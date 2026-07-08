/**
 * Strip heavy binary fields from answers for list/table views.
 * Full payloads are still returned by GET /forms/responses/:id.
 */
function compactFormResponseAnswers(answers) {
  if (!answers || typeof answers !== "object") return answers ?? {};

  const out = {};
  for (const [key, value] of Object.entries(answers)) {
    // Drop embedded binary payloads from list views entirely.
    if (typeof value === "string" && value.startsWith("data:image")) continue;
    if (key === "docInfo" && value && typeof value === "object") {
      const { logo, logoRight, signature, ...rest } = value;
      out.docInfo = { ...rest };
      continue;
    }
    if (key === "formData" && value && typeof value === "object") {
      const { images, ...formRest } = value;
      const imageCount = Array.isArray(images) ? images.length : 0;
      out.formData = {
        ...formRest,
        ...(imageCount ? { images: { _count: imageCount } } : {}),
      };
      continue;
    }
    if (Array.isArray(value) && value.some((v) => typeof v === "string" && v.startsWith("data:image"))) {
      out[key] = { _count: value.length };
      continue;
    }
    out[key] = value;
  }

  return out;
}

function compactFormResponseRow(row) {
  if (!row) return row;
  return {
    ...row,
    answers: compactFormResponseAnswers(row.answers),
  };
}

function isCompactListRequest(query = {}) {
  const raw = query.compact;
  return raw === true || raw === "true" || raw === "1" || raw === 1;
}

/** SHEQ dashboard widgets only need status + list labels (not photos). */
function pickSheqDashboardAnswers(answers) {
  if (!answers || typeof answers !== "object") return {};
  const fd = answers.formData;
  return {
    name: answers.name,
    formData:
      fd && typeof fd === "object"
        ? {
            projectStatus: fd.projectStatus,
            client: fd.client,
            siteAddress: fd.siteAddress,
          }
        : undefined,
  };
}

function pickInspectionDashboardAnswers(answers) {
  if (!answers || typeof answers !== "object") return {};
  return { siteRating: answers.siteRating };
}

function pickRecentActionAnswers(answers) {
  if (!answers || typeof answers !== "object") return {};
  return {
    report_heading: answers.report_heading,
    reportHeading: answers.reportHeading,
  };
}

function slimFormResponseRow(row, pickAnswers) {
  if (!row) return row;
  return {
    ...row,
    answers: pickAnswers(row.answers),
  };
}

module.exports = {
  compactFormResponseAnswers,
  compactFormResponseRow,
  isCompactListRequest,
  pickSheqDashboardAnswers,
  pickInspectionDashboardAnswers,
  pickRecentActionAnswers,
  slimFormResponseRow,
};
