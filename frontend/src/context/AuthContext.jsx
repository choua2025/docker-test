/**
 * Holds "who is logged in" for the whole app.
 *
 * On first load it checks whether a saved token still works by calling
 * /api/auth/me. Until that answer arrives, `status` is "loading" - which is
 * why ProtectedRoute must wait instead of redirecting straight to /login.
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { authApi, getToken, setToken } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading"); // "loading" | "ready"

  // Restore the session once, when the app mounts.
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (!getToken()) {
        if (!cancelled) setStatus("ready");
        return;
      }

      try {
        const { user: currentUser } = await authApi.me();
        if (!cancelled) setUser(currentUser);
      } catch {
        // Expired, revoked or invalid - drop it and stay logged out.
        setToken(null);
      } finally {
        if (!cancelled) setStatus("ready");
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: user !== null,

      async login(credentials) {
        const { user: loggedIn, token } = await authApi.login(credentials);
        setToken(token);
        setUser(loggedIn);
        return loggedIn;
      },

      async register(data) {
        const { user: created, token } = await authApi.register(data);
        setToken(token);
        setUser(created);
        return created;
      },

      logout() {
        setToken(null);
        setUser(null);
      },
    }),
    [user, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return context;
}
