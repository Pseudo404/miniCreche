import { get, set, update } from 'idb-keyval';
import { getCreche } from './api';

export type EmargementRecord = {
    id: string;
    creche_name: string;
    employee_id: string;
    employee_name: string;
    type_event: string;
    timestamp: string;
    signature: string;
    synced: boolean;
};

// Replace this with the PC's Tailscale IP if needed, or read from env
const SYNC_URL = process.env.NEXT_PUBLIC_SYNC_URL || "http://localhost:8000/sync";

export async function saveEmargementLocally(record: Omit<EmargementRecord, 'id' | 'creche_name' | 'synced'>) {
    const creche = getCreche();
    const fullRecord: EmargementRecord = {
        ...record,
        id: crypto.randomUUID(),
        creche_name: creche ? creche.nom : 'Inconnue',
        synced: false
    };

    await update('emargements', (val: EmargementRecord[] | undefined) => {
        const arr = val || [];
        arr.push(fullRecord);
        return arr;
    });

    // Try to sync immediately in background
    syncEmargements();
}

export async function syncEmargements() {
    if (typeof window === 'undefined' || !navigator.onLine) return { success: false, pending: await getPendingCount() };

    const emargements: EmargementRecord[] = await get('emargements') || [];
    const pending = emargements.filter(e => !e.synced);
    
    if (pending.length === 0) return { success: true, pending: 0 };

    try {
        const response = await fetch(SYNC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pending)
        });

        if (response.ok) {
            // Mark as synced
            const pendingIds = new Set(pending.map(p => p.id));
            await update('emargements', (val: EmargementRecord[] | undefined) => {
                const arr = val || [];
                return arr.map(e => pendingIds.has(e.id) ? { ...e, synced: true } : e);
            });
            return { success: true, pending: 0 };
        }
    } catch (e) {
        console.error("Sync failed, will retry later", e);
    }
    
    return { success: false, pending: pending.length };
}

export async function getPendingCount() {
    const emargements: EmargementRecord[] = await get('emargements') || [];
    return emargements.filter(e => !e.synced).length;
}
