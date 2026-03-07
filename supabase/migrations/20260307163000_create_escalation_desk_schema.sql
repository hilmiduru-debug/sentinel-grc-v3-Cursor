/*
  # Wave 14: CAE Escalation Desk Schema
  
  **OVERVIEW:**
  This migration creates the necessary data structures to support the "Yönetim Kurulu Eskalasyon Masası" (CAE Escalation Desk).
  It includes tables for tracking escalations and their corresponding logs/history.
  
  ## 1. New Tables
  
  ### `escalations` - Tracks findings escalated to higher authorities
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key to tenants)
  - `finding_id` (uuid, foreign key to audit_findings, unique to prevent duplicate escalations)
  - `status` (text) - PENDING, REVIEWING, ESCALATED_TO_BOARD, RESOLVED, CLOSED
  - `escalation_level` (text) - CAE, AUDIT_COMMITTEE, BOARD_OF_DIRECTORS
  - `reason` (text) - Detailed reason for escalation
  - `created_by` (uuid, foreign key to user_profiles)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### `escalation_logs` - History and audit trail of actions taken on an escalation
  - `id` (uuid, primary key)
  - `escalation_id` (uuid, foreign key to escalations)
  - `actor_id` (uuid, foreign key to user_profiles)
  - `action_type` (text) - CREATED, STATUS_CHANGED, LEVEL_CHANGED, NOTE_ADDED, RESOLUTION_PROPOSED, REJECTED
  - `notes` (text)
  - `created_at` (timestamptz)
  
  ## 2. Security (RLS)
  - Both tables have RLS ENABLED.
  - "Dev mode public" policies are applied for unhindered development.
  
  ## 3. Strict Rules Applied
  - NO SEED DATA (INSERT INTO) in this file. DDL only.
*/

-- =====================================================
-- TABLE: escalations
-- =====================================================
CREATE TABLE IF NOT EXISTS public.escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  finding_id UUID NOT NULL REFERENCES public.audit_findings(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWING', 'ESCALATED_TO_BOARD', 'RESOLVED', 'CLOSED')),
  escalation_level TEXT NOT NULL CHECK (escalation_level IN ('CAE', 'AUDIT_COMMITTEE', 'BOARD_OF_DIRECTORS')),
  reason TEXT NOT NULL,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_finding_escalation UNIQUE (finding_id)
);

CREATE INDEX IF NOT EXISTS idx_escalations_tenant ON public.escalations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_escalations_finding ON public.escalations(finding_id);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON public.escalations(status);

ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;

-- Dev mode policies for escalations
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'escalations' AND policyname = 'Dev mode public read escalations') THEN
    CREATE POLICY "Dev mode public read escalations" ON public.escalations FOR SELECT TO public USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'escalations' AND policyname = 'Dev mode public insert escalations') THEN
    CREATE POLICY "Dev mode public insert escalations" ON public.escalations FOR INSERT TO public WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'escalations' AND policyname = 'Dev mode public update escalations') THEN
    CREATE POLICY "Dev mode public update escalations" ON public.escalations FOR UPDATE TO public USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'escalations' AND policyname = 'Dev mode public delete escalations') THEN
    CREATE POLICY "Dev mode public delete escalations" ON public.escalations FOR DELETE TO public USING (true);
  END IF;
END $$;


-- =====================================================
-- TABLE: escalation_logs
-- =====================================================
CREATE TABLE IF NOT EXISTS public.escalation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  escalation_id UUID NOT NULL REFERENCES public.escalations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('CREATED', 'STATUS_CHANGED', 'LEVEL_CHANGED', 'NOTE_ADDED', 'RESOLUTION_PROPOSED', 'REJECTED')),
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escalation_logs_escalation ON public.escalation_logs(escalation_id);
CREATE INDEX IF NOT EXISTS idx_escalation_logs_created_at ON public.escalation_logs(created_at DESC);

ALTER TABLE public.escalation_logs ENABLE ROW LEVEL SECURITY;

-- Dev mode policies for escalation_logs
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'escalation_logs' AND policyname = 'Dev mode public read escalation_logs') THEN
    CREATE POLICY "Dev mode public read escalation_logs" ON public.escalation_logs FOR SELECT TO public USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'escalation_logs' AND policyname = 'Dev mode public insert escalation_logs') THEN
    CREATE POLICY "Dev mode public insert escalation_logs" ON public.escalation_logs FOR INSERT TO public WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'escalation_logs' AND policyname = 'Dev mode public update escalation_logs') THEN
    CREATE POLICY "Dev mode public update escalation_logs" ON public.escalation_logs FOR UPDATE TO public USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'escalation_logs' AND policyname = 'Dev mode public delete escalation_logs') THEN
    CREATE POLICY "Dev mode public delete escalation_logs" ON public.escalation_logs FOR DELETE TO public USING (true);
  END IF;
END $$;
