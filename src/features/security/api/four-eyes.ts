import { supabase } from '@/shared/api/supabase';
import { ACTIVE_TENANT_ID } from '@/shared/lib/constants';

export type FourEyesStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface FourEyesApproval {
  id: string;
  tenant_id: string;
  resource_type: string;
  resource_id: string;
  action_name: string;
  maker_id: string;
  checker_id: string | null;
  status: FourEyesStatus;
  payload: unknown;
  created_at: string;
  decided_at: string | null;
}

export interface CreateFourEyesApprovalInput {
  resourceType: string;
  resourceId: string;
  actionName: string;
  payload?: unknown;
}

export async function createFourEyesApproval(
  input: CreateFourEyesApprovalInput,
): Promise<FourEyesApproval> {
  const { data, error } = await supabase
    .from('sys_four_eyes_approvals')
    .insert({
      tenant_id: ACTIVE_TENANT_ID,
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      action_name: input.actionName,
      maker_id: (await supabase.auth.getUser()).data.user?.id ?? ACTIVE_TENANT_ID,
      status: 'PENDING',
      payload: input.payload ?? {},
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as FourEyesApproval;
}

/** PENDING durumundaki tüm onay taleplerini getirir (Checker paneli için). */
export async function fetchPendingApprovals(): Promise<FourEyesApproval[]> {
  const { data, error } = await supabase
    .from('sys_four_eyes_approvals')
    .select('*')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as FourEyesApproval[];
}

export type ResolveApprovalStatus = 'APPROVED' | 'REJECTED';

export interface ResolveApprovalInput {
  id: string;
  status: ResolveApprovalStatus;
}

/** Onay talebini onayla veya reddet; checker_id ve decided_at güncellenir. */
export async function resolveApproval(input: ResolveApprovalInput): Promise<FourEyesApproval> {
  const { data: user } = await supabase.auth.getUser();
  const checkerId = user?.user?.id ?? null;

  const { data, error } = await supabase
    .from('sys_four_eyes_approvals')
    .update({
      status: input.status,
      checker_id: checkerId,
      decided_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as FourEyesApproval;
}

