import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canAccessPath, isViewOnlyUser } from "../utils/pageAccess";

/**
 * Restricts view-only users to their allowed page list.
 */
export default function PageAccessGuard({ children }) {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser || !isViewOnlyUser(currentUser)) {
    return children;
  }

  if (!canAccessPath(currentUser, location.pathname)) {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  return children;
}
