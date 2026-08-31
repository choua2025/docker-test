/**
 * Wraps routes that need a login, and optionally a specific role.
 *
 *   <Route element={<ProtectedRoute />}>            ... any logged-in user
 *   <Route element={<ProtectedRoute roles={["teacher", "admin"]} />}>
 *
 * This is a convenience for the user interface only. The real protection is
 * requireAuth / requireRole on the server - never trust the browser.
 */
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { Spinner } from "./ui.jsx";

export default function ProtectedRoute({ roles }) {
  const { user, status } = useAuth();
  const location = useLocation();

  // Still checking the saved token - redirecting now would log the user out
  // every time they refresh the page.
  if (status === "loading") return <Spinner />;

  if (!user) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
