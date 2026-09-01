# LaoLearn

A web app for hosting Grade 7 (M7) lessons for schools in Lao PDR. The whole
interface is in Lao. See `README.md` for setup and the folder structure.

- `backend/` — Express 5 REST API on PostgreSQL, JWT auth, roles admin/teacher/student
- `frontend/` — React + Vite + Tailwind v4 single-page app, Lao strings in `src/i18n/lo.js`
- Compose is split: `backend/docker-compose.yml` (db + API), `frontend/docker-compose.yml` (nginx),
  root `docker-compose.yml` `include:`s both. They share the external network `laolearn`.
  Root `.env` configures all three; standalone runs need `--env-file ../.env`.
- Migrations: `backend/src/db/migrations/*.sql`, applied by `npm run migrate`
- Tests: `cd backend && npm test` (node:test, 46 tests, own `laolearn_test` db, no Docker)
- CI: `.github/workflows/{backend,frontend}.yml` are path-filtered; `release.yml` pushes to ghcr

Conventions worth keeping:

- Only `frontend/src/lib/api.js` calls `fetch`; only `backend/src/config/db.js` opens a pool.
- All user-facing API error messages are written in Lao, with a machine `code` beside them.
- Roles are enforced by `requireRole()` on the server. `<ProtectedRoute>` is UI convenience only.
- Lesson search uses `to_tsvector('simple', ...)` plus `pg_trgm`, because Lao has no spaces
  between words — do not switch it to the `english` dictionary.
- The repo root is not an npm package. Run npm inside `backend/` or `frontend/`.

## Agent skills

### Issue tracker

Issues and specs live as markdown files under `.scratch/<feature-slug>/` in this repo. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` at the repo root and ADRs in `docs/adr/`, both created lazily by `/domain-modeling`. See `docs/agents/domain.md`.

## Phase status

Phases 1 (auth) and 2 (subjects + lessons + Cloudinary attachments) are done.
Next: 3 search, 4 quizzes, 5 UI polish + deploy.

Lesson ownership: a teacher may edit/delete only lessons they created; an admin
may touch any. That rule lives in `assertCanModify()` in
`backend/src/services/lesson.service.js` — enforce it there, not in controllers.
