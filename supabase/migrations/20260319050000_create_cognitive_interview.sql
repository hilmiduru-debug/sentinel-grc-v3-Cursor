-- =============================================================================
-- Wave 50: Cognitive Interview Assistant
-- Bilişsel Denetim Mülakat Asistanı — DDL Only (No Seed Data)
-- =============================================================================

-- Mülakat Oturumları: Denetçi–Muhatap etkileşimini kayıt altına alır
CREATE TABLE IF NOT EXISTS interview_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111'
    REFERENCES tenants(id) ON DELETE CASCADE,
  title text NOT NULL,                          -- Örn: "Hazine İşlemleri Mülakat #1"
  subject_name text NOT NULL,                   -- Görüşülen kişinin adı
  subject_title text DEFAULT '',                -- Unvanı
  subject_department text DEFAULT '',           -- Departmanı
  interviewer_name text NOT NULL,               -- Denetçi adı
  engagement_id uuid,                           -- İlgili denetim kaydına bağlantı (opsiyonel)
  purpose text DEFAULT '',                      -- Mülakat amacı / kapsamı
  location text DEFAULT '',                     -- Yer (Şube / Online)
  status text NOT NULL DEFAULT 'Planlandı'
    CHECK (status IN ('Planlandı', 'Devam Ediyor', 'Tamamlandı', 'İptal')),
  risk_topics text[] DEFAULT '{}',              -- İlgili risk konuları
  audio_url text,                               -- Ses kaydı URL (blob veya storage)
  overall_sentiment text DEFAULT 'Nötr'
    CHECK (overall_sentiment IN ('Pozitif', 'Şüpheli', 'Stresli', 'Nötr', 'Savunmacı')),
  ai_risk_score numeric(4,1) DEFAULT 0
    CHECK (ai_risk_score >= 0 AND ai_risk_score <= 10),
  duration_seconds integer DEFAULT 0,
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_tenant   ON interview_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_status   ON interview_sessions(status);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_subject  ON interview_sessions(subject_name);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_created  ON interview_sessions(created_at DESC);

ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon read interview_sessions"
  ON interview_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert interview_sessions"
  ON interview_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update interview_sessions"
  ON interview_sessions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Auth read interview_sessions"
  ON interview_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert interview_sessions"
  ON interview_sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update interview_sessions"
  ON interview_sessions FOR UPDATE TO authenticated USING (true);

-- Transkript & AI Analiz Satırları: Her konuşma satırı için duygu + risk analizi
CREATE TABLE IF NOT EXISTS transcript_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111'
    REFERENCES tenants(id) ON DELETE CASCADE,
  session_id uuid NOT NULL
    REFERENCES interview_sessions(id) ON DELETE CASCADE,
  line_order integer NOT NULL,                  -- Sıra numarası
  speaker text NOT NULL                         -- 'Denetçi' veya 'Muhatap'
    CHECK (speaker IN ('Denetçi', 'Muhatap')),
  transcript text NOT NULL DEFAULT '',          -- Konuşma metni
  sentiment text NOT NULL DEFAULT 'Nötr'
    CHECK (sentiment IN ('Pozitif', 'Şüpheli', 'Stresli', 'Nötr', 'Savunmacı', 'Kaçamak')),
  confidence numeric(4,2) DEFAULT 0.75
    CHECK (confidence >= 0 AND confidence <= 1),
  ai_flag text,                                 -- AI tespit ettiği durum (Örn: "Kaçamak Cevap")
  ai_note text,                                 -- AI'ın açıklaması
  keywords text[] DEFAULT '{}',               -- Tespit edilen anahtar kelimeler
  start_ms integer DEFAULT 0,                   -- Ses dosyasındaki başlangıç (ms)
  end_ms integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transcript_session ON transcript_analysis(session_id);
CREATE INDEX IF NOT EXISTS idx_transcript_ordered ON transcript_analysis(session_id, line_order);
CREATE INDEX IF NOT EXISTS idx_transcript_flag    ON transcript_analysis(ai_flag) WHERE ai_flag IS NOT NULL;

ALTER TABLE transcript_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon read transcript_analysis"
  ON transcript_analysis FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert transcript_analysis"
  ON transcript_analysis FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Auth read transcript_analysis"
  ON transcript_analysis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert transcript_analysis"
  ON transcript_analysis FOR INSERT TO authenticated WITH CHECK (true);
