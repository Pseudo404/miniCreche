"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login, ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      router.push("/emargement");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 401
            ? "Identifiant ou mot de passe incorrect."
            : "Impossible de se connecter. Vérifiez que le serveur est lancé."
        );
      } else {
        setError("Impossible de se connecter. Vérifiez que le serveur est lancé.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-[440px]">
        <div className="mb-8 text-center">
          <h1 className="font-display text-[2.25rem] font-semibold leading-tight text-primary">
            Mini Crèche
          </h1>
          <p className="mt-2 text-muted">
            Connexion de la tablette à votre crèche
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-surface p-8 shadow-[0_1px_2px_rgba(34,40,31,0.06),0_8px_24px_rgba(34,40,31,0.06)]"
        >
          <div className="flex flex-col gap-5">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ink">Identifiant</span>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-14 rounded-xl border border-border bg-white px-4 text-base text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30"
                placeholder="creche_dupont"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ink">Mot de passe</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-14 rounded-xl border border-border bg-white px-4 text-base text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30"
                placeholder="••••••••"
              />
            </label>

            {error && (
              <p className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-14 rounded-xl bg-primary text-base font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}