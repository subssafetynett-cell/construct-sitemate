import React, { useState, useEffect, useMemo } from "react";
import { 
    Box, Typography, Card, CardContent, 
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Paper, 
    Button, CircularProgress, TextField, InputAdornment, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions, Alert,
    Tabs, Tab, TablePagination,
} from "@mui/material";
import { FileText, Search, Edit3, Trash2, Eye } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import { formatSubmitterDisplay, showSubmissionCreatorColumn } from "../utils/submitterDisplay";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import {
    canEditGeneralFormTemplatesList,
    GENERAL_FORM_TEMPLATE_EDITOR_ROLES_TEXT,
} from "../utils/generalFormTemplateAccess";
import {
    isGeneralFormsPageSubmission,
    submissionHasSiteContext,
    userOwnsFormSubmission,
} from "../utils/generalFormSubmissions";
import {
    getSubmissionVisibility,
    visibilityLabel,
    GENERAL_FORM_VISIBILITY,
} from "../utils/generalFormVisibility";
import api from "../services/api";
import { useFormResponsesListQuery } from "../hooks/useDashboardQueries";
import TablePageSkeleton from "../components/TablePageSkeleton";
import {
  filterTemplateLibrary,
  buildTemplateViewEditUrl,
  buildSavedTemplateEditUrl,
} from "../constants/templateCatalog";
import { TEMPLATES_PAGE_TAB_SAVED } from "../utils/templatePageContext";

const TAB_LIBRARY = "library";
const TAB_SAVED = "saved";
const SAVED_ROWS_PER_PAGE_OPTIONS = [5, 10, 25];

