import React, { useState, useEffect } from "react";
import {
    Box,
    Typography,
    TextField,
    Button,
    Paper,
    Grid,
    Alert,
    CircularProgress,
    Snackbar,
} from "@mui/material";
import Layout from "../components/Layout";
import api from "../services/api";
import { newPasswordError } from "../utils/passwordPolicy";

const AccountSettings = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [passwords, setPasswords] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [snack, setSnack] = useState({
        open: false,
        message: "",
        severity: "info",
    });

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        try {

            try {
                const res = await api.get("/auth/me");
                if (res.data && res.data.user) {
                    setUser(res.data.user);
                } else {
                    throw new Error("No user data");
                }
            } catch (err) {
                console.warn("API fetch failed, checking localStorage", err);
                const stored = localStorage.getItem("user");
                if (stored) {
                    setUser(JSON.parse(stored));
                }
            }
        } catch (err) {
            console.error("Failed to load profile", err);
            setSnack({ open: true, message: "Failed to load profile", severity: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const handleUpdatePassword = async () => {
        if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
            setSnack({ open: true, message: "Please fill in all fields", severity: "warning" });
            return;
        }
        if (passwords.newPassword !== passwords.confirmPassword) {
            setSnack({ open: true, message: "Passwords do not match", severity: "error" });
            return;
        }

        const pwErr = newPasswordError(passwords.newPassword);
        if (pwErr) {
            setSnack({ open: true, message: pwErr, severity: "error" });
            return;
        }

        try {
            await api.post("/auth/change-password", {
                currentPassword: passwords.currentPassword,
                newPassword: passwords.newPassword,
            });

            setSnack({ open: true, message: "Password updated successfully", severity: "success" });
            setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (err) {
            console.error("Update failed", err);
            setSnack({
                open: true,
                message: err.response?.data?.message || "Failed to update password",
                severity: "error",
            });
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Layout>
            <Box sx={{ flex: 1, p: { xs: 2, md: 4 }, overflow: "auto" }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 3, color: "#1a2027" }}>
                    Account Settings
                </Typography>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 3,
                                borderRadius: 2,
                                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                            }}
                        >
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                Change Password
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                                Update your account password
                            </Typography>

                            <Box component="form" noValidate autoComplete="off">
                                <Grid container spacing={4}>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Current Password"
                                            name="currentPassword"
                                            type="password"
                                            autoComplete="current-password"
                                            value={passwords.currentPassword}
                                            onChange={handleChange}
                                            variant="outlined"
                                            sx={{ mb: 3 }}
                                            InputProps={{ sx: { borderRadius: 2 } }}
                                        />
                                        <Box sx={{ display: "flex", flexDirection: "row", gap: 3 }}>
                                            <TextField
                                                fullWidth
                                                label="New Password"
                                                name="newPassword"
                                                type="password"
                                                autoComplete="new-password"
                                                value={passwords.newPassword}
                                                onChange={handleChange}
                                                variant="outlined"
                                                InputProps={{ sx: { borderRadius: 2 } }}
                                            />
                                            <TextField
                                                fullWidth
                                                label="Confirm New Password"
                                                name="confirmPassword"
                                                type="password"
                                                autoComplete="new-password"
                                                value={passwords.confirmPassword}
                                                onChange={handleChange}
                                                variant="outlined"
                                                InputProps={{ sx: { borderRadius: 2 } }}
                                            />
                                        </Box>
                                    </Grid>

                                    <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <Button
                                            variant="contained"
                                            onClick={handleUpdatePassword}
                                            sx={{
                                                bgcolor: "#0d5d97",
                                                textTransform: "none",
                                                fontWeight: 600,
                                                py: 1.5,
                                                px: 4,
                                                borderRadius: 1.5,
                                                "&:hover": { bgcolor: "#0a4a7a" },
                                            }}
                                        >
                                            Change Password
                                        </Button>
                                    </Grid>
                                </Grid>
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>

            <Snackbar
                open={snack.open}
                autoHideDuration={4000}
                onClose={() => setSnack({ ...snack, open: false })}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
            >
                <Alert
                    onClose={() => setSnack({ ...snack, open: false })}
                    severity={snack.severity}
                    sx={{ width: "100%" }}
                >
                    {snack.message}
                </Alert>
            </Snackbar>
        </Layout>
    );
};

export default AccountSettings;
