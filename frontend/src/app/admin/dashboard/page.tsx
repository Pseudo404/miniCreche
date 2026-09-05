"use client";

import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

type AdminEmployee = {
  id: string;
  nom: string;
  prenom: string;
  creche_nom: string;
  heures_jour_contrat: string;
  total_worked_minutes: number;
  total_contract_minutes: number;
  diff_minutes: number;
};

type SortKey =
  | "nom_asc"
  | "nom_desc"
  | "creche_nom_asc"
  | "creche_nom_desc"
  | "diff_minutes_asc"
  | "diff_minutes_desc";

function formatMinutes(mins: number) {
  const sign = mins < 0 ? "-" : "+";
  const absMins = Math.abs(Math.round(mins));
  const h = Math.floor(absMins / 60);
  const m = absMins % 60;
  return `${sign}${h}h${m.toString().padStart(2, "0")}`;
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  return (
    <span className={`ml-1 transition-opacity ${active ? "opacity-100" : "opacity-30"}`}>
      {dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

export default function AdminDashboard() {
  const [employees, setEmployees] = useState<AdminEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterCreche, setFilterCreche] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("nom_asc");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const data = await apiFetch(`/admin/employees/?month=${month}&year=${year}`);
        setEmployees(data);
      } catch {
        setError("Impossible de charger les employés");
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, [month, year]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [y, m] = e.target.value.split("-");
    setYear(parseInt(y));
    setMonth(parseInt(m));
  };

  const monthStr = `${year}-${month.toString().padStart(2, "0")}`;
  const creches = Array.from(new Set(employees.map((e) => e.creche_nom)));

  const sorted = useMemo(() => {
    const list = filterCreche
      ? employees.filter((e) => e.creche_nom === filterCreche)
      : [...employees];

    switch (sortKey) {
      case "nom_asc":
        list.sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`));
        break;
      case "nom_desc":
        list.sort((a, b) => `${b.nom} ${b.prenom}`.localeCompare(`${a.nom} ${a.prenom}`));
        break;
      case "creche_nom_asc":
        list.sort((a, b) => a.creche_nom.localeCompare(b.creche_nom));
        break;
      case "creche_nom_desc":
        list.sort((a, b) => b.creche_nom.localeCompare(a.creche_nom));
        break;
      case "diff_minutes_asc":
        list.sort((a, b) => a.diff_minutes - b.diff_minutes);
        break;
      case "diff_minutes_desc":
        list.sort((a, b) => b.diff_minutes - a.diff_minutes);
        break;
    }
    return list;
  }, [employees, filterCreche, sortKey]);

  const toggleSort = (base: "nom" | "creche_nom" | "diff_minutes") => {
    const ascKey  = `${base}_asc`  as SortKey;
    const descKey = `${base}_desc` as SortKey;
    setSortKey((prev) => (prev === ascKey ? descKey : ascKey));
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Chargement...
      </div>
    );
  if (error)
    return <div className="text-red-500 text-center mt-20">{error}</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Employés</h1>
          <p className="text-slate-500">Gérez les horaires et vérifiez les émargements</p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <input
            type="month"
            value={monthStr}
            onChange={handleMonthChange}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <select
            value={filterCreche}
            onChange={(e) => setFilterCreche(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Toutes les crèches</option>
            {creches.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm uppercase font-semibold">
              <th
                className="px-6 py-4 cursor-pointer hover:text-purple-700 select-none"
                onClick={() => toggleSort("nom")}
              >
                Nom
                <SortIcon
                  active={sortKey === "nom_asc" || sortKey === "nom_desc"}
                  dir={sortKey === "nom_desc" ? "desc" : "asc"}
                />
              </th>
              <th
                className="px-6 py-4 cursor-pointer hover:text-purple-700 select-none"
                onClick={() => toggleSort("creche_nom")}
              >
                Crèche
                <SortIcon
                  active={sortKey === "creche_nom_asc" || sortKey === "creche_nom_desc"}
                  dir={sortKey === "creche_nom_desc" ? "desc" : "asc"}
                />
              </th>
              <th className="px-6 py-4">Travaillé (mois)</th>
              <th
                className="px-6 py-4 cursor-pointer hover:text-purple-700 select-none"
                onClick={() => toggleSort("diff_minutes")}
              >
                Solde (+/-)
                <SortIcon
                  active={sortKey === "diff_minutes_asc" || sortKey === "diff_minutes_desc"}
                  dir={sortKey === "diff_minutes_asc" ? "asc" : "desc"}
                />
              </th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((emp) => {
              const isPos = emp.diff_minutes >= 0;
              return (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">
                    {emp.prenom} {emp.nom}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {emp.creche_nom}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {emp.total_worked_minutes > 0
                      ? `${Math.floor(emp.total_worked_minutes / 60)}h${Math.round(
                          emp.total_worked_minutes % 60
                        )
                          .toString()
                          .padStart(2, "0")}`
                      : "–"}
                  </td>
                  <td className="px-6 py-4">
                    {emp.total_worked_minutes > 0 ? (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isPos
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {formatMinutes(emp.diff_minutes)}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">–</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/employee/__employee__?id=${encodeURIComponent(emp.id)}`}
                      className="inline-flex items-center justify-center px-4 py-2 border border-purple-200 text-sm font-medium rounded-lg text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
                    >
                      Voir le pointage
                    </Link>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  Aucun employé trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
