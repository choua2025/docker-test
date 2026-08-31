/**
 * A student's own quiz results.
 *
 * The endpoint takes no user id - the server reads it from the token - so
 * there is no URL a student could edit to read someone else's scores.
 *
 * Quizzes arrive in phase 4, so today this page correctly shows its empty
 * state. It fills in on its own once results exist.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { resultsApi } from "../lib/api.js";
import { subjectTheme } from "../lib/subjectTheme.js";
import { t } from "../i18n/lo.js";
import { EmptyState, ErrorMessage, PageHeader, Spinner } from "../components/ui.jsx";

function formatDate(value) {
  return new Date(value).toLocaleDateString("lo-LA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** A headline number. `unit` keeps "%" from being read as part of the value. */
function Stat({ label, value, unit }) {
  return (
    <div className="rounded-2xl border border-paper-200 bg-white p-5 shadow-xs">
      <p className="text-sm text-paper-500">{label}</p>
      <p className="mt-1 font-serif text-3xl font-bold text-paper-900 tabular-nums">
        {value}
        {unit && <span className="ms-1 text-lg font-semibold text-paper-500">{unit}</span>}
      </p>
    </div>
  );
}

function ResultRow({ result }) {
  const theme = subjectTheme(result.subject_name);
  const tone =
    result.percent >= 80 ? "text-brand-700" : result.percent >= 50 ? "text-saffron-600" : "text-red-600";

  return (
    <li className="rounded-2xl border border-paper-200 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <span
            className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ backgroundColor: theme.tint, color: theme.ink }}
          >
            {result.subject_name}
          </span>

          <h2 className="mt-2 font-serif text-lg font-semibold text-paper-900">
            {result.quiz_title}
          </h2>

          <Link
            to={`/lessons/${result.lesson_id}`}
            className="mt-0.5 inline-block text-sm text-brand-700 hover:underline"
          >
            {result.lesson_title}
          </Link>

          <p className="mt-2 text-xs text-paper-500">
            {t.scores.takenAt}: {formatDate(result.taken_at)}
          </p>
        </div>

        <div className="text-end">
          <p className={`font-serif text-3xl font-bold tabular-nums ${tone}`}>{result.percent}%</p>
          <p className="text-sm text-paper-500 tabular-nums">
            {result.score} / {result.total_questions}
          </p>
        </div>
      </div>

      {/* The same number again as a bar: easier to compare down a list than
          reading percentages one by one. */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-paper-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${result.percent}%`, backgroundColor: theme.solid }}
        />
      </div>
    </li>
  );
}

export default function MyScoresPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    resultsApi
      .mine()
      .then((result) => !cancelled && setData(result))
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setData({ results: [], summary: { attempts: 0, quizzes: 0, averagePercent: 0, bestPercent: 0 } });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (data === null) return <Spinner />;

  const { results, summary } = data;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader title={t.scores.title} subtitle={t.scores.subtitle} />

      {error && (
        <div className="mb-6">
          <ErrorMessage>{error}</ErrorMessage>
        </div>
      )}

      {results.length === 0 ? (
        <EmptyState
          title={t.scores.empty}
          hint={t.scores.emptyHint}
          action={
            <Link
              to="/lessons"
              className="rounded-xl bg-brand-700 px-5 py-3 font-medium text-white shadow-sm transition hover:bg-brand-800"
            >
              {t.scores.goToLessons}
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label={t.scores.attempts} value={summary.attempts} />
            <Stat label={t.scores.quizzes} value={summary.quizzes} />
            <Stat label={t.scores.average} value={summary.averagePercent} unit="%" />
            <Stat label={t.scores.best} value={summary.bestPercent} unit="%" />
          </div>

          <ul className="flex flex-col gap-3">
            {results.map((result) => (
              <ResultRow key={result.id} result={result} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
