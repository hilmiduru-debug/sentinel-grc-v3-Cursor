import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';

const TENANT_ID = '11111111-1111-1111-1111-111111111111';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ZkpSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ZkpStatus   = 'submitted' | 'reviewing' | 'investigating' | 'resolved' | 'dismissed';
export type CategoryType = 'rüşvet_yolsuzluk' | 'mobbing' | 'cinsel_taciz' | 'finansal_usulsüzlük';

export interface ZkpEncryptedReport {
  id: string;
  tenant_id: string;
  tracking_code: string;
  category: CategoryType;
  severity: ZkpSeverity;
  encrypted_payload: string;
  zk_proof_hash: string;
  status: ZkpStatus;
  assigned_investigator: string | null;
  decryption_attempts: number;
  last_decrypted_at: string | null;
  last_decrypted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VaultAccessLog {
  id: string;
  tenant_id: string;
  report_id: string;
  accessed_by_role: string;
  accessed_by_email: string;
  access_reason: string | null;
  access_status: 'success' | 'denied' | 'key_mismatch';
  ip_address: string | null;
  accessed_at: string;
}

// ─── ZKP Reports ──────────────────────────────────────────────────────────────

export function useZkpReports(filters?: { status?: ZkpStatus; category?: CategoryType }) {
  return useQuery({
    queryKey: ['zkp-reports', TENANT_ID, filters],
    queryFn: async () => {
      let query = supabase
        .from('zkp_encrypted_reports')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .order('created_at', { ascending: false });

      if (filters?.status)   query = query.eq('status', filters.status);
      if (filters?.category) query = query.eq('category', filters.category);

      const { data, error } = await query;
      if (error) {
        console.error('[Wave 68] Şifreli ihbarlar alınamadı:', error.message);
        return [] as ZkpEncryptedReport[];
      }
      
      // Wave 68: (reports || []).map koruması eklendi ZORUNLU
      return ((data as ZkpEncryptedReport[]) || []).map(row => ({
        ...row,
        // Frontend'de güvenliği sağlamak için ek formatlama veya log silme yapılabilir
        encrypted_payload: row.encrypted_payload || 'ENCRYPTION_ERROR',
      }));
    },
    staleTime: 30_000,
  });
}

// ─── Log Access (Decryption Attempt) ──────────────────────────────────────────

export function useAccessLogs(reportId: string) {
  return useQuery({
    queryKey: ['vault-access-logs', TENANT_ID, reportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vault_access_logs')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .eq('report_id', reportId)
        .order('accessed_at', { ascending: false });

      if (error) {
        console.error('[Wave 68] Kasa logları alınamadı:', error.message);
        return [] as VaultAccessLog[];
      }
      
      return ((data as VaultAccessLog[]) || []).map(log => log);
    },
    enabled: !!reportId,
    staleTime: 10_000,
  });
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export function useRecordAccessAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ report_id, status, email, role, reason }: { report_id: string; status: 'success'|'denied'|'key_mismatch'; email: string; role: string; reason: string }) => {
      const { error } = await supabase.from('vault_access_logs').insert({
        tenant_id: TENANT_ID,
        report_id,
        accessed_by_email: email,
        accessed_by_role: role,
        access_status: status,
        access_reason: reason,
      });

      if (error) throw error;

      if (status === 'success') {
        // Also update decryption attempt counter on report
        const { data: reportRows } = await supabase.from('zkp_encrypted_reports').select('decryption_attempts').eq('id', report_id).single();
        if (reportRows) {
           await supabase.from('zkp_encrypted_reports').update({
             decryption_attempts: Number(reportRows.decryption_attempts) + 1,
             last_decrypted_at: new Date().toISOString(),
             last_decrypted_by: email,
           }).eq('id', report_id);
        }
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['vault-access-logs', TENANT_ID, variables.report_id] });
      qc.invalidateQueries({ queryKey: ['zkp-reports'] });
    },
  });
}
