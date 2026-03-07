import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Clock, CheckCircle2, XCircle,
  ChevronRight, Siren, Radio, Activity, Zap
} from 'lucide-react';

import clsx from 'clsx';
import {
  useActiveCrisis, useRecoveryLogs, useUpdateCrisisStatus, useUpdateRecoveryStep,
  calcRtoProgress, type CrisisEvent, type RecoveryLog
} from '@/features/bcp/api';

// ---------------------------------------------------------------------------
// Countdown Timer component (live countdown in seconds)
// ---------------------------------------------------------------------------
function CountdownTimer({ targetIso, breached }: { targetIso: string; breached: boolean }) {
  const [secs, setSecs] = useState<number>(() =>
    Math.max(0, Math.floor((new Date(targetIso).getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    const id = setInterval(() => {
      setSecs(Math.max(0, Math.floor((new Date(targetIso).getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  const hh = Math.floor(secs / 3600).toString().padStart(2, '0');
  const mm = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
  const ss = (secs % 60).toString().padStart(2, '0');

  return (
    <span className={clsx('font-mono text-lg font-bold tabular-nums', breached ? 'text-red-600' : 'text-emerald-600')}>
      {breached ? '⚠ AŞILDI' : `${hh}:${mm}:${ss}`}
    </span>
  );
}

// ---------------------------------------------------------------------------
// RTO Progress Bar
// ---------------------------------------------------------------------------
function RtoBar({ event }: { event: CrisisEvent }) {
  const { progressPct, isBreached } = calcRtoProgress(event);
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <motion.div
        className={clsx('h-full rounded-full', isBreached ? 'bg-red-500' : progressPct > 75 ? 'bg-amber-500' : 'bg-emerald-500')}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(progressPct, 100)}%` }}
        transition={{ duration: 0.8 }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Severity badge
// ---------------------------------------------------------------------------
function SeverityBadge({ sev }: { sev: string }) {
  const cls = sev === 'CRITICAL' ? 'bg-red-100 text-red-700 border-red-200' :
              sev === 'HIGH' ? 'bg-orange-100 text-orange-700 border-orange-200' :
              sev === 'MEDIUM' ? 'bg-amber-100 text-amber-700 border-amber-200' :
              'bg-green-100 text-green-700 border-green-200';
  return (
    <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded border uppercase', cls)}>
      {sev}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-red-50 text-red-600 border-red-200',
    RECOVERING: 'bg-amber-50 text-amber-700 border-amber-200',
    CONTAINED: 'bg-blue-50 text-blue-700 border-blue-200',
    RESOLVED: 'bg-green-50 text-green-700 border-green-200',
    POST_MORTEM: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  const label: Record<string, string> = {
    ACTIVE: '● Aktif', RECOVERING: '↻ Kurtarma', CONTAINED: '■ Kontrol Altı',
    RESOLVED: '✓ Çözüldü', POST_MORTEM: '⚑ Post-Mortem',
  };
  return (
    <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded border', map[status] ?? '')}>
      {label[status] ?? status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Recovery Step row
// ---------------------------------------------------------------------------
function RecoveryStepRow({
  log, crisisId, onUpdate
}: {
  log: RecoveryLog;
  crisisId: string;
  onUpdate: (logId: string, crisisId: string, status: RecoveryLog['status']) => void;
}) {
  const icon = log.status === 'COMPLETED' ? (
    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
  ) : log.status === 'FAILED' ? (
    <XCircle size={16} className="text-red-500 shrink-0" />
  ) : log.status === 'IN_PROGRESS' ? (
    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
      <Activity size={16} className="text-amber-500 shrink-0" />
    </motion.div>
  ) : (
    <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
  );

  return (
    <div className={clsx(
      'flex items-center gap-3 p-2 rounded-lg border transition-colors',
      log.status === 'COMPLETED' ? 'border-emerald-100 bg-emerald-50/50' :
      log.status === 'FAILED' ? 'border-red-100 bg-red-50/50' :
      log.status === 'IN_PROGRESS' ? 'border-amber-100 bg-amber-50/50' :
      'border-slate-100 bg-white'
    )}>
      {icon}
      <div className="flex-1 min-w-0">
        <p className={clsx('text-xs font-semibold truncate', log.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-700')}>
          {log.step_number}. {log.action_title}
        </p>
        {log.assigned_to && (
          <p className="text-[10px] text-slate-400">{log.assigned_to}</p>
        )}
      </div>
      {log.elapsed_minutes != null && (
        <span className="text-[10px] text-slate-400">{log.elapsed_minutes}dk</span>
      )}
      {log.status === 'PENDING' && (
        <button
          onClick={() => onUpdate(log.id, crisisId, 'IN_PROGRESS')}
          className="text-[10px] px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shrink-0"
        >
          Başlat
        </button>
      )}
      {log.status === 'IN_PROGRESS' && (
        <button
          onClick={() => onUpdate(log.id, crisisId, 'COMPLETED')}
          className="text-[10px] px-2 py-0.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors shrink-0"
        >
          Tamamla
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Crisis Card (with expanded recovery logs)
// ---------------------------------------------------------------------------
function CrisisCard({ event }: { event: CrisisEvent }) {
  const [expanded, setExpanded] = useState(event.severity === 'CRITICAL');
  const { data: logs = [] } = useRecoveryLogs(event.id);
  const updateStatus = useUpdateCrisisStatus();
  const updateStep = useUpdateRecoveryStep();
  const { progressPct, isBreached } = calcRtoProgress(event);
  const completedSteps = (logs ?? []).filter(l => l.status === 'COMPLETED').length;

  const handleStepUpdate = useCallback((logId: string, crisisId: string, status: RecoveryLog['status']) => {
    updateStep.mutate({ logId, crisisId, status });
  }, [updateStep]);

  return (
    <motion.div
      layout
      className={clsx(
        'border rounded-xl overflow-hidden shadow-sm',
        event.severity === 'CRITICAL' ? 'border-red-200 bg-red-50/30' :
        event.severity === 'HIGH' ? 'border-orange-200 bg-orange-50/20' :
        'border-slate-200 bg-white'
      )}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={clsx(
            'p-2 rounded-lg shrink-0',
            event.severity === 'CRITICAL' ? 'bg-red-100' : 'bg-orange-100'
          )}>
            <Siren size={18} className={event.severity === 'CRITICAL' ? 'text-red-600' : 'text-orange-600'} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <SeverityBadge sev={event.severity} />
              <StatusBadge status={event.status} />
              <span className="text-[10px] text-slate-400 font-mono">{event.event_code}</span>
            </div>
            <h3 className="text-sm font-bold text-slate-800 leading-tight">{event.title}</h3>
            {event.description && (
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{event.description}</p>
            )}
          </div>

          <button onClick={() => setExpanded(v => !v)} className="p-1 text-slate-400 hover:text-slate-600 shrink-0">
            <ChevronRight size={16} className={clsx('transition-transform', expanded && 'rotate-90')} />
          </button>
        </div>

        {/* RTO / RPO meters */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <Clock size={11} /> RTO Kalan
            </span>
            <CountdownTimer targetIso={event.rto_target_at} breached={isBreached} />
          </div>
          <RtoBar event={event} />
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>%{progressPct.toFixed(0)} süre kullanıldı</span>
            {logs.length > 0 && (
              <span>{completedSteps}/{logs.length} adım tamamlandı</span>
            )}
          </div>
        </div>

        {/* Affected systems */}
        {(event.affected_systems ?? []).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {(event.affected_systems ?? []).map((sys) => (
              <span key={sys} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                {sys}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Recovery Logs (expandable) */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600">Kurtarma Adımları</span>
                {event.status !== 'RESOLVED' && (
                  <button
                    onClick={() => updateStatus.mutate({ crisisId: event.id, status: 'RESOLVED' })}
                    className="text-[10px] px-2 py-0.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                  >
                    Krizi Kapat
                  </button>
                )}
              </div>
              {(logs ?? []).length === 0 ? (
                <p className="text-xs text-slate-400">Kurtarma logu bulunamadı.</p>
              ) : (
                <div className="space-y-1.5">
                  {(logs ?? []).map(log => (
                    <RecoveryStepRow
                      key={log.id}
                      log={log}
                      crisisId={event.id}
                      onUpdate={handleStepUpdate}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// MAIN: CrisisCockpit Widget
// ---------------------------------------------------------------------------
export function CrisisCockpit() {
  const { data: events = [], isLoading } = useActiveCrisis();
  const criticalCount = (events ?? []).filter(e => e.severity === 'CRITICAL').length;
  const activeCount = (events ?? []).filter(e => e.status === 'ACTIVE').length;

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className={clsx('rounded-xl p-3 border', criticalCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200')}>
          <div className="flex items-center gap-2">
            <Siren size={16} className={criticalCount > 0 ? 'text-red-600' : 'text-slate-400'} />
            <span className="text-xs text-slate-500">Kritik Kriz</span>
          </div>
          <p className={clsx('text-2xl font-black mt-1', criticalCount > 0 ? 'text-red-600' : 'text-slate-400')}>
            {criticalCount}
          </p>
        </div>
        <div className="rounded-xl p-3 border bg-white border-slate-200">
          <div className="flex items-center gap-2">
            <Radio size={16} className={activeCount > 0 ? 'text-amber-500' : 'text-slate-400'} />
            <span className="text-xs text-slate-500">Aktif Olay</span>
          </div>
          <p className={clsx('text-2xl font-black mt-1', activeCount > 0 ? 'text-amber-600' : 'text-slate-400')}>
            {activeCount}
          </p>
        </div>
        <div className="rounded-xl p-3 border bg-white border-slate-200">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-blue-500" />
            <span className="text-xs text-slate-500">İzleniyor</span>
          </div>
          <p className="text-2xl font-black mt-1 text-blue-600">{(events ?? []).length}</p>
        </div>
      </div>

      {/* Crisis Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
        </div>
      ) : (events ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <Shield size={32} className="text-emerald-400 mb-2" />
          <p className="text-sm font-bold text-slate-600">Aktif Kriz Yok</p>
          <p className="text-xs text-slate-400">Tüm sistemler normal çalışmakta.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(events ?? []).map(event => (
            <CrisisCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
