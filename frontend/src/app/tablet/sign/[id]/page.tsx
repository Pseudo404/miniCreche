"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import { apiFetch } from "@/lib/api";
import { saveEmargementLocally } from "@/lib/sync";

type Employee = {
  id: string;
  nom: string;
  prenom: string;
};

export default function SignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const employeeId = searchParams.get("id") || "";
  const sigCanvas = useRef<any>(null);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<string>("ARRIVEE");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!employeeId) {
      setError("Employé non sélectionné");
      setLoading(false);
      return;
    }
    // In a real app we'd fetch just this employee,
    // but we can just fetch all and find them for simplicity
    const fetchEmployee = async () => {
      try {
        const { get } = await import("idb-keyval");
        const cached = await get<Employee[]>("employees_cache");
        const { getCreche } = await import("@/lib/api");
        const data: Employee[] = cached || await apiFetch(
          `/employees/?creche=${encodeURIComponent(getCreche()?.nom || "")}`
        );
        const emp = data.find((e) => e.id === employeeId);
        if (emp) setEmployee(emp);
        else setError("Employé non trouvé");
      } catch (err) {
        setError("Impossible de charger les données");
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [employeeId]);

  const handleClear = () => {
    sigCanvas.current?.clear();
  };

  const handleSave = async () => {
    if (sigCanvas.current?.isEmpty()) {
      setError("Veuillez signer avant de valider.");
      return;
    }
    setError("");
    setSaving(true);
    
    const signatureBase64 = sigCanvas.current.getTrimmedCanvas().toDataURL("image/png");

    try {
      await saveEmargementLocally({
        employee_id: employeeId,
        employee_name: `${employee?.prenom} ${employee?.nom}`,
        type_event: action,
        timestamp: new Date().toISOString(),
        signature: signatureBase64,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push("/tablet");
      }, 2000);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde locale.");
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center mt-20">Chargement...</div>;
  if (error && !employee) return <div className="text-center mt-20 text-red-500">{error}</div>;

  if (success) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mb-6">
          ✓
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Émargement validé !</h2>
        <p className="text-slate-500 text-lg">Retour à l'accueil...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl w-full mx-auto flex flex-col h-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
      <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center gap-4">
        <button
          onClick={() => router.push("/tablet")}
          className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-600 shadow-sm border border-slate-200 text-xl font-bold hover:bg-slate-50"
        >
          ←
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {employee?.prenom} {employee?.nom}
          </h2>
          <p className="text-slate-500">Sélectionnez l'action et signez ci-dessous</p>
        </div>
      </div>

      <div className="p-8 flex flex-col flex-1">
        <div className="grid grid-cols-2 gap-4 mb-8">
          {[
            { id: "ARRIVEE", label: "Arrivée", color: "bg-emerald-500 text-white", inactive: "bg-slate-100 text-slate-600 hover:bg-slate-200" },
            { id: "DEPART",  label: "Départ",  color: "bg-rose-500 text-white",    inactive: "bg-slate-100 text-slate-600 hover:bg-slate-200" },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setAction(btn.id)}
              className={`py-4 rounded-xl font-bold text-lg transition-colors ${
                action === btn.id ? btn.color : btn.inactive
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {error && <div className="text-red-500 text-center mb-4 font-medium">{error}</div>}

        <div className="flex-1 min-h-[300px] border-2 border-dashed border-slate-300 rounded-2xl relative bg-slate-50 overflow-hidden">
          <SignatureCanvas
            ref={sigCanvas}
            canvasProps={{
              className: "w-full h-full absolute top-0 left-0 cursor-crosshair",
            }}
            backgroundColor="transparent"
          />
          <div className="absolute top-4 left-4 text-slate-400 font-medium pointer-events-none">
            Signez ici...
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={handleClear}
            className="flex-1 py-4 bg-slate-100 text-slate-700 font-semibold rounded-xl text-lg hover:bg-slate-200 transition-colors"
          >
            Effacer
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-[2] py-4 bg-blue-600 text-white font-semibold rounded-xl text-lg shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all disabled:opacity-50"
          >
            {saving ? "Validation..." : "Valider"}
          </button>
        </div>
      </div>
    </div>
  );
}
