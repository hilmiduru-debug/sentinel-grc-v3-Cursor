/*
  # Fix CCM Alerts RLS — Authenticated INSERT

  ## Problem
  Authenticated users could SELECT and UPDATE ccm_alerts but had no INSERT policy,
  causing 403 when "Canlı Sinyal Tetikle" (insert alert) is used.

  ## Solution
  Add RLS policy so authenticated users can INSERT (and keep UPDATE) on ccm_alerts.
  Dev modunda basit allow policy; tenant kontrolü opsiyonel.
*/

-- Authenticated users may insert ccm_alerts (e.g. Canlı Sinyal from UI)
CREATE POLICY "Authenticated users can insert ccm_alerts"
  ON ccm_alerts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
