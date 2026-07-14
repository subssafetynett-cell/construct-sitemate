import { GENERAL_FORM_TEMPLATES } from "./generalFormTemplates";
import { SITEPACK_REPORT_MODULES } from "./sitepackFormCatalog";
import { TEMPLATES_PAGE_SOURCE } from "../utils/templatePageContext";

/** SHEQ service + installation form templates (actual form at /sheq-install-form). */
export const SHEQ_INSPECTION_CATEGORY = "SHEQ Inspection";
export const SHEQ_INSTALLATION_CATEGORY = "SHEQ Installation";

export const SHEQ_TEMPLATES = [
  {
    id: "sheq-service",
    title: "SHEQ Service",
    description: "SHEQ inspection service forms and reports.",
    path: "/sheq-install-form",
    sheqCategory: SHEQ_INSPECTION_CATEGORY,
    type: "sheq",
    group: "SHEQ",
  },
  {
    id: "sheq-installation",
    title: "SHEQ Installation",
    description: "SHEQ installation inspection and audit forms.",
    path: "/sheq-install-form",
    sheqCategory: SHEQ_INSTALLATION_CATEGORY,
    type: "sheq",
    group: "SHEQ",
  },
];

export const REPORT_TEMPLATES = SITEPACK_REPORT_MODULES.map((module) => ({
  id: module.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  title: module.title,
  description: `Fill and save ${module.title.toLowerCase()}.`,
  path: module.route,
  type: "report",
  group:
    module.groupId === "health-inspection"
      ? "Health and Safety inspection"
      : "Report concern",
}));

export const TEMPLATE_LIBRARY = [
  ...REPORT_TEMPLATES,
  ...SHEQ_TEMPLATES,
  ...GENERAL_FORM_TEMPLATES.map((template) => ({
    ...template,
    type: "general",
    group: "General templates",
  })),
];

export const TEMPLATE_LIBRARY_BY_TITLE = Object.fromEntries(
  TEMPLATE_LIBRARY.map((t) => [t.title, t])
);

export function filterTemplateLibrary(search = "") {
  const q = search.trim().toLowerCase();
  if (!q) return TEMPLATE_LIBRARY;
  return TEMPLATE_LIBRARY.filter(
    (template) =>
      template.title.toLowerCase().includes(q) ||
      (template.description || "").toLowerCase().includes(q) ||
      (template.group || "").toLowerCase().includes(q)
  );
}

export function buildSheqFormUrl(template, { preview = false, ...extra } = {}) {
  if (!template?.sheqCategory) return template?.path || "";
  const params = new URLSearchParams();
  params.set("category", template.sheqCategory);
  if (preview) params.set("preview", "true");
  Object.entries(extra).forEach(([key, value]) => {
    if (value != null && String(value).trim() !== "") {
      params.set(key, String(value));
    }
  });
  return `/sheq-install-form?${params.toString()}`;
}

export function buildTemplatePreviewUrl(template, extra = {}) {
  if (!template?.path) return "";
  // Do not force Templates-page `source` here — callers from /general-forms
  // pass it explicitly; monitoring / reporting concerns must not inherit it.
  if (template.type === "general") {
    const params = new URLSearchParams({
      preview: "true",
      ...extra,
    });
    const qs = params.toString();
    return template.path.includes("?") ? `${template.path}&${qs}` : `${template.path}?${qs}`;
  }
  if (template.type === "report") {
    const params = new URLSearchParams({
      create: "true",
      preview: "true",
      ...extra,
    });
    const qs = params.toString();
    return template.path.includes("?") ? `${template.path}&${qs}` : `${template.path}?${qs}`;
  }
  if (template.type === "sheq") {
    return buildSheqFormUrl(template, { preview: true, ...extra });
  }
  return template.path;
}

export function buildTemplateViewEditUrl(template, extra = {}) {
  const withSource = {
    source: TEMPLATES_PAGE_SOURCE,
    // General-form library edits always persist under General forms.
    ...(template.type === "general" ? { category: "General forms" } : {}),
    ...extra,
  };
  if (template.type === "sheq") {
    return buildSheqFormUrl(template, withSource);
  }
  if (template.type === "report") {
    const params = new URLSearchParams({ create: "true", ...withSource });
    const qs = params.toString();
    return template.path.includes("?") ? `${template.path}&${qs}` : `${template.path}?${qs}`;
  }
  const qs = new URLSearchParams(withSource).toString();
  if (!qs) return template.path;
  return template.path.includes("?") ? `${template.path}&${qs}` : `${template.path}?${qs}`;
}

export function buildTemplateUseUrl(template, extra = {}) {
  if (template.type === "sheq") {
    return buildSheqFormUrl(template, extra);
  }
  if (template.type === "report") {
    const params = new URLSearchParams({ create: "true", ...extra });
    const qs = params.toString();
    return template.path.includes("?") ? `${template.path}&${qs}` : `${template.path}?${qs}`;
  }
  const qs = new URLSearchParams(extra).toString();
  if (!qs) return template.path;
  return template.path.includes("?") ? `${template.path}&${qs}` : `${template.path}?${qs}`;
}

/** Open a saved template submission from the Templates → Saved templates tab. */
export function buildSavedTemplateEditUrl(submission) {
  const responseId = submission?.id || submission?._id;
  if (!responseId) return "/general-forms";

  const moduleTitle =
    submission.answers?.templateModuleTitle || submission.form?.title || "";
  const template =
    TEMPLATE_LIBRARY_BY_TITLE[moduleTitle] ||
    TEMPLATE_LIBRARY.find((t) => t.title === submission.form?.title);

  if (!template) {
    return `/forms/${submission.formId}/use?action=edit&responseId=${responseId}`;
  }

  if (template.type === "general") {
    return `${template.path}/${responseId}?source=${TEMPLATES_PAGE_SOURCE}&category=General%20forms`;
  }

  if (template.type === "sheq") {
    const params = new URLSearchParams({
      category: template.sheqCategory,
      source: TEMPLATES_PAGE_SOURCE,
    });
    return `${template.path}/${responseId}?${params.toString()}`;
  }

  if (template.type === "report") {
    const params = new URLSearchParams({
      responseId: String(responseId),
      source: TEMPLATES_PAGE_SOURCE,
    });
    return `${template.path}?${params.toString()}`;
  }

  return buildTemplateViewEditUrl(template);
}
