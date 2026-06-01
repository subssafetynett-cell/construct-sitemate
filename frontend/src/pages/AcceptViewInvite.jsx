import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { Link as RouterLink, useParams } from "react-router-dom";
import api from "../services/api";
import { newPasswordError } from "../utils/passwordPolicy";

export default function AcceptViewInvite() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [loadError, setLoadError] = useState("");

  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!token) {
      setLoadError("Invalid invitation link.");
      setLoading(false);
      return;
    }
    api
      .get(`/auth/view-invite/${token}`)
      .then((res) => {
        if (res.data?.success) setInvite(res.data.invite);
        else setLoadError(res.data?.message || "Invalid invitation.");
      })
      .catch((err) => {
        setLoadError(err.response?.data?.message || "Invalid invitation.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (!/^\d{6}$/.test(otp.trim())) {
      setSubmitError("Enter the 6-digit code from your email.");
      return;
    }
    const pwdErr = newPasswordError(password);
    if (pwdErr) {
      setSubmitError(pwdErr);
      return;
    }
    if (password !== passwordConfirm) {
      setSubmitError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/auth/accept-view-invite", {
        token,
        otp: otp.trim(),
        password,
        passwordConfirm,
      });
      if (res.data?.success) {
        setDone(true);
      } else {
        setSubmitError(res.data?.message || "Could not complete invitation.");
      }
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Could not complete invitation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: 4,
        bgcolor: "#f8fafc",
      }}
    >
      <Box
        sx={{
          maxWidth: 440,
          width: "100%",
          bgcolor: "#fff",
          borderRadius: 3,
          p: { xs: 3, sm: 4 },
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: "#111827" }}>
          Accept view invitation
        </Typography>

        {loading && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && loadError && (
          <>
            <Alert severity="error" sx={{ mb: 2 }}>
              {loadError}
            </Alert>
            <Button component={RouterLink} to="/login" variant="outlined" fullWidth>
              Go to sign in
            </Button>
          </>
        )}

        {!loading && !loadError && done && (
          <>
            <Alert severity="success" sx={{ mb: 2 }}>
              Your view-only account is ready. Sign in with your email and password.
            </Alert>
            <Button
              component={RouterLink}
              to="/login"
              variant="contained"
              fullWidth
              sx={{ bgcolor: "#0B4DA6", textTransform: "none", borderRadius: 2 }}
            >
              Sign in
            </Button>
          </>
        )}

        {!loading && !loadError && !done && invite && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              You were invited to <strong>{invite.companyName}</strong> with view-only access
              for <strong>{invite.emailMasked || invite.email}</strong>.
            </Typography>

            {invite.alreadyVerified && (
              <Alert severity="info" sx={{ mb: 2 }}>
                This invitation was already completed. You can sign in, or set a new password below if
                you were sent a new invite.
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                label="Verification code"
                fullWidth
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code from email"
                inputProps={{ inputMode: "numeric", pattern: "[0-9]*", maxLength: 6 }}
                sx={{ mb: 2 }}
              />
              <TextField
                label="Password"
                type={showPassword ? "text" : "password"}
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                sx={{ mb: 2 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword((s) => !s)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Confirm password"
                type={showPassword ? "text" : "password"}
                fullWidth
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                autoComplete="new-password"
                sx={{ mb: 2 }}
              />

              {submitError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {submitError}
                </Alert>
              )}

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={submitting}
                sx={{
                  py: 1.4,
                  bgcolor: "#0B4DA6",
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: 2,
                }}
              >
                {submitting ? "Activating…" : "Activate view access"}
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
