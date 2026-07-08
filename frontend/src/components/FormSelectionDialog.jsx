import React, { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    CircularProgress,
    TextField,
    Box,
    Tabs,
    Tab,
    Chip,
    Card,
    CardContent,
    InputAdornment,
} from "@mui/material";
import { Eye, FileText, Search } from "lucide-react";
import api, { fetchFormResponsesList } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { filterTemplateLibrary } from "../constants/templateCatalog";
import { isGeneralFormsPageSubmission } from "../utils/generalFormSubmissions";
import {
    filterMonitoringBuilderForms,
    filterMonitoringSavedTemplates,
} from "../utils/monitoringContext";

const TAB_LIBRARY = "library";
const TAB_SAVED = "saved";
const TAB_BUILDER = "builder";

function isStandardSheqSubmission(sub) {
    const ans = sub?.answers;
    return Boolean(
        ans?.formData !== undefined ||
        ans?.formSections?.length ||
        ans?.headerLabels ||
        ans?.installationMeasures
    );
}

function getSubmissionLabel(sub) {
    const ans = sub?.answers || {};
    const client = ans.formData?.client?.trim();
    const name = ans.name?.trim();
    if (client) return client;
    if (name) return name;
    return "Untitled report";
}

function getSavedTemplateLabel(sub) {
    return sub.name || sub.answers?.name || sub.form?.title || "Untitled";
}

function getSavedTemplateSecondary(sub) {
    const savedDate = sub.createdAt
        ? new Date(sub.createdAt).toLocaleDateString("en-GB")
        : null;
    const formTitle = sub.form?.title;
    const primary = getSavedTemplateLabel(sub);
    if (formTitle && formTitle !== primary) {
        return savedDate ? `${formTitle} · ${savedDate}` : formTitle;
    }
    return savedDate ? `Saved ${savedDate}` : "Saved template";
}

function filterSheqSavedSubmissions(submissions = [], search = "") {
    const q = search.trim().toLowerCase();
    if (!q) return submissions;
    return submissions.filter((sub) => {
        const label = getSubmissionLabel(sub).toLowerCase();
        const site = (sub.answers?.formData?.siteAddress || "").toLowerCase();
        return label.includes(q) || site.includes(q);
    });
}

function TemplatePickerCard({
    title,
    description,
    group,
    meta,
    onUse,
    onPreview,
    borderColor,
    headingColor,
    subColor,
}) {
    return (
        <Card
            elevation={0}
            sx={{
                border: `1px solid ${borderColor}`,
                borderRadius: 2,
                bgcolor: "transparent",
                height: "100%",
            }}
        >
            <CardContent sx={{ p: 2, display: "flex", flexDirection: "column", height: "100%" }}>
                <Box sx={{ display: "flex", gap: 1.5, mb: 1.5, flex: 1 }}>
                    <Box
                        sx={{
                            p: 1,
                            borderRadius: 1.5,
                            bgcolor: "rgba(232, 159, 23, 0.12)",
                            color: "#E89F17",
                            display: "flex",
                            flexShrink: 0,
                            alignSelf: "flex-start",
                        }}
                    >
                        <FileText size={18} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                        {group ? (
                            <Typography
                                variant="caption"
                                sx={{ color: "#E89F17", fontWeight: 600, display: "block", mb: 0.25 }}
                            >
                                {group}
                            </Typography>
                        ) : null}
                        <Typography sx={{ fontWeight: 600, color: headingColor, fontSize: "0.9rem" }}>
                            {title}
                        </Typography>
                        {description ? (
                            <Typography variant="body2" sx={{ color: subColor, mt: 0.5 }}>
                                {description}
                            </Typography>
                        ) : null}
                        {meta ? (
                            <Typography variant="body2" sx={{ color: subColor, mt: 0.5 }}>
                                {meta}
                            </Typography>
                        ) : null}
                    </Box>
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<Eye size={16} />}
                        onClick={onPreview}
                        sx={{ textTransform: "none", fontWeight: 600 }}
                    >
                        Preview
                    </Button>
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={onUse}
                        sx={{
                            bgcolor: "#E89F17",
                            textTransform: "none",
                            fontWeight: 600,
                            "&:hover": { bgcolor: "#cc8b14" },
                        }}
                    >
                        Use
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
}

