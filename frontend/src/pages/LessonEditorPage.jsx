/**
 * One form for both creating and editing a lesson.
 *
 * With no :id in the URL it creates; with an :id it loads the lesson first.
 * Keeping it as one component means the two paths cannot drift apart.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { lessonsApi, subjectsApi } from "../lib/api.js";
import { t } from "../i18n/lo.js";
import FileUpload from "../components/FileUpload.jsx";
import {
  Button,
  ErrorMessage,
  Field,
  PageHeader,
  Select,
  Spinner,
  TextArea,
} from "../components/ui.jsx";

/** Turn a lesson row from the API into the flat shape this form edits. */
function toFormState(lesson) {
  return {
    subjectId: String(lesson.subject_id),
    title: lesson.title,
    content: lesson.content ?? "",
    position: String(lesson.position ?? 0),
    file: lesson.file_url
      ? {
          url: lesson.file_url,
          publicId: lesson.file_public_id,
          resourceType: lesson.file_resource_type,
          name: lesson.file_name,
          bytes: lesson.file_bytes ? Number(lesson.file_bytes) : undefined,
          mime: lesson.file_mime ?? undefined,
        }
      : null,
  };
}

export default function LessonEditorPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({
    // Pre-select the subject the teacher was browsing.
    subjectId: searchParams.get("subjectId") ?? "",
    title: "",
    content: "",
    position: "0",
    file: null,
  });
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    subjectsApi
      .list()
      .then(({ subjects: list }) => setSubjects(list))
      .catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    if (!isEditing) return;
    let cancelled = false;

    lessonsApi
      .get(id)
      .then(({ lesson }) => !cancelled && setForm(toFormState(lesson)))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [id, isEditing]);

  function update(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setSaving(true);

    const payload = {
      subjectId: Number(form.subjectId),
      title: form.title,
      content: form.content,
      position: Number(form.position) || 0,
      // Always sent, so clearing the attachment reaches the server as null.
      file: form.file,
    };

    try {
      const { lesson } = isEditing
        ? await lessonsApi.update(id, payload)
        : await lessonsApi.create(payload);
      navigate(`/lessons/${lesson.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      if (err.details && typeof err.details === "object") setFieldErrors(err.details);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title={isEditing ? t.lessons.edit : t.lessons.create} />

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 rounded-xl border border-paper-200 bg-white p-6 shadow-sm"
      >
        {error && <ErrorMessage>{error}</ErrorMessage>}

        <Select
          id="subjectId"
          label={t.lessons.subject}
          required
          value={form.subjectId}
          onChange={update("subjectId")}
          error={fieldErrors.subjectId?.[0]}
        >
          <option value="">{t.lessons.chooseSubject}</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </Select>

        <Field
          id="title"
          label={t.lessons.lessonTitle}
          placeholder={t.lessons.titlePlaceholder}
          required
          value={form.title}
          onChange={update("title")}
          error={fieldErrors.title?.[0]}
        />

        <Field
          id="position"
          type="number"
          min="0"
          label={t.lessons.position}
          hint={t.lessons.positionHint}
          value={form.position}
          onChange={update("position")}
          error={fieldErrors.position?.[0]}
        />

        <TextArea
          id="content"
          label={t.lessons.content}
          placeholder={t.lessons.contentPlaceholder}
          rows={14}
          value={form.content}
          onChange={update("content")}
          error={fieldErrors.content?.[0]}
        />

        <FileUpload
          value={form.file}
          onChange={(file) => setForm((prev) => ({ ...prev, file }))}
          disabled={saving}
        />

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? t.common.saving : t.common.save}
          </Button>
          <Link
            to={isEditing ? `/lessons/${id}` : "/lessons"}
            className="inline-flex items-center rounded-lg border border-paper-200 bg-white px-4 py-2.5 font-medium text-paper-700 hover:bg-paper-50"
          >
            {t.common.cancel}
          </Link>
        </div>
      </form>
    </div>
  );
}
