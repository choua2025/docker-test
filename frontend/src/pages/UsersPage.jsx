/**
 * Every account in the school, for admins only.
 *
 * The API refuses the dangerous moves (changing your own role, deleting the
 * last admin) and says why in Lao. This page shows those messages rather than
 * trying to predict them, so the two can never disagree.
 */
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../context/AuthContext.jsx";
import { usersApi } from "../lib/api.js";
import { t } from "../i18n/lo.js";
import { Badge, Button, EmptyState, ErrorMessage, PageHeader, Spinner } from "../components/ui.jsx";

const ROLE_TONE = { admin: "saffron", teacher: "brand", student: "neutral" };

function formatDate(value) {
  // Lao uses the Buddhist calendar in daily life, but the Gregorian year is
  // what school records use, so keep the plain locale date.
  return new Date(value).toLocaleDateString("lo-LA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** A percentage that reads at a glance: colour carries the meaning too. */
function ScorePill({ percent }) {
  if (percent === null || percent === undefined) {
    return <span className="text-paper-300">—</span>;
  }
  const tone =
    percent >= 80 ? "text-brand-700" : percent >= 50 ? "text-saffron-600" : "text-red-600";
  return <span className={`font-serif font-semibold tabular-nums ${tone}`}>{percent}%</span>;
}

function UserRow({ user, isSelf, onChangeRole, onDelete, busy }) {
  return (
    <tr className="border-t border-paper-100 align-middle">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper-100 font-serif text-sm font-semibold text-paper-700"
            aria-hidden="true"
          >
            {[...(user.name ?? "?").trim()][0]}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-paper-900">
              {user.name}
              {isSelf && (
                <span className="ms-2 text-xs font-normal text-paper-500">({t.users.you})</span>
              )}
            </p>
            <p className="truncate text-xs text-paper-500">{user.email}</p>
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        <Badge tone={ROLE_TONE[user.role]}>{t.roles[user.role]}</Badge>
      </td>

      <td className="px-4 py-3 text-sm text-paper-500 tabular-nums">
        {formatDate(user.created_at)}
      </td>

      <td className="px-4 py-3 text-sm tabular-nums">
        {user.lesson_count > 0 ? (
          <span className="text-paper-900">{user.lesson_count}</span>
        ) : (
          <span className="text-paper-300">—</span>
        )}
      </td>

      <td className="px-4 py-3 text-sm tabular-nums">
        {user.quiz_count > 0 ? (
          <span className="text-paper-900">
            {user.quiz_count} {t.users.times}
          </span>
        ) : (
          <span className="text-paper-300">—</span>
        )}
      </td>

      <td className="px-4 py-3 text-sm">
        <ScorePill percent={user.average_percent} />
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <select
            aria-label={t.users.changeRole}
            value={user.role}
            disabled={isSelf || busy}
            onChange={(event) => onChangeRole(user, event.target.value)}
            className="rounded-lg border border-paper-200 bg-white px-2.5 py-1.5 text-sm disabled:cursor-not-allowed disabled:bg-paper-100 disabled:text-paper-300"
          >
            <option value="student">{t.roles.student}</option>
            <option value="teacher">{t.roles.teacher}</option>
            <option value="admin">{t.roles.admin}</option>
          </select>

          <button
            onClick={() => onDelete(user)}
            disabled={isSelf || busy}
            className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-paper-300 disabled:hover:bg-transparent"
          >
            {t.common.delete}
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function UsersPage() {
  const { user: me } = useAuth();

  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(""); // the debounced value actually sent
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Wait until typing stops, so a five-letter search is one request, not five.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await usersApi.list({ role: role || undefined, search: query || undefined }));
    } catch (err) {
      setError(err.message);
      setData({ users: [], total: 0, counts: { admin: 0, teacher: 0, student: 0, total: 0 } });
    }
  }, [role, query]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleChangeRole(target, nextRole) {
    setError("");
    setBusy(true);
    try {
      await usersApi.setRole(target.id, nextRole);
      await load();
    } catch (err) {
      setError(err.message);
      await load(); // put the dropdown back to the real value
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(target) {
    const warning =
      target.lesson_count > 0 ? `\n\n${t.users.keepsLessons} (${target.lesson_count})` : "";
    if (!window.confirm(`${t.users.confirmDelete}\n\n${target.name}${warning}`)) return;

    setError("");
    setBusy(true);
    try {
      await usersApi.remove(target.id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const counts = data?.counts;
  const chips = [
    { value: "", label: t.users.all, count: counts?.total },
    { value: "student", label: t.roles.student, count: counts?.student },
    { value: "teacher", label: t.roles.teacher, count: counts?.teacher },
    { value: "admin", label: t.roles.admin, count: counts?.admin },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader title={t.users.title} subtitle={t.users.subtitle} />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip.value}
              onClick={() => setRole(chip.value)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                role === chip.value
                  ? "border-transparent bg-brand-800 text-white shadow-sm"
                  : "border-paper-200 bg-white text-paper-700 hover:border-paper-300 hover:bg-paper-100"
              }`}
            >
              {chip.label}
              {chip.count !== undefined && (
                <span className="ms-2 text-xs opacity-70 tabular-nums">{chip.count}</span>
              )}
            </button>
          ))}
        </div>

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t.users.searchPlaceholder}
          aria-label={t.users.searchPlaceholder}
          className="min-w-56 flex-1 rounded-xl border border-paper-200 bg-white px-4 py-2.5 shadow-xs placeholder:text-paper-300 focus:border-brand-600 focus:ring-4 focus:ring-brand-100 focus:outline-none"
        />
      </div>

      {error && (
        <div className="mb-6">
          <ErrorMessage>{error}</ErrorMessage>
        </div>
      )}

      {data === null ? (
        <Spinner />
      ) : data.users.length === 0 ? (
        <EmptyState title={t.users.empty} hint={t.users.emptyHint} />
      ) : (
        // The table scrolls inside its own box, so the page never slides
        // sideways on a phone.
        <div className="overflow-x-auto rounded-2xl border border-paper-200 bg-white shadow-xs">
          <table className="w-full min-w-3xl border-collapse text-start">
            <thead>
              <tr className="text-start text-xs font-medium tracking-wide text-paper-500 uppercase">
                <th className="px-4 py-3 text-start font-medium">{t.auth.name}</th>
                <th className="px-4 py-3 text-start font-medium">{t.dashboard.yourRole}</th>
                <th className="px-4 py-3 text-start font-medium">{t.users.joined}</th>
                <th className="px-4 py-3 text-start font-medium">{t.users.lessonsWritten}</th>
                <th className="px-4 py-3 text-start font-medium">{t.users.quizzesTaken}</th>
                <th className="px-4 py-3 text-start font-medium">{t.users.average}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  isSelf={String(user.id) === String(me.id)}
                  onChangeRole={handleChangeRole}
                  onDelete={handleDelete}
                  busy={busy}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
