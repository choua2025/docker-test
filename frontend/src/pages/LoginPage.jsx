import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { t } from "../i18n/lo.js";
import { AuthCard, Button, ErrorMessage, Field } from "../components/ui.jsx";

export default function LoginPage() {
  const { login, user, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already logged in? Skip the form.
  if (status === "ready" && user) return <Navigate to="/" replace />;

  function update(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(form);
      // Go back to whatever page sent us here, or the dashboard.
      navigate(location.state?.from?.pathname ?? "/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title={t.auth.loginTitle} subtitle={t.auth.loginSubtitle}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <ErrorMessage>{error}</ErrorMessage>

        <Field
          id="email"
          name="email"
          type="email"
          label={t.auth.email}
          placeholder={t.auth.emailPlaceholder}
          autoComplete="email"
          required
          value={form.email}
          onChange={update("email")}
        />

        <div>
          <Field
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            label={t.auth.password}
            autoComplete="current-password"
            required
            value={form.password}
            onChange={update("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="mt-1.5 text-xs font-medium text-brand-700 hover:underline"
          >
            {showPassword ? t.auth.hidePassword : t.auth.showPassword}
          </button>
        </div>

        <Button type="submit" disabled={submitting} className="mt-2 w-full">
          {submitting ? t.auth.submitting : t.auth.loginButton}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-paper-500">
        {t.auth.noAccount}{" "}
        <Link to="/register" className="font-medium text-brand-700 hover:underline">
          {t.auth.goRegister}
        </Link>
      </p>
    </AuthCard>
  );
}
