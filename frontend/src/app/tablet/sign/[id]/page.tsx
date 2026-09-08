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

  // NOUVEAU : États pour savoir s'il a déjà pointé aujourd'hui
  const [hasArrived, setHasArrived] = useState(false);
  const [hasDeparted, setHasDeparted] = useState(false);

  useEffect(() => {
    if (!employeeId) {
      setError("Employé non sélectionné");
      setLoading(false);
      return;
    }

    const fetchEmployeeAndStatus = async () => {
      try {
        const { get } = await import("idb-keyval");
        
        // 1. Charger l'employé
        const cached = await get<Employee[]>("employees_cache");
        const { getCreche } = await import("@/lib/api");
        const data: Employee[] = cached || await apiFetch(
          `/employees/?creche=${encodeURIComponent(getCreche()?.nom || "")}`
        );
        const emp = data.find((e) => e.id === employeeId);
        
        if (emp) setEmployee(emp);
        else setError("Employé non trouvé");

        // 2. NOUVEAU : Vérifier le statut du jour
        const today = new Date().toISOString().split("T")[0]; // ex: "2023-10-25"
        const statusKey = `status_${employeeId}_${today}`;
        const currentStatus = await get(statusKey) || { ARRIVEE: false, DEPART: false };
        
        setHasArrived(currentStatus.ARRIVEE);
        setHasDeparted(currentStatus.DEPART);

        // NOUVEAU : Si déjà arrivé mais pas parti, on pré-sélectionne le départ
        if (currentStatus.ARRIVEE && !currentStatus.DEPART) {
          setAction("DEPART");
        }

      } catch (err) {
        setError("Impossible de charger les données");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeAndStatus();
  }, [employeeId]);

  const handleClear = () => {
    sigCanvas.current?.clear();
  };

  const handleSave = async () => {
    if (sigCanvas.current?.isEmpty()) {
      setError("Veuillez signer avant de valider.");
      return;
    }

    // Vérification de sécurité avant d'enregistrer
    if (action === "ARRIVEE" && hasArrived) {
      setError("L'arrivée a déjà été signée aujourd'hui.");
      return;
    }
    if (action === "DEPART" && hasDeparted) {
      setError("Le départ a déjà été signé aujourd'hui.");
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

      // NOUVEAU : Sauvegarder localement qu'il a pointé pour bloquer le bouton
      const { get, set } = await import("idb-keyval");
      const today = new Date().toISOString().split("T")[0];
      const statusKey = `status_${employeeId}_${today}`;
      const currentStatus = await get(statusKey) || { ARRIVEE: false, DEPART: false };
      await set(statusKey, { ...currentStatus, [action]: true });

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
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mb-6">
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
        
        {/* NOUVEAU : Grille de boutons mise à jour pour gérer le mode "disabled" */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {[
            { id: "ARRIVEE", label: "Arrivée", color: "bg-emerald-500 text-white", inactive: "bg-slate-100 text-slate-600 hover:bg-slate-200", disabled: hasArrived },
            { id: "DEPART",  label: "Départ",  color: "bg-rose-500 text-white",   inactive: "bg-slate-100 text-slate-600 hover:bg-slate-200", disabled: hasDeparted },
          ].map((btn) => (
            <button
              key={btn.id}
              disabled={btn.disabled}
              onClick={() => setAction(btn.id)}
              className={`py-4 rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 ${
                action === btn.id
                  ? btn.color
                  : btn.disabled 
                  ? "bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100" 
                  : btn.inactive
              }`}
            >
              {btn.label} {btn.disabled && <span className="text-sm font-normal">(Fait)</span>}
            </button>
          ))}
        </div>

        {error && <div className="text-red-500 text-center mb-4 font-medium bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}

        <div className="flex-1 min-h-[300px] border-2 border-dashed border-slate-300 rounded-2xl relative bg-slate-50 overflow-hidden">
          <SignatureCanvas
            ref={sigCanvas}
            throttle={0}
            minDistance={1}
            velocityFilterWeight={0.2}
            minWidth={1}
            maxWidth={3}
            clearOnResize={false}
            canvasProps={{
              className: "w-full h-full absolute top-0 left-0 cursor-crosshair touch-none",
              style: { touchAction: "none" },
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
            disabled={saving || (action === "ARRIVEE" && hasArrived) || (action === "DEPART" && hasDeparted)}
            className="flex-[2] py-4 bg-purple-600 text-white font-semibold rounded-xl text-lg shadow-lg hover:bg-purple-700 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Validation..." : "Valider"}
          </button>
        </div>
      </div>
    </div>
  );
}