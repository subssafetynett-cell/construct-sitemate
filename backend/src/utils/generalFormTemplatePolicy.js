const GENERAL_FORM_TEMPLATE_ROLES = ["superadmin", "company_admin", "site_manager"];

function isSafetynettUser(user) {
  const n = (user?.companyname || user?.company || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  return n === "safetynett";
}

function siteContextPresent(answers, body) {
  const a = answers?.siteId;
  if (a != null && String(a).trim() !== "") return true;
  const b = body?.siteId;
  if (b != null && String(b).trim() !== "") return true;
  return false;
}

/** When saving/updating without site context, only template editors may write. */
function assertGeneralFormTemplateWrite(req, answers, body = {}) {
  if (!req.user) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }
  if (isSafetynettUser(req.user)) return { ok: true };
  if (siteContextPresent(answers, body)) return { ok: true };
  if (GENERAL_FORM_TEMPLATE_ROLES.includes(req.user.role)) return { ok: true };
  return {
    ok: false,
    status: 403,
    message:
      "Only Super Admin, Company Admin, or Site Manager can edit general form templates. Use a site pack link if you are filling this for a site.",
  };
}

module.exports = {
  assertGeneralFormTemplateWrite,
  siteContextPresent,
};
