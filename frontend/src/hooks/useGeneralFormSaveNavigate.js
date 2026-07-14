import { useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useGeneralFormRouteSubmissionIds } from "./useGeneralFormRouteSubmissionIds";
import {
  isContextualFormFill,
  isTemplatesPageEditContext,
} from "../utils/templatePageContext";

/** After the first save, move to /base-path/:id so later saves update the same row. */
export function useGeneralFormSaveNavigate(basePath) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { persistedResponseId } = useGeneralFormRouteSubmissionIds();

  return useCallback(
    (savedId, asNew = false) => {
      // Keep fills from monitoring / reporting concerns / site pack on that flow.
      // Do not pivot into Templates-page edit URLs (`/general-forms/.../:id`).
      if (isContextualFormFill(searchParams)) return;
      if (!isTemplatesPageEditContext(searchParams) && searchParams.get("siteId")) {
        return;
      }
      if (!savedId || persistedResponseId || asNew) return;
      const qs = searchParams.toString();
      navigate(`${basePath}/${savedId}${qs ? `?${qs}` : ""}`, { replace: true });
    },
    [navigate, searchParams, persistedResponseId, basePath]
  );
}
