import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getStoredToken, isTokenExpired } from "../utils/authSession";
import { getPostAuthPath } from "../utils/postAuthRedirect";

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

/**
 * Sends already-signed-in users to the main dashboard (e.g. on /login or /signup).
 */
export default function RedirectIfAuthenticated() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = getStoredToken();
    if (!token || isTokenExpired(token)) return;
    navigate(getPostAuthPath(readStoredUser()), { replace: true });
  }, [navigate]);

  return null;
}
