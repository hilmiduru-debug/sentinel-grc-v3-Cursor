/*
  # Wave 90: Shariah-AI Algorithmic Filter & Shield

  1. `ai_investment_decisions` - Robo-Advisor veya Alım-Satım botlarının ürettiği ham fon alım/satım talepleri.
  2. `shariah_blocked_transactions` - İslami Finans kalkanı (Algorithmic Shield) tarafından AAOIFI standartlarına uymadığı gerekçesiyle otomatik reddedilen işlemler.
*/

-- ============================================================
-- 1. ai_investment_decisions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_investment_decisions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid        NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111'::uuid,
  portfolio_id        text        NOT NULL, -- Örn: "PORT-A12"
  ai_model_name       text        NOT NULL, -- Örn: "Sentinel_Quant_V3"
  ticker              text        NOT NULL,
  company_name        text        NOT NULL,
  sector              text        NOT NULL,
  action_type         text        NOT NULL CHECK (action_type IN ('BUY', 'SELL', 'HOLD')),
  confidence_score    numeric     NOT NULL DEFAULT 0,
  proposed_amount     numeric     NOT NULL DEFAULT 0,
  decision_date       timestamptz NOT NULL DEFAULT now(),
  status              text        NOT NULL DEFAULT 'PENDING_REVIEW'
                      CHECK (status IN ('PENDING_REVIEW', 'APPROVED', 'BLOCKED_BY_SHIELD', 'EXECUTED')),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_decisions_tenant ON public.ai_investment_decisions(tenant_id);
ALTER TABLE public.ai_investment_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_decisions: auth read"  ON public.ai_investment_decisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "ai_decisions: auth write" ON public.ai_investment_decisions FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ai_decisions: anon read"  ON public.ai_investment_decisions FOR SELECT TO anon          USING (true);
CREATE POLICY "ai_decisions: anon write" ON public.ai_investment_decisions FOR ALL    TO anon          USING (true) WITH CHECK (true);

-- ============================================================
-- 2. shariah_blocked_transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shariah_blocked_transactions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid        NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111'::uuid,
  decision_id         uuid        NOT NULL REFERENCES public.ai_investment_decisions(id) ON DELETE CASCADE,
  violating_ticker    text        NOT NULL,
  company_name        text        NOT NULL,
  violation_category  text        NOT NULL, -- Örn: Haram_Income, Debt_Ratio, Gambling, Alcohol
  aaoifi_rule_ref     text        NOT NULL, -- Örn: "AAOIFI Shari'ah Standard No. 21"
  haram_income_ratio  numeric,              -- Şirketin haram kazanç oranı (Örn: %8)
  debt_to_asset_ratio numeric,              -- Borç / Varlık oranı (Ömür boyu faizli borç limiti geçilmişse)
  block_reason        text        NOT NULL,
  blocked_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shariah_blocked_tenant ON public.shariah_blocked_transactions(tenant_id);
ALTER TABLE public.shariah_blocked_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shariah_blocked: auth read"  ON public.shariah_blocked_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "shariah_blocked: auth write" ON public.shariah_blocked_transactions FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shariah_blocked: anon read"  ON public.shariah_blocked_transactions FOR SELECT TO anon          USING (true);
CREATE POLICY "shariah_blocked: anon write" ON public.shariah_blocked_transactions FOR ALL    TO anon          USING (true) WITH CHECK (true);
