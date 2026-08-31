/**
 * Attachment picker for the lesson editor.
 *
 * The file goes straight from the browser to Cloudinary (see uploadApi), so
 * this component owns the progress bar and hands the finished attachment
 * back to the form through `onChange`.
 *
 * `value` is the attachment object, or null when there is none.
 */
import { useEffect, useRef, useState } from "react";

import { uploadApi } from "../lib/api.js";
import { t } from "../i18n/lo.js";
import { Button, ErrorMessage } from "./ui.jsx";

function formatBytes(bytes) {
  if (!bytes) return "";
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** A rough icon so a teacher can tell at a glance what is attached. */
function fileIcon(resourceType, mime) {
  if (resourceType === "video") return "🎬";
  if (mime === "application/pdf" || resourceType === "raw") return "📄";
  return "🖼️";
}

export default function FileUpload({ value, onChange, disabled }) {
  const inputRef = useRef(null);
  const [uploadEnabled, setUploadEnabled] = useState(null); // null = still asking
  const [maxMb, setMaxMb] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    uploadApi
      .config()
      .then((config) => {
        if (cancelled) return;
        setUploadEnabled(config.enabled);
        setMaxMb(config.maxMb);
      })
      .catch(() => !cancelled && setUploadEnabled(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    // Reset the input so picking the same file twice still fires onChange.
    event.target.value = "";
    if (!file) return;

    setError("");
    setProgress(0);
    try {
      const attachment = await uploadApi.upload(file, setProgress);
      onChange(attachment);
    } catch (err) {
      setError(err.message);
    } finally {
      setProgress(null);
    }
  }

  const busy = progress !== null;

  return (
    <div>
      <p className="mb-1.5 block text-sm font-medium text-paper-700">{t.upload.label}</p>

      {uploadEnabled === false && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t.upload.disabled}
        </p>
      )}

      {uploadEnabled && (
        <div className="rounded-lg border border-paper-200 bg-white p-4">
          {value ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-2xl" aria-hidden="true">
                {fileIcon(value.resourceType, value.mime)}
              </span>
              <span className="min-w-0 flex-1">
                <a
                  href={value.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate font-medium text-brand-700 hover:underline"
                >
                  {value.name || t.upload.openFile}
                </a>
                <span className="text-xs text-paper-500">{formatBytes(value.bytes)}</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                onClick={() => inputRef.current?.click()}
                disabled={disabled || busy}
              >
                {t.upload.replace}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => onChange(null)}
                disabled={disabled || busy}
              >
                {t.upload.remove}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || busy}
            >
              {t.upload.choose}
            </Button>
          )}

          {busy && (
            <div className="mt-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-paper-200">
                <div
                  className="h-full bg-brand-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-paper-500">
                {t.upload.uploading} {progress}%
              </p>
            </div>
          )}

          {maxMb && !busy && (
            <p className="mt-2 text-xs text-paper-500">PDF / MP4 / JPG / PNG — ≤ {maxMb} MB</p>
          )}

          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.mp4,.mov,.webm,.jpg,.jpeg,.png,.webp,.gif"
            onChange={handleFile}
          />
        </div>
      )}

      {error && (
        <div className="mt-2">
          <ErrorMessage>{error}</ErrorMessage>
        </div>
      )}
    </div>
  );
}
