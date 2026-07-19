import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  TextField,
} from "@mui/material";
import { Link as RouterLink, useParams } from "react-router-dom";
import api from "../services/api";

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendResult, setResendResult] = useState(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await api.post("/auth/verify-email", { token });
        if (cancelled) return;
        if (res.data?.success) {
          setStatus("success");
          setMessage(res.data.message || "Email verified. You can sign in now.");
        } else {
          setStatus("error");
          setMessage(res.data?.message || "Verification failed.");
          if (res.data?.email) setResendEmail(res.data.email);
        }
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(err.response?.data?.message || "Verification failed.");
        if (err.response?.data?.email) setResendEmail(err.response.data.email);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleResend = async () => {
    const email = resendEmail.trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setResendResult({
        severity: "error",
        msg: "Enter a valid email address to resend the verification link.",
      });
      return;
    }
    setResendLoading(true);
    setResendResult(null);
    try {
      const res = await api.post("/auth/resend-verification", { email });
      setResendResult({
        severity: "success",
        msg:
          res.data?.message ||
          "A new verification link has been sent. Check your inbox and spam folder.",
      });
    } catch (err) {
      setResendResult({
        severity: "error",
        msg:
          err.response?.data?.message || "Could not resend the verification email.",
      });
    } finally {
      setResendLoading(false);
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
        bgcolor: "#fff",
      }}
    >
      <Box sx={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <Box component="img" src="/sitemate-logo.svg" alt="Sitemate" sx={{ height: 36, mb: 3 }} />
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
          Email verification
        </Typography>

        {status === "loading" && (
          <>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography color="text.secondary">Verifying your email…</Typography>
          </>
        )}

        {status === "success" && (
          <Alert severity="success" sx={{ mb: 2, textAlign: "left" }}>
            {message}
          </Alert>
        )}

        {status === "error" && (
          <Alert severity="error" sx={{ mb: 2, textAlign: "left" }}>
            {message}
          </Alert>
        )}

        {status === "success" && (
          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
            sx={{ mt: 1, textTransform: "none", borderRadius: 50, bgcolor: "#0B4DA6" }}
          >
            Go to sign in
          </Button>
        )}

        {status === "error" && (
          <Box
            sx={{
              mt: 1,
              p: 2.5,
              border: "1px solid #e2e8f0",
              borderRadius: 3,
              textAlign: "left",
              bgcolor: "#f8fafc",
            }}
          >
            <Typography sx={{ fontWeight: 600, mb: 0.5 }}>
              Resend verification link
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter your account email and we&apos;ll send you a new verification link.
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="email"
              label="Email address"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              sx={{ mb: 2, bgcolor: "#fff" }}
            />
            {resendResult && (
              <Alert severity={resendResult.severity} sx={{ mb: 2 }}>
                {resendResult.msg}
              </Alert>
            )}
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                disabled={resendLoading}
                onClick={handleResend}
                sx={{ textTransform: "none", borderRadius: 50, bgcolor: "#0B4DA6" }}
              >
                {resendLoading ? "Sending…" : "Resend verification link"}
              </Button>
              <Button
                component={RouterLink}
                to="/login"
                variant="text"
                sx={{ textTransform: "none", borderRadius: 50 }}
              >
                Go to sign in
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
