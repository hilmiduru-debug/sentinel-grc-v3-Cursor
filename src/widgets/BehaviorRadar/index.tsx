/**
 * BehaviorRadar — Wave 46: Fraud Fingerprint & Behavior Analytics
 * %100 Light Mode | Apple Glassmorphism | Real Supabase
 * İki panel: FraudAlertList + BehaviorStats
 */

import { useState } from 'react';
import {
  ShieldAlert, Fingerprint, Activity, AlertTriangle,
  CheckCircle2, Clock, RefreshCw, Loader2, Eye, ChevronRight,
  Users, TrendingUp, Zap
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import {
  useFraudAlerts,
  useFraudStats,
  useBehaviorLogs,
  useUpdateAlertStatus,
  type FraudAlert,
  type AlertStatus,
} from '@/features/fraud-analytics/api';

// ─── Severity & Status config ─────────────────────────────────────────────────

const SEV_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  critical: { label: 'Kritik',  color: 'bg-red-100 text-red-700 border-red-200',    dot: 'bg-red-500' },
  high:     { label: 'Yüksek', color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  medium:   { label: 'Orta',   color: 'bg-amber-100 text-amber-700 border-amber-200',    dot: 'bg-amber-500' },
  low:      { label: 'Düşük',  color: 'bg-slate-100 text-slate-600 border-slate-200',    dot: 'bg-slate-400' },
};

const STATUS_CONFIG: Record<AlertStatus, { label: string; icon: typeof CheckCircle2; color: string }> = {
  open:           { label: 'Açık',         icon: AlertTriangle, color: 'text-red-600' },
  investigating:  { label: 'Soruşturuluyor', icon: Clock,        color: 'text-amber-600' },
  resolved:       { label: 'Çözüldü',      icon: CheckCircle2,  color: 'text-emerald-600' },
  false_positive: { label: 'Yanlış Alarm', icon: CheckCircle2,  color: 'text-slate-400' },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function BehaviorRadar() {
  const [activeTab, setActiveTab] = useState<'alerts' | 'activity'>('alerts');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: alerts = [], isLoading: alertsLoading, refetch: refetchAlerts } = useFraudAlerts();
  const { data: stats, isLoading: statsLoading } = useFraudStats(72);
  const { data: logs = [], isLoading: logsLoading } = useBehaviorLogs({ hoursBack: 48 });
  const updateStatus = useUpdateAlertStatus();

  const handleSetStatus = async (id: string, status: AlertStatus) => {
    try {
      await updateStatus.mutateAsync({ id, status, resolvedBy: 'İç Denetim Ekibi' });
      toast.success(`Uyarı durumu "${STATUS_CONFIG[status].label}" olarak güncellendi.`);
    } catch {
      toast.error('Durum güncellenemedi.');
    }
  };

  return (
    <div className="space-y-5">
      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={ShieldAlert}
          label="Açık Uyarılar"
          value={statsLoading ? '…' : String(stats?.openAlerts ?? 0)}
          sub={`${stats?.criticalAlerts ?? 0} kritik`}
          color="red"
        />
        <StatCard
          icon={Activity}
          label="Şüpheli Oran"
          value={statsLoading ? '…' : `${stats?.suspiciousRate ?? 0}%`}
          sub={`${stats?.suspiciousEvents ?? 0} şüpheli olay`}
          color="amber"
        />
        <StatCard
          icon={TrendingUp}
          label="Ort. Risk Skoru"
          value={statsLoading ? '…' : `${stats?.avgRiskScore ?? 0}`}
          sub="Son 72 saat"
          color="violet"
        />
        <StatCard
          icon={Users}
          label="En Riskli Kullanıcı"
          value={statsLoading ? '…' : (stats?.topRiskyUser?.split(' ')[0] ?? '—')}
          sub={stats?.topRiskyUser ?? 'Tespit yok'}
          color="slate"
        />
      </div>

      {/* Tab panel */}
      <div className="bg-white/80 backdrop-blur-lg border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-red-50 to-orange-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
              <Fingerprint size={18} className="text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Davranış Radarı</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Suiistimal Parmak İzi Motoru — Wave 46</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              {(['alerts', 'activity'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-bold rounded-md transition-all',
                    activeTab === tab
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {tab === 'alerts' ? 'Uyarılar' : 'Aktivite'}
                </button>
              ))}
            </div>
            <button
              onClick={() => { refetchAlerts(); }}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Alerts tab */}
        {activeTab === 'alerts' && (
          <div className="divide-y divide-slate-100">
            {alertsLoading ? (
              <LoadingState label="Fraud uyarıları yükleniyor..." />
            ) : alerts.length === 0 ? (
              <EmptyState icon={ShieldAlert} label="Açık fraud uyarısı yok" sub="Sistem temiz görünüyor" />
            ) : (
              alerts.map(alert => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  expanded={expandedId === alert.id}
                  onExpand={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
                  onStatusChange={handleSetStatus}
                  isUpdating={updateStatus.isPending && (updateStatus.variables as { id: string } | undefined)?.id === alert.id}
                />
              ))
            )}
          </div>
        )}

        {/* Activity log tab */}
        {activeTab === 'activity' && (
          <div className="divide-y divide-slate-100 max-h-[450px] overflow-y-auto">
            {logsLoading ? (
              <LoadingState label="Aktivite logları yükleniyor..." />
            ) : logs.length === 0 ? (
              <EmptyState icon={Activity} label="Son 48 saat log yok" sub="Sistem aktivitesi tespit edilmedi" />
            ) : (
              logs.map(log => (
                <div
                  key={log.id}
                  className={clsx(
                    'px-5 py-3 flex items-start gap-3 hover:bg-slate-50/70 transition-colors',
                    log.event_category === 'critical' && 'bg-red-50/30',
                    log.event_category === 'suspicious' && 'bg-amber-50/20',
                  )}
                >
                  <div className={clsx(
                    'w-2 h-2 rounded-full mt-1.5 shrink-0',
                    log.event_category === 'critical' ? 'bg-red-500' :
                    log.event_category === 'suspicious' ? 'bg-amber-500' : 'bg-emerald-400'
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-700">{log.user_name ?? log.user_id}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">{log.event_type}</span>
                      {log.risk_score >= 70 && (
                        <span className="text-[10px] font-bold text-red-600">⚡ Risk: {log.risk_score}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {log.ip_address ?? 'IP bilinmiyor'} · {new Date(log.occurred_at).toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Alert Row ────────────────────────────────────────────────────────────────

function AlertRow({
  alert: a,
  expanded,
  onExpand,
  onStatusChange,
  isUpdating,
}: {
  alert: FraudAlert;
  expanded: boolean;
  onExpand: () => void;
  onStatusChange: (id: string, status: AlertStatus) => void;
  isUpdating: boolean;
}) {
  const sevCfg    = SEV_CONFIG[a.severity]    ?? SEV_CONFIG.medium;
  const statusCfg = STATUS_CONFIG[a.status]   ?? STATUS_CONFIG.open;
  const StatusIcon = statusCfg.icon;

  return (
    <div className={clsx('transition-colors', expanded && 'bg-slate-50/60')}>
      <div
        className="px-5 py-4 flex items-start gap-4 cursor-pointer hover:bg-slate-50/50 group"
        onClick={onExpand}
      >
        {/* Severity dot */}
        <div className={clsx('w-2.5 h-2.5 rounded-full mt-1.5 shrink-0', sevCfg.dot)} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={clsx('text-[10px] font-black px-2 py-0.5 rounded-full border', sevCfg.color)}>
              {sevCfg.label}
            </span>
            <span className={clsx('flex items-center gap-1 text-[10px] font-semibold', statusCfg.color)}>
              <StatusIcon size={10} />
              {statusCfg.label}
            </span>
            <span className="text-[10px] text-slate-400 font-mono ml-auto shrink-0">
              Risk: <strong>{a.risk_score}</strong>
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-800 leading-snug">{a.title}</p>
          {a.affected_user_name && (
            <p className="text-[11px] text-slate-500 mt-0.5">👤 {a.affected_user_name}</p>
          )}
        </div>

        <ChevronRight
          size={14}
          className={clsx('text-slate-400 shrink-0 transition-transform mt-1', expanded && 'rotate-90')}
        />
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-4 space-y-3">
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3 border border-slate-100">
            {a.description}
          </p>

          {a.evidence && (
            <div className="text-[10px] font-mono text-slate-500 bg-slate-100 rounded-lg p-2 overflow-auto max-h-24">
              {JSON.stringify(a.evidence, null, 2)}
            </div>
          )}

          <div className="flex items-center gap-2">
            {a.status === 'open' && (
              <>
                <button
                  onClick={() => onStatusChange(a.id, 'investigating')}
                  disabled={isUpdating}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isUpdating ? <Loader2 size={10} className="animate-spin" /> : <Eye size={10} />}
                  Soruştur
                </button>
                <button
                  onClick={() => onStatusChange(a.id, 'false_positive')}
                  disabled={isUpdating}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Zap size={10} />
                  Yanlış Alarm
                </button>
              </>
            )}
            {a.status === 'investigating' && (
              <button
                onClick={() => onStatusChange(a.id, 'resolved')}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-50"
              >
                {isUpdating ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                Çözüldü Olarak Kapat
              </button>
            )}
            <span className="text-[10px] text-slate-400 ml-auto">
              {new Date(a.created_at).toLocaleString('tr-TR')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  color: 'red' | 'amber' | 'violet' | 'slate';
}) {
  const colorMap = {
    red:    { bg: 'bg-red-50    border-red-100',    icon: 'text-red-500',    val: 'text-red-700' },
    amber:  { bg: 'bg-amber-50  border-amber-100',  icon: 'text-amber-500',  val: 'text-amber-700' },
    violet: { bg: 'bg-violet-50 border-violet-100', icon: 'text-violet-500', val: 'text-violet-700' },
    slate:  { bg: 'bg-slate-50  border-slate-100',  icon: 'text-slate-500',  val: 'text-slate-700' },
  };
  const c = colorMap[color];
  return (
    <div className={clsx('rounded-xl border p-4 backdrop-blur-sm', c.bg)}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={c.icon} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      </div>
      <p className={clsx('text-xl font-black tabular-nums', c.val)}>{value}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-16 gap-2 text-sm text-slate-400">
      <Loader2 size={16} className="animate-spin text-red-400" />
      {label}
    </div>
  );
}

function EmptyState({ icon: Icon, label, sub }: { icon: React.ElementType; label: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon size={36} className="text-slate-200 mb-3" />
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}
