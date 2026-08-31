# LaoLearn

ລະບົບບົດຮຽນອອນລາຍ ຊັ້ນ ມ.7 ສຳລັບໂຮງຮຽນ ສປປ ລາວ

A web application for hosting and organising Grade 7 (M7) lessons for schools in
Lao PDR. The whole interface is in Lao, using **Noto Sans Lao**, and all data is
stored as UTF-8.

| Layer    | Technology                                      |
| -------- | ----------------------------------------------- |
| Frontend | React 18 + Vite + Tailwind CSS v4               |
| Backend  | Node.js + Express 5 (REST API)                  |
| Database | PostgreSQL 17 (with full-text + trigram search) |
| Files    | Cloudinary (PDF / image / video attachments)    |
| Auth     | JWT + bcrypt, three roles                       |

## Roles

| Role                       | Can do                                                          |
| -------------------------- | --------------------------------------------------------------- |
| **Admin** (ຜູ້ດູແລລະບົບ)   | manage subjects, manage users, view overall statistics            |
| **Teacher** (ຄູສອນ)        | create/edit/delete lessons, create quizzes, view student results   |
| **Student** (ນັກຮຽນ)       | read and search lessons, take quizzes, view their own scores       |

Only teachers and students can sign up. **An admin is created from the server**
(`npm run seed`), never through a public form.

## Folder structure

```
docker-project/
├── backend/                    Express REST API
│   ├── src/
│   │   ├── server.js           entry point: waits for the DB, listens, shuts down cleanly
│   │   ├── app.js              builds the Express app (importable by tests)
│   │   ├── config/
│   │   │   ├── env.js          reads + validates every environment variable
│   │   │   └── db.js           the PostgreSQL connection pool
│   │   ├── routes/             URL -> middleware -> controller
│   │   ├── controllers/        reads the request, calls a service, sends the response
│   │   ├── services/           the actual rules (auth.service.js)
│   │   ├── middleware/         requireAuth / requireRole, validation, error handling
│   │   ├── utils/              HttpError
│   │   └── db/
│   │       ├── migrations/     numbered .sql files, applied in order
│   │       ├── migrate.js      npm run migrate
│   │       └── seed.js         npm run seed - creates the first admin
│   ├── .env.example
│   ├── docker-compose.yml      db + backend
│   └── Dockerfile
│
├── frontend/                   React single-page app
│   ├── src/
│   │   ├── main.jsx            mounts React, Router and AuthProvider
│   │   ├── App.jsx             every route in one file
│   │   ├── index.css           Tailwind v4 theme (brand colours, Noto Sans Lao)
│   │   ├── i18n/lo.js          ALL Lao interface text lives here
│   │   ├── lib/api.js          the only place that calls fetch()
│   │   ├── context/            AuthContext - who is logged in
│   │   ├── components/         Navbar, ProtectedRoute, shared UI pieces
│   │   └── pages/              one file per screen
│   ├── nginx.conf              serves the SPA and proxies /api to the backend
│   ├── docker-compose.yml      nginx
│   └── Dockerfile
│
├── docker-compose.yml          includes the two stacks below
└── .env.example                copy to .env - read by every compose file
```

## Running it

### With Docker (closest to how a school would deploy it)

Each part owns its own compose file, and the root one only pulls the two
together, so a stack can be deployed and restarted on its own:

| File                           | Services            |
| ------------------------------ | ------------------- |
| `backend/docker-compose.yml`   | `db` + `backend`    |
| `frontend/docker-compose.yml`  | `frontend` (nginx)  |
| `docker-compose.yml` (root)    | `include:`s both    |

They talk over a shared Docker network called `laolearn`, created once:

```bash
docker network create laolearn

cp .env.example .env
# Edit .env: set JWT_SECRET (32+ chars), POSTGRES_PASSWORD and ADMIN_PASSWORD.
# Generate a secret with:
#   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

docker compose up -d --build

# Create the tables, then the first admin account and the default subjects:
docker compose run --rm backend npm run migrate
docker compose run --rm backend npm run seed
```

Open **http://localhost:8081**.

To run just one part — redeploying the API without touching the web server,
for example — pass the root `.env`, which stays the single place to configure
everything:

```bash
cd backend  && docker compose --env-file ../.env up -d --build
cd frontend && docker compose --env-file ../.env up -d --build
```

Order does not matter. nginx resolves the backend's name through Docker's DNS
on each request rather than at startup, so the web server starts happily
without the API and picks it up as soon as it appears.

> Host ports are set in `.env` (`FRONTEND_HOST_PORT`, `BACKEND_HOST_PORT`,
> `POSTGRES_HOST_PORT`). They default to 8081 / 9010 / 5440 rather than the
> usual 8080 / 9000 / 5432, because other containers on this machine already
> use those. Change them freely.

### Without Docker (day-to-day development)

Two terminals. `backend/.env` is already pointed at the **PostgreSQL 17 installed
on Windows** (service `postgresql-x64-17`, port **5432**, database `laolearn`).

> Note: `docker compose` does not use that database — a container's `localhost`
> is the container itself, so the compose stack runs its own `laolearn-db`
> service instead. The two hold the same schema but separate data. To point the
> compose backend at the Windows server, set its `DATABASE_URL` host to
> `host.docker.internal` and make sure `pg_hba.conf` accepts that address.

