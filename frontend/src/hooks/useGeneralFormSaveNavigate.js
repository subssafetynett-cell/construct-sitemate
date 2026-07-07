import { useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useGeneralFormRouteSubmissionIds } from "./useGeneralFormRouteSubmissionIds";

/** After the first save, move to /base-path/:id so later saves update the same row. */
export function useGeneralFormSaveNavigate(basePath) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { persistedResponseId } = useGeneralFormRouteSubmissionIds();
  const siteId = searchParams.get("siteId");

  return useCallback(
    (savedId, asNew = false) => {
      // In Friday Pack / Site Pack flows we should stay in form-fill context
      // and return to SitepackManagement, not pivot into template edit routes.
      if (siteId) return;
      if (!savedId || persistedResponseId || asNew) return;
      const qs = searchParams.toString();
      navigate(`${basePath}/${savedId}${qs ? `?${qs}` : ""}`, { replace: true });
    },
    [navigate, searchParams, persistedResponseId, basePath, siteId]
  );
}
