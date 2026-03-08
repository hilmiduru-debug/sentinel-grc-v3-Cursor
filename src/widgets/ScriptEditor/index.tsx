/**
 * ScriptEditor — Wave 51: CAS IDE & Script Scheduler
 * Sürekli Denetim Senaryo Editörü — Real Supabase Data
 * %100 Light Mode | Apple Glassmorphism | FSD Widget Layer
 */

import {
 useAuditScripts,
 useRunScript,
 useScriptLogs,
 useScriptStats,
 useUpdateScript,
 type AuditScript,
 type ScriptCategory,
} from '@/features/cas-ide/api';
import clsx from 'clsx';
import {
 AlertTriangle,
 BarChart3,
 Calendar,
 CheckCircle2,
 ChevronRight,
 Clock,
 Code2,
 Loader2,
 Play,
 RefreshCw,
 Terminal,
 XCircle,
 Zap
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<ScriptCategory, { label: string; color: string }> = {
 DORMANT_ACCOUNTS: { label: 'Atıl Hesap', color: 'bg-slate-100 text-slate-700 border-slate-200' },
 SEGREGATION_OF_DUTIES: { label: 'Görevler Ayrılığı', color: 'bg-violet-100 text-violet-700 border-violet-200' },
 FRAUD_DETECTION: { label: 'AML / Dolandırıcılık', color: 'bg-red-100 text-red-700 border-red-200' },
 COMPLIANCE: { label: 'Uyum', color: 'bg-blue-100 text-blue-700 border-blue-200' },
 DATA_QUALITY: { label: 'Veri Kalitesi', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
 ACCESS_CONTROL: { label: 'Erişim Kontrolü', color: 'bg-amber-100 text-amber-700 border-amber-200' },
};

const STATUS_CFG = {
 success: { icon: CheckCircle2, color: 'text-emerald-600', label: 'Başarılı' },
 error: { icon: XCircle, color: 'text-red-600', label: 'Hata' },
 running: { icon: Loader2, color: 'text-blue-500', label: 'Çalışıyor' },
 timeout: { icon: AlertTriangle, color: 'text-amber-600', label: 'Zaman Aşımı' },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function ScriptEditor() {
 const [selectedId, setSelectedId] = useState<string | null>(null);
 const [activeTab, setActiveTab] = useState<'scripts' | 'logs'>('scripts');

 const { data: scripts = [], isLoading, refetch } = useAuditScripts();
 const { data: stats } = useScriptStats();
 const { data: logs = [], isLoading: logsLoading } = useScriptLogs(selectedId ?? undefined);
 const runScript = useRunScript();
 const updateScript = useUpdateScript();

 const selectedScript = scripts.find(s => s.id === selectedId);

 const handleRun = async (id: string, title: string) => {
 try {
 await runScript.mutateAsync(id);
 toast.success(`"${title}" çalıştırıldı.`);
 } catch {
 toast.error('Script çalıştırılamadı.');
 }
 };

 const handleToggleActive = async (script: AuditScript) => {
 await updateScript.mutateAsync({ id: script.id, is_active: !script.is_active });
 toast.success(script.is_active ? 'Script devre dışı bırakıldı.' : 'Script etkinleştirildi.');
 };

 return (
 <div className="space-y-5">
 {/* KPI Stats Row */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
 <KpiCard icon={Code2} label="Toplam Script" value={String(stats?.totalScripts ?? 0)} color="violet" />
 <KpiCard icon={Calendar} label="Zamanlanmış" value={String(stats?.activeScheduled ?? 0)} color="blue" />
 <KpiCard icon={XCircle} label="Hata Oranı" value={`${stats?.errorRate ?? 0}%`} color="red" />
 <KpiCard icon={BarChart3} label="Ort. Süre" value={`${((stats?.avgDurationMs ?? 0)/1000).toFixed(1)}s`} color="slate" />
 </div>

 {/* Main panel */}
 <div className="bg-white/80 backdrop-blur-lg border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
 {/* Header */}
 <div className="px-5 py-4 bg-gradient-to-r from-violet-50 to-slate-50 border-b border-slate-100 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
 <Terminal size={18} className="text-violet-600" />
 </div>
 <div>
 <h3 className="text-sm font-bold text-slate-800">CAS Senaryo Editörü</h3>
 <p className="text-[11px] text-slate-500 mt-0.5">Sürekli Denetim Script Kütüphanesi — Wave 51</p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <div className="flex bg-slate-100 rounded-lg p-0.5">
 {(['scripts', 'logs'] as const).map(tab => (
 <button
 key={tab}
 onClick={() => setActiveTab(tab)}
 className={clsx(
 'px-3 py-1.5 text-xs font-bold rounded-md transition-all',
 activeTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
 )}
 >
 {tab === 'scripts' ? 'Scriptler' : 'Çalıştırma Geçmişi'}
 </button>
 ))}
 </div>
 <button onClick={() => refetch()} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
 <RefreshCw size={14} />
 </button>
 </div>
 </div>

 {/* Scripts tab */}
 {activeTab === 'scripts' && (
 <div className="divide-y divide-slate-100">
 {isLoading ? (
 <LoadingRow label="Denetim scriptleri yükleniyor..." />
 ) : scripts.length === 0 ? (
 <EmptyRow icon={Code2} label="Script bulunamadı" sub="Yeni senaryo oluşturun" />
 ) : (
 (scripts || []).map(script => (
 <ScriptRow
 key={script.id}
 script={script}
 selected={selectedId === script.id}
 onSelect={() => {
 setSelectedId(script.id);
 setActiveTab('logs');
 }}
 onRun={() => handleRun(script.id, script.title)}
 onToggle={() => handleToggleActive(script)}
 isRunning={runScript.isPending && (runScript.variables as string | undefined) === script.id}
 />
 ))
 )}
 </div>
 )}

 {/* Execution logs tab */}
 {activeTab === 'logs' && (
 <div>
 {selectedScript && (
 <div className="px-5 py-3 bg-violet-50/50 border-b border-violet-100 flex items-center gap-2">
 <Code2 size={12} className="text-violet-500" />
 <span className="text-xs font-bold text-violet-700">{selectedScript.title}</span>
 <button
 onClick={() => handleRun(selectedScript.id, selectedScript.title)}
 disabled={runScript.isPending}
 className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold rounded-lg transition-colors disabled:opacity-50"
 >
 {runScript.isPending ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
 Manuel Çalıştır
 </button>
 </div>
 )}

 {!selectedId ? (
 <EmptyRow icon={Terminal} label="Script seçin" sub="Soldaki Script sekmesinden bir senaryo seçin" />
 ) : logsLoading ? (
 <LoadingRow label="Çalıştırma geçmişi yükleniyor..." />
 ) : logs.length === 0 ? (
 <EmptyRow icon={Clock} label="Henüz çalıştırma yok" sub="İlk çalıştırmayı yapın" />
 ) : (
 <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
 {(logs || []).map(log => {
 const cfg = STATUS_CFG[log.status] ?? STATUS_CFG.error;
 const Icon = cfg.icon;
 return (
 <div key={log.id} className="px-5 py-3 flex items-start gap-3 hover:bg-slate-50/60 transition-colors">
 <Icon size={14} className={clsx(cfg.color, 'mt-0.5 shrink-0', log.status === 'running' && 'animate-spin')} />
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <span className={clsx('text-[10px] font-black', cfg.color)}>{cfg.label}</span>
 <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
 {log.triggered_by}
 </span>
 {log.rows_returned != null && (
 <span className="text-[10px] text-slate-500">{log.rows_returned} kayıt</span>
 )}
 {log.duration_ms != null && (
 <span className="text-[10px] text-slate-400">{(log.duration_ms / 1000).toFixed(2)}s</span>
 )}
 </div>
 {log.output_preview && (
 <p className="text-[10px] text-slate-500 font-mono mt-1 line-clamp-1">{log.output_preview}</p>
 )}
 {log.error_message && (
 <p className="text-[10px] text-red-500 mt-1">{log.error_message}</p>
 )}
 <p className="text-[10px] text-slate-400 mt-0.5">
 {new Date(log.started_at).toLocaleString('tr-TR')}
 </p>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 );
}

// ─── Script Row ───────────────────────────────────────────────────────────────

function ScriptRow({
 script: s,
 selected,
 onSelect,
 onRun,
 onToggle,
 isRunning,
}: {
 script: AuditScript;
 selected: boolean;
 onSelect: () => void;
 onRun: () => void;
 onToggle: () => void;
 isRunning: boolean;
}) {
 const catCfg = CATEGORY_LABELS[s.category] ?? CATEGORY_LABELS.ACCESS_CONTROL;
 const statusCfg = s.last_run_status ? STATUS_CFG[s.last_run_status] : null;
 const StatusIcon = statusCfg?.icon;

 return (
 <div
 className={clsx(
 'px-5 py-4 flex items-start gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors group',
 selected && 'bg-violet-50/30',
 !s.is_active && 'opacity-50'
 )}
 onClick={onSelect}
 >
 {/* Language badge */}
 <span className="shrink-0 mt-0.5 text-[9px] font-black bg-slate-800 text-white px-1.5 py-0.5 rounded font-mono">
 {s.script_type}
 </span>

 {/* Content */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap mb-1">
 <span className={clsx('text-[10px] font-bold border px-2 py-0.5 rounded-full', catCfg.color)}>
 {catCfg.label}
 </span>
 {s.is_scheduled && s.schedule_cron && (
 <span className="flex items-center gap-1 text-[10px] text-slate-500">
 <Clock size={9} />{s.schedule_cron}
 </span>
 )}
 {statusCfg && StatusIcon && (
 <span className={clsx('flex items-center gap-1 text-[10px] font-semibold ml-auto', statusCfg.color)}>
 <StatusIcon size={10} />{statusCfg.label}
 </span>
 )}
 </div>
 <p className="text-sm font-semibold text-slate-800 leading-snug">{s.title}</p>
 <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{s.description}</p>
 <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
 <span>{s.total_executions} çalıştırma</span>
 {s.error_count > 0 && <span className="text-red-400">{s.error_count} hata</span>}
 {s.last_run_results != null && <span>{s.last_run_results} kayıt</span>}
 </div>
 </div>

 {/* Actions */}
 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
 <button
 onClick={(e) => { e.stopPropagation(); onRun(); }}
 disabled={isRunning}
 className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50"
 >
 {isRunning ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
 Çalıştır
 </button>
 <button
 onClick={(e) => { e.stopPropagation(); onToggle(); }}
 className={clsx(
 'p-1.5 rounded-lg text-[10px] font-bold transition-colors',
 s.is_active ? 'hover:bg-red-50 text-red-400 hover:text-red-600' : 'hover:bg-emerald-50 text-emerald-400 hover:text-emerald-600'
 )}
 title={s.is_active ? 'Devre Dışı Bırak' : 'Etkinleştir'}
 >
 <Zap size={12} />
 </button>
 <ChevronRight size={14} className="text-slate-300" />
 </div>
 </div>
 );
}

// ─── Utility components ───────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: 'violet' | 'blue' | 'red' | 'slate' }) {
 const map = {
 violet: 'bg-violet-50 border-violet-100 text-violet-600',
 blue: 'bg-blue-50 border-blue-100 text-blue-600',
 red: 'bg-red-50 border-red-100 text-red-600',
 slate: 'bg-slate-50 border-slate-100 text-slate-500',
 };
 return (
 <div className={clsx('rounded-xl border p-4', map[color])}>
 <div className="flex items-center gap-2 mb-2">
 <Icon size={14} />
 <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
 </div>
 <p className="text-xl font-black tabular-nums">{value}</p>
 </div>
 );
}

function LoadingRow({ label }: { label: string }) {
 return (
 <div className="flex items-center justify-center py-16 gap-2 text-sm text-slate-400">
 <Loader2 size={16} className="animate-spin text-violet-400" />{label}
 </div>
 );
}

function EmptyRow({ icon: Icon, label, sub }: { icon: React.ElementType; label: string; sub: string }) {
 return (
 <div className="flex flex-col items-center justify-center py-16 text-center">
 <Icon size={36} className="text-slate-200 mb-3" />
 <p className="text-sm font-semibold text-slate-600">{label}</p>
 <p className="text-xs text-slate-400 mt-1">{sub}</p>
 </div>
 );
}
