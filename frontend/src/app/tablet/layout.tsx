"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCreche, logout } from "@/lib/api";

export default function TabletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [crecheName, setCrecheName] = useState("");

  useEffect(() => {
    const creche = getCreche();
    if (!creche) {
      router.push("/");
    } else {
      setCrecheName(creche.nom);
    }
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (!crecheName) return null; // Wait for mount

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-slate-800">📍 {crecheName}</h1>
        <button
          onClick={handleLogout}
          className="text-slate-500 hover:text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Déconnexion
        </button>
      </header>
      <main className="flex-1 p-6 flex flex-col">{children}</main>
    </div>
  );
}
