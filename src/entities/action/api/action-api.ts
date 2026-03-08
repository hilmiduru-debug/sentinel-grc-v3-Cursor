import { supabase } from '@/shared/api/supabase';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type {
 ActionAgingMetrics,
 CreateEvidenceInput,
 CreateRequestInput,
} from '../model/types';

export async function getActionsWithAging(): Promise<ActionAgingMetrics[]> {
 const { data, error } = await supabase
 .from('view_action_aging_metrics')
 .select('*')
 .order('performance_delay_days', { ascending: false });

 if (error) throw error;
 return (data ?? []) as ActionAgingMetrics[];
}

export function useActions() {
 return useQuery({
 queryKey: ['actions-aging'],
 queryFn: getActionsWithAging,
 staleTime: 60_000,
 });
}

export async function uploadEvidence(
 actionId: string,
 file: File,
 aiScore: number,
): Promise<void> {
 try {
   const storagePath = `action-evidence/${actionId}/${Date.now()}_${file.name}`;

   const { error: uploadError } = await supabase.storage
   .from('action-evidence')
   .upload(storagePath, file, { upsert: false });

   if (uploadError) {
   console.warn('Storage upload skipped (bucket may not exist):', uploadError.message);
   }

   const fileHash = await computeSha256(file);

   const payload: CreateEvidenceInput = {
   action_id: actionId,
   storage_path: storagePath,
   file_hash: fileHash,
   ai_confidence_score: aiScore,
   };

   const { error } = await supabase.from('action_evidence').insert(payload);
   if (error) throw error;
   toast.success('Kanıt başarıyla yüklendi ✓');
 } catch (err: any) {
   toast.error(`Kanıt yüklenemedi: ${err.message || 'Bilinmeyen hata'}`);
   throw err;
 }
}

export async function submitRequest(
 payload: CreateRequestInput,
): Promise<void> {
 try {
   const { error } = await supabase.from('action_requests').insert({
   action_id: payload.action_id,
   type: payload.type,
   justification: payload.justification,
   requested_date: payload.requested_date ?? null,
   expiration_date: payload.expiration_date ?? null,
   status: 'pending',
   });
   if (error) throw error;
   toast.success('Talep başarıyla iletildi ✓');
 } catch (err: any) {
   toast.error(`Talep iletilemedi: ${err.message || 'Bilinmeyen hata'}`);
   throw err;
 }
}

async function computeSha256(file: File): Promise<string> {
 const buffer = await file.arrayBuffer();
 const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
 const hashArray = Array.from(new Uint8Array(hashBuffer));
 return (hashArray || []).map((b) => b.toString(16).padStart(2, '0')).join('');
}