export default function GeneralFormsList() {
    const { isDarkMode } = useTheme();
    const { role, currentUser } = useAuth();
    const navigate = useNavigate();
    const canManageTemplates = canEditGeneralFormTemplatesList(role);
    const showCreatorColumn = showSubmissionCreatorColumn(role);

    const userCanOpenSubmissionEditor = (sub) =>
        canManageTemplates || submissionHasSiteContext(sub);

    const userCanEditListSubmission = (sub) =>
        userCanOpenSubmissionEditor(sub) && userOwnsFormSubmission(sub, currentUser?.id);

    const [searchParams] = useSearchParams();
    const urlSearch = searchParams.get("search") || "";

    const [activeTab, setActiveTab] = useState(
        searchParams.get("tab") === TEMPLATES_PAGE_TAB_SAVED ? TAB_SAVED : TAB_LIBRARY
    );
    const [templateSearch, setTemplateSearch] = useState(urlSearch);
    const [savedPage, setSavedPage] = useState(0);
    const [savedRowsPerPage, setSavedRowsPerPage] = useState(10);

    const {
        data: submissionsResponse,
        isLoading: loading,
        refetch: refetchSubmissions,
    } = useFormResponsesListQuery(
        // Include null/empty categories so legacy Templates saves still appear.
        // Client filter (isGeneralFormsPageSubmission) keeps monitoring/site-pack out.
        { category: "General forms,__empty__" },
        { fetchAll: true, refetchOnMount: "always", staleTime: 0 }
    );

    const submissions = useMemo(
        () =>
            (submissionsResponse?.data || []).filter(isGeneralFormsPageSubmission),
        [submissionsResponse]
    );

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [trashId, setTrashId] = useState(null);

    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab === TEMPLATES_PAGE_TAB_SAVED) {
            setActiveTab(TAB_SAVED);
        }
    }, [searchParams]);

    useEffect(() => {
        if (activeTab === TAB_SAVED) {
            refetchSubmissions();
        }
    }, [activeTab, refetchSubmissions]);

    const handleDeleteConfirm = (id) => {
        setTrashId(id);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!trashId) return;
        try {
            await api.delete(`/forms/responses/${trashId}`);
            await refetchSubmissions();
            setDeleteDialogOpen(false);
            setTrashId(null);
        } catch (err) {
            console.error("Failed to delete", err);
            alert("Failed to delete submission");
        }
    };

    const getEditPath = (submission) => buildSavedTemplateEditUrl(submission);

    const filteredTemplates = filterTemplateLibrary(templateSearch);

    const filteredSubmissions = submissions.filter(
        (s) => {
            const q = templateSearch.toLowerCase();
            return (
                isGeneralFormsPageSubmission(s) &&
                ((s.form?.title || "").toLowerCase().includes(q) ||
                    (s.name || s.answers?.name || "").toLowerCase().includes(q) ||
                    new Date(s.createdAt).toLocaleDateString().includes(q))
            );
        }
    );

    const paginatedSubmissions = filteredSubmissions.slice(
        savedPage * savedRowsPerPage,
        savedPage * savedRowsPerPage + savedRowsPerPage
    );

    useEffect(() => {
        setSavedPage(0);
    }, [templateSearch, activeTab]);

    useEffect(() => {
        const maxPage = Math.max(0, Math.ceil(filteredSubmissions.length / savedRowsPerPage) - 1);
        if (savedPage > maxPage) setSavedPage(maxPage);
    }, [filteredSubmissions.length, savedPage, savedRowsPerPage]);

    const surfaceBg = isDarkMode ? "#1B212C" : "#FFFFFF";
    const surfaceBorder = isDarkMode ? "#374151" : "#E5E7EB";
    const mutedText = isDarkMode ? "#9CA3AF" : "#6B7280";
    const headingText = isDarkMode ? "#F9FAFB" : "#111827";

    const actionButtonSx = {
        textTransform: "none",
        borderRadius: 50,
        fontWeight: 600,
        fontSize: "0.8125rem",
        py: 0.75,
        width: "100%",
    };

    const handleViewEditTemplate = (template) => {
        navigate(buildTemplateViewEditUrl(template));
    };

    return (
        <Layout>
            <Box sx={{ maxWidth: 1400, mx: "auto", width: "100%" }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, color: headingText, mb: 0.5, letterSpacing: "-0.01em" }}>
                    Templates
                </Typography>
                <Typography sx={{ color: mutedText, fontSize: "0.95rem", maxWidth: 720 }}>
                    Browse all templates and forms — report concerns, inspections, SHEQ, and general templates.
                </Typography>
            </Box>

            {canManageTemplates && (
            <Alert
                severity="info"
                sx={{
                    mb: 3,
                    borderRadius: 2,
                    alignItems: "center",
                    bgcolor: isDarkMode ? "rgba(232, 159, 23, 0.12)" : "rgba(232, 159, 23, 0.08)",
                    color: isDarkMode ? "#F9FAFB" : "#374151",
                    border: `1px solid ${isDarkMode ? "rgba(232, 159, 23, 0.35)" : "rgba(232, 159, 23, 0.35)"}`,
                    "& .MuiAlert-icon": { color: "#E89F17" },
                }}
            >
                {`From this page you can edit template fields, name the template when you save, and choose Public (visible to your company) or Private (only you). Only ${GENERAL_FORM_TEMPLATE_EDITOR_ROLES_TEXT} can change templates.`}
            </Alert>
            )}

            <Paper
                elevation={0}
                sx={{
                    borderRadius: 4,
                    border: `1px solid ${surfaceBorder}`,
                    bgcolor: surfaceBg,
                    overflow: "hidden",
                }}
            >
            <Box
                sx={{
                    px: { xs: 2, sm: 3 },
                    pt: { xs: 1.5, sm: 2 },
                    borderBottom: `1px solid ${surfaceBorder}`,
                    bgcolor: isDarkMode ? "#111827" : "#FAFAF9",
                }}
            >
                <Tabs
                    value={activeTab}
                    onChange={(_, value) => {
                        setActiveTab(value);
                        setTemplateSearch("");
                        setSavedPage(0);
                    }}
                    sx={{
                        minHeight: 44,
                        mb: 2,
                        "& .MuiTab-root": {
                            textTransform: "none",
                            fontWeight: 600,
                            fontSize: "0.9rem",
                            color: isDarkMode ? "#9CA3AF" : "#6B7280",
                            minHeight: 44,
                        },
                        "& .Mui-selected": {
                            color: isDarkMode ? "#F9FAFB" : "#111827",
                        },
                        "& .MuiTabs-indicator": {
                            bgcolor: "#E89F17",
                            height: 3,
                            borderRadius: "3px 3px 0 0",
                        },
                    }}
                >
                    <Tab label="Template library" value={TAB_LIBRARY} />
                    <Tab
                        label={`Saved templates${submissions.length ? ` (${submissions.length})` : ""}`}
                        value={TAB_SAVED}
                    />
                </Tabs>

                <TextField
                    fullWidth
                    size="small"
                    placeholder={
                        activeTab === TAB_LIBRARY
                            ? "Search template library..."
                            : "Search saved templates..."
                    }
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search size={18} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                            </InputAdornment>
                        ),
                        sx: {
                            borderRadius: 2,
                            bgcolor: isDarkMode ? "#1B212C" : "#FFFFFF",
                            fontSize: "0.9rem",
                            "& fieldset": { borderColor: surfaceBorder },
                            "&:hover fieldset": { borderColor: isDarkMode ? "#4B5563" : "#D1D5DB" },
                            "&.Mui-focused fieldset": { borderColor: "#E89F17", borderWidth: 1.5 },
                        },
                    }}
                    sx={{ pb: 2 }}
                />
            </Box>

            <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {activeTab === TAB_LIBRARY && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: 2.5 }}>
                {filteredTemplates.length === 0 ? (
                    <Box
                        sx={{
                            gridColumn: "1 / -1",
                            p: 5,
                            textAlign: "center",
                            bgcolor: isDarkMode ? "#111827" : "#F9FAFB",
                            borderRadius: 3,
                            border: `1px dashed ${surfaceBorder}`,
                        }}
                    >
                        <Typography sx={{ color: mutedText }}>No templates match your search.</Typography>
                    </Box>
                ) : (
                filteredTemplates.map((form) => (
                    <Card
                        key={form.id}
                        sx={{
                            bgcolor: isDarkMode ? "#111827" : "#FFFFFF",
                            border: `1px solid ${surfaceBorder}`,
                            borderRadius: 3,
                            display: "flex",
                            flexDirection: "column",
                            transition: "border-color 0.2s, box-shadow 0.2s",
                            boxShadow: isDarkMode ? "none" : "0 1px 3px rgba(0,0,0,0.04)",
                            "&:hover": {
                                borderColor: "rgba(232, 159, 23, 0.55)",
                                boxShadow: isDarkMode
                                    ? "0 4px 24px rgba(0,0,0,0.25)"
                                    : "0 8px 24px rgba(17,24,39,0.08)",
                            },
                        }}
                        elevation={0}
                    >
                        <CardContent sx={{ p: 2.5, flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                                <Box
                                    sx={{
                                        p: 1.25,
                                        bgcolor: "rgba(232, 159, 23, 0.12)",
                                        borderRadius: 2,
                                        color: "#E89F17",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    <FileText size={20} />
                                </Box>
                                <Box sx={{ minWidth: 0 }}>
                                    {form.group ? (
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: "#E89F17",
                                                fontWeight: 600,
                                                display: "block",
                                                mb: 0.25,
                                            }}
                                        >
                                            {form.group}
                                        </Typography>
                                    ) : null}
                                    <Typography
                                        variant="subtitle1"
                                        sx={{
                                            fontWeight: 600,
                                            color: headingText,
                                            lineHeight: 1.35,
                                            fontSize: "0.95rem",
                                        }}
                                    >
                                        {form.title}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: mutedText,
                                            mt: 0.75,
                                            lineHeight: 1.5,
                                            display: "-webkit-box",
                                            WebkitLineClamp: 3,
                                            WebkitBoxOrient: "vertical",
                                            overflow: "hidden",
                                        }}
                                    >
                                        {form.description}
                                    </Typography>
                                </Box>
                            </Box>

                            <Button
                                variant="contained"
                                size="small"
                                startIcon={canManageTemplates ? <Edit3 size={15} /> : <Eye size={15} />}
                                onClick={() => handleViewEditTemplate(form)}
                                sx={{
                                    ...actionButtonSx,
                                    mt: "auto",
                                    bgcolor: "#E89F17",
                                    color: "#FFFFFF",
                                    boxShadow: "none",
                                    "&:hover": { bgcolor: "#D48E14", boxShadow: "none", color: "#FFFFFF" },
                                    "& .MuiButton-startIcon": { color: "#FFFFFF" },
                                }}
                            >
                                View / Edit
                            </Button>
                        </CardContent>
                    </Card>
                ))
                )}
            </Box>
            )}

            {activeTab === TAB_SAVED && (
            <Box>
                {loading ? (
                    <TablePageSkeleton rows={8} />
                ) : filteredSubmissions.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center', bgcolor: isDarkMode ? "#1B212C" : "#F9FAFB", borderRadius: 4, border: `1px dashed ${isDarkMode ? "#374151" : "#E5E7EB"}` }}>
                        <Typography color="text.secondary">
                            {templateSearch
                                ? "No saved templates match your search."
                                : "No saved templates yet. Open a template from the library, edit it, and save it here."}
                        </Typography>
                    </Box>
                ) : (
                    <>
                    <TableContainer sx={{ borderRadius: 3, border: `1px solid ${surfaceBorder}`, overflow: "hidden" }}>
                        <Table>
                            <TableHead sx={{ bgcolor: isDarkMode ? "#111827" : "#F9FAFB" }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 600, color: headingText, fontSize: "0.85rem", width: 72 }}>SL No</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: headingText, fontSize: "0.85rem" }}>Form Title</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: headingText, fontSize: "0.85rem" }}>Visibility</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: headingText, fontSize: "0.85rem" }}>Saved Date</TableCell>
                                    {showCreatorColumn && (
                                    <TableCell sx={{ fontWeight: 600, color: headingText, fontSize: "0.85rem" }}>Created by</TableCell>
                                    )}
                                    <TableCell align="right" sx={{ fontWeight: 600, color: headingText, fontSize: "0.85rem" }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedSubmissions.map((sub, idx) => {
                                    const slNo = savedPage * savedRowsPerPage + idx + 1;
                                    return (
                                    <TableRow key={sub.id || sub._id} sx={{ "&:hover": { bgcolor: isDarkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)" } }}>
                                        <TableCell sx={{ color: mutedText, fontWeight: 500 }}>
                                            {slNo}
                                        </TableCell>
                                        <TableCell sx={{ color: isDarkMode ? "#F9FAFB" : "#111827" }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Box sx={{ p: 1, bgcolor: "rgba(232, 159, 23, 0.1)", borderRadius: 1.5, color: "#E89F17", display: 'flex' }}>
                                                    <FileText size={16} />
                                                </Box>
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 600, color: isDarkMode ? "#F9FAFB" : "#111827" }}>
                                                        {sub.name || sub.answers?.name || sub.form?.title || "Untitled Form"}
                                                    </Typography>
                                                    {sub.form?.title && (sub.name || sub.answers?.name) && (
                                                        <Typography variant="caption" sx={{ color: isDarkMode ? "#9CA3AF" : "#6B7280", display: "block" }}>
                                                            {sub.form.title}
                                                        </Typography>
                                                    )}
                                                    {((sub.tags && sub.tags.length > 0) || (sub.answers?.tags && sub.answers.tags.length > 0)) && (
                                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.8 }}>
                                                            {(typeof (sub.tags || sub.answers?.tags) === 'string' 
                                                                ? (sub.tags || sub.answers?.tags).split(',').map(t => t.trim()) 
                                                                : (sub.tags || sub.answers?.tags)
                                                            ).filter(Boolean).map((tag, i) => (
                                                                <Chip 
                                                                    key={i} 
                                                                    label={tag} 
                                                                    size="small" 
                                                                    variant="filled"
                                                                    sx={{ 
                                                                        fontSize: '0.65rem', 
                                                                        height: 20,
                                                                        bgcolor: isDarkMode ? "rgba(232, 159, 23, 0.2)" : "rgba(232, 159, 23, 0.15)",
                                                                        color: "#E89F17",
                                                                        fontWeight: 600,
                                                                        borderRadius: 1
                                                                    }} 
                                                                />
                                                            ))}
                                                        </Box>
                                                    )}
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={visibilityLabel(getSubmissionVisibility(sub))}
                                                sx={{
                                                    fontWeight: 600,
                                                    fontSize: "0.7rem",
                                                    bgcolor:
                                                        getSubmissionVisibility(sub) ===
                                                        GENERAL_FORM_VISIBILITY.PRIVATE
                                                            ? isDarkMode
                                                                ? "rgba(148, 163, 184, 0.2)"
                                                                : "rgba(100, 116, 139, 0.12)"
                                                            : "rgba(34, 197, 94, 0.15)",
                                                    color:
                                                        getSubmissionVisibility(sub) ===
                                                        GENERAL_FORM_VISIBILITY.PRIVATE
                                                            ? isDarkMode
                                                                ? "#CBD5E1"
                                                                : "#475569"
                                                            : "#16a34a",
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ color: isDarkMode ? "#9CA3AF" : "#6B7280" }}>
                                            {new Date(sub.createdAt).toLocaleDateString("en-GB", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </TableCell>
                                        {showCreatorColumn && (
                                        <TableCell sx={{ color: isDarkMode ? "#9CA3AF" : "#6B7280", fontSize: "0.8rem" }}>
                                            {formatSubmitterDisplay(sub.submittedBy)}
                                        </TableCell>
                                        )}
                                        <TableCell align="right">
                                            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, flexWrap: "wrap" }}>
                                                {userCanEditListSubmission(sub) ? (
                                                    <>
                                                        <Button
                                                            size="small"
                                                            startIcon={<Edit3 size={16} />}
                                                            onClick={() => navigate(getEditPath(sub))}
                                                            sx={{
                                                                color: "#E89F17",
                                                                textTransform: "none",
                                                                "&:hover": { bgcolor: "rgba(232, 159, 23, 0.1)" },
                                                            }}
                                                        >
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            startIcon={<Trash2 size={16} />}
                                                            onClick={() => handleDeleteConfirm(sub.id || sub._id)}
                                                            sx={{
                                                                color: isDarkMode ? "#EF4444" : "#DC2626",
                                                                textTransform: "none",
                                                                "&:hover": {
                                                                    bgcolor: isDarkMode
                                                                        ? "rgba(239, 68, 68, 0.12)"
                                                                        : "rgba(220, 38, 38, 0.06)",
                                                                },
                                                            }}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <Button
                                                        size="small"
                                                        startIcon={<Eye size={16} />}
                                                        onClick={() => navigate(getEditPath(sub))}
                                                        sx={{
                                                            color: isDarkMode ? "#9CA3AF" : "#6B7280",
                                                            textTransform: "none",
                                                            "&:hover": {
                                                                bgcolor: isDarkMode
                                                                    ? "rgba(255,255,255,0.05)"
                                                                    : "rgba(0,0,0,0.04)",
                                                            },
                                                        }}
                                                    >
                                                        View
                                                    </Button>
                                                )}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 1,
                            mt: 2,
                            pt: 1,
                            borderTop: `1px solid ${surfaceBorder}`,
                        }}
                    >
                        <Typography variant="body2" sx={{ color: mutedText }}>
                            Showing {filteredSubmissions.length === 0 ? 0 : savedPage * savedRowsPerPage + 1} to{" "}
                            {Math.min(savedPage * savedRowsPerPage + savedRowsPerPage, filteredSubmissions.length)} of{" "}
                            {filteredSubmissions.length}
                        </Typography>
                        <TablePagination
                            component="div"
                            count={filteredSubmissions.length}
                            page={savedPage}
                            onPageChange={(_, newPage) => setSavedPage(newPage)}
                            rowsPerPage={savedRowsPerPage}
                            onRowsPerPageChange={(e) => {
                                setSavedRowsPerPage(parseInt(e.target.value, 10));
                                setSavedPage(0);
                            }}
                            rowsPerPageOptions={SAVED_ROWS_PER_PAGE_OPTIONS}
                            sx={{
                                color: headingText,
                                "& .MuiTablePagination-toolbar": { p: 0, minHeight: 40 },
                                "& .MuiTablePagination-selectIcon": { color: mutedText },
                            }}
                        />
                    </Box>
                    </>
                )}
            </Box>
            )}
            </Box>
            </Paper>
            </Box>
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        padding: 2,
                        minWidth: 320,
                        bgcolor: isDarkMode ? "#1B212C" : "#FFFFFF",
                        color: isDarkMode ? "#F9FAFB" : "inherit"
                    }
                }}
            >
                <DialogTitle sx={{ pb: 1, fontWeight: 600, fontSize: '1.25rem' }}>
                    Delete Submission?
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2, color: isDarkMode ? "#9CA3AF" : "text.secondary" }}>
                        Are you sure you want to delete this submission? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ borderTop: isDarkMode ? "1px solid #374151" : "none", pt: 2 }}>
                    <Button
                        onClick={() => setDeleteDialogOpen(false)}
                        variant="outlined"
                        sx={{
                            textTransform: 'none',
                            color: isDarkMode ? "#9CA3AF" : 'text.primary',
                            borderColor: isDarkMode ? "#374151" : 'divider',
                            borderRadius: 50,
                            px: 3
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        disableElevation
                        onClick={handleDelete}
                        sx={{
                            textTransform: 'none',
                            borderRadius: 50,
                            px: 3,
                            bgcolor: "#EF4444"
                        }}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Layout>
    );
}
