const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type LoginResponse = {
  access: string;
  refresh: string;
  role: string;
  creche?: { id: string; nom: string };
};

const AUTH_STORAGE_KEY = "auth_session";

type StoredSession = Pick<LoginResponse, "access" | "refresh" | "role" | "creche">;

function writeSessionToLocalStorage(session: StoredSession) {
  localStorage.setItem("access_token", session.access);
  localStorage.setItem("refresh_token", session.refresh);
  localStorage.setItem("role", session.role);
  if (session.creche) localStorage.setItem("creche", JSON.stringify(session.creche));
  else localStorage.removeItem("creche");
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(data.detail || "Connexion impossible", res.status);
  }

  writeSessionToLocalStorage(data);
  // IndexedDB is retained by Android WebView even when its localStorage is
  // unexpectedly discarded while the application is closed.
  try {
    const { set } = await import("idb-keyval");
    await set(AUTH_STORAGE_KEY, data);
  } catch {
    // localStorage is still enough in browsers where IndexedDB is disabled.
  }

  return data;
}

export function getCreche(): { id: string; nom: string } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("creche");
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Restore the tablet session after a WebView restart. */
export async function restoreAuthSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (isLoggedIn()) return true;

  try {
    const { get } = await import("idb-keyval");
    const saved = await get<StoredSession>(AUTH_STORAGE_KEY);
    if (!saved?.access || !saved.role) return false;
    writeSessionToLocalStorage(saved);
    return true;
  } catch {
    return false;
  }
}

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem("access_token"));
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("creche");
  localStorage.removeItem("role");
  import("idb-keyval").then(({ del }) => del(AUTH_STORAGE_KEY));
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("access_token");
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.detail || "Erreur serveur", res.status);
  }

  return res.json();
}
