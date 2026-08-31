import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { authApi } from "../lib/api.js";
import { t } from "../i18n/lo.js";
import { AuthCard, Button, ErrorMessage, Field } from "../components/ui.jsx";

export default function RegisterPage() {
  const { register, user, status } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
    teacherCode: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [teacherCodeRequired, setTeacherCodeRequired] = useState(false);

  // Ask the server whether teacher signup is gated by a code.
  useEffect(() => {
    authApi
      .config()
      .then((config) => setTeacherCodeRequired(Boolean(config.teacherCodeRequired)))
      .catch(() => setTeacherCodeRequired(false));
  }, []);

  if (status === "ready" && user) return <Navigate to="/" replace />;

  function update(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    // Checked here for a fast, friendly message; the server checks again.
    if (form.password.length < 8) {
      setFieldErrors({ password: [t.auth.passwordTooShort] });
      return;
    }
    if (form.password !== form.confirmPassword) {
      setFieldErrors({ confirmPassword: [t.auth.passwordMismatch] });
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        // Only send the code when it is actually needed.
        ...(form.role === "teacher" && teacherCodeRequired
          ? { teacherCode: form.teacherCode }
          : {}),
      });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
      // The API returns { field: ["message"] } for validation failures.
      if (err.details && typeof err.details === "object") setFieldErrors(err.details);
    } finally {
      setSubmitting(false);
    }
  }

  const roleOptions = [
    { value: "student", label: t.auth.roleStudent, hint: t.auth.roleStudentHint },
    { value: "teacher", label: t.auth.roleTeacher, hint: t.auth.roleTeacherHint },
  ];

  return (
    <AuthCard title={t.auth.registerTitle} subtitle={t.auth.registerSubtitle}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <ErrorMessage>{error}</ErrorMessage>

        {/* Role picker - big tap targets so it works well on a phone. */}
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-paper-700">{t.auth.role}</legend>
          <div className="grid grid-cols-2 gap-3">
            {roleOptions.map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-lg border p-3 text-center transition ${
                  form.role === option.value
                    ? "border-brand-600 bg-brand-50 ring-2 ring-brand-200"
                    : "border-paper-200 hover:bg-paper-50"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={form.role === option.value}
                  onChange={update("role")}
                  className="sr-only"
                />
                <span className="block font-medium text-paper-900">{option.label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-paper-500">
                  {option.hint}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {form.role === "teacher" && teacherCodeRequired && (
          <Field
            id="teacherCode"
            label={t.auth.teacherCode}
            hint={t.auth.teacherCodeHint}
            error={fieldErrors.teacherCode?.[0]}
            required
            value={form.teacherCode}
            onChange={update("teacherCode")}
          />
        )}

        <Field
          id="name"
          label={t.auth.name}
          placeholder={t.auth.namePlaceholder}
          autoComplete="name"
          error={fieldErrors.name?.[0]}
          required
          value={form.name}
          onChange={update("name")}
        />

        <Field
          id="email"
          type="email"
          label={t.auth.email}
          placeholder={t.auth.emailPlaceholder}
          autoComplete="email"
          error={fieldErrors.email?.[0]}
          required
          value={form.email}
          onChange={update("email")}
        />

        <Field
          id="password"
          type="password"
          label={t.auth.password}
          hint={t.auth.passwordHint}
          autoComplete="new-password"
          error={fieldErrors.password?.[0]}
          required
          value={form.password}
          onChange={update("password")}
        />

        <Field
          id="confirmPassword"
          type="password"
          label={t.auth.confirmPassword}
          autoComplete="new-password"
          error={fieldErrors.confirmPassword?.[0]}
          required
          value={form.confirmPassword}
          onChange={update("confirmPassword")}
        />

        <Button type="submit" disabled={submitting} className="mt-2 w-full">
          {submitting ? t.auth.submitting : t.auth.registerButton}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-paper-500">
        {t.auth.hasAccount}{" "}
        <Link to="/login" className="font-medium text-brand-700 hover:underline">
          {t.auth.goLogin}
        </Link>
      </p>
    </AuthCard>
  );
}
