/**
 * HorizonScanner — Regülasyon Sinyali Özet Widget'ı
 * widgets/HorizonScanner/index.tsx (Wave 47)
 *
 * C-Level · Apple Glassmorphism · %100 Light Mode
 * Gerçek Supabase verisi · Sıfır sahte data
 */

import {
 useRadarSignals, useRadarSummary,
 type RegulatoryBulletin,
} from '@/features/regulatory-radar/api/radar';
import { motion } from 'framer-motion';
import {
 ChevronRight,
 Clock,
 Globe,
 Loader2,
 ScanLine
} from 'lucide-react';

// ─── Sabitler ─────────────────────────────────────────────────────────────────

const IMPACT_CONFIG: Record<RegulatoryBulletin['impact_level'], {
 bg: string; text: string; border: string; dot: string; label: string;
}> = {
 CRITICAL: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', label: 'Kritik' },
 HIGH: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', label: 'Yüksek' },
 MEDIUM: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', label: 'Orta' },
 LOW: { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400', label: 'Düşük' },
};

const STATUS_LABELS: Record<RegulatoryBulletin['status'], string> = {
 CONSULTATION: 'Görüş Bekleniyor',
 PUBLISHED: 'Yayımlandı',
 ENACTED: 'Yürürlükte',
 DRAFT: 'Taslak',
 REPEALED: 'Yürürlükten Kaldırıldı',
};

const AUTHORITY_COLORS: Record<string, string> = {
 BDDK: 'bg-blue-100 text-blue-700',
 MASAK: 'bg-red-100 text-red-700',
 FATF: 'bg-purple-100 text-purple-700',
 SPK: 'bg-teal-100 text-teal-700',
 KVKK: 'bg-amber-100 text-amber-700',
 EBA: 'bg-indigo-100 text-indigo-700',
};

function authorityClass(authority: string): string {
 return AUTHORITY_COLORS[authority] ?? 'bg-slate-100 text-slate-600';
}

function daysUntil(dateStr: string | null): string {
 if (!dateStr) return '—';
 const diff = new Date(dateStr).getTime() - Date.now();
 const days = Math.ceil(diff / 86400000);
 if (days < 0) return 'Geçti';
 if (days === 0) return 'Bugün';
 return `${days} gün`;
}

// ─── Sinyal Satırı ────────────────────────────────────────────────────────────

function SignalRow({
 bulletin,
 index,
 onClick,
}: {
 bulletin: RegulatoryBulletin;
 index: number;
 onClick: (b: RegulatoryBulletin) => void;
}) {
 const cfg = IMPACT_CONFIG[bulletin.impact_level] ?? IMPACT_CONFIG.LOW;
 const isUrgent = bulletin.impact_level === 'CRITICAL' || bulletin.impact_level === 'HIGH';

 return (
 <motion.div
 initial={{ opacity: 0, x: -8 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: index * 0.06 }}
 onClick={() => onClick(bulletin)}
 className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border cursor-pointer
 transition-all hover:shadow-sm hover:scale-[1.01]
 ${cfg.bg} ${cfg.border}`}
 >
 {/* Sinyal Noktası */}
 <div className="relative mt-1.5 shrink-0">
 <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
 {isUrgent && (
 <div className={`absolute inset-0 rounded-full ${cfg.dot} opacity-40 animate-ping`} />
 )}
 </div>

 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-0.5 flex-wrap">
 <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${authorityClass(bulletin.source_authority)}`}>
 {bulletin.source_authority}
 </span>
 <span className={`text-[9px] font-bold ${cfg.text} uppercase`}>
 {cfg.label}
 </span>
 <span className="text-[9px] text-slate-400">
 {STATUS_LABELS[bulletin.status] ?? bulletin.status}
 </span>
 </div>

 <p className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2">
 {bulletin.title}
 </p>

 <div className="flex items-center gap-3 mt-1.5">
 {bulletin.effective_date && (
 <div className="flex items-center gap-1 text-[9px] text-slate-500">
 <Clock size={9} />
 <span>Yürürlük: {daysUntil(bulletin.effective_date)}</span>
 </div>
 )}
 {(bulletin.tags || []).slice(0, 2).map((tag) => (
 <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-white/80 rounded border border-slate-200 font-mono text-slate-500">
 {tag}
 </span>
 ))}
 </div>
 </div>

 <ChevronRight size={13} className="text-slate-300 mt-1 shrink-0" />
 </motion.div>
 );
}

// ─── Ana Widget ───────────────────────────────────────────────────────────────

interface HorizonScannerProps {
 onSelectBulletin?: (b: RegulatoryBulletin) => void;
 limit?: number;
}

export function HorizonScanner({ onSelectBulletin, limit = 6 }: HorizonScannerProps) {
 const { data: signals = [], isLoading } = useRadarSignals();
 const { data: kpi } = useRadarSummary();

 const displayed = (signals || []).slice(0, limit);

 return (
 <div className="bg-white/70 backdrop-blur-lg border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
 {/* Başlık */}
 <div className="px-5 py-4 bg-gradient-to-r from-slate-800 to-slate-700 flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
 <ScanLine size={15} className="text-blue-300" />
 </div>
 <div>
 <h3 className="text-sm font-bold text-white">Horizon Scanner</h3>
 <p className="text-[10px] text-slate-400 mt-0.5">Ufuk Tarama — Mevzuat Sinyalleri</p>
 </div>
 </div>

 {/* KPI minyatür */}
 <div className="flex items-center gap-3">
 <div className="text-center">
 <p className="text-lg font-black text-red-400">{kpi?.criticalCount ?? '—'}</p>
 <p className="text-[8px] text-slate-500 font-bold">KRİTİK</p>
 </div>
 <div className="text-center">
 <p className="text-lg font-black text-white">{kpi?.totalSignals ?? '—'}</p>
 <p className="text-[8px] text-slate-500 font-bold">TOPLAM</p>
 </div>
 </div>
 </div>

 {/* İçerik */}
 <div className="p-4 space-y-2">
 {isLoading ? (
 <div className="flex items-center justify-center py-10">
 <Loader2 size={20} className="animate-spin text-slate-400" />
 <span className="ml-2 text-sm text-slate-500">Radar taranıyor…</span>
 </div>
 ) : displayed.length === 0 ? (
 <div className="text-center py-10">
 <Globe size={32} className="text-slate-300 mx-auto mb-2" />
 <p className="text-sm text-slate-500">Mevzuat sinyali bulunamadı.</p>
 </div>
 ) : (
 (displayed || []).map((bulletin, i) => (
 <SignalRow
 key={bulletin.id}
 bulletin={bulletin}
 index={i}
 onClick={onSelectBulletin ?? (() => null)}
 />
 ))
 )}
 </div>
 </div>
 );
}
