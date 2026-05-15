import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getStoredToken,
  isTokenExpired,
  registerSessionExpiredHandler,
  scheduleTokenExpiryLogout,
  clearExpiryTimer,
  handleSessionExpired,
} from "../utils/authSession";

/**
 * Wires JWT expiry → logout + redirect. Mount once inside BrowserRouter.
 */
export default function SessionManager() {
  const navigate = useNavigate();
  const { clearUser, refreshUser } = useAuth();

  useEffect(() => {
    registerSessionExpiredHandler((reason) => {
      clearUser();
      navigate("/login", {
        replace: true,
        state: { sessionExpired: reason === "expired" || reason === "unauthorized" },
      });
    });

    return () => {
      registerSessionExpiredHandler(null);
      clearExpiryTimer();
    };
  }, [clearUser, navigate]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      clearExpiryTimer();
      return undefined;
    }

    if (isTokenExpired(token)) {
      handleSessionExpired("expired");
      return undefined;
    }

    refreshUser();
    return scheduleTokenExpiryLogout(token);
  }, [refreshUser]);

  useEffect(() => {
    const onFocus = () => {
      const token = getStoredToken();
      if (token && isTokenExpired(token)) {
        handleSessionExpired("expired");
      } else if (token) {
        scheduleTokenExpiryLogout(token);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") onFocus();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
