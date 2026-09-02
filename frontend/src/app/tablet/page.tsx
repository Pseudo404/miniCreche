"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

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

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await apiFetch("/employees/");
        setEmployees(data);
      } catch (err: any) {
        setError("Impossible de charger les employés");
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
    <div className="max-w-4xl w-full mx-auto">
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
