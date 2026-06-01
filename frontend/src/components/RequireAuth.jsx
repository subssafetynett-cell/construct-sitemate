// src/components/RequireAuth.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getStoredToken, isTokenExpired, clearAuthStorage } from "../utils/authSession";
import PageAccessGuard from "./PageAccessGuard";

export default function RequireAuth({ children }) {
  const location = useLocation();
  const token = getStoredToken();

  if (!token || isTokenExpired(token)) {
    if (token) clearAuthStorage();
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
          sessionExpired: Boolean(token),
        }}
      />
    );
  }

  return <PageAccessGuard>{children}</PageAccessGuard>;
}

