/**
 * The subject list.
 *
 * Everyone sees the subjects and their lesson counts; only an admin gets the
 * add / edit / delete controls, matching what the API allows.
 *
 * Each subject carries its own colour and Lao initial, so a student picking
 * "ຄະນິດສາດ" recognises the tile before reading it - and so the page is not
 * eight identical grey boxes.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { subjectsApi } from "../lib/api.js";
import { subjectTheme, subjectGlyph } from "../lib/subjectTheme.js";
import { t } from "../i18n/lo.js";
import {
  Button,
  EmptyState,
  ErrorMessage,
  Field,
  PageHeader,
  Spinner,
  TextArea,
} from "../components/ui.jsx";

function SubjectTile({ subject, isAdmin, onEdit, onDelete }) {
  const theme = subjectTheme(subject.name);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-paper-200 bg-white shadow-xs transition hover:-translate-y-0.5 hover:shadow-lg">
      {/* The subject's colour band, with its initial set large and faint
          behind - a spine label rather than a decorative icon. */}
      <div
        className="relative flex h-28 items-end p-5"
        style={{ backgroundColor: theme.tint }}
      >
        <span
          className="pointer-events-none absolute -top-2 right-3 font-serif text-8xl leading-none opacity-25 select-none"
          style={{ color: theme.solid }}
          aria-hidden="true"
        >
          {subjectGlyph(subject.name)}
        </span>
        <Link
          to={`/lessons?subjectId=${subject.id}`}
          className="relative font-serif text-xl font-bold"
          style={{ color: theme.ink }}
        >
          <span className="absolute inset-0 -m-5" aria-hidden="true" />
          {subject.name}
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {subject.description && (
          <p className="text-sm leading-relaxed text-paper-500">{subject.description}</p>
        )}

        <p className="mt-auto flex items-center gap-2 text-sm">
          <span
            className="font-serif text-lg font-semibold tabular-nums"
            style={{ color: theme.solid }}
          >
            {subject.lesson_count}
          </span>
          <span className="text-paper-500">{t.subjects.lessonCount}</span>
        </p>

        {isAdmin && (
          <div className="relative z-10 flex gap-3 border-t border-paper-100 pt-3">
            <button
              onClick={() => onEdit(subject)}
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              {t.common.edit}
            </button>
            <button
              onClick={() => onDelete(subject)}
              className="text-sm font-medium text-red-600 hover:underline"
            >
              {t.common.delete}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SubjectsPage() {
  const { user } = useAuth();
  const isAdmin = user.role === "admin";

  const [subjects, setSubjects] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // null | {} (new) | subject
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function load() {
    setError("");
    try {
      const { subjects: list } = await subjectsApi.list();
      setSubjects(list);
    } catch (err) {
      setError(err.message);
      setSubjects([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setForm({ name: "", description: "" });
    setFormError("");
    setEditing({});
  }

  function openEdit(subject) {
    setForm({ name: subject.name, description: subject.description ?? "" });
    setFormError("");
    setEditing(subject);
  }

  async function handleSave(event) {
    event.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      if (editing.id) await subjectsApi.update(editing.id, form);
      else await subjectsApi.create(form);
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(subject) {
    if (!window.confirm(`${t.subjects.confirmDelete}\n\n${subject.name}`)) return;
    try {
      await subjectsApi.remove(subject.id);
      await load();
    } catch (err) {
      // The API refuses to delete a subject that still holds lessons, and
      // explains why in Lao - show that message as-is.
      setError(err.message);
    }
  }

  if (subjects === null) return <Spinner />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader
        title={t.subjects.title}
        subtitle={t.subjects.subtitle}
        action={isAdmin && <Button onClick={openNew}>{t.subjects.add}</Button>}
      />

      {error && (
        <div className="mb-6">
          <ErrorMessage>{error}</ErrorMessage>
        </div>
      )}

      {editing && (
        <form
          onSubmit={handleSave}
          className="mb-8 rounded-2xl border border-paper-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-5 text-lg font-semibold text-paper-900">
            {editing.id ? t.subjects.edit : t.subjects.add}
          </h2>

          {formError && (
            <div className="mb-5">
              <ErrorMessage>{formError}</ErrorMessage>
            </div>
          )}

          <div className="flex flex-col gap-5">
            <Field
              id="subject-name"
              label={t.subjects.name}
              placeholder={t.subjects.namePlaceholder}
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <TextArea
              id="subject-description"
              label={t.subjects.description}
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="mt-6 flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? t.common.saving : t.common.save}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
              {t.common.cancel}
            </Button>
          </div>
        </form>
      )}

      {subjects.length === 0 ? (
        <EmptyState title={t.subjects.empty} hint={isAdmin ? t.subjects.emptyAdmin : undefined} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <SubjectTile
              key={subject.id}
              subject={subject}
              isAdmin={isAdmin}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
