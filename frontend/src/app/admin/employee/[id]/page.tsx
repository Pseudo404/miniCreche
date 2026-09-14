"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type DailyTime = {
  date: string;
  worked_minutes: number;
  contract_minutes: number;
  diff_minutes: number;
  is_complete: boolean;
  events_count: number;
};

type TimeData = {
  employee_id: string;
  heures_jour_contrat: number;
  has_schedule: boolean;
  month: number;
  year: number;
  daily: DailyTime[];
  total_worked_minutes: number;
  total_contract_minutes: number;
  total_diff_minutes: number;
};

type Emargement = {
  id: string;
  type_event: string;
  horodatage: string;
  signature: string;
  expected_time: string | null;
  delay_minutes: number | null;
};

type ScheduleEntry = {
  jour: number;
  matin_debut: string;
  matin_fin: string;
  aprem_debut: string;
  aprem_fin: string;
};

type ScheduleExceptionEntry = {
  date: string;
  label: string;
  matin_debut: string;
  matin_fin: string;
  aprem_debut: string;
  aprem_fin: string;
  no_pointage: boolean;
  cumuler: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const JOURS = [
  { label: "Lundi", value: 0 },
  { label: "Mardi", value: 1 },
  { label: "Mercredi", value: 2 },
  { label: "Jeudi", value: 3 },
  { label: "Vendredi", value: 4 },
  { label: "Samedi", value: 5 },
  { label: "Dimanche", value: 6 },
];

const EMPTY_SCHEDULE: ScheduleEntry[] = JOURS.map((j) => ({
  jour: j.value,
  matin_debut: "",
  matin_fin: "",
  aprem_debut: "",
  aprem_fin: "",
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMinutes(mins: number) {
  const sign = mins < 0 ? "-" : "+";
  const absMins = Math.abs(Math.round(mins));
  const h = Math.floor(absMins / 60);
  const m = absMins % 60;
  return `${sign}${h}h${m.toString().padStart(2, "0")}`;
}

function totalSlotMinutes(entry: ScheduleEntry): number {
  const slot = (d: string, f: string) => {
    if (!d || !f) return 0;
    const [dh, dm] = d.split(":").map(Number);
    const [fh, fm] = f.split(":").map(Number);
    return Math.max(0, (fh * 60 + fm) - (dh * 60 + dm));
  };
  return slot(entry.matin_debut, entry.matin_fin) + slot(entry.aprem_debut, entry.aprem_fin);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminEmployeeDetail() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  const creche = searchParams.get("creche") || "";
  const crecheQuery = `&creche=${encodeURIComponent(creche)}`;

  const [timeData, setTimeData] = useState<TimeData | null>(null);
  const [emargements, setEmargements] = useState<Emargement[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<"time" | "signatures" | "schedule">("time");

  // Exceptions state
  const [exceptions, setExceptions] = useState<ScheduleExceptionEntry[]>([]);
  const [exceptionsLoading, setExceptionsLoading] = useState(false);
  const [newExcDate, setNewExcDate] = useState("");
  const [newExcLabel, setNewExcLabel] = useState("Journée exceptionnelle");
  const [newExcMatinDebut, setNewExcMatinDebut] = useState("");
  const [newExcMatinFin, setNewExcMatinFin] = useState("");
  const [newExcApremDebut, setNewExcApremDebut] = useState("");
  const [newExcApremFin, setNewExcApremFin] = useState("");
  const [newExcCumuler, setNewExcCumuler] = useState(false);

  // Schedule state
  const [schedule, setSchedule] = useState<ScheduleEntry[]>(EMPTY_SCHEDULE);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleSaved, setScheduleSaved] = useState(false);

  // Balance adjustments state
  type BalAdj = { id: number; minutes: number; reason: string; created_at: string };
  const [adjustments, setAdjustments] = useState<BalAdj[]>([]);
  const [adjHours, setAdjHours] = useState("");
  const [adjMins, setAdjMins] = useState("");
  const [adjIsNegative, setAdjIsNegative] = useState(false);
  const [adjReason, setAdjReason] = useState("");
  const [adjSaving, setAdjSaving] = useState(false);

  // ── Fetch time + signatures ──────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [timeRes, sigRes] = await Promise.all([
          apiFetch(`/admin/employees/${id}/time/?month=${month}&year=${year}${crecheQuery}`),
          apiFetch(`/admin/employees/${id}/emargements/?month=${month}&year=${year}${crecheQuery}`),
        ]);
        setTimeData(timeRes);
        setEmargements(sigRes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, month, year, crecheQuery]);

  // ── Fetch schedule once ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchSchedule = async () => {
      setScheduleLoading(true);
      try {
        const data: ScheduleEntry[] = await apiFetch(`/admin/employees/${id}/schedule/?creche=${encodeURIComponent(creche)}`);
        // Merge fetched data with empty template
        setSchedule(
          EMPTY_SCHEDULE.map((empty) => {
            const found = data.find((s) => s.jour === empty.jour);
            return found
              ? {
                  jour: found.jour,
                  matin_debut: found.matin_debut ?? "",
                  matin_fin: found.matin_fin ?? "",
                  aprem_debut: found.aprem_debut ?? "",
                  aprem_fin: found.aprem_fin ?? "",
                }
              : empty;
          })
        );
      } catch (err) {
        console.error(err);
      } finally {
        setScheduleLoading(false);
      }
    };
    fetchSchedule();
  }, [id, creche]);

  useEffect(() => {
    const fetchExceptions = async () => {
      setExceptionsLoading(true);
      try {
        const data = await apiFetch(`/admin/employees/${id}/exceptions/?creche=${encodeURIComponent(creche)}`);
        setExceptions(data);
      } catch (err) {
        console.error(err);
      } finally {
        setExceptionsLoading(false);
      }
    };
    fetchExceptions();
  }, [id, creche]);


  useEffect(() => {
    const fetchAdjustments = async () => {
      try {
        const data = await apiFetch(`/admin/employees/${id}/balance/adjustments?creche=${encodeURIComponent(creche)}`);
        setAdjustments(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAdjustments();
  }, [id, creche]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [y, m] = e.target.value.split("-");
    setYear(parseInt(y));
    setMonth(parseInt(m));
  };

  const updateScheduleField = (
    jour: number,
    field: keyof Omit<ScheduleEntry, "jour">,
    value: string
  ) => {
    setSchedule((prev) =>
      prev.map((s) => (s.jour === jour ? { ...s, [field]: value } : s))
    );
    setScheduleSaved(false);
  };

  const handleSaveSchedule = async () => {
    setScheduleSaving(true);
    try {
      await apiFetch(`/admin/employees/${id}/schedule/?creche=${encodeURIComponent(creche)}`, {
        method: "POST",
        body: JSON.stringify(schedule),
      });
      setScheduleSaved(true);
      const timeRes = await apiFetch(
        `/admin/employees/${id}/time/?month=${month}&year=${year}${crecheQuery}`
      );
      setTimeData(timeRes);
    } catch (err) {
      console.error(err);
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleAddException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExcDate) return;
    try {
      await apiFetch(`/admin/employees/${id}/exceptions/?creche=${encodeURIComponent(creche)}`, {
        method: "POST",
        body: JSON.stringify({
          date: newExcDate,
          label: newExcLabel,
          matin_debut: newExcMatinDebut,
          matin_fin: newExcMatinFin,
          aprem_debut: newExcApremDebut,
          aprem_fin: newExcApremFin,
          no_pointage: false,
          cumuler: newExcCumuler,
        }),
      });
      // Refresh
      const data = await apiFetch(`/admin/employees/${id}/exceptions/?creche=${encodeURIComponent(creche)}`);
      setExceptions(data);
      const timeRes = await apiFetch(`/admin/employees/${id}/time/?month=${month}&year=${year}${crecheQuery}`);
      setTimeData(timeRes);
      // Reset
      setNewExcDate(""); setNewExcLabel("Journée exceptionnelle"); setNewExcMatinDebut(""); setNewExcMatinFin(""); setNewExcApremDebut(""); setNewExcApremFin(""); setNewExcCumuler(false);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l&apos;ajout.");
    }
  };

  const handleDeleteException = async (date: string) => {
    if (!confirm("Supprimer cette journée personnalisée ?")) return;
    try {
      await apiFetch(`/admin/employees/${id}/exceptions/${date}?creche=${encodeURIComponent(creche)}`, {
        method: "DELETE",
      });
      const data = await apiFetch(`/admin/employees/${id}/exceptions/?creche=${encodeURIComponent(creche)}`);
      setExceptions(data);
      const timeRes = await apiFetch(`/admin/employees/${id}/time/?month=${month}&year=${year}${crecheQuery}`);
      setTimeData(timeRes);
    } catch (err) {
      console.error(err);
    }
  };


  const handleAddAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseInt(adjHours) || 0;
    const m = parseInt(adjMins) || 0;
    if (h === 0 && m === 0) return;
    let totalMins = h * 60 + m;
    if (adjIsNegative) totalMins = -totalMins;
    setAdjSaving(true);
    try {
      await apiFetch(`/admin/employees/${id}/balance/adjust?creche=${encodeURIComponent(creche)}`, {
        method: "POST",
        body: JSON.stringify({ minutes: totalMins, reason: adjReason }),
      });
      // Refresh
      const data = await apiFetch(`/admin/employees/${id}/balance/adjustments?creche=${encodeURIComponent(creche)}`);
      setAdjustments(data);
      const timeRes = await apiFetch(`/admin/employees/${id}/time/?month=${month}&year=${year}${crecheQuery}`);
      setTimeData(timeRes);
      setAdjHours(""); setAdjMins(""); setAdjReason("");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'ajout de l'ajustement.");
    } finally {
      setAdjSaving(false);
    }
  };

  const handleDeleteAdjustment = async (adj_id: number) => {
    if (!confirm("Supprimer cet ajustement ?")) return;
    try {
      await apiFetch(`/admin/employees/${id}/balance/adjustments/${adj_id}`, { method: "DELETE" });
      const data = await apiFetch(`/admin/employees/${id}/balance/adjustments?creche=${encodeURIComponent(creche)}`);
      setAdjustments(data);
      const timeRes = await apiFetch(`/admin/employees/${id}/time/?month=${month}&year=${year}${crecheQuery}`);
      setTimeData(timeRes);
    } catch (err) {
      console.error(err);
    }
  };

  const monthStr = `${year}-${month.toString().padStart(2, "0")}`;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/dashboard" className="text-purple-600 hover:underline font-medium">
          ← Retour aux employés
        </Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Détail du pointage</h1>
          <p className="text-slate-500">
            {timeData?.has_schedule
              ? "Emploi du temps personnalisé actif"
              : `Contrat : ${timeData?.heures_jour_contrat} h/jour (forfait)`}
          </p>
        </div>

        <input
          type="month"
          value={monthStr}
          onChange={handleMonthChange}
          className="px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Stats Summary */}
      {timeData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="text-sm font-medium text-slate-500 mb-1">Heures Travaillées (Mois)</div>
            <div className="text-2xl font-bold text-slate-800">
              {Math.floor(timeData.total_worked_minutes / 60)}h
              {Math.round(timeData.total_worked_minutes % 60).toString().padStart(2, "0")}
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="text-sm font-medium text-slate-500 mb-1">Heures Attendues (Mois)</div>
            <div className="text-2xl font-bold text-slate-800">
              {Math.floor(timeData.total_contract_minutes / 60)}h
              {Math.round(timeData.total_contract_minutes % 60).toString().padStart(2, "0")}
            </div>
          </div>
          <div
            className={`p-6 rounded-2xl shadow-sm border ${
              timeData.total_diff_minutes >= 0
                ? "bg-emerald-50 border-emerald-200"
                : "bg-rose-50 border-rose-200"
            }`}
          >
            <div
              className={`text-sm font-medium mb-1 ${
                timeData.total_diff_minutes >= 0 ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              Solde (+ / -)
            </div>
            <div
              className={`text-2xl font-bold ${
                timeData.total_diff_minutes >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {formatMinutes(timeData.total_diff_minutes)}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        {(
          [
            { key: "time", label: "Calcul des Heures" },
            { key: "schedule", label: "📅 Emploi du Temps" },
            { key: "signatures", label: "Contrôle des Signatures" },
          ] as { key: "time" | "schedule" | "signatures"; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === key
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && activeTab !== "schedule" ? (
        <div className="text-center py-10">Chargement des données...</div>
      ) : (
        <>
          {/* ── Calcul des Heures ─────────────────────────────────────────── */}
          {activeTab === "time" && timeData && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm uppercase font-semibold">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Statut</th>
                    <th className="px-6 py-4">Travaillé</th>
                    <th className="px-6 py-4">Attendu</th>
                    <th className="px-6 py-4">Écart (+/-)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {timeData.daily.map((day) => (
                    <tr key={day.date} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium">
                        {new Date(day.date + "T12:00:00").toLocaleDateString("fr-FR", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      <td className="px-6 py-4">
                        {day.is_complete ? (
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-bold">
                            Complet
                          </span>
                        ) : (
                          <span className="text-rose-600 bg-rose-50 px-2 py-1 rounded text-xs font-bold">
                            Incomplet ({day.events_count} event)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {day.is_complete
                          ? `${Math.floor(day.worked_minutes / 60)}h${Math.round(
                              day.worked_minutes % 60
                            )
                              .toString()
                              .padStart(2, "0")}`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {day.contract_minutes > 0
                          ? `${Math.floor(day.contract_minutes / 60)}h${Math.round(
                              day.contract_minutes % 60
                            )
                              .toString()
                              .padStart(2, "00")}`
                          : "–"}
                      </td>
                      <td className="px-6 py-4">
                        {day.is_complete ? (
                          <span
                            className={`font-semibold ${
                              day.diff_minutes >= 0 ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {formatMinutes(day.diff_minutes)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                  {timeData.daily.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        Aucun pointage ce mois-ci.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Emploi du Temps ───────────────────────────────────────────── */}
          {activeTab === "schedule" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {scheduleLoading ? (
                <div className="p-10 text-center text-slate-500">Chargement de l&apos;emploi du temps...</div>
              ) : (
                <>
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-700">Grille horaire hebdomadaire</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Laissez vide les jours de repos. Le calcul des heures utilisera ces horaires.
                      </p>
                    </div>
                    <button
                      onClick={handleSaveSchedule}
                      disabled={scheduleSaving}
                      className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        scheduleSaved
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-purple-600 text-white hover:bg-purple-700"
                      }`}
                    >
                      {scheduleSaving ? "Enregistrement..." : scheduleSaved ? "✓ Enregistré" : "Enregistrer"}
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-semibold">
                          <th className="px-6 py-3">Jour</th>
                          <th className="px-6 py-3">Matin – Début</th>
                          <th className="px-6 py-3">Matin – Fin</th>
                          <th className="px-6 py-3">Après-midi – Début</th>
                          <th className="px-6 py-3">Après-midi – Fin</th>
                          <th className="px-6 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {schedule.map((entry) => {
                          const total = totalSlotMinutes(entry);
                          const jourLabel = JOURS.find((j) => j.value === entry.jour)?.label ?? "";
                          return (
                            <tr key={entry.jour} className="hover:bg-slate-50">
                              <td className="px-6 py-3 font-medium text-slate-700 w-28">
                                {jourLabel}
                              </td>
                              {(
                                [
                                  "matin_debut",
                                  "matin_fin",
                                  "aprem_debut",
                                  "aprem_fin",
                                ] as (keyof Omit<ScheduleEntry, "jour">)[]
                              ).map((field) => (
                                <td key={field} className="px-4 py-2">
                                  <input
                                    type="time"
                                    value={entry[field]}
                                    onChange={(e) =>
                                      updateScheduleField(entry.jour, field, e.target.value)
                                    }
                                    className="w-32 px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                  />
                                </td>
                              ))}
                              <td className="px-6 py-3 text-right font-semibold text-slate-700">
                                {total > 0
                                  ? `${Math.floor(total / 60)}h${(total % 60)
                                      .toString()
                                      .padStart(2, "0")}`
                                  : <span className="text-slate-300 font-normal">Repos</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-200 bg-slate-50">
                          <td colSpan={5} className="px-6 py-3 text-slate-500 text-sm font-medium">
                            Total semaine
                          </td>
                          <td className="px-6 py-3 text-right font-bold text-purple-700">
                            {(() => {
                              const total = schedule.reduce(
                                (acc, e) => acc + totalSlotMinutes(e),
                                0
                              );
                              return total > 0
                                ? `${Math.floor(total / 60)}h${(total % 60)
                                    .toString()
                                    .padStart(2, "0")}`
                                : "–";
                            })()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
              
              {/* --- Jours Personnalisés / Exceptions --- */}
              <div className="mt-8 border-t-2 border-slate-100 bg-slate-50">

            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Ajouter un jour personnalisé</h2>
              <form onSubmit={handleAddException} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl mb-8 border border-slate-100">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input type="date" required value={newExcDate} onChange={e => setNewExcDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Libellé (ex: Réunion, Formation)</label>
                  <input type="text" value={newExcLabel} onChange={e => setNewExcLabel(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Matin – Début</label>
                  <input type="time" value={newExcMatinDebut} onChange={e => setNewExcMatinDebut(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Matin – Fin</label>
                  <input type="time" value={newExcMatinFin} onChange={e => setNewExcMatinFin(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Après-midi – Début</label>
                  <input type="time" value={newExcApremDebut} onChange={e => setNewExcApremDebut(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Après-midi – Fin</label>
                  <input type="time" value={newExcApremFin} onChange={e => setNewExcApremFin(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div className="md:col-span-2 flex items-center mt-2">
                  <input type="checkbox" id="cumuler" checked={newExcCumuler} onChange={e => setNewExcCumuler(e.target.checked)} className="w-5 h-5 text-purple-600 border-slate-300 rounded focus:ring-purple-500 mr-3" />
                  <label htmlFor="cumuler" className="text-sm font-medium text-slate-800">
                    Cumuler avec l&apos;horaire habituel (utile pour les réunions en soirée). Si non coché, remplace complètement la journée.
                  </label>
                </div>
                <div className="md:col-span-2 mt-2">
                  <button type="submit" className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors">
                    Ajouter
                  </button>
                </div>
              </form>

              <h2 className="text-xl font-bold text-slate-800 mb-4">Jours personnalisés enregistrés</h2>
              {exceptionsLoading ? (
                <div className="text-slate-500">Chargement...</div>
              ) : exceptions.length === 0 ? (
                <div className="text-slate-500">Aucun jour personnalisé.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-semibold">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Libellé</th>
                        <th className="px-4 py-3">Horaires</th>
                        <th className="px-4 py-3">Mode</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {exceptions.map(exc => (
                        <tr key={exc.date} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800">{new Date(exc.date).toLocaleDateString("fr-FR")}</td>
                          <td className="px-4 py-3 text-slate-600">{exc.label}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {exc.matin_debut && exc.matin_fin ? `${exc.matin_debut}-${exc.matin_fin} ` : ""}
                            {exc.aprem_debut && exc.aprem_fin ? `${exc.aprem_debut}-${exc.aprem_fin}` : ""}
                          </td>
                          <td className="px-4 py-3">
                            {exc.cumuler ? (
                              <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded">Cumulé</span>
                            ) : (
                              <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded">Remplacement</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => handleDeleteException(exc.date)} className="text-rose-600 hover:text-rose-800 font-semibold text-xs bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded transition-colors">
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
              </div>
            </div>
          )}



          {/* ── Contrôle des Signatures ───────────────────────────────────── */}
          {activeTab === "signatures" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {emargements.map((sig) => {
                let delayColor = "text-slate-700";
                if (sig.delay_minutes !== null) {
                  if (sig.type_event === "ARRIVEE") {
                    if (sig.delay_minutes <= 0) {
                      delayColor = "text-emerald-600";
                    } else {
                      delayColor = "text-rose-600";
                    }
                  } else if (sig.type_event === "DEPART") {
                    if (sig.delay_minutes >= 0) {
                      delayColor = "text-emerald-600";
                    } else {
                      delayColor = "text-rose-600";
                    }
                  }
                }

                return (
                <div
                  key={sig.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col"
                >
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {sig.expected_time 
                          ? `Prévu : ${new Date(sig.horodatage).toLocaleDateString("fr-FR")} à ${sig.expected_time}`
                          : new Date(sig.horodatage).toLocaleDateString("fr-FR")}
                      </div>
                      <div className={`font-bold text-sm ${delayColor} mt-1`}>
                        {new Date(sig.horodatage).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded bg-slate-200 text-slate-600">
                      {sig.type_event}
                    </span>
                  </div>
                  <div className="p-4 flex-1 flex items-center justify-center bg-slate-50 relative min-h-[150px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sig.signature}
                      alt="Signature"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>
              )})}
              {emargements.length === 0 && (
                <div className="col-span-full text-center py-10 text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  Aucune signature ce mois-ci.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
