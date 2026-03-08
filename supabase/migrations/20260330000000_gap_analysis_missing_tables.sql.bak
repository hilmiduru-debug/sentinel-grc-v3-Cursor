-- =============================================================================
-- SENTINEL V3.0 - GAP ANALYSIS MIGRATION
-- =============================================================================
-- Frontend API kodları (supabase.from) ile veritabanı şeması arasındaki 
-- kopuklukları gidermek üzere "Missing Tables (Eksik Tablolar)" ve 
-- "Alias Views (İsim Uyuşmazlığı Görünümleri)" oluşturulur.
-- =============================================================================

-- =============================================================================
-- 1. ALIAS VIEWS (Frontend'in farklı isimle aradığı ancak var olan tablolar)
-- =============================================================================

-- Frontend `findings` ve `findings_v2` aratıyor ancak DB'de `audit_findings` var.
CREATE OR REPLACE VIEW public.findings AS 
SELECT * FROM public.audit_findings;

CREATE OR REPLACE VIEW public.findings_v2 AS 
SELECT * FROM public.audit_findings;

-- Frontend `cae_escalations` aratıyor ancak DB'de `escalations` var.
CREATE OR REPLACE VIEW public.cae_escalations AS 
SELECT * FROM public.escalations;

-- Frontend `sla_escalations` aratıyor ancak DB'de `sla_escalation_logs` var.
CREATE OR REPLACE VIEW public.sla_escalations AS 
SELECT * FROM public.sla_escalation_logs;


-- =============================================================================
-- 2. MISSING TABLES (Frontend'in Okuyup/Yazdığı Ancak Şemada Olmayan Tablolar)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.stakeholders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
    name text NOT NULL,
    role text,
    department text,
    email text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.program_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
    title text NOT NULL,
    description text,
    category text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.template_steps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id uuid REFERENCES public.program_templates(id) ON DELETE CASCADE,
    step_order integer NOT NULL,
    title text NOT NULL,
    instruction text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.report_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id uuid, -- no strict FK to avoid cascade issues if parent missing
    user_id uuid,
    content text NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.resource_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    engagement_id uuid,
    auditor_id uuid,
    allocated_hours numeric,
    start_date date,
    end_date date,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.report_magic_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id uuid,
    token text NOT NULL UNIQUE,
    expires_at timestamptz,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.report_read_receipts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id uuid,
    magic_link_id uuid,
    reader_ip text,
    read_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.engagement_team_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    engagement_id uuid,
    user_id uuid,
    role text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.governance_board_meetings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
    title text NOT NULL,
    meeting_date date,
    status text,
    created_at timestamptz DEFAULT now()
);

-- Alias for board_meetings
CREATE OR REPLACE VIEW public.board_meetings AS 
SELECT * FROM public.governance_board_meetings;

CREATE TABLE IF NOT EXISTS public.timesheets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    engagement_id uuid,
    activity_type text,
    hours numeric,
    logged_date date,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qaip_kpis (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
    metric_name text NOT NULL,
    metric_value numeric,
    target_value numeric,
    measured_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workpaper_evidence (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workpaper_id uuid,
    file_name text,
    file_url text,
    uploaded_by uuid,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.risk_velocity_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    universe_node_id uuid,
    previous_score numeric,
    new_score numeric,
    change_reason text,
    snapshot_date timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.esg_ledger (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
    metric_id uuid,
    recorded_value numeric,
    period_date date,
    created_at timestamptz DEFAULT now()
);

-- =============================================================================
-- 3. MISSING RPC (Stored Procedures)
-- =============================================================================
-- Frontend RPC calling `evaluate_sla_breaches_v2`
CREATE OR REPLACE FUNCTION public.evaluate_sla_breaches_v2()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Dummy implementation to prevent API crashes
    -- In a real scenario, this would check SLAs and generate alerts
END;
$$;

-- Global Read Access for all new tables
ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS global_demo_read_stakeholders ON public.stakeholders;
CREATE POLICY global_demo_read_stakeholders ON public.stakeholders FOR SELECT USING (true);

ALTER TABLE public.program_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS global_demo_read_program_templates ON public.program_templates;
CREATE POLICY global_demo_read_program_templates ON public.program_templates FOR SELECT USING (true);

ALTER TABLE public.template_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS global_demo_read_template_steps ON public.template_steps;
CREATE POLICY global_demo_read_template_steps ON public.template_steps FOR SELECT USING (true);

ALTER TABLE public.report_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS global_demo_read_report_comments ON public.report_comments;
CREATE POLICY global_demo_read_report_comments ON public.report_comments FOR SELECT USING (true);

ALTER TABLE public.resource_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS global_demo_read_resource_assignments ON public.resource_assignments;
CREATE POLICY global_demo_read_resource_assignments ON public.resource_assignments FOR SELECT USING (true);

ALTER TABLE public.report_magic_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS global_demo_read_report_magic_links ON public.report_magic_links;
CREATE POLICY global_demo_read_report_magic_links ON public.report_magic_links FOR SELECT USING (true);

ALTER TABLE public.report_read_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS global_demo_read_report_read_receipts ON public.report_read_receipts;
CREATE POLICY global_demo_read_report_read_receipts ON public.report_read_receipts FOR SELECT USING (true);

ALTER TABLE public.engagement_team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS global_demo_read_engagement_team_members ON public.engagement_team_members;
CREATE POLICY global_demo_read_engagement_team_members ON public.engagement_team_members FOR SELECT USING (true);

ALTER TABLE public.governance_board_meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS global_demo_read_governance_board_meetings ON public.governance_board_meetings;
CREATE POLICY global_demo_read_governance_board_meetings ON public.governance_board_meetings FOR SELECT USING (true);

ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS global_demo_read_timesheets ON public.timesheets;
CREATE POLICY global_demo_read_timesheets ON public.timesheets FOR SELECT USING (true);

ALTER TABLE public.qaip_kpis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS global_demo_read_qaip_kpis ON public.qaip_kpis;
CREATE POLICY global_demo_read_qaip_kpis ON public.qaip_kpis FOR SELECT USING (true);

ALTER TABLE public.workpaper_evidence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS global_demo_read_workpaper_evidence ON public.workpaper_evidence;
CREATE POLICY global_demo_read_workpaper_evidence ON public.workpaper_evidence FOR SELECT USING (true);

ALTER TABLE public.risk_velocity_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS global_demo_read_risk_velocity_snapshots ON public.risk_velocity_snapshots;
CREATE POLICY global_demo_read_risk_velocity_snapshots ON public.risk_velocity_snapshots FOR SELECT USING (true);

ALTER TABLE public.esg_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS global_demo_read_esg_ledger ON public.esg_ledger;
CREATE POLICY global_demo_read_esg_ledger ON public.esg_ledger FOR SELECT USING (true);
