/**
 * GeoPoliticalMap — Wave 62: Geopolitical Risk & Sanctions Radar
 * %100 Light Mode | Apple Glassmorphism | Real Supabase
 */

import { useState } from 'react';
import {
  Globe2, ShieldAlert, AlertTriangle, Crosshair, Map as MapIcon,
  RefreshCw, CheckCircle2, History, ChevronRight, Activity, Building2, User
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import {
  useSanctions,
  useAmlAlerts,
  useGeoEvents,
  useGeoStats,
  useUpdateAmlStatus,
  type SanctionList,
  type AmlAlert,
  type GeoEvent,
  type AmlStatus,
} from '@/features/sanctions-radar/api/geopolitics';

// ─── Config ───────────────────────────────────────────────────────────────────

const SEVERITY_CFG: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: 'Kritik',  color: 'text-red-700',      bg: 'bg-red-50 border-red-200' },
  high:     { label: 'Yüksek',  color: 'text-orange-700',   bg: 'bg-orange-50 border-orange-200' },
  medium:   { label: 'Orta',    color: 'text-amber-700',    bg: 'bg-amber-50 border-amber-200' },
  low:      { label: 'Düşük',   color: 'text-slate-600',    bg: 'bg-slate-50 border-slate-200' },
};

const AML_STATUS_CFG: Record<AmlStatus, { label: string; color: string }> = {
  open:             { label: 'Açık',        color: 'text-red-600 bg-red-50' },
  investigating:    { label: 'İncelemede',   color: 'text-amber-600 bg-amber-50' },
  reported_to_fiu:  { label: 'MASAK/FIU',   color: 'text-purple-600 bg-purple-50' },
  false_positive:   { label: 'Asılsız',     color: 'text-slate-500 bg-slate-100' },
  resolved:         { label: 'Çözüldü',     color: 'text-emerald-600 bg-emerald-50' },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function GeoPoliticalMap() {
  const [activeTab, setActiveTab] = useState<'map' | 'sanctions' | 'aml'>('map');

  const { data: stats, isLoading: statsLoading }  = useGeoStats();
  const { data: events = [], isLoading: eventsLoading, refetch: refetchEvents } = useGeoEvents();
  const { data: sanctions = [], isLoading: sanctionsLoading } = useSanctions({ activeOnly: true });
  const { data: alerts = [], isLoading: alertsLoading } = useAmlAlerts();
  
  const updateAmlStatus = useUpdateAmlStatus();

  const handleUpdateAml = async (id: string, status: AmlStatus) => {
    try {
      await updateAmlStatus.mutateAsync({ id, status });
      toast.success('AML işlemi güncellendi.');
    } catch {
      toast.error('Güncelleme başarısız.');
    }
  };

  return (
    <div className="space-y-5">
      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Globe2}
          label="Sıcak Çatışma / Risk"
          value={statsLoading ? '…' : String(stats?.criticalGeoEvents ?? 0)}
          sub="Kritik seviye global olay"
          color="red"
        />
        <StatCard
          icon={ShieldAlert}
          label="Aktif Ambargo"
          value={statsLoading ? '…' : String(stats?.activeSanctions ?? 0)}
          sub="OFAC, UN, EU Listeleri"
          color="slate"
        />
        <StatCard
          icon={AlertTriangle}
          label="Açık AML Alarmı"
          value={statsLoading ? '…' : String(stats?.openAmlAlerts ?? 0)}
          sub="İncelenmesi gereken şüpheli işlem"
          color="orange"
        />
        <StatCard
          icon={Activity}
          label="Riskli İşlem Oranı"
          value={statsLoading ? '…' : `%${stats?.riskyTransactionRate ?? 0}`}
          sub="Tüm izlenen transferlere göre"
          color="blue"
        />
      </div>

      {/* Main panel */}
      <div className="bg-white/90 backdrop-blur-xl border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-red-50 to-orange-50/50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
              <Compass size={18} className="text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Jeopolitik Risk ve Yaptırım Radarı</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Global Ambargo & AML İzleme Motoru — Wave 62</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-white/50 border border-slate-200 rounded-lg p-0.5">
              {(['map', 'sanctions', 'aml'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-bold rounded-md transition-all',
                    activeTab === tab ? 'bg-white text-slate-800 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {tab === 'map' ? 'Global Isı Haritası' : tab === 'sanctions' ? 'Yaptırım Listesi' : 'AML Alarmları'}
                </button>
              ))}
            </div>
            <button onClick={() => refetchEvents()} className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 transition-all">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* 1. Map Tab (Synthetic Visual Representation) */}
        {activeTab === 'map' && (
          <div className="relative h-[450px] bg-sky-50 overflow-hidden flex flex-col">
            {eventsLoading ? (
              <LoadingState label="Global veriler taranıyor..." />
            ) : events.length === 0 ? (
              <EmptyState icon={Globe2} label="Risk Olayı Yok" sub="Dünya genelinde izlenen kritik olay bulunmuyor." />
            ) : (
              <div className="flex flex-1">
                {/* Left: Event List */}
                <div className="w-80 bg-white/80 backdrop-blur border-r border-slate-200 flex flex-col">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                      <History size={12} /> Son Olaylar
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {events.map((ev: GeoEvent) => {
                      const sev = SEVERITY_CFG[ev.impact_level];
                      return (
                        <div key={ev.id} className="px-4 py-3 hover:bg-white transition-colors cursor-pointer group">
                          <div className="flex flex-wrap items-center gap-1 mb-1">
                            <span className={clsx('text-[9px] font-bold px-1.5 py-0.5 rounded uppercase', sev.bg, sev.color)}>
                              {ev.impact_level}
                            </span>
                            <span className="text-[9px] font-mono bg-slate-100 text-slate-500 px-1 py-0.5 rounded">{ev.country_code ?? ev.region}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-800 leading-snug">{ev.title}</p>
                          <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{ev.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Right: Abstract Map Area */}
                <div className="flex-1 relative flex items-center justify-center bg-[url('https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg')] bg-no-repeat bg-center opacity-40 mix-blend-multiply pointer-events-none" style={{ backgroundSize: '90%' }}>
                  <div className="absolute inset-0 flex items-center justify-center flex-col gap-2 text-slate-400">
                     <MapIcon size={48} className="opacity-20" />
                     <p className="text-xs font-bold uppercase tracking-widest">Jeopolitik Simülasyon Devrede</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Sanctions Tab */}
        {activeTab === 'sanctions' && (
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
             {sanctionsLoading ? <LoadingState label="Ambargo listeleri yükleniyor..." /> :
              sanctions.length === 0 ? <EmptyState icon={ShieldAlert} label="Eşleşme Yok" sub="Mevcut müşteri veri tabanında yaptırım listesi eşleşmesi bulunamadı." /> :
              sanctions.map(s => <SanctionRow key={s.id} sanction={s} />)
             }
          </div>
        )}

        {/* 3. AML Alerts Tab */}
        {activeTab === 'aml' && (
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto bg-slate-50/30">
            {alertsLoading ? <LoadingState label="Şüpheli işlem alarmları taranıyor..." /> :
              alerts.length === 0 ? <EmptyState icon={Activity} label="Alarm Yok" sub="İncelenmesi gereken AML alarmı bulunmuyor." /> :
              alerts.map(a => <AmlAlertRow key={a.id} alert={a} onStatusUpdate={(status) => handleUpdateAml(a.id, status)} isUpdating={updateAmlStatus.isPending && (updateAmlStatus.variables as any)?.id === a.id} />)
            }
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub Components ───────────────────────────────────────────────────────────

function Compass(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10"/>
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
    </svg>
  );
}

function SanctionRow({ sanction: s }: { sanction: SanctionList }) {
  const rCfg = SEVERITY_CFG[s.risk_level] ?? SEVERITY_CFG.medium;
  const isPerson = s.entity_type === 'PERSON';

  return (
    <div className="px-5 py-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border', rCfg.bg, rCfg.color)}>
        {isPerson ? <User size={18} /> : <Building2 size={18} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={clsx('text-[10px] font-bold border px-2 py-0.5 rounded-full', rCfg.bg, rCfg.color)}>
             {rCfg.label}
          </span>
          <span className="text-[10px] font-black bg-slate-800 text-white px-2 py-0.5 rounded font-mono">
            {s.list_source} ({s.sanction_type})
          </span>
          {s.country_code && (
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">
              {s.country_code}
            </span>
          )}
        </div>
        <p className="text-sm font-bold text-slate-800">{s.entity_name}</p>
        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed border-l-2 border-slate-200 pl-2">
          {s.notes}
        </p>
      </div>
      <ChevronRight size={16} className="text-slate-300 mt-2 shrink-0" />
    </div>
  );
}

function AmlAlertRow({ alert: a, onStatusUpdate, isUpdating }: { alert: AmlAlert; onStatusUpdate: (st: AmlStatus) => void; isUpdating: boolean }) {
  const sCfg = SEVERITY_CFG[a.severity] ?? SEVERITY_CFG.medium;
  const stCfg = AML_STATUS_CFG[a.status];

  return (
    <div className="px-5 py-4 hover:bg-white transition-colors">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
        <div>
          <span className={clsx('text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded flex items-center w-max mb-1.5', stCfg.color)}>
            <Crosshair size={10} className="mr-1" /> {stCfg.label}
          </span>
          <h4 className="text-sm font-bold text-slate-800">{a.title}</h4>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">{a.alert_code} · {new Date(a.created_at).toLocaleString('tr-TR')}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">İşlem Tutarı</p>
          <p className="text-lg font-black font-mono text-slate-800">
            {a.transaction_amount?.toLocaleString()} {a.transaction_currency}
          </p>
          <p className="text-[10px] text-red-500 font-bold">Risk Skoru: {a.risk_score}</p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 mb-3">
        <p className="text-xs text-slate-600 leading-relaxed mb-2">{a.description}</p>
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 font-medium">
           <span className="flex items-center gap-1"><User size={12} /> {a.customer_name} ({a.customer_id})</span>
           <span className="flex items-center gap-1"><Globe2 size={12} /> {a.origin_country} ➔ {a.destination_country}</span>
           <span className="flex items-center gap-1"><RefreshCw size={12} /> Toplam {a.total_transactions} adet işlem</span>
        </div>
      </div>

      {a.status === 'open' && (
        <div className="flex items-center gap-2">
           <button onClick={() => onStatusUpdate('investigating')} disabled={isUpdating} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition-colors">
              İncelemeye Al
           </button>
           <button onClick={() => onStatusUpdate('false_positive')} disabled={isUpdating} className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-[10px] font-bold rounded-lg transition-colors">
              Asılsız (False-Positive)
           </button>
        </div>
      )}
      {a.status === 'investigating' && (
        <div className="flex items-center gap-2">
           <button onClick={() => onStatusUpdate('reported_to_fiu')} disabled={isUpdating} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold rounded-lg transition-colors">
              MASAK / FIU'ya Bildir
           </button>
           <button onClick={() => onStatusUpdate('resolved')} disabled={isUpdating} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-colors">
              Kapat (Çözüldü)
           </button>
        </div>
      )}
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
      <RefreshCw size={24} className="animate-spin text-red-400" />
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
