import React, { useState } from "react";
import {
  Box,
  Grid,
  TextField,
  Button,
  Typography,
  IconButton,
  InputAdornment,
  Alert,
  Link as MuiLink,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useParams, useNavigate, Link as RouterLink } from "react-router-dom";
import api from "../services/api";
import { newPasswordError } from "../utils/passwordPolicy";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldError("");
    setMessage(null);

    const pwdErr = newPasswordError(password);
    if (pwdErr) {
      setFieldError(pwdErr);
      return;
    }
    if (password !== confirmPassword) {
      setFieldError("Passwords do not match");
      return;
    }
    if (!token) {
      setFieldError("Invalid reset link. Please request a new one.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password", { token, password });
      if (res.data?.success) {
        setMessage({
          type: "success",
          text: res.data.message || "Password reset successfully!",
        });
        setTimeout(() => navigate("/login"), 2500);
      } else {
        setFieldError(res.data?.message || "Failed to reset password");
      }
    } catch (err) {
      setFieldError(err.response?.data?.message || "Server error");
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
              Set a new <br /> password
            </Typography>

            <Typography color="text.secondary" sx={{ mb: 4 }}>
              Choose a strong password (8+ characters with uppercase, number, and special character).
            </Typography>

            <Box component="form" onSubmit={handleSubmit} noValidate autoComplete="off">
              <TextField
                label="New password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldError("");
                }}
                fullWidth
                margin="normal"
                required
                disabled={loading || message?.type === "success"}
                InputProps={{
                  sx: { borderRadius: 2 },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label="toggle password visibility"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="Confirm password"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setFieldError("");
                }}
                fullWidth
                margin="normal"
                required
                disabled={loading || message?.type === "success"}
                InputProps={{
                  sx: { borderRadius: 2 },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => setShowConfirm((v) => !v)}
                        aria-label="toggle confirm password visibility"
                      >
                        {showConfirm ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {fieldError && (
                <Typography color="error" sx={{ mt: 1 }}>
                  {fieldError}
                </Typography>
              )}

              {message && (
                <Alert severity={message.type} sx={{ mt: 2 }}>
                  {message.text}
                </Alert>
              )}

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading || message?.type === "success"}
                sx={{
                  mt: 4,
                  mb: 1,
                  py: 1.25,
                  borderRadius: 2,
                  bgcolor: "#013a63",
                  ":hover": { bgcolor: "#2a6f97" },
                }}
              >
                {loading ? "Resetting…" : "Reset password"}
              </Button>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: "center" }}>
                <MuiLink component={RouterLink} to="/forgot-password" sx={{ fontWeight: 700 }}>
                  Request a new link
                </MuiLink>
                {" · "}
                <MuiLink component={RouterLink} to="/login" sx={{ fontWeight: 700 }}>
                  Sign in
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
            alt="Reset password illustration"
            sx={{ width: "100%", maxWidth: 2000, height: "auto", objectFit: "contain" }}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
