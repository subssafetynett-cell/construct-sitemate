import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canEditGeneralFormTemplate } from "../utils/generalFormTemplateAccess";

function normalizeSiteId(value) {
  if (value == null) return null;
  const t = String(value).trim();
  return t !== "" ? t : null;
}

/**
 * General forms under /general-forms: without ?siteId=… only superadmin, company_admin, site_manager may edit.
 * With siteId (site pack), existing site workflows keep full edit for whoever can open the link.
 *
 * Pass `action` and `downloading` from the page to get `pdfLayout` / `contentReadOnly` helpers.
 * Optional `persistedSiteId` (e.g. answers.siteId after loading a submission) is merged with the URL param.
 */
export function useGeneralFormTemplateAccess(
  action,
  downloading = false,
  persistedSiteId = null
) {
  const [searchParams] = useSearchParams();
  const { role } = useAuth();
  const siteId =
    normalizeSiteId(searchParams.get("siteId")) ||
    normalizeSiteId(persistedSiteId);
  const canEdit = canEditGeneralFormTemplate(role, { siteId });
  const isSitePackContext = Boolean(siteId && String(siteId).trim() !== "");
  const isDownloadAction = String(action || "").toLowerCase() === "download";
  const pdfLayout = Boolean(downloading || isDownloadAction);
  const contentReadOnly = pdfLayout || !canEdit;
  return {
    canEdit,
    siteId,
    isSitePackContext,
    pdfLayout,
    contentReadOnly,
  };
}
