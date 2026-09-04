"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { syncEmargements, getPendingCount } from "@/lib/sync";

type Employee = {
  id: string;
  nom: string;
  prenom: string;
};

export default function TabletHome() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    // Initial fetch of pending count
    getPendingCount().then(setPendingSync);

    // Auto-sync interval (every 10 seconds)
    const interval = setInterval(async () => {
      if (navigator.onLine) {
        const res = await syncEmargements();
        setPendingSync(res.pending);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { get, set } = await import('idb-keyval');
        const cached = await get('employees_cache');
        if (cached) {
          setEmployees(cached);
          setLoading(false);
        }

        if (navigator.onLine) {
          const { getCreche } = await import('@/lib/api');
          const creche = getCreche();
          const data = await apiFetch(`/employees/?creche=${creche?.nom || ''}`);
          setEmployees(data);
          await set('employees_cache', data);
        }
      } catch (err: any) {
        if (employees.length === 0) {
          setError("Impossible de charger les employés (hors-ligne)");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center">Chargement...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center mt-10">{error}</div>;
  }

  return (
    <div className="max-w-4xl w-full mx-auto relative">
      <div className="absolute top-0 right-0 flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm text-sm font-medium">
        {pendingSync === 0 ? (
          <><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> À jour</>
        ) : (
          <><span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span> {pendingSync} en attente</>
        )}
      </div>

      <h2 className="text-3xl font-semibold text-slate-800 mb-8 text-center mt-4">
        Qui êtes-vous ?
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {employees.map((emp) => (
          <button
            key={emp.id}
            onClick={() => router.push(`/tablet/sign/${emp.id}`)}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all active:scale-95 flex flex-col items-center justify-center gap-3 aspect-square"
          >
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold uppercase">
              {emp.prenom[0]}{emp.nom[0]}
            </div>
            <div className="text-center">
              <div className="font-semibold text-slate-800 text-lg">{emp.prenom}</div>
              <div className="text-slate-500">{emp.nom}</div>
            </div>
          </button>
        ))}
        {employees.length === 0 && (
          <div className="col-span-full text-center text-slate-500 py-12">
            Aucun employé enregistré dans cette crèche.
          </div>
        )}
      </div>
    </div>
  );
}
