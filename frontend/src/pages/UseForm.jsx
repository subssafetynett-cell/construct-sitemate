import React, { useEffect, useState, useRef } from "react";
import { flushSync } from "react-dom";
import {
  Box,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Checkbox,
  Radio,
  RadioGroup,
  FormControlLabel,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import Layout from "../components/Layout";
import { useAutoFormDirty } from "../hooks/useAutoFormDirty";
import { useUnsavedFormGuard } from "../hooks/useUnsavedFormGuard.jsx";
import { downloadPdfFromRef } from "../utils/pdfGenerator";
import { downloadWordFromForm } from "../utils/wordGenerator";
import { prepareCustomFormPdfAssets } from "../utils/prepareFormPdfAssets";
import FormRenderer from "../components/FormRenderer";
import { getBackendOrigin } from "../utils/backendOrigin.js";
import { resolveFormCategoryFromSearchParams, sitepackNavState } from "../utils/sitepackContext";
import { FRIDAY_PACK_FORMS_CATEGORY, GENERAL_FORMS_CATEGORY } from "../utils/generalFormSubmissions";
import { monitoringFolderPath, monitoringSitePath } from "../utils/monitoringContext";
import {
  isTemplatesPageEditContext,
  prepareTemplatesPageSave,
  templatesPageListUrl,
} from "../utils/templatePageContext";
import { queryClient } from "../lib/queryClient";

// helper to build absolute URL for logos
const computeLogoUrl = (logo) => {
    if (!logo) return null;
    if (/^https?:\/\//i.test(logo)) return logo;
    const host = getBackendOrigin();
    return `${host.replace(/\/$/, "")}${logo.startsWith("/") ? "" : "/"}${logo}`;
};

export default function UseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const siteId = searchParams.get("siteId");
  const subfolderId = searchParams.get("subfolderId");
  const monitoringSection = searchParams.get("monitoringSection");
  const category = resolveFormCategoryFromSearchParams(searchParams);
  const action = searchParams.get("action");
  const responseId = searchParams.get("responseId") || searchParams.get("submissionId");
  const fromTemplateId = searchParams.get("fromTemplate");
  // Primitive — avoid putting the URLSearchParams object in effect deps.
  const isTemplatesPageEdit = isTemplatesPageEditContext(searchParams);
  const containerRef = useRef(null);
  
  const [downloading, setDownloading] = useState(false);
  const [preparingPdf, setPreparingPdf] = useState(false);
  const [pdfExportValues, setPdfExportValues] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);

  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const readOnly = action === "download" || action === "download_word";
  const { isDirty, resetDirty } = useAutoFormDirty([values], {
    enabled: !readOnly,
    loading,
  });

  const navigateBack = () => {
    if (searchParams.get("embedded") === "true") {
      try {
        window.parent?.postMessage(
          {
            type: "sitemate:monitoring-form-done",
            monitoringSection,
            siteId,
            subfolderId,
            listPath: searchParams.get("listPath") || undefined,
          },
          window.location.origin
        );
      } catch {
        /* ignore */
      }
      return;
    }
    if (isTemplatesPageEdit) {
      navigate(templatesPageListUrl());
      return;
    }
    if (monitoringSection && siteId) {
      if (subfolderId) {
        navigate(monitoringFolderPath(monitoringSection, siteId, subfolderId));
      } else {
        navigate(monitoringSitePath(monitoringSection, siteId));
      }
      return;
    }
    if (siteId) {
      navigate("/sitepack-management", {
        state: sitepackNavState({
          siteId,
          subfolderId,
          subfolderName: searchParams.get("subfolderName") || undefined,
          moduleTitle: category || FRIDAY_PACK_FORMS_CATEGORY,
        }),
      });
    } else if (searchParams.get("listPath")) {
      navigate(searchParams.get("listPath"));
    } else if (category && category !== GENERAL_FORMS_CATEGORY && category !== FRIDAY_PACK_FORMS_CATEGORY) {
      // Return to Reporting Concerns list when form was opened from those pages
      const concernPathByCategory = {
        "Health & Safety concern": "/report-health-safety",
        "Quality concern": "/report-quality",
        "Positive observation": "/report-positive",
        "Sustainability concern": "/report-environmental",
      };
      navigate(concernPathByCategory[category] || "/forms");
    } else {
      navigate("/forms");
    }
  };

  const performSave = async () => {
    setSaving(true);
    try {
      const processedAnswers = {};
      for (const [key, value] of Object.entries(values)) {
        if (value instanceof File) {
          processedAnswers[key] = await toBase64(value);
        } else if (!key.endsWith("_preview")) {
          processedAnswers[key] = value;
        }
      }

      if (siteId) processedAnswers.siteId = siteId;
      if (subfolderId) processedAnswers.subfolderId = subfolderId;
      if (monitoringSection) processedAnswers.monitoringSection = monitoringSection;

      const prepared = prepareTemplatesPageSave(
        processedAnswers,
        searchParams,
        form?.title || ""
      );
      const answers = prepared.payload;
      const resolvedCategory = prepared.isTemplatesPage
        ? prepared.category
        : (() => {
            const explicitCategory = category != null ? String(category).trim() : "";
            return explicitCategory && explicitCategory !== GENERAL_FORMS_CATEGORY
              ? explicitCategory
              : siteId
                ? FRIDAY_PACK_FORMS_CATEGORY
                : explicitCategory || GENERAL_FORMS_CATEGORY;
          })();

      const body = { answers, category: resolvedCategory };
      if (!prepared.isTemplatesPage) {
        if (siteId) body.siteId = String(siteId).trim();
        if (subfolderId) body.subfolderId = String(subfolderId).trim();
      }

      if (responseId) {
        await api.put(`/forms/responses/${responseId}`, body);
      } else {
        await api.post(`/forms/${id}/responses`, body);
      }

      if (prepared.isTemplatesPage) {
        try {
          await queryClient.invalidateQueries({ queryKey: ["form-responses"] });
        } catch (cacheErr) {
          console.warn("Could not invalidate form-responses cache", cacheErr);
        }
      }

      resetDirty();
      return true;
    } catch (err) {
      console.error("Submit failed", err);
      const msg = err.response?.data?.message || err.message || "Failed to submit form";
      alert(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const { requestLeave, consumePendingNavigation, UnsavedDialog } = useUnsavedFormGuard({
    enabled: !readOnly,
    isDirty,
    onLeave: navigateBack,
    saving,
    onPromptSave: performSave,
  });

  useEffect(() => {
    try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
            const user = JSON.parse(userStr);
            let rawLogo = null;
            if (user.clientId && typeof user.clientId === 'object' && user.clientId.logo) {
                rawLogo = user.clientId.logo;
            } else if (user.companyLogo) {
                rawLogo = user.companyLogo;
            } else if (user.logo) {
                rawLogo = user.logo;
            }
            if (rawLogo) {
                setLogoUrl(computeLogoUrl(rawLogo));
            }
        }
    } catch (e) {
        console.error("Error parsing user from localstorage", e);
    }

    const fetchForm = async () => {
      try {
        const res = await api.get(`/forms/${id}`);
        if (res?.data?.success) {
          setForm(res.data.data);
        }
      } catch (err) {
        console.error("Failed to load form", err);
      } finally {
        if (!responseId && !fromTemplateId) setLoading(false);
      }
    };

    const fetchResponse = async () => {
      const seedId = responseId || fromTemplateId;
      if (!seedId) return;
      try {
        const res = await api.get(`/forms/responses/${seedId}`);
        if (res.data?.success && res.data.data?.answers) {
          const seedAnswers = { ...(res.data.data.answers || {}) };
          // Keep Templates-library marker when editing from /general-forms;
          // strip it for site pack / monitoring / reporting concern fills.
          if (!isTemplatesPageEdit) {
            delete seedAnswers.savedFromTemplatesPage;
          }
          setValues(seedAnswers);
          resetDirty();
        }
      } catch (err) {
        console.error("Failed to load response", err);
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
    if (responseId || fromTemplateId) {
      fetchResponse();
    }
  }, [id, responseId, fromTemplateId, isTemplatesPageEdit, resetDirty]);

  const downloadStartedRef = useRef(false);

  useEffect(() => {
    downloadStartedRef.current = false;
  }, [id, responseId, action]);

  useEffect(() => {
    if (loading || !form) return;
    if (action !== "download" && action !== "download_word") return;
    if (downloadStartedRef.current) return;

    downloadStartedRef.current = true;
    let cancelled = false;

    (async () => {
      setPreparingPdf(true);
      const fileName = `CustomForm_${String(form.title || "form").replace(/\s+/g, "_")}`;
      try {
        const exportValues = await prepareCustomFormPdfAssets(form, values, logoUrl);
        if (cancelled) return;

        if (action === "download_word") {
          await downloadWordFromForm(form, exportValues, fileName, (err) => {
            if (cancelled) return;
            setPreparingPdf(false);
            // Always clear so a stuck tab (close blocked) can retry.
            downloadStartedRef.current = false;
            if (err) {
              alert("Could not prepare Word document. Please try again.");
              return;
            }
            window.close();
          });
          return;
        }

        // Keep the form DOM mounted so downloadPdfFromRef can capture containerRef.
        flushSync(() => {
          setPdfExportValues(exportValues);
          setDownloading(true);
          setPreparingPdf(false);
        });
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        if (cancelled) return;

        await new Promise((resolve) => {
          downloadPdfFromRef(containerRef, fileName, (err) => {
            setDownloading(false);
            setPdfExportValues(null);
            // Always clear so a stuck tab (close blocked) can retry.
            downloadStartedRef.current = false;
            if (err) {
              alert("Could not prepare PDF. Please try again.");
            } else {
              window.close();
            }
            resolve();
          });
        });
      } catch (err) {
        console.error("Download preparation failed:", err);
        if (!cancelled) {
          setPreparingPdf(false);
          setDownloading(false);
          setPdfExportValues(null);
          downloadStartedRef.current = false;
          alert(
            action === "download_word"
              ? "Could not prepare Word document. Please try again."
              : "Could not prepare PDF. Please try again."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      // Allow a fresh attempt after Strict Mode remount or navigation.
      downloadStartedRef.current = false;
    };
    // Intentionally omit values/logoUrl: loading already waits for the response payload,
    // and re-running on those would cancel an in-flight download.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, action, form]);

  const handleChange = (fieldId, value) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };



  const handleCheckboxToggle = (fieldId, option) => {
    setValues((prev) => {
      const current = Array.isArray(prev[fieldId]) ? prev[fieldId] : [];
      return {
        ...prev,
        [fieldId]: current.includes(option)
          ? current.filter((v) => v !== option)
          : [...current, option],
      };
    });
  };

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });

  const handleSubmit = async () => {
    const ok = await performSave();
    if (ok) {
      // Contextual fills and Templates-page edits return to their list immediately.
      const hasReturnContext = Boolean(
        isTemplatesPageEditContext(searchParams) ||
          siteId ||
          monitoringSection ||
          searchParams.get("listPath") ||
          (category &&
            category !== GENERAL_FORMS_CATEGORY &&
            category !== FRIDAY_PACK_FORMS_CATEGORY)
      );
      if (hasReturnContext) {
        navigateBack();
      } else {
        resetDirty();
        setSuccessOpen(true);
      }
    }
  };


  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!form) {
    return <Typography sx={{ p: 4 }}>Form not found</Typography>;
  }

  const displayValues = pdfExportValues ?? values;
  const displayLogoUrl = pdfExportValues?.__companyLogoUrl ?? logoUrl;
  const exportMode = downloading || readOnly;

  return (
    <Layout>
      <Box sx={{ flex: 1, px: { xs: 2, md: 5 }, py: 4, overflowY: "auto", position: "relative" }}>
        {(preparingPdf || downloading) && (
          <Box
            sx={{
              position: "fixed",
              inset: 0,
              zIndex: 1400,
              display: "grid",
              placeItems: "center",
              bgcolor: "rgba(255,255,255,0.72)",
            }}
          >
            <Box sx={{ textAlign: "center" }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
                {preparingPdf ? "Preparing download…" : "Downloading…"}
              </Typography>
            </Box>
          </Box>
        )}
        {!readOnly && (
          <Box sx={{ maxWidth: 900, mx: "auto", mb: 2 }}>
            <Button variant="outlined" onClick={requestLeave} sx={{ textTransform: "none" }}>
              Back
            </Button>
          </Box>
        )}


        <Paper
          ref={containerRef}
          className={exportMode ? "pdf-export-root" : undefined}
          sx={{ p: 3, maxWidth: 900, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 'auto', boxSizing: 'border-box' }}
        >
          {exportMode && (
            <Typography sx={{ position: 'absolute', top: 24, right: 24, fontWeight: 500, color: 'text.secondary', fontSize: '0.9rem' }}>
                Date: {new Date().toLocaleDateString('en-GB')}
            </Typography>
          )}

            <Box sx={{ flex: 1 }}>
              <FormRenderer 
                form={form}
                values={displayValues}
                onChange={handleChange}
                onSubmit={handleSubmit}
                isSubmitting={saving}
                logoUrl={displayLogoUrl}
                submitLabel="Save"
                readOnly={readOnly}
                exportMode={exportMode}
              />
            </Box>
        </Paper>
      </Box>

      {UnsavedDialog}

      <Dialog open={successOpen} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Form Submitted 🎉
        </DialogTitle>

        <DialogContent>
          <Typography>
            Your response has been saved successfully.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="contained"
            sx={{ textTransform: "none" }}
            onClick={() => {
              setSuccessOpen(false);
              resetDirty();
              if (!consumePendingNavigation()) {
                navigateBack();
              }
            }}
          >
            {siteId ? "Back to Site Pack" : "Go to Forms"}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
