/**
 * Small shared building blocks, so every screen looks the same and the
 * Tailwind classes are written once.
 */
import { t } from "../i18n/lo.js";

/** Brand mark. The book-spine bar is the whole logo - no icon library. */
export function Logo({ size = "md", onDark = false }) {
  const s = {
    md: { box: "h-9 w-9", text: "text-xl", bar: "h-4" },
    lg: { box: "h-14 w-14", text: "text-3xl", bar: "h-6" },
  }[size];

  return (
    <span className="inline-flex items-center gap-3">
      <span
        className={`${s.box} grid shrink-0 place-items-center rounded-xl bg-linear-to-br from-brand-600 to-brand-800 shadow-sm`}
        aria-hidden="true"
      >
        {/* Three stacked bars: a shelf of books, drawn in CSS. */}
        <span className="flex items-end gap-[3px]">
          <span className={`${s.bar} w-[3px] rounded-full bg-brand-200`} />
          <span className={`${s.bar} w-[3px] rounded-full bg-saffron-200`} />
          <span className={`${s.bar} w-[3px] rounded-full bg-brand-100/70`} />
        </span>
      </span>
      <span
        className={`${s.text} font-serif font-bold tracking-tight ${
          onDark ? "text-white" : "text-brand-800"
        }`}
      >
        {t.app.name}
      </span>
    </span>
  );
}

export function Spinner({ label = t.common.loading }) {
  return (
    <div className="flex items-center justify-center gap-3 p-12 text-paper-500">
      <span
        className="h-5 w-5 animate-spin rounded-full border-2 border-paper-200 border-t-brand-600"
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}

export function ErrorMessage({ children }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-800"
    >
      {children}
    </p>
  );
}

const inputClasses = (error) =>
  `w-full rounded-xl border bg-white px-4 py-3 text-paper-900 shadow-xs transition
   placeholder:text-paper-300
   focus:border-brand-600 focus:ring-4 focus:ring-brand-100 focus:outline-none
   ${error ? "border-red-400 bg-red-50/40" : "border-paper-200 hover:border-paper-300"}`;

export function Field({ id, label, hint, error, className = "", ...inputProps }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-paper-700">
        {label}
      </label>
      <input
        id={id}
        className={inputClasses(error)}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={hint || error ? `${id}-help` : undefined}
        {...inputProps}
      />
      {(hint || error) && (
        <p
          id={`${id}-help`}
          className={`mt-2 text-xs ${error ? "text-red-600" : "text-paper-500"}`}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}

export function TextArea({ id, label, hint, error, rows = 10, className = "", ...props }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-paper-700">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        className={`${inputClasses(error)} leading-loose`}
        aria-invalid={error ? "true" : undefined}
        {...props}
      />
      {(hint || error) && (
        <p className={`mt-2 text-xs ${error ? "text-red-600" : "text-paper-500"}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

export function Select({ id, label, hint, error, children, className = "", ...props }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-paper-700">
        {label}
      </label>
      <select id={id} className={inputClasses(error)} {...props}>
        {children}
      </select>
      {(hint || error) && (
        <p className={`mt-2 text-xs ${error ? "text-red-600" : "text-paper-500"}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

export function Button({ children, variant = "primary", size = "md", className = "", ...props }) {
  const variants = {
    primary:
      "bg-brand-700 text-white shadow-sm hover:bg-brand-800 active:bg-brand-900 disabled:bg-brand-300 disabled:shadow-none",
    ghost:
      "bg-white text-paper-700 border border-paper-200 shadow-xs hover:border-paper-300 hover:bg-paper-50",
    danger: "bg-white text-red-700 border border-red-200 shadow-xs hover:bg-red-50",
  };
  const sizes = { md: "px-5 py-3", sm: "px-4 py-2 text-sm" };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium
        transition disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** A small status chip. `tone` picks the meaning, not just the colour. */
export function Badge({ children, tone = "neutral" }) {
  const tones = {
    neutral: "bg-paper-100 text-paper-700",
    brand: "bg-brand-50 text-brand-800",
    saffron: "bg-saffron-50 text-saffron-600",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-paper-900 sm:text-[2rem]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-paper-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, hint, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-paper-300 bg-white/60 px-6 py-16 text-center">
      {/* An empty shelf, drawn with the same bars as the logo. */}
      <span className="mx-auto mb-4 flex w-fit items-end gap-1.5 opacity-30" aria-hidden="true">
        <span className="h-7 w-1.5 rounded-full bg-paper-300" />
        <span className="h-5 w-1.5 rounded-full bg-paper-300" />
        <span className="h-8 w-1.5 rounded-full bg-paper-300" />
      </span>
      <p className="font-serif text-lg font-semibold text-paper-700">{title}</p>
      {hint && <p className="mx-auto mt-2 max-w-sm text-sm text-paper-500">{hint}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

/**
 * The login / register frame.
 *
 * Two panels on a wide screen: the brand side carries the product's promise,
 * the form side stays plain so nothing competes with the fields. On a phone
 * the brand side collapses to a header, since a student signing in on a
 * 5-inch screen wants the form, not the poster.
 */
export function AuthCard({ title, subtitle, children }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-brand-800 p-12 lg:flex lg:flex-col lg:justify-between">
        {/* Ruled lines, like the inside of a school exercise book. */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent 0 43px, rgba(255,255,255,.55) 43px 44px)",
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -top-28 -right-28 h-96 w-96 rounded-full bg-saffron-500/20 blur-3xl"
          aria-hidden="true"
        />

        <Logo size="lg" onDark />

        <div className="relative">
          <p className="font-serif text-4xl leading-[1.5] font-semibold text-white">
            {t.app.tagline}
          </p>
          <p className="mt-6 max-w-md leading-loose text-brand-100">{t.auth.posterNote}</p>
        </div>

        <p className="relative text-sm text-brand-200">{t.app.name} · ສປປ ລາວ</p>
      </aside>

      <main className="flex min-h-dvh flex-col justify-center px-5 py-12 sm:px-10 lg:px-14">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <h1 className="text-3xl font-bold text-paper-900">{title}</h1>
          {subtitle && <p className="mt-2 mb-8 text-paper-500">{subtitle}</p>}

          {children}
        </div>
      </main>
    </div>
  );
}
