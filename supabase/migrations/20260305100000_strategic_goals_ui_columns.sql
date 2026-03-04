/*
  Stratejik Hedefler sayfası (StrategyDashboard) UI için gerekli sütunlar.
  goals.ts: progress, risk_appetite, linked_audit_objective_ids (strategic_bank_goals)
            type, status (strategic_audit_objectives)
  DDL only; seed data in seed.sql.
*/

-- strategic_bank_goals: UI alanları
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'strategic_bank_goals' AND column_name = 'progress') THEN
    ALTER TABLE public.strategic_bank_goals ADD COLUMN progress integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'strategic_bank_goals' AND column_name = 'risk_appetite') THEN
    ALTER TABLE public.strategic_bank_goals ADD COLUMN risk_appetite text NOT NULL DEFAULT 'Medium' CHECK (risk_appetite IN ('Low', 'Medium', 'High'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'strategic_bank_goals' AND column_name = 'linked_audit_objective_ids') THEN
    ALTER TABLE public.strategic_bank_goals ADD COLUMN linked_audit_objective_ids uuid[] DEFAULT '{}';
  END IF;
END $$;

-- strategic_audit_objectives: UI alanları (type, status)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'strategic_audit_objectives' AND column_name = 'type') THEN
    ALTER TABLE public.strategic_audit_objectives ADD COLUMN type text DEFAULT 'Assurance' CHECK (type IN ('Assurance', 'Advisory'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'strategic_audit_objectives' AND column_name = 'status') THEN
    ALTER TABLE public.strategic_audit_objectives ADD COLUMN status text NOT NULL DEFAULT 'On Track' CHECK (status IN ('On Track', 'At Risk', 'Off Track', 'Completed'));
  END IF;
END $$;

-- Mevcut strategic_audit_objectives satırlarında category -> type eşlemesi (sütun eklendiyse)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'strategic_audit_objectives' AND column_name = 'type') THEN
    UPDATE public.strategic_audit_objectives
    SET type = CASE WHEN category = 'ADVISORY' THEN 'Advisory' ELSE 'Assurance' END;
  END IF;
END $$;

COMMENT ON COLUMN public.strategic_bank_goals.progress IS 'Hedef ilerleme yüzdesi (0-100).';
COMMENT ON COLUMN public.strategic_bank_goals.risk_appetite IS 'Risk iştahı: Low, Medium, High.';
COMMENT ON COLUMN public.strategic_bank_goals.linked_audit_objective_ids IS 'Bu banka hedefiyle hizalanan denetim hedefi id listesi.';
COMMENT ON COLUMN public.strategic_audit_objectives.type IS 'Denetim türü: Assurance veya Advisory.';
COMMENT ON COLUMN public.strategic_audit_objectives.status IS 'Durum: On Track, At Risk, Off Track, Completed.';
