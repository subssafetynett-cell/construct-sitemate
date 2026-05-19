import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Link as MuiLink,
} from "@mui/material";
import { Link as RouterLink, useParams } from "react-router-dom";
import api from "../services/api";

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

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
        }
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(err.response?.data?.message || "Verification failed.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

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

        {status !== "loading" && (
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
          <Typography sx={{ mt: 2 }} variant="body2" color="text.secondary">
            Need a new link?{" "}
            <MuiLink component={RouterLink} to="/login" sx={{ fontWeight: 600 }}>
              Sign in
            </MuiLink>{" "}
            and use resend verification.
          </Typography>
        )}
      </Box>
    </Box>
  );
}
