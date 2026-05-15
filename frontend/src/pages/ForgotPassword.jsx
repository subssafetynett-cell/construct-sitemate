import React, { useState } from "react";
import {
  Box,
  Grid,
  TextField,
  Button,
  Typography,
  Alert,
  Link as MuiLink,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import api from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage(null);

    try {
      const res = await api.post("/auth/forgot-password", { email: trimmed });
      if (res.data?.success) {
        setMessage(
          res.data.message ||
            "If an account exists for that email, we sent a password reset link."
        );
      } else {
        setError(res.data?.message || "Could not send reset link. Please try again.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: { xs: 2, sm: 4, md: 8, lg: 12 },
      }}
    >
      <Grid
        container
        alignItems="center"
        justifyContent="center"
        sx={{ flexGrow: 1, maxWidth: "1600px" }}
      >
        <Grid
          item
          xs={12}
          md={6}
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            px: { xs: 2, sm: 4, md: 6 },
            py: { xs: 4, md: 0 },
          }}
        >
          <Box sx={{ width: "100%", maxWidth: 500, mx: "auto" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
              <Box
                component="img"
                src="/sitemate-logo.svg"
                alt="logo"
                sx={{ height: 36, width: "auto" }}
              />
            </Box>

            <Typography variant="h3" component="h1" sx={{ fontWeight: 800, mb: 1.5, lineHeight: 1.04 }}>
              Forgot your <br /> password?
            </Typography>

            <Typography color="text.secondary" sx={{ mb: 4 }}>
              Enter the email on your account and we&apos;ll send you a link to reset your password.
            </Typography>

            <Box component="form" onSubmit={handleSubmit} noValidate autoComplete="off">
              <TextField
                label="Email address"
                type="email"
                name="forgot-password-email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                fullWidth
                margin="normal"
                required
                disabled={loading || Boolean(message)}
                InputProps={{ sx: { borderRadius: 2 } }}
              />

              {error && (
                <Typography color="error" sx={{ mt: 1 }}>
                  {error}
                </Typography>
              )}

              {message && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  {message}
                </Alert>
              )}

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading || Boolean(message)}
                sx={{
                  mt: 4,
                  mb: 1,
                  py: 1.25,
                  borderRadius: 2,
                  bgcolor: "#013a63",
                  ":hover": { bgcolor: "#2a6f97" },
                }}
              >
                {loading ? "Sending…" : "Send reset link"}
              </Button>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: "center" }}>
                <MuiLink component={RouterLink} to="/login" sx={{ fontWeight: 700 }}>
                  Back to sign in
                </MuiLink>
              </Typography>
            </Box>
          </Box>
        </Grid>

        <Grid
          item
          xs={12}
          md={6}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            px: { xs: 2, sm: 4, md: 6 },
            py: { xs: 4, md: 0 },
          }}
        >
          <Box
            component="img"
            src="/loginimage.svg"
            alt="Forgot password illustration"
            sx={{ width: "100%", maxWidth: 2000, height: "auto", objectFit: "contain" }}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
