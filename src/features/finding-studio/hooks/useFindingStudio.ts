import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { differenceInDays, parseISO, isValid } from 'date-fns';

// --- Imports ---
import { useMethodologyStore } from '@/features/admin/methodology/model/store';
import {
  fetchFinding,
  createFinding,
  updateFinding
} from '@/entities/finding/api/supabase-api';

// --- Types ---
export type FindingMode = 'zen' | 'edit' | 'negotiation';

export interface SLAStatus {
  daysRemaining: number | null;
  isOverdue: boolean;
  label: string;
  statusColor: 'green' | 'amber' | 'red';
}

// UI tarafında kullanılan genişletilmiş tip
export interface ComprehensiveFinding {
  id: string;
  title: string;
  status: string;
  impact: number;
  likelihood: number;
  target_date?: string;
  internal_notes?: string;
  secrets?: any;
  category?: string;
  department?: string;
  tags?: string[];
  severity?: string;
  audit_framework?: 'STANDARD' | 'BDDK';
  bddk_deficiency_type?: string | null;
  control_effectiveness?: number;
  risk_category?: string;
  process_id?: string;
  subprocess_id?: string;
  control_id?: string;
  evidence_files?: string[];
  rejection_reason?: string;
  related_items?: Array<{
    id: string;
    type: 'Finding' | 'Policy' | 'Action' | 'Risk';
    title: string;
  }>;
  activity_log?: Array<{
    id: string;
    timestamp: Date;
    action_type: string;
    actor: { name: string; role: string };
    details?: any;
  }>;
  [key: string]: any;
}

const CURRENT_ROLE: 'auditor' | 'auditee' | 'viewer' = 'auditor';

