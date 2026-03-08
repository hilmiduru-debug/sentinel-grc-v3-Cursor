/**
 * Timesheet API — workpaper_time_logs tabanlı, mock yok.
 * Zaman girişleri workpaper_time_logs + workpapers + audit_engagements ile çekilir.
 */

import { supabase } from '@/shared/api/supabase';

export interface TimeEntryRow {
 id: string;
 workpaper_id: string;
 auditor_id: string;
 log_date: string;
 hours_logged: number;
 description: string | null;
 created_at: string;
 workpaper?: {
 title: string;
 audit_steps?: {
 audit_engagements?: { title: string };
 } | null;
 } | null;
}

export interface TimeEntry {
 id: string;
 workpaper_id: string;
 auditor_id: string;
 date: string;
 hours: number;
 description?: string;
 workpaper?: {
 title: string;
 engagement?: { title: string };
 };
}

/**
 * Haftalık zaman girişlerini workpaper_time_logs üzerinden getirir (mevcut kullanıcı).
 */
export async function fetchTimeEntriesForWeek(
 auditorId: string,
 weekStart: string,
 weekEnd: string
): Promise<TimeEntry[]> {
 const { data, error } = await supabase
 .from('workpaper_time_logs')
 .select(`
 id, workpaper_id, auditor_id, log_date, hours_logged, description, created_at,
 workpaper:workpapers(
 title,
 audit_steps(
 audit_engagements(title)
 )
 )
 `)
 .eq('auditor_id', auditorId)
 .gte('log_date', weekStart)
 .lte('log_date', weekEnd)
 .order('log_date', { ascending: true });

 if (error) throw error;

 const rows = (data ?? []) as TimeEntryRow[];
 return (rows || []).map((row) => {
 const rawDate = row.log_date;
 const dateStr =
 rawDate == null
 ? ''
 : typeof rawDate === 'string'
 ? rawDate.split('T')[0]
 : String(rawDate).split('T')[0];
 return {
 id: row.id,
 workpaper_id: row.workpaper_id,
 auditor_id: row.auditor_id,
 date: dateStr,
 hours: Number(row.hours_logged),
 description: row.description ?? undefined,
 workpaper: row.workpaper
 ? {
 title: row.workpaper.title ?? '',
 engagement:
 row.workpaper.audit_steps?.audit_engagements != null
 ? { title: row.workpaper.audit_steps.audit_engagements.title ?? '' }
 : undefined,
 }
 : undefined,
 };
 });
}
