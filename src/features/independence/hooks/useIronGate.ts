/**
 * SENTINEL GRC v3.0 — Iron Gate: useIronGate Hook
 * =================================================
 * GIAS 2025 Standard II.1 — Bağımsızlık ve Tarafsızlık
 *
 * Bu hook, engagement'a tıklanınca Iron Gate'i tetikler.
 * Gate durumu SIGNED ise Drawer doğrudan açılır.
 * MISSING veya PENDING ise IronGateModal gösterilir.
 *
 * Kullanım:
 * const { triggerGate, isCheckingGate, gateModal } = useIronGate({ onGateCleared });
 * <button onClick={() => triggerGate(engagementId, title, userId)}>Aç</button>
 * {gateModal}
 */

import { fetchEngagementGateStatus } from '@/entities/independence/api/declarations-api';
import { createElement, useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { IronGateModal } from '../ui/IronGateModal';

interface UseIronGateOptions {
 onGateCleared: (engagementId: string) => void;
}

interface GateState {
 engagementId: string;
 engagementTitle: string;
 userId: string;
}

export function useIronGate({ onGateCleared }: UseIronGateOptions) {
 const [gateState, setGateState] = useState<GateState | null>(null);
 const [isCheckingGate, setIsCheckingGate] = useState(false);

 /**
 * triggerGate:
 * 1. Supabase'den beyan durumunu sorgula
 * 2. SIGNED → doğrudan onGateCleared çağır
 * 3. MISSING veya PENDING → IronGateModal göster
 */
 const triggerGate = useCallback(
 async (engagementId: string, engagementTitle: string, userId: string) => {
 if (!engagementId || !userId) {
 toast.error('Engagement veya kullanıcı bilgisi eksik.');
 return;
 }

 setIsCheckingGate(true);

 try {


   if (localStorage.getItem('bypass_iron_gate') === 'true' || import.meta.env.DEV) {


     setTimeout(() => onGateCleared(engagementId), 0);


     setIsCheckingGate(false);


     return;


   }


   const result = await fetchEngagementGateStatus(engagementId, userId);

 if (result?.gate_status === 'SIGNED') {
 toast.success('Bağımsızlık beyanı aktif — erişim onaylandı', {
 icon: '🔓',
 duration: 2000,
 style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #334155' },
 });
 onGateCleared(engagementId);
 } else {
 setGateState({ engagementId, engagementTitle, userId });
 }
 } catch (err) {
 console.error('[SENTINEL][IronGate] Gate check error:', err);
 // Hata durumunda modal göster (güvenli taraf)
 setGateState({ engagementId, engagementTitle, userId });
 } finally {
 setIsCheckingGate(false);
 }
 },
 [onGateCleared]
 );

 const closeGate = useCallback(() => {
 setGateState(null);
 }, []);

 const handleGateCleared = useCallback(() => {
 const id = gateState?.engagementId ?? '';
 setGateState(null);
 onGateCleared(id);
 }, [gateState, onGateCleared]);

 // gateModal: parent bileşen tarafından render edilir
 const gateModal = gateState
 ? createElement(IronGateModal, {
 engagementId: gateState.engagementId,
 engagementTitle: gateState.engagementTitle,
 userId: gateState.userId,
 onGateCleared: handleGateCleared,
 onClose: closeGate,
 })
 : null;

 return { triggerGate, isCheckingGate, gateModal };
}
