-- ============================================================================
-- Lesson attachments and ordering.
--
-- 001 stored only `file_url`. That is not enough in practice:
--   - the reader must know whether to render a PDF, a video or an image;
--   - deleting a lesson must also delete the file from Cloudinary, which
--     needs the asset's public_id, not its URL.
--
-- Teachers also need to control the order lessons appear in ("ບົດທີ 1, 2, 3"),
-- which alphabetical sorting cannot express.
-- ============================================================================

ALTER TABLE lessons
  -- Cloudinary's identifier for the asset, e.g. "laolearn/lessons/ab12cd34".
  ADD COLUMN IF NOT EXISTS file_public_id TEXT,
  -- Cloudinary resource type: 'image', 'video' or 'raw' (PDFs are 'image'
  -- or 'raw' depending on the account, so it is recorded rather than guessed).
  ADD COLUMN IF NOT EXISTS file_resource_type TEXT,
  -- The original filename, so the reader can show "ບົດທີ 1.pdf" instead of a hash.
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_bytes BIGINT,
  -- MIME type, used to pick the right viewer in the browser.
  ADD COLUMN IF NOT EXISTS file_mime TEXT,
  -- Display order inside a subject. Lower comes first.
  ADD COLUMN IF NOT EXISTS position INT NOT NULL DEFAULT 0;

-- Either there is no file at all, or there is a URL and an id to delete it by.
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_file_complete;
ALTER TABLE lessons
  ADD CONSTRAINT lessons_file_complete CHECK (
    (file_url IS NULL AND file_public_id IS NULL)
    OR (file_url IS NOT NULL AND file_public_id IS NOT NULL)
  );

ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_file_resource_type_valid;
ALTER TABLE lessons
  ADD CONSTRAINT lessons_file_resource_type_valid CHECK (
    file_resource_type IS NULL OR file_resource_type IN ('image', 'video', 'raw')
  );

-- Lessons are almost always listed for one subject, in teaching order.
CREATE INDEX IF NOT EXISTS lessons_subject_position_idx
  ON lessons (subject_id, position, id);
