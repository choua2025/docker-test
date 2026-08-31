/**
 * The landing screen after login.
 *
 * A greeting band, then the subjects the person can jump straight into.
 * Showing real subjects here - rather than three placeholder cards - means
 * the first screen after login is already useful.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { subjectsApi } from "../lib/api.js";
import { subjectTheme, subjectGlyph } from "../lib/subjectTheme.js";
import { t } from "../i18n/lo.js";

const INTRO_BY_ROLE = {
  admin: t.dashboard.adminIntro,
  teacher: t.dashboard.teacherIntro,
  student: t.dashboard.studentIntro,
};

/** `to: null` marks a feature that is not built yet (phases 3 and 4). */
const ACTIONS = {
  admin: [
    { title: t.subjects.manage, to: "/subjects" },
    { title: t.nav.lessons, to: "/lessons" },
    { title: t.nav.users, to: null },
  ],
  teacher: [
    { title: t.lessons.add, to: "/lessons/new" },
    { title: t.nav.lessons, to: "/lessons" },
    { title: t.nav.quizzes, to: null },
  ],
  student: [
    { title: t.nav.lessons, to: "/lessons" },
    { title: t.nav.subjects, to: "/subjects" },
    { title: t.nav.quizzes, to: null },
  ],
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    subjectsApi
      .list()
      .then(({ subjects: list }) => setSubjects(list))
      .catch(() => setSubjects([]));
  }, []);

  return (
    <div>
      {/* Greeting band. The ruled lines echo a school exercise book and give
          the page a top edge without needing a photograph. */}
      <div className="relative overflow-hidden bg-brand-800">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent 0 39px, rgba(255,255,255,.6) 39px 40px)",
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -top-32 -right-20 h-80 w-80 rounded-full bg-saffron-500/20 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <p className="text-sm text-brand-200">
            {t.dashboard.yourRole}: {t.roles[user.role]}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-[2.5rem]">
            {t.dashboard.welcome}, {user.name}
          </h1>
          <p className="mt-3 max-w-xl leading-loose text-brand-100">
            {INTRO_BY_ROLE[user.role]}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {ACTIONS[user.role].map((action) =>
              action.to ? (
                <Link
                  key={action.title}
                  to={action.to}
                  className="rounded-xl bg-white px-5 py-3 font-medium text-brand-800 shadow-sm transition hover:bg-brand-50"
                >
                  {action.title}
                </Link>
              ) : (
                <span
                  key={action.title}
                  className="rounded-xl border border-white/25 px-5 py-3 font-medium text-brand-200"
                  title={t.dashboard.comingSoon}
                >
                  {action.title}
                  <span className="ms-2 text-xs text-brand-300">
                    · {t.dashboard.comingSoon}
                  </span>
                </span>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Subject shortcuts. Small tiles here, full cards on /subjects. */}
      {subjects.length > 0 && (
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="mb-5 text-lg font-semibold text-paper-900">{t.subjects.title}</h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {subjects.map((subject) => {
              const theme = subjectTheme(subject.name);
              return (
                <Link
                  key={subject.id}
                  to={`/lessons?subjectId=${subject.id}`}
                  className="flex items-center gap-3 rounded-xl border border-paper-200 bg-white p-3 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-lg font-serif text-xl font-semibold"
                    style={{ backgroundColor: theme.tint, color: theme.ink }}
                    aria-hidden="true"
                  >
                    {subjectGlyph(subject.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-paper-900">
                      {subject.name}
                    </span>
                    <span className="block text-xs text-paper-500 tabular-nums">
                      {subject.lesson_count} {t.subjects.lessonCount}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
