import { supabase } from '@/shared/api/supabase';

/**
 * Logs the report export event into the immutable audit_logs table.
 * Designed as a fire-and-forget function (returns void, errors are swallowed to not disrupt UI).
 */
export const logReportExport = async (reportId: string, exportFormat: 'PDF' | 'DOCX') => {
  try {
    const userStr = localStorage.getItem('sentinel_user');
    let uName = 'Bilinmeyen Kullanıcı';
    let actorId = null;
    
    if (userStr) {
      const u = JSON.parse(userStr);
      uName = u.name || u.email || 'Bilinmeyen Kullanıcı';
      actorId = u.id || null;
    }

    // Prepare immutable log payload
    const logPayload = {
      event: 'REPORT_EXPORT',
      format: exportFormat,
      message: `${uName}, ${reportId} numaralı raporu ${exportFormat} formatında dışa aktardı.`,
      browser_data: navigator.userAgent
    };

    const { error } = await supabase.from('audit_logs').insert({
      entity_type: 'reports',
      entity_id: reportId,
      action: 'UPDATE', // CREATE, UPDATE, DELETE are allowed. Using UPDATE for reading/exporting footprint.
      actor_id: actorId,
      payload: logPayload
    });

    if (error) {
      console.warn('Audit Trail Warning: Failed to log report export', error);
    }
  } catch (err) {
    console.warn('Audit Trail Error: Exception while logging report export', err);
  }
};
