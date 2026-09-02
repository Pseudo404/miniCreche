const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type LoginResponse = {
  access: string;
  refresh: string;
  role: string;
  creche?: { id: string; nom: string };
};

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

  localStorage.setItem("access_token", data.access);
  localStorage.setItem("refresh_token", data.refresh);
  localStorage.setItem("role", data.role);
  if (data.creche) {
    localStorage.setItem("creche", JSON.stringify(data.creche));
  }

  return data;
}

export function getCreche(): { id: string; nom: string } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("creche");
  return raw ? JSON.parse(raw) : null;
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