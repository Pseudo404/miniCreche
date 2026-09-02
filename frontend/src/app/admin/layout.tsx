"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/api";
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [role, setRole] = useState("");

  useEffect(() => {
    const userRole = localStorage.getItem("role");
    if (userRole !== "ADMIN") {
      router.push("/");
    } else {
      setRole(userRole);
    }
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (!role) return null; // Wait for mount

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-purple-700 text-white shadow-md p-4 flex justify-between items-center">
        <Link href="/admin/dashboard" className="text-xl font-bold flex items-center gap-2">
          <span>👩‍💼</span> Dashboard Directrice
        </Link>
        <button
          onClick={handleLogout}
          className="text-purple-100 hover:text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
        >
          Déconnexion
        </button>
      </header>
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  );
}