```bash
# Terminal 1 - API on http://localhost:9000
cd backend
# .env already exists; recreate it from .env.example if you need to
npm install
npm run migrate
npm run seed
npm run dev

# Terminal 2 - UI on http://localhost:5173
cd frontend
npm install
npm run dev
```

Vite proxies `/api` to the backend, so the browser only ever talks to one
origin and there is no CORS to configure.

## Auth API

| Method | Path                        | Who        | Purpose                                    |
| ------ | --------------------------- | ---------- | ------------------------------------------ |
| GET    | `/api/health`               | anyone     | is the API up and can it reach the DB?     |
| GET    | `/api/auth/config`          | anyone     | does teacher signup need a code?           |
| POST   | `/api/auth/register`        | anyone     | create a teacher or student account        |
| POST   | `/api/auth/login`           | anyone     | email + password → JWT                     |
| GET    | `/api/auth/me`              | logged in  | the current user                           |
| POST   | `/api/auth/change-password` | logged in  | change own password                        |

## Subjects, lessons and files

| Method | Path                      | Who                  |
| ------ | ------------------------- | -------------------- |
| GET    | `/api/subjects`           | logged in            |
| POST   | `/api/subjects`           | **admin**            |
| PUT    | `/api/subjects/:id`       | **admin**            |
| DELETE | `/api/subjects/:id`       | **admin**, and only when the subject holds no lessons |
| GET    | `/api/lessons`            | logged in — `?subjectId=&page=&limit=` |
| GET    | `/api/lessons/:id`        | logged in            |
| POST   | `/api/lessons`            | teacher, admin       |
| PUT    | `/api/lessons/:id`        | the author, or admin |
| DELETE | `/api/lessons/:id`        | the author, or admin |
| GET    | `/api/uploads/config`     | logged in — is upload switched on? |
| POST   | `/api/uploads/signature`  | teacher, admin       |

**File upload.** Attachments never pass through the API. A teacher's browser
asks for a short-lived signature, uploads straight to Cloudinary with it, then
sends back the resulting URL when saving the lesson — so a 100 MB lesson video
never occupies the Node process. The signature pins the target folder, so it
cannot be used to write anywhere else in the account.

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`
to enable it. Left empty, everything else still works and the editor shows a
notice instead of the file picker.

> **PDF delivery must be enabled on the Cloudinary account.** New accounts
> refuse to serve PDF and ZIP files: the upload succeeds, but every request for
> the file answers `401`, so students see an empty viewer. Signed URLs and
> `resource_type: raw` do *not* get around it — it is an account setting.
>
> Fix it once, in the Cloudinary Console:
> **Settings → Security → Restricted media types → untick "PDF and ZIP files"**.
>
> Images and videos are unaffected and work immediately.

On `PUT /api/lessons/:id` the `file` field means three different things:

| `file`      | Effect                        |
| ----------- | ----------------------------- |
| omitted     | keep the current attachment   |
| `null`      | remove it (and delete the Cloudinary asset) |
| an object   | replace it (old asset deleted after the row is safely updated) |

Every error has the same shape, with a message already written in Lao:

```json
{ "error": { "code": "email_taken", "message": "ອີເມວນີ້ຖືກໃຊ້ແລ້ວ" } }
```

## Security notes

- Passwords are hashed with bcrypt (12 rounds by default, `BCRYPT_ROUNDS`).
- Login answers with one message for a wrong email and a wrong password, and
  always runs a bcrypt comparison, so it never reveals which emails exist.
- Every secret comes from the environment. The API refuses to start if
  `JWT_SECRET` is missing, shorter than 32 characters, or still the example
  value in production.
- `helmet` sets security headers; login and registration are rate limited.
- Only the server decides roles. `requireRole()` guards the API;
  `<ProtectedRoute>` in React only hides links, and is never the real check.
- Optional `TEACHER_REGISTRATION_CODE`: when set, teacher signup also requires
  a code the school hands out. Leave it empty for open signup.
- The JWT is kept in `localStorage`. That is the simplest approach and works on
  any deployment, but it means a cross-site-scripting bug could expose a token.
  Tokens are therefore short-lived (`JWT_EXPIRES_IN`, default 2h). Moving to an
  `httpOnly` cookie is a contained change in `lib/api.js` and the auth routes.

## Lao language notes

- `<html lang="lo">`, Noto Sans Lao, and extra line height, because Lao vowel
  and tone marks stack above and below the base letters.
- Every interface string lives in `frontend/src/i18n/lo.js`, so wording can be
  corrected without touching React.
- **Search**: the `lessons.search_vector` column uses PostgreSQL's `simple`
  dictionary rather than `english` — stemming English words would do nothing
  for Lao. Because Lao is written without spaces between words, full-text
  search alone can miss a keyword inside a long run of text, so the schema also
  carries `pg_trgm` indexes on `title` and `content` for fast substring
  matching. The search feature will use both and rank the combined results.
- For a school with weak internet, download the Noto Sans Lao files into
  `frontend/public/` and serve them locally instead of from Google Fonts.

## Status

- [x] Project setup, Docker, database schema and migrations
- [x] Authentication: register, login, roles, protected routes
- [x] Subjects and lessons (CRUD, Cloudinary attachments)
- [ ] Full-text search with highlighted snippets
- [ ] Quizzes, answer keys and saved scores
