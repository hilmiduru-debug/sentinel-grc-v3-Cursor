/**
 * ShadowRadar — Wave 72: Shadow IT & Shadow AI Hunter
 * %100 Light Mode | Apple Glassmorphism | Real Supabase
 */

import { useState } from 'react';
import {
  EyeOff, Globe2, Activity, ShieldAlert, Cpu, DatabaseZap,
  CheckCircle2, AlertTriangle, AlertOctagon, XCircle, RefreshCw,
  Search, Shield, Server
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import {
  useShadowAssets,
  useAILogs,
  useDataLeakageStats,
  useUpdateAssetStatus,
  type ShadowAsset,
  type UnauthorizedAILog,
  type RiskLevel,
  type AssetStatus,
} from '@/features/shadow-it/api/shadow-it';

// ─── Config ───────────────────────────────────────────────────────────────────

const RISK_CFG: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  critical: { label: 'Kritik Risk', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  high:     { label: 'Yüksek',      color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  medium:   { label: 'Orta',        color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  low:      { label: 'Düşük',       color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
};

const STATUS_CFG: Record<AssetStatus, { label: string; icon: typeof CheckCircle2; color: string }> = {
  discovered:   { label: 'Yeni Tespit', icon: EyeOff, color: 'text-amber-500' },
  under_review: { label: 'İnceleniyor', icon: Search, color: 'text-blue-500' },
  blocked:      { label: 'Bloklandı',   icon: XCircle, color: 'text-red-500' },
  approved:     { label: 'İzinli',      icon: CheckCircle2, color: 'text-emerald-500' },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function ShadowRadar() {
  const [activeTab, setActiveTab] = useState<'assets' | 'logs'>('assets');

  const { data: stats, isLoading: statsLoading } = useDataLeakageStats();
  const { data: assets = [], isLoading: assetsLoading, refetch: refetchAssets } = useShadowAssets();
  const { data: logs = [], isLoading: logsLoading } = useAILogs();
  
  const updateStatus = useUpdateAssetStatus();

  const handleUpdateStatus = async (id: string, status: AssetStatus) => {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast.success(`Uygulama durumu "${status}" olarak güncellendi.`);
    } catch {
      toast.error('Güncelleme başarısız.');
    }
  };

  // KPI calculations (Safe calculations over the loaded data slice if needed, 
  // though backend `total_traffic` aggregated correctly)
  const totalAssets = assets.length;
  const criticalAlarms = logs.filter(l => l.severity === 'critical' || l.severity === 'high').length;

  return (
    <div className="space-y-5">
      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Globe2}
          label="Keşfedilen Gölge IT"
          value={assetsLoading ? '…' : String(totalAssets)}
          sub="Kurum ağında izinsiz veya izlenen uygulama"
          color="slate"
        />
        <StatCard
          icon={DatabaseZap}
          label="Yapay Zeka Sızıntı Alarmı"
          value={logsLoading ? '…' : String(criticalAlarms)}
          sub="Kritik veri çıkışı tespiti (DLP)"
          color="orange"
        />
        <StatCard
          icon={Cpu}
          label="Toplam Sızan/Giden Trafik"
          value={statsLoading ? '…' : `${((stats?.totalTrafficMB ?? 0)/1024).toFixed(1)} GB`}
          sub="Gölge IT uygulamalarına toplam veri"
          color="blue"
        />
        <StatCard
          icon={ShieldAlert}
          label="Riskli Trafik Yoğunluğu"
          value={statsLoading ? '…' : `%${stats?.criticalRatio ?? 0}`}
          sub="(total_traffic || 1) Sıfır Bölünme Korumalı"
          color="red"
        />
      </div>

      {/* Main panel */}
      <div className="bg-white/90 backdrop-blur-xl border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-100 to-indigo-50/50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-200 rounded-xl flex items-center justify-center">
              <EyeOff size={18} className="text-slate-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Shadow IT & Shadow AI Hunter</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">İzinsiz Ağ Trafiği ve Üretken AI Sızıntı Monitörü — Wave 72</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-200/50 rounded-lg p-0.5">
              {(['assets', 'logs'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-bold rounded-md transition-all',
                    activeTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {tab === 'assets' ? 'İzinsiz Varlıklar (Apps)' : 'Ağ / AI Sızıntı Logları'}
                </button>
              ))}
            </div>
            <button onClick={() => refetchAssets()} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* 1. Shadow Assets Tab */}
        {activeTab === 'assets' && (
          <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto">
            {assetsLoading ? (
              <LoadingState label="Ağ trafiği üzerinden gölge uygulamalar taranıyor..." />
            ) : assets.length === 0 ? (
              <EmptyState icon={Globe2} label="Gölge IT Bulunamadı" sub="Ağınızda izinsiz bir uygulama trafiği tespit edilmedi." />
            ) : (
              assets.map(asset => (
                <AssetRow 
                  key={asset.id} 
                  asset={asset} 
                  onStatusChange={(s) => handleUpdateStatus(asset.id, s)} 
                  isUpdating={updateStatus.isPending && (updateStatus.variables as any)?.id === asset.id} 
                />
              ))
            )}
          </div>
        )}

        {/* 2. Unauthorized AI Logs Tab */}
        {activeTab === 'logs' && (
          <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto bg-slate-50/50">
             {logsLoading ? <LoadingState label="Proxy ve Firewall logları çözümleniyor..." /> :
              logs.length === 0 ? <EmptyState icon={Activity} label="Sızıntı Logu Yok" sub="Herhangi bir veri çıkışı veya politika ihlali bulunmuyor." /> :
              logs.map(log => <AILogRow key={log.id} log={log} />)
             }
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub Components ───────────────────────────────────────────────────────────

function AssetRow({ asset: a, onStatusChange, isUpdating }: { asset: ShadowAsset; onStatusChange: (s: AssetStatus) => void; isUpdating: boolean }) {
  const rCfg = RISK_CFG[a.risk_level] ?? RISK_CFG.medium;
  const sCfg = STATUS_CFG[a.status];
  const StatusIcon = sCfg.icon;

  return (
    <div className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border', rCfg.bg, rCfg.color)}>
           {a.category.includes('AI') ? <Cpu size={16} /> : <Server size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={clsx('text-[10px] font-bold border px-2 py-0.5 rounded-full', rCfg.bg, rCfg.color)}>
               {rCfg.label} · Skor: {a.risk_score}
            </span>
            <span className="text-[10px] font-black bg-slate-800 text-white px-2 py-0.5 rounded font-mono">
              {a.category}
            </span>
          </div>
          <p className="text-sm font-bold text-slate-800">{a.app_name}</p>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
             <span>{a.active_users_count} Aktif Çalışan</span>
             <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
             <span>{(a.total_traffic_mb / 1024).toFixed(2)} GB Veri Transferi</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className={clsx('flex items-center gap-1 text-[11px] font-bold', sCfg.color)}>
          <StatusIcon size={14} className={isUpdating ? 'animate-spin' : ''} /> {sCfg.label}
        </div>
        {a.status === 'discovered' && (
          <div className="flex gap-1 ml-2">
            <button onClick={() => onStatusChange('under_review')} disabled={isUpdating} className="px-2 py-1 text-[10px] font-bold bg-blue-50 text-blue-600 rounded hover:bg-blue-100">İncele</button>
            <button onClick={() => onStatusChange('blocked')} disabled={isUpdating} className="px-2 py-1 text-[10px] font-bold bg-red-50 text-red-600 rounded hover:bg-red-100">Blokla</button>
          </div>
        )}
        {a.status === 'under_review' && (
          <div className="flex gap-1 ml-2">
            <button onClick={() => onStatusChange('approved')} disabled={isUpdating} className="px-2 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100">İzin Ver</button>
            <button onClick={() => onStatusChange('blocked')} disabled={isUpdating} className="px-2 py-1 text-[10px] font-bold bg-red-50 text-red-600 rounded hover:bg-red-100">Blokla</button>
          </div>
        )}
      </div>
    </div>
  );
}

function AILogRow({ log: l }: { log: UnauthorizedAILog & { app_name?: string } }) {
  const isCritical = l.severity === 'critical' || l.severity === 'high';
  const mbSize = (l.payload_size_bytes / (1024 * 1024)).toFixed(2);

  return (
    <div className="px-5 py-4 hover:bg-white transition-colors">
      <div className="flex items-start justify-between mb-2">
         <div className="flex items-center gap-2">
            <div className={clsx(
              'p-1.5 rounded-lg border',
              isCritical ? 'bg-red-50 border-red-200 text-red-600' : 'bg-orange-50 border-orange-200 text-orange-600'
            )}>
               {l.alert_type === 'data_exfiltration_risk' ? <DatabaseZap size={14} /> : <AlertOctagon size={14} />}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {l.alert_type.replace(/_/g, ' ')}
              </span>
              <h4 className="text-sm font-bold text-slate-800">{l.ai_service_name} Hedefli Bağlantı</h4>
            </div>
         </div>
         <div className="text-right">
            <span className={clsx(
               'text-[10px] font-bold px-2 py-0.5 rounded border',
               l.action_taken === 'blocked_by_proxy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
               l.action_taken === 'alerted' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500'
            )}>
               {l.action_taken.replace(/_/g, ' ').toUpperCase()}
            </span>
         </div>
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
        <p className="text-xs text-slate-600 leading-relaxed mb-3">{l.description}</p>
        
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] text-slate-500 font-mono">
           <span>IP: <strong className="text-slate-700">{l.device_ip}</strong></span>
           {l.user_email && <span>User: <strong className="text-slate-700">{l.user_email}</strong></span>}
           <span>Sızan Boyut: <strong className={clsx(Number(mbSize) > 5 ? 'text-red-500' : 'text-orange-500')}>{mbSize} MB</strong></span>
           <span className="ml-auto text-slate-400">{new Date(l.occurred_at).toLocaleString('tr-TR')}</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  const map: Record<string, string> = {
    slate:  'bg-slate-50 border-slate-200 text-slate-600',
    red:    'bg-red-50 border-red-200 text-red-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
    blue:   'bg-blue-50 border-blue-200 text-blue-600',
  };
  return (
    <div className={clsx('rounded-xl border p-4', map[color])}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} />
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</span>
      </div>
      <p className="text-2xl font-black tabular-nums">{value}</p>
      <p className="text-[10px] opacity-70 mt-1 truncate">{sub}</p>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-sm text-slate-400 h-full">
      <RefreshCw size={24} className="animate-spin text-slate-400" />
      <span>{label}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, label, sub }: { icon: any; label: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center h-full">
      <Icon size={48} className="text-slate-200 mb-4" />
      <p className="text-base font-bold text-slate-700">{label}</p>
      <p className="text-xs text-slate-400 mt-2 max-w-xs">{sub}</p>
    </div>
  );
}