export default function FormSelectionDialog({
    open,
    onClose,
    onSelect,
    /**
     * Picker layout:
     * - saved-builder: Saved Templates + Formbuilder Template
     * - full: Templates + Saved Templates + Formbuilder Template
     * - templates: Templates + Saved Templates
     * - formbuilder: Formbuilder Template only
     */
    variant = "saved-builder",
    /** When set, enriches saved/templates tabs with SHEQ category reports. */
    sheqTemplateCategory = null,
}) {
    const { isDarkMode } = useTheme();
    const [builderForms, setBuilderForms] = useState([]);
    const [savedTemplates, setSavedTemplates] = useState([]);
    const [sheqSubmissions, setSheqSubmissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState(TAB_SAVED);

    const showLibrary = variant === "full" || variant === "templates";
    const showSaved = variant === "saved-builder" || variant === "full" || variant === "templates";
    const showBuilder = variant === "saved-builder" || variant === "full" || variant === "formbuilder";
    const sheqEnriched = Boolean(sheqTemplateCategory);

    const headingColor = isDarkMode ? "#F9FAFB" : "#111827";
    const subColor = isDarkMode ? "#9CA3AF" : "#6B7280";
    const borderColor = isDarkMode ? "#374151" : "#E5E7EB";
    const surfaceBg = isDarkMode ? "#111827" : "#FFFFFF";

    const defaultTab = showLibrary ? TAB_LIBRARY : showSaved ? TAB_SAVED : TAB_BUILDER;

    const emit = (payload, preview = false) => {
        onSelect({ ...payload, preview });
    };

    useEffect(() => {
        if (!open) {
            setSearch("");
            setActiveTab(defaultTab);
            return undefined;
        }
        setActiveTab(defaultTab);
        return loadPickerData();
    }, [open, variant, sheqTemplateCategory, defaultTab]);

    const loadPickerData = () => {
        let cancelled = false;
        const run = async () => {
            setLoading(true);
            setSavedTemplates([]);
            setBuilderForms([]);
            setSheqSubmissions([]);
            try {
                const requests = [];
                if (showSaved) {
                    requests.push(fetchFormResponsesList({ category: "General forms,__empty__" }));
                }
                if (showBuilder) {
                    requests.push(api.get("/forms"));
                }
                if (sheqEnriched && showSaved) {
                    requests.push(fetchFormResponsesList({ category: sheqTemplateCategory }));
                }

                const results = await Promise.all(requests);
                if (cancelled) return;

                let idx = 0;
                if (showSaved) {
                    const responsesRes = results[idx++];
                    if (responsesRes?.success) {
                        const saved = (responsesRes.data || [])
                            .filter(isGeneralFormsPageSubmission)
                            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                        setSavedTemplates(saved);
                    }
                }
                if (showBuilder) {
                    const formsRes = results[idx++];
                    if (formsRes.data?.success) {
                        const userCreatedForms = (formsRes.data.data || []).filter(
                            (form) =>
                                !(
                                    form.fields?.length === 1 &&
                                    form.fields[0].id === "custom_hardcoded_form_data"
                                )
                        );
                        setBuilderForms(userCreatedForms);
                    }
                }
                if (sheqEnriched && showSaved) {
                    const sheqRes = results[idx++];
                    if (sheqRes?.success) {
                        const standard = (sheqRes.data || []).filter(isStandardSheqSubmission);
                        standard.sort(
                            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                        );
                        setSheqSubmissions(standard);
                    }
                }
            } catch (err) {
                console.error("Failed to load template picker data", err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        run();
        return () => {
            cancelled = true;
        };
    };

    const filteredLibraryTemplates = useMemo(
        () => filterTemplateLibrary(search),
        [search]
    );

    const filteredSavedTemplates = useMemo(
        () => filterMonitoringSavedTemplates(savedTemplates, search),
        [savedTemplates, search]
    );

    const filteredSheqSubmissions = useMemo(
        () => filterSheqSavedSubmissions(sheqSubmissions, search),
        [sheqSubmissions, search]
    );

    const filteredBuilderForms = useMemo(
        () => filterMonitoringBuilderForms(builderForms, search),
        [builderForms, search]
    );

    const savedCount = filteredSavedTemplates.length + filteredSheqSubmissions.length;
    const libraryCount =
        filteredLibraryTemplates.length + (sheqEnriched && !search.trim() ? 1 : 0);

    const isInstallation = sheqTemplateCategory === "SHEQ Installation";
    const dialogTitle =
        variant === "formbuilder"
            ? "Choose Form"
            : variant === "templates" || variant === "full"
              ? "Choose Templates"
              : "Choose a Form";

    const showTabs = [showLibrary, showSaved, showBuilder].filter(Boolean).length > 1;
    const contentTab = !showTabs
        ? showBuilder
            ? TAB_BUILDER
            : showSaved
              ? TAB_SAVED
              : TAB_LIBRARY
        : activeTab;

    const searchPlaceholder =
        contentTab === TAB_LIBRARY
            ? "Search templates..."
            : contentTab === TAB_SAVED
              ? "Search saved templates..."
              : "Search form builder forms...";

    const defaultChecklistLabel = isInstallation
        ? "Default SHEQ installation checklist"
        : "Default SHEQ service checklist";
    const defaultChecklistHint = isInstallation
        ? "Standard installation audit layout"
        : "Standard vehicle / site audit layout";

    const tabSx = {
        minHeight: 40,
        "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: 600,
            minHeight: 40,
            color: subColor,
        },
        "& .Mui-selected": { color: "#E89F17" },
        "& .MuiTabs-indicator": { bgcolor: "#E89F17" },
    };

    const cardGrid = (children) => (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                gap: 2,
            }}
        >
            {children}
        </Box>
    );

    const emptyState = (message) => (
        <Typography sx={{ color: subColor, gridColumn: "1 / -1", py: 3, textAlign: "center" }}>
            {message}
        </Typography>
    );

    const cardProps = {
        borderColor,
        headingColor,
        subColor,
    };

    const renderLibraryList = () => {
        const hasSheqDefault = sheqEnriched && !search.trim();
        if (!hasSheqDefault && filteredLibraryTemplates.length === 0) {
            return emptyState("No templates match your search.");
        }

        return cardGrid(
            <>
                {hasSheqDefault ? (
                    <TemplatePickerCard
                        key="sheq-default"
                        title={defaultChecklistLabel}
                        description={defaultChecklistHint}
                        group="SHEQ"
                        onUse={() => emit({ type: "sheq-blank", title: defaultChecklistLabel })}
                        onPreview={() =>
                            emit({ type: "sheq-blank", title: defaultChecklistLabel }, true)
                        }
                        {...cardProps}
                    />
                ) : null}
                {filteredLibraryTemplates.map((template) => (
                    <TemplatePickerCard
                        key={template.id}
                        title={template.title}
                        description={template.description}
                        group={template.group}
                        onUse={() => emit({ type: "catalog-template", template })}
                        onPreview={() => emit({ type: "catalog-template", template }, true)}
                        {...cardProps}
                    />
                ))}
            </>
        );
    };

    const renderSavedList = () => {
        if (savedCount === 0) {
            return emptyState(
                savedTemplates.length === 0 && sheqSubmissions.length === 0
                    ? "No saved templates yet. Save a template from the Templates page to see it here."
                    : "No saved templates match your search."
            );
        }

        return cardGrid(
            <>
                {filteredSheqSubmissions.map((sub) => {
                    const subId = sub.id || sub._id;
                    const date = new Date(sub.createdAt).toLocaleDateString("en-GB");
                    const site = sub.answers?.formData?.siteAddress;
                    const payload = {
                        type: "sheq-template",
                        id: subId,
                        title: getSubmissionLabel(sub),
                    };
                    return (
                        <TemplatePickerCard
                            key={`sheq-${subId}`}
                            title={getSubmissionLabel(sub)}
                            description={site || "Saved SHEQ report"}
                            group="Saved SHEQ"
                            meta={date}
                            onUse={() => emit(payload)}
                            onPreview={() => emit(payload, true)}
                            {...cardProps}
                        />
                    );
                })}
                {filteredSavedTemplates.map((sub) => {
                    const subId = sub.id || sub._id;
                    const payload = { type: "saved-template", submission: sub };
                    return (
                        <TemplatePickerCard
                            key={subId}
                            title={getSavedTemplateLabel(sub)}
                            description={getSavedTemplateSecondary(sub)}
                            group="Saved template"
                            onUse={() => emit(payload)}
                            onPreview={() => emit(payload, true)}
                            {...cardProps}
                        />
                    );
                })}
            </>
        );
    };

    const renderBuilderList = () => {
        if (filteredBuilderForms.length === 0) {
            return emptyState(
                builderForms.length === 0
                    ? "No form builder forms yet. Create forms in the Form Builder first."
                    : "No form builder forms match your search."
            );
        }

        return cardGrid(
            filteredBuilderForms.map((form) => {
                const payload = { type: "builder-form", form };
                return (
                    <TemplatePickerCard
                        key={form.id || form._id}
                        title={form.title || "Untitled form"}
                        description={
                            form.description ||
                            `${form.fields?.length || 0} fields · Form builder`
                        }
                        group="Form builder"
                        onUse={() => emit(payload)}
                        onPreview={() => emit(payload, true)}
                        {...cardProps}
                    />
                );
            })
        );
    };

    const subtitleText =
        variant === "full"
            ? "Choose from templates, saved templates, or form builder forms."
            : variant === "templates"
              ? "Browse the template library or your saved templates."
              : variant === "saved-builder"
                ? "Browse saved templates or form builder forms."
                : "Select a form builder form to continue.";

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    bgcolor: isDarkMode ? "#1B212C" : "#FFFFFF",
                    border: `1px solid ${borderColor}`,
                    overflow: "hidden",
                    boxShadow: isDarkMode
                        ? "0 24px 48px rgba(0,0,0,0.45)"
                        : "0 24px 48px rgba(15,23,42,0.12)",
                },
            }}
        >
            <DialogTitle
                sx={{
                    fontWeight: 700,
                    color: headingColor,
                    pb: showTabs ? 1.5 : undefined,
                    pt: 2.5,
                    px: 3,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1.5,
                }}
            >
                <Box
                    sx={{
                        p: 1,
                        borderRadius: 2,
                        bgcolor: "rgba(232, 159, 23, 0.12)",
                        color: "#E89F17",
                        display: "flex",
                        flexShrink: 0,
                        mt: 0.25,
                    }}
                >
                    <FileText size={20} />
                </Box>
                <Box>
                    <Typography sx={{ fontWeight: 700, color: headingColor, fontSize: "1.1rem" }}>
                        {dialogTitle}
                    </Typography>
                    <Typography variant="body2" sx={{ color: subColor, mt: 0.5 }}>
                        {subtitleText}
                    </Typography>
                </Box>
            </DialogTitle>

            {showTabs ? (
                <Box
                    sx={{
                        px: 3,
                        borderBottom: `1px solid ${borderColor}`,
                        bgcolor: isDarkMode ? "#111827" : "#F9FAFB",
                    }}
                >
                    <Tabs
                        value={activeTab}
                        onChange={(_, value) => setActiveTab(value)}
                        sx={tabSx}
                    >
                        {showLibrary ? (
                            <Tab
                                value={TAB_LIBRARY}
                                label={
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        Templates
                                        <Chip
                                            size="small"
                                            label={libraryCount}
                                            sx={{ height: 20, fontSize: "0.7rem" }}
                                        />
                                    </Box>
                                }
                            />
                        ) : null}
                        {showSaved ? (
                            <Tab
                                value={TAB_SAVED}
                                label={
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        Saved Templates
                                        <Chip
                                            size="small"
                                            label={savedCount}
                                            sx={{ height: 20, fontSize: "0.7rem" }}
                                        />
                                    </Box>
                                }
                            />
                        ) : null}
                        {showBuilder ? (
                            <Tab
                                value={TAB_BUILDER}
                                label={
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        Formbuilder Template
                                        <Chip
                                            size="small"
                                            label={filteredBuilderForms.length}
                                            sx={{ height: 20, fontSize: "0.7rem" }}
                                        />
                                    </Box>
                                }
                            />
                        ) : null}
                    </Tabs>
                </Box>
            ) : null}

            <DialogContent
                dividers
                sx={{
                    maxHeight: "70vh",
                    bgcolor: surfaceBg,
                    px: 3,
                    py: 2.5,
                }}
            >
                <TextField
                    fullWidth
                    size="small"
                    placeholder={searchPlaceholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search size={18} color={subColor} />
                            </InputAdornment>
                        ),
                        sx: {
                            borderRadius: 2,
                            bgcolor: isDarkMode ? "#1B212C" : "#FFFFFF",
                        },
                    }}
                    sx={{ mb: 2.5 }}
                />

                {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                        <CircularProgress sx={{ color: "#E89F17" }} />
                    </Box>
                ) : contentTab === TAB_LIBRARY ? (
                    renderLibraryList()
                ) : contentTab === TAB_SAVED ? (
                    renderSavedList()
                ) : (
                    renderBuilderList()
                )}
            </DialogContent>
            <DialogActions
                sx={{
                    px: 3,
                    py: 2,
                    borderTop: `1px solid ${borderColor}`,
                    bgcolor: isDarkMode ? "#1B212C" : "#F9FAFB",
                }}
            >
                <Button
                    onClick={onClose}
                    sx={{ textTransform: "none", fontWeight: 600, color: subColor }}
                >
                    Cancel
                </Button>
            </DialogActions>
        </Dialog>
    );
}
