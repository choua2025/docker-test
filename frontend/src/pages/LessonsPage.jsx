/**
 * Lesson list, optionally filtered to one subject.
 *
 * The subject filter lives in the URL (?subjectId=3) so a teacher can bookmark
 * or share "the maths lessons" and the back button behaves.
 */
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { lessonsApi, subjectsApi } from "../lib/api.js";
import { subjectTheme, subjectGlyph } from "../lib/subjectTheme.js";
import { t } from "../i18n/lo.js";
import { Badge, Button, EmptyState, ErrorMessage, Spinner } from "../components/ui.jsx";

function LessonRow({ lesson }) {
  const theme = subjectTheme(lesson.subject_name);

  return (
    <Link
      to={`/lessons/${lesson.id}`}
      className="group flex gap-4 rounded-2xl border border-paper-200 bg-white p-4 shadow-xs transition hover:-translate-y-0.5 hover:border-paper-300 hover:shadow-md sm:p-5"
    >
      {/* The lesson's place in the subject, as a numbered spine. */}
      <span
        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl font-serif text-lg font-semibold tabular-nums"
        style={{ backgroundColor: theme.tint, color: theme.ink }}
        aria-hidden="true"
      >
        {lesson.position > 0 ? lesson.position : subjectGlyph(lesson.subject_name)}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="font-serif text-lg font-semibold text-paper-900 group-hover:text-brand-800">
            {lesson.title}
          </span>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ backgroundColor: theme.tint, color: theme.ink }}
          >
            {lesson.subject_name}
          </span>
          {lesson.file_url && (
            <Badge tone="saffron">
              {lesson.file_resource_type === "video" ? "ວິດີໂອ" : "ເອກະສານ"}
            </Badge>
          )}
        </span>

        {lesson.content && (
          <span className="mt-1.5 line-clamp-2 block text-sm leading-relaxed text-paper-500">
            {lesson.content}
          </span>
        )}

        <span className="mt-2.5 block text-xs text-paper-500">
          {t.lessons.author}: {lesson.author_name ?? "-"}
        </span>
      </span>
    </Link>
  );
}

export default function LessonsPage() {
  const { user } = useAuth();
  const canWrite = user.role === "teacher" || user.role === "admin";

  const [searchParams, setSearchParams] = useSearchParams();
  const subjectId = searchParams.get("subjectId") ?? "";
  const page = Number(searchParams.get("page") ?? 1);

  const [subjects, setSubjects] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    subjectsApi
      .list()
      .then(({ subjects: list }) => setSubjects(list))
      .catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError("");

    lessonsApi
      .list({ subjectId: subjectId || undefined, page })
      .then((result) => !cancelled && setData(result))
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setData({ lessons: [], total: 0, page: 1, totalPages: 1 });
      });

    return () => {
      cancelled = true;
    };
  }, [subjectId, page]);

  function selectSubject(value) {
    // Changing the filter always returns to page 1.
    setSearchParams(value ? { subjectId: value } : {});
  }

  function goToPage(next) {
    const params = {};
    if (subjectId) params.subjectId = subjectId;
    if (next > 1) params.page = String(next);
    setSearchParams(params);
  }

  const current = subjects.find((s) => String(s.id) === String(subjectId));
  const theme = current ? subjectTheme(current.name) : null;

  // Chips instead of a dropdown: with eight subjects they all fit, and a
  // student can see the whole set without opening anything.
  const chipClass = (active) =>
    `shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
      active
        ? "border-transparent bg-brand-800 text-white shadow-sm"
        : "border-paper-200 bg-white text-paper-700 hover:border-paper-300 hover:bg-paper-100"
    }`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {current && (
            <span
              className="mb-2 inline-block rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: theme.tint, color: theme.ink }}
            >
              {t.lessons.subject}
            </span>
          )}
          <h1 className="text-2xl font-bold text-paper-900 sm:text-[2rem]">
            {current ? current.name : t.lessons.title}
          </h1>
          {current?.description && (
            <p className="mt-1.5 text-paper-500">{current.description}</p>
          )}
        </div>

        {canWrite && (
          <Link
            to={`/lessons/new${subjectId ? `?subjectId=${subjectId}` : ""}`}
            className="rounded-xl bg-brand-700 px-5 py-3 font-medium text-white shadow-sm transition hover:bg-brand-800"
          >
            {t.lessons.add}
          </Link>
        )}
      </div>

      <div className="mb-7 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button onClick={() => selectSubject("")} className={chipClass(!subjectId)}>
          {t.lessons.all}
        </button>
        {subjects.map((subject) => (
          <button
            key={subject.id}
            onClick={() => selectSubject(String(subject.id))}
            className={chipClass(String(subject.id) === subjectId)}
          >
            {subject.name}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6">
          <ErrorMessage>{error}</ErrorMessage>
        </div>
      )}

      {data === null ? (
        <Spinner />
      ) : data.lessons.length === 0 ? (
        <EmptyState title={t.lessons.empty} hint={canWrite ? t.lessons.emptyTeacher : undefined} />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {data.lessons.map((lesson) => (
              <li key={lesson.id}>
                <LessonRow lesson={lesson} />
              </li>
            ))}
          </ul>

          {data.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                disabled={data.page <= 1}
                onClick={() => goToPage(data.page - 1)}
              >
                {t.lessons.prev}
              </Button>
              <span className="text-sm text-paper-500 tabular-nums">
                {t.lessons.page} {data.page} {t.lessons.of} {data.totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={data.page >= data.totalPages}
                onClick={() => goToPage(data.page + 1)}
              >
                {t.lessons.next}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
