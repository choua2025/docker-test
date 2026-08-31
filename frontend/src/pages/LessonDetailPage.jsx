/**
 * Reading a lesson: the text, and the attachment rendered in place when the
 * browser can show it (image, video, PDF) rather than only as a download link.
 *
 * This is the screen students spend the most time on, so it is set as a
 * reading page - narrow measure, generous leading - not as a dashboard card.
 *
 * Edit and delete appear only for the author or an admin: the same rule the
 * API enforces.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { lessonsApi } from "../lib/api.js";
import { subjectTheme } from "../lib/subjectTheme.js";
import { t } from "../i18n/lo.js";
import { Button, ErrorMessage, Spinner } from "../components/ui.jsx";

function formatBytes(bytes) {
  if (!bytes) return "";
  const mb = Number(bytes) / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(Number(bytes) / 1024))} KB`;
}

function Attachment({ lesson }) {
  if (!lesson.file_url) return null;

  const isPdf = lesson.file_mime === "application/pdf" || /\.pdf($|\?)/i.test(lesson.file_url);

  return (
    <section className="mt-12">
      <h2 className="mb-4 text-lg font-semibold text-paper-900">{t.upload.label}</h2>

      <div className="overflow-hidden rounded-2xl border border-paper-200 bg-white shadow-xs">
        {lesson.file_resource_type === "video" && (
          <video src={lesson.file_url} controls className="w-full bg-black" preload="metadata" />
        )}

        {lesson.file_resource_type === "image" && !isPdf && (
          <img src={lesson.file_url} alt={lesson.file_name ?? lesson.title} className="w-full" />
        )}

        {isPdf && (
          // A plain iframe: no PDF library to ship, and it degrades to the
          // download link below on browsers that cannot render inline.
          <iframe
            src={lesson.file_url}
            title={lesson.file_name ?? lesson.title}
            className="h-[70vh] w-full border-0"
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-paper-100 px-5 py-4">
          <span className="min-w-0">
            <span className="block truncate font-medium text-paper-900">
              {lesson.file_name ?? t.upload.openFile}
            </span>
            <span className="text-xs text-paper-500 tabular-nums">
              {formatBytes(lesson.file_bytes)}
            </span>
          </span>
          <a
            href={lesson.file_url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-lg border border-paper-200 px-4 py-2 text-sm font-medium text-brand-700 transition hover:bg-paper-50"
          >
            {t.upload.download}
          </a>
        </div>
      </div>
    </section>
  );
}

export default function LessonDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLesson(null);
    lessonsApi
      .get(id)
      .then(({ lesson: found }) => !cancelled && setLesson(found))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDelete() {
    if (!window.confirm(`${t.lessons.confirmDelete}\n\n${lesson.title}`)) return;
    try {
      await lessonsApi.remove(lesson.id);
      navigate(`/lessons?subjectId=${lesson.subject_id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <ErrorMessage>{error}</ErrorMessage>
        <Link to="/lessons" className="mt-5 inline-block text-brand-700 hover:underline">
          ← {t.lessons.back}
        </Link>
      </div>
    );
  }

  if (!lesson) return <Spinner />;

  const canEdit = user.role === "admin" || String(lesson.created_by) === String(user.id);
  const theme = subjectTheme(lesson.subject_name);

  return (
    <article className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <Link
        to={`/lessons?subjectId=${lesson.subject_id}`}
        className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition hover:opacity-80"
        style={{ backgroundColor: theme.tint, color: theme.ink }}
      >
        ← {lesson.subject_name}
      </Link>

      <header className="mt-5 border-b border-paper-200 pb-7">
        {lesson.position > 0 && (
          <p className="font-serif text-sm font-semibold tabular-nums" style={{ color: theme.solid }}>
            ບົດທີ {lesson.position}
          </p>
        )}
        <h1 className="mt-1 text-3xl leading-[1.45] font-bold text-paper-900 sm:text-[2.35rem]">
          {lesson.title}
        </h1>
        <p className="mt-4 text-sm text-paper-500">
          {t.lessons.author}: {lesson.author_name ?? "-"}
        </p>

        {canEdit && (
          <div className="mt-5 flex gap-2">
            <Link
              to={`/lessons/${lesson.id}/edit`}
              className="rounded-lg border border-paper-200 bg-white px-4 py-2 text-sm font-medium text-paper-700 shadow-xs transition hover:bg-paper-50"
            >
              {t.common.edit}
            </Link>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              {t.common.delete}
            </Button>
          </div>
        )}
      </header>

      {lesson.content && (
        // whitespace-pre-wrap keeps the teacher's own line breaks without
        // needing a rich-text editor or any HTML rendering (an XSS risk).
        // `lesson-prose` carries the wide leading Lao needs.
        <div className="lesson-prose mt-8 whitespace-pre-wrap text-paper-700">
          {lesson.content}
        </div>
      )}

      <Attachment lesson={lesson} />
    </article>
  );
}
