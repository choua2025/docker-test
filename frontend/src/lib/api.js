/**
 * The one place that talks to the backend.
 *
 * Components never call fetch() directly - they call apiRequest(), which
 * attaches the JWT, parses JSON, and turns any error response into an
 * ApiError carrying the Lao message the server sent.
 */
import { t } from "../i18n/lo.js";

// Same-origin by default: Vite proxies /api in development, nginx does it in
// production. VITE_API_URL is only needed for a separate API domain.
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

const TOKEN_KEY = "laolearn.token";

export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// --- token storage ---------------------------------------------------------

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    // Private browsing mode can throw on localStorage access.
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore - the app still works for this session */
  }
}

// --- requests --------------------------------------------------------------

/**
 * @param {string} path e.g. "/auth/login"
 * @param {{ method?: string, body?: unknown, auth?: boolean }} [options]
 *        `auth: false` skips the Authorization header (public endpoints).
 */
export async function apiRequest(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // fetch only rejects when the request never reached the server.
    throw new ApiError(t.common.networkError, { code: "network_error" });
  }

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(payload?.error?.message || t.common.error, {
      status: response.status,
      code: payload?.error?.code,
      details: payload?.error?.details,
    });
  }

  return payload;
}

// --- auth endpoints --------------------------------------------------------

export const authApi = {
  config: () => apiRequest("/auth/config", { auth: false }),
  register: (data) => apiRequest("/auth/register", { method: "POST", body: data, auth: false }),
  login: (data) => apiRequest("/auth/login", { method: "POST", body: data, auth: false }),
  me: () => apiRequest("/auth/me"),
  changePassword: (data) => apiRequest("/auth/change-password", { method: "POST", body: data }),
};

// --- subjects & lessons ----------------------------------------------------

/** Drop empty values so the URL stays clean and the server's defaults apply. */
function queryString(params) {
  const search = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== null),
  );
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const subjectsApi = {
  list: () => apiRequest("/subjects"),
  get: (id) => apiRequest(`/subjects/${id}`),
  create: (data) => apiRequest("/subjects", { method: "POST", body: data }),
  update: (id, data) => apiRequest(`/subjects/${id}`, { method: "PUT", body: data }),
  remove: (id) => apiRequest(`/subjects/${id}`, { method: "DELETE" }),
};

export const lessonsApi = {
  list: (params = {}) => apiRequest(`/lessons${queryString(params)}`),
  get: (id) => apiRequest(`/lessons/${id}`),
  create: (data) => apiRequest("/lessons", { method: "POST", body: data }),
  update: (id, data) => apiRequest(`/lessons/${id}`, { method: "PUT", body: data }),
  remove: (id) => apiRequest(`/lessons/${id}`, { method: "DELETE" }),
};

// --- users (admin) and own scores ------------------------------------------

export const usersApi = {
  list: (params = {}) => apiRequest(`/users${queryString(params)}`),
  get: (id) => apiRequest(`/users/${id}`),
  setRole: (id, role) => apiRequest(`/users/${id}/role`, { method: "PATCH", body: { role } }),
  remove: (id) => apiRequest(`/users/${id}`, { method: "DELETE" }),
};

export const resultsApi = {
  /** Own scores only - the server reads the user from the token, not the URL. */
  mine: () => apiRequest("/results/me"),
};

// --- file upload -----------------------------------------------------------

export const uploadApi = {
  config: () => apiRequest("/uploads/config"),

  /**
   * Upload straight to Cloudinary using a signature from our server, so a
   * large video never travels through the API.
   *
   * @param {File} file
   * @param {(percent: number) => void} [onProgress]
   * @returns the attachment shape the lesson endpoints expect
   */
  async upload(file, onProgress) {
    const signature = await apiRequest("/uploads/signature", { method: "POST" });

    if (file.size > signature.maxBytes) {
      throw new ApiError(
        `${t.upload.tooLarge} ${Math.round(signature.maxBytes / 1024 / 1024)} MB`,
        { code: "file_too_large" },
      );
    }

    const form = new FormData();
    form.append("file", file);
    form.append("api_key", signature.apiKey);
    form.append("timestamp", signature.timestamp);
    form.append("folder", signature.folder);
    form.append("context", signature.context);
    form.append("signature", signature.signature);

    // XMLHttpRequest rather than fetch, because it reports upload progress -
    // essential feedback on a slow school connection.
    const result = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", signature.uploadUrl);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () => {
        try {
          const body = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(body);
          else reject(new ApiError(body?.error?.message || t.upload.failed, { status: xhr.status }));
        } catch {
          reject(new ApiError(t.upload.failed, { status: xhr.status }));
        }
      };
      xhr.onerror = () => reject(new ApiError(t.common.networkError, { code: "network_error" }));
      xhr.send(form);
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      name: file.name,
      bytes: result.bytes,
      mime: file.type || undefined,
    };
  },
};
