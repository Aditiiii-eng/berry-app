export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === "true";
export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export function getToken() {
  // Primary: the dedicated key written on every login / token refresh
  const direct = localStorage.getItem("berry_token");
  if (direct) return direct;

  // Fallback: Zustand's persist storage (survives accidental clearToken calls)
  // This heals the case where "berry_token" was wiped but the JWT is still in
  // the Zustand store blob. We also write it back to restore the primary key.
  try {
    const raw = localStorage.getItem("berry-app-storage");
    if (raw) {
      const stored = JSON.parse(raw);
      const token = stored?.state?.token;
      if (token) {
        localStorage.setItem("berry_token", token); // restore primary key
        return token;
      }
    }
  } catch {
    // ignore JSON parse errors
  }
  return null;
}

export function setToken(token) {
  if (token) localStorage.setItem("berry_token", token);
}

export function clearToken() {
  localStorage.removeItem("berry_token");
}

// Error subclass that carries the HTTP status so callers can react
// to 401 without relying on side-effects inside apiFetch.
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch(path, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      typeof data?.detail === "string"
        ? data.detail
        : typeof data?.detail === "object"
        ? JSON.stringify(data.detail)
        : "Request failed";

    // On 401, fire a global event so App.jsx can trigger a clean logout.
    // Using a custom window event avoids circular imports between this
    // module and the Zustand store.
    if (res.status === 401) {
      window.dispatchEvent(
        new CustomEvent("berry:unauthorized", { detail: msg })
      );
    }

    throw new ApiError(msg, res.status);
  }

  return data;
}

export const request = async (path, options = {}) => {
  return apiFetch(path, options);
};

export async function fetchImageBlob(url) {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    if (res.status === 401) {
      window.dispatchEvent(
        new CustomEvent("berry:unauthorized", { detail: "Unauthorized image request" })
      );
    }
    throw new Error(`Failed to fetch image: ${res.status}`);
  }
  return await res.blob();
}
