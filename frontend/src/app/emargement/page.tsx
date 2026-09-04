"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCreche, isLoggedIn, logout } from "@/lib/api";

export default function EmargementPage() {
  const router = useRouter();
  const [creche, setCreche] = useState<{ id: string; nom: string } | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/");
      return;
    }
    setCreche(getCreche());
  }, [router]);

  if (!creche) return null;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm uppercase tracking-wide text-muted">Connecté</p>
      <h1 className="font-display text-3xl font-semibold text-primary">
        {creche.nom}
      </h1>
      <p className="max-w-sm text-muted">
        La connexion fonctionne. L'écran de sélection des employés et de
        signature arrive à la prochaine étape.
      </p>
      <button
        onClick={() => {
          logout();
          router.push("/");
        }}
        className="mt-4 h-12 rounded-xl border border-border px-6 text-sm font-medium text-ink transition-colors hover:bg-white"
      >
        Se déconnecter
      </button>
    </main>
  );
}