export const useFindingStudio = () => {
  // 1. Router Integration
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const mode = (searchParams.get('mode') as FindingMode) || 'edit';

  // 2. Global Stores
  const { findingSections, fetchConfig } = useMethodologyStore();

  // 3. Local State
  const [finding, setFinding] = useState<ComprehensiveFinding | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // --- Helper: Data Sanitization ---
  const sanitizeData = useCallback((data: ComprehensiveFinding): ComprehensiveFinding => {
    if (CURRENT_ROLE !== 'auditor') {
      const sanitized = { ...data };
      delete sanitized.internal_notes;
      delete sanitized.secrets;
      return sanitized;
    }
    return data;
  }, []);

  // --- Helper: Normalize raw DB finding to ComprehensiveFinding ---
  const normalize = useCallback((raw: any): ComprehensiveFinding => {
    return {
      id: raw.id ?? 'unknown',
      title: raw.title ?? '',
      status: raw.status ?? 'draft',
      impact: raw.impact ?? 1,
      likelihood: raw.likelihood ?? 1,
      control_effectiveness: raw.control_effectiveness ?? 1,
      audit_framework: raw.audit_framework ?? 'STANDARD',
      evidence_files: raw.evidence_files ?? [],
      related_items: raw.related_items ?? [],
      activity_log: raw.activity_log ?? [],
      ...raw,
    };
  }, []);

  // --- Effect: Initialize & Fetch Data ---
  useEffect(() => {
    let isMounted = true;

    const initStudio = async () => {
      setIsLoading(true);

      try {
        // 1. Metodolojiyi yükle
        if (findingSections.length === 0) {
          await fetchConfig();
        }

        if (!isMounted) return;

        if (!id || id === 'new') {
          // --- YENİ KAYIT ---
          const dynamicFields = findingSections.reduce((acc, section) => {
            acc[section.key] = '';
            return acc;
          }, {} as Record<string, any>);

          const newTemplate: ComprehensiveFinding = {
            id: 'new',
            title: '',
            status: 'draft',
            impact: 1,
            likelihood: 1,
            control_effectiveness: 1,
            audit_framework: 'STANDARD',
            evidence_files: [],
            related_items: [],
            activity_log: [],
            ...dynamicFields,
          };

          setFinding(newTemplate);

        } else {
          // --- MEVCUT KAYIT: SUPABASE'DEN ÇEK ---
          try {
            const foundInDB = await fetchFinding(id);

            if (foundInDB) {
              setFinding(sanitizeData(normalize(foundInDB)));
            } else {
              toast.error('Bulgu bulunamadı. Ana sayfaya yönlendiriliyorsunuz...');
              setTimeout(() => navigate('/execution/findings'), 2000);
              return;
            }
          } catch (dbError: any) {
            console.error('Database Fetch Error:', dbError);
            toast.error(`Veritabanı hatası: ${dbError.message || 'Bilinmeyen hata'}`);
          }
        }

      } catch (error) {
        console.error('Finding Studio Init Error:', error);
        toast.error('Veri yüklenirken bir hata oluştu.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initStudio();

    return () => { isMounted = false; };
  }, [id, navigate, sanitizeData, normalize, fetchConfig, findingSections.length]);


  // --- Logic: Risk Engine Calculation ---
  const riskCalculation = useMemo(() => {
    if (!finding) return { score: 0, level: 'Low', color: 'gray', isVetoed: false };

    const simpleScore = (finding.impact ?? 1) * (finding.likelihood ?? 1);
    const isVetoed = simpleScore > 20;

    return {
      score: simpleScore,
      level: simpleScore > 20 ? 'Critical' : simpleScore > 10 ? 'High' : 'Low',
      color: simpleScore > 20 ? 'red' : 'green',
      isVetoed
    };
  }, [finding?.impact, finding?.likelihood]);


  // --- Logic: SLA Calculator ---
  const slaStatus = useMemo((): SLAStatus => {
    if (!finding?.target_date || !isValid(parseISO(finding.target_date))) {
      return { daysRemaining: null, isOverdue: false, label: 'Termin Yok', statusColor: 'green' };
    }

    const today = new Date();
    const target = parseISO(finding.target_date);
    const diff = differenceInDays(target, today);
    const isOverdue = diff < 0;

    let color: SLAStatus['statusColor'] = 'green';
    if (isOverdue) color = 'red';
    else if (diff <= 3) color = 'amber';

    return {
      daysRemaining: diff,
      isOverdue,
      label: isOverdue ? `${Math.abs(diff)} Gün Gecikmeli` : `${diff} Gün Kaldı`,
      statusColor: color
    };
  }, [finding?.target_date]);


  // --- Actions ---

  const updateField = useCallback((field: string, value: any) => {
    setFinding((prev) => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
    setHasUnsavedChanges(true);
  }, []);

  const setMode = useCallback((newMode: FindingMode) => {
    setSearchParams({ mode: newMode });
  }, [setSearchParams]);

  const saveFinding = useCallback(async () => {
    if (!finding) return;
    setIsSaving(true);

    try {
      if (!id || id === 'new') {
        const DEMO_ENGAGEMENT_ID = '00000000-0000-0000-0000-000000000001';
        const createdFinding = await createFinding(finding as any, DEMO_ENGAGEMENT_ID);
        setHasUnsavedChanges(false);
        toast.success('Yeni bulgu başarıyla oluşturuldu!');
        navigate(`/execution/findings/${createdFinding.id}?mode=${mode}`, { replace: true });
        setFinding(normalize(createdFinding));
      } else {
        const updatedFinding = await updateFinding(id, finding as any);
        setHasUnsavedChanges(false);
        setFinding(normalize(updatedFinding));
        toast.success('Değişiklikler başarıyla kaydedildi.');
      }

    } catch (err: any) {
      console.error('Save Finding Error:', err);
      toast.error(err.message || 'Kaydetme başarısız oldu.');
    } finally {
      setIsSaving(false);
    }
  }, [finding, id, mode, navigate, normalize]);

  return {
    finding,
    mode,
    riskScore: riskCalculation.score,
    riskLevel: riskCalculation.level,
    isVetoed: riskCalculation.isVetoed,
    slaStatus,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    userRole: CURRENT_ROLE,
    updateField,
    setMode,
    saveFinding,
    isEditable: mode === 'edit' || !id || id === 'new',
  };
};