/**
 * Smart Contract & Digital Asset Ledger Audit API
 * Wave 70: Akıllı Sözleşme Denetimi
 *
 * FSD: features/digital-assets/api.ts
 * Savunmacı Programlama: (contracts || []).map ve strict optional chaining (?.)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

export type AuditStatus = 'Pending' | 'Scanning' | 'Audited' | 'Critical Risk';
export type VulnSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type VulnStatus = 'Open' | 'In Progress' | 'Resolved' | 'Accepted Risk';
export type ComplianceStatus = 'Compliant' | 'Non-Compliant' | 'Pending Review' | 'Unknown';

export interface SmartContract {
  id: string;
  tenant_id: string;
  contract_name: string;
  network: string;
  contract_address: string;
  solidity_version: string;
  description: string | null;
  audit_status: AuditStatus;
  risk_score: number | null;
  deployment_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TokenIssuance {
  id: string;
  tenant_id: string;
  contract_id: string;
  token_name: string;
  token_symbol: string;
  total_supply: number;
  issuance_date: string | null;
  regulatory_compliance: ComplianceStatus;
  created_at: string;
  updated_at: string;
}

export interface ContractVulnerability {
  id: string;
  tenant_id: string;
  contract_id: string;
  vulnerability_type: string;
  severity: VulnSeverity;
  description: string;
  code_snippet: string | null;
  line_number: number | null;
  remediation_plan: string | null;
  status: VulnStatus;
  created_at: string;
  updated_at: string;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

const TENANT_ID     = '11111111-1111-1111-1111-111111111111';
const CONTRACTS_KEY = ['smart-contracts', TENANT_ID] as const;
const TOKENS_KEY    = ['token-issuances', TENANT_ID] as const;
const VULNS_KEY     = ['contract-vulns', TENANT_ID] as const;

// ─── API Hooks ────────────────────────────────────────────────────────────────

export function useContracts(status?: AuditStatus) {
  return useQuery({
    queryKey: [...CONTRACTS_KEY, status],
    queryFn: async () => {
      let query = supabase
        .from('smart_contracts')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('audit_status', status);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[Wave70] Failed to fetch smart_contracts:', error);
        return [] as SmartContract[];
      }
      
      // Zorunlu dizi güvenlik kalkanı
      return ((data as any[]) || []).map(contract => ({
        ...contract,
        risk_score: contract?.risk_score ?? 0,
      })) as SmartContract[];
    },
    staleTime: 30_000,
  });
}

export function useTokens(contractId?: string) {
  return useQuery({
    queryKey: [...TOKENS_KEY, contractId],
    enabled: !!contractId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('token_issuances')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .eq('contract_id', contractId!)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Wave70] Failed to fetch token_issuances:', error);
        return [] as TokenIssuance[];
      }
      
      return ((data as TokenIssuance[]) || []).map(t => ({
        ...t,
        total_supply: t?.total_supply ?? 0,
      }));
    },
    staleTime: 30_000,
  });
}

export function useVulnerabilities(contractId?: string) {
  return useQuery({
    queryKey: [...VULNS_KEY, contractId],
    enabled: !!contractId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_vulnerabilities')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .eq('contract_id', contractId!)
        .order('severity', { ascending: false }) // High/Critical önce
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Wave70] Failed to fetch contract_vulnerabilities:', error);
        return [] as ContractVulnerability[];
      }
      
      return ((data as ContractVulnerability[]) || []).map(v => ({
        ...v,
        description: v?.description ?? 'No description available',
      }));
    },
    staleTime: 15_000,
  });
}

export function useUpdateVulnStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: VulnStatus }) => {
      const { error } = await supabase
        .from('contract_vulnerabilities')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VULNS_KEY });
      qc.invalidateQueries({ queryKey: CONTRACTS_KEY });
    },
  });
}
