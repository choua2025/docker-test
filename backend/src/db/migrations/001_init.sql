-- ============================================================================
-- LaoLearn - initial schema
--
-- All text columns are UTF-8 (PostgreSQL default here), so Lao script is
-- stored and compared correctly.
-- ============================================================================

-- pg_trgm powers "contains this substring" search, which is our fallback for
-- Lao text: Lao is written without spaces between words, so the normal
-- full-text tokenizer cannot always split it into words.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Helper: keep updated_at accurate without the API having to remember.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $fn$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
DO $do$
BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$do$;

CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT        NOT NULL CHECK (length(btrim(name)) > 0),
  -- Always stored lower-cased by the API, so this UNIQUE is case-insensitive
  -- in practice and "Somchai@x.la" cannot register twice.
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  role          user_role   NOT NULL DEFAULT 'student',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- subjects  (ວິຊາ)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subjects (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT        NOT NULL UNIQUE CHECK (length(btrim(name)) > 0),
  description TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS subjects_set_updated_at ON subjects;
CREATE TRIGGER subjects_set_updated_at
  BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- lessons  (ບົດຮຽນ)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lessons (
  id         BIGSERIAL PRIMARY KEY,
  subject_id BIGINT      NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL CHECK (length(btrim(title)) > 0),
  content    TEXT        NOT NULL DEFAULT '',
  file_url   TEXT,                    -- Cloudinary URL (PDF / image / video)
  created_by BIGINT      REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Full-text search column, maintained by PostgreSQL itself.
  --
  -- The 'simple' dictionary is used on purpose: the 'english' dictionary
  -- would stem English words and does nothing useful for Lao. 'simple' just
  -- lowercases and splits on whitespace/punctuation, which works for Lao
  -- phrases separated by spaces.
  --
  -- setweight() marks title matches as weight 'A' and body matches as 'B',
  -- so ts_rank ranks a title hit above a body hit.
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(content, '')), 'B')
  ) STORED
);

DROP TRIGGER IF EXISTS lessons_set_updated_at ON lessons;
CREATE TRIGGER lessons_set_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS lessons_subject_id_idx ON lessons (subject_id);
CREATE INDEX IF NOT EXISTS lessons_created_by_idx ON lessons (created_by);

-- The main search index.
CREATE INDEX IF NOT EXISTS lessons_search_vector_idx
  ON lessons USING GIN (search_vector);

-- Trigram indexes: they make ILIKE '%keyword%' fast, which is how we catch
-- Lao keywords that sit in the middle of an unspaced run of text.
CREATE INDEX IF NOT EXISTS lessons_title_trgm_idx
  ON lessons USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS lessons_content_trgm_idx
  ON lessons USING GIN (content gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- quizzes  (ແບບທົດສອບ)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quizzes (
  id         BIGSERIAL PRIMARY KEY,
  lesson_id  BIGINT      NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL CHECK (length(btrim(title)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS quizzes_set_updated_at ON quizzes;
CREATE TRIGGER quizzes_set_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS quizzes_lesson_id_idx ON quizzes (lesson_id);

-- ---------------------------------------------------------------------------
-- questions  (ຄຳຖາມ)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questions (
  id             BIGSERIAL PRIMARY KEY,
  quiz_id        BIGINT      NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text  TEXT        NOT NULL CHECK (length(btrim(question_text)) > 0),
  -- A JSON array of answer strings, e.g. ["ຄຳຕອບ ກ", "ຄຳຕອບ ຂ"]
  options        JSONB       NOT NULL,
  -- Zero-based index into `options` telling which answer is correct.
  -- This is never sent to students - only the API compares against it.
  correct_answer SMALLINT    NOT NULL CHECK (correct_answer >= 0),
  position       INT         NOT NULL DEFAULT 0,   -- display order
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT questions_options_is_array
    CHECK (jsonb_typeof(options) = 'array' AND jsonb_array_length(options) >= 2),
  CONSTRAINT questions_correct_answer_in_range
    CHECK (correct_answer < jsonb_array_length(options))
);

CREATE INDEX IF NOT EXISTS questions_quiz_id_idx ON questions (quiz_id, position);

-- ---------------------------------------------------------------------------
-- quiz_results  (ຄະແນນ)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_results (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_id         BIGINT      NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score           INT         NOT NULL CHECK (score >= 0),
  -- Stored alongside the score so an old result still means something after
  -- the teacher adds or removes questions.
  total_questions INT         NOT NULL CHECK (total_questions > 0),
  taken_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT quiz_results_score_within_total CHECK (score <= total_questions)
);

CREATE INDEX IF NOT EXISTS quiz_results_user_id_idx ON quiz_results (user_id, taken_at DESC);
CREATE INDEX IF NOT EXISTS quiz_results_quiz_id_idx ON quiz_results (quiz_id);
