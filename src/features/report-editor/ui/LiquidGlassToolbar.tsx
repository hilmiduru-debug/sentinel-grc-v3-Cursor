import { useFindingStore } from '@/entities/finding/model/store';
import type { FindingRefBlock, M6ReportStatus } from '@/entities/report';
import { useActiveReportStore } from '@/entities/report';
import clsx from 'clsx';
import { ArrowLeft, ChevronDown, Download, FileText, GitBranch, Loader2, Lock, Search, Send, Sparkles, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import type { CollabContext } from '../hooks/useCollaboration';
import { PresenceBar } from './PresenceBar';
import { SearchPalette } from './SearchPalette';
import { logReportExport } from '../api/export-audit';
import { exportToWord as engineExportWord, exportToForensicPDF as engineExportPDF } from '../utils/export-engine';

const STATUS_CONFIG: Record<M6ReportStatus, { label: string; className: string }> = {
 draft: { label: 'Taslak', className: 'bg-slate-100 text-slate-600 border-slate-200' },
 in_review: { label: 'İncelemede', className: 'bg-amber-50 text-amber-700 border-amber-200' },
 cae_review: { label: 'CAE İncelemesi', className: 'bg-blue-50 text-blue-700 border-blue-200' },
 published: { label: 'Yayında', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
 archived: { label: 'Arşivlendi', className: 'bg-canvas text-slate-400 border-slate-200' },
};

const SIMULATION_STATES = [
 { score: 95.2, severity: 'CRITICAL' },
 { score: 71.8, severity: 'HIGH' },
 { score: 44.5, severity: 'MEDIUM' },
 { score: 18.3, severity: 'LOW' },
] as const;

interface LiquidGlassToolbarProps {
 collabCtx?: CollabContext;
 traceabilityOpen?: boolean;
 onTraceabilityToggle?: () => void;
}

export function LiquidGlassToolbar({ collabCtx, traceabilityOpen, onTraceabilityToggle }: LiquidGlassToolbarProps) {
 const navigate = useNavigate();
 const { activeReport, publishReport } = useActiveReportStore();
 const updateFindingScore = useFindingStore((s) => s.updateFindingScore);
 const [isExporting, setIsExporting] = useState(false);
 const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
 const [searchOpen, setSearchOpen] = useState(false);
 const dropdownRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
 const handleClickOutside = (event: MouseEvent) => {
 if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
 setIsExportMenuOpen(false);
 }
 };
 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 useEffect(() => {
 const handler = (e: KeyboardEvent) => {
 if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
 e.preventDefault();
 setSearchOpen((v) => !v);
 }
 };
 window.addEventListener('keydown', handler);
 return () => window.removeEventListener('keydown', handler);
 }, []);

  const exportToForensicPDF = async () => {
    if (!activeReport) return;
    setIsExportMenuOpen(false);
    setIsExporting(true);
    try {
      const el = document.getElementById('report-editor-container') || document.body;
      await engineExportPDF(activeReport, el);
    } catch (err: any) {
      toast.error('PDF oluşturulamadı: ' + (err?.message ?? 'Bilinmeyen hata'));
    } finally {
      setIsExporting(false);
    }
  };

  const exportToWord = async () => {
    if (!activeReport) return;
    setIsExportMenuOpen(false);
    setIsExporting(true);
    try {
      const el = document.getElementById('report-editor-container') || document.body;
      await engineExportWord(activeReport, el.innerHTML);
    } catch (err: any) {
      toast.error('Word oluşturulamadı: ' + (err?.message ?? 'Bilinmeyen hata'));
    } finally {
      setIsExporting(false);
    }
  };

 const statusCfg = activeReport
 ? STATUS_CONFIG[activeReport.status]
 : STATUS_CONFIG.draft;

 const handleSimulate = () => {
 if (!activeReport) return;
 let targetId: string | null = null;
 const secs = activeReport?.sections ?? [];
 outer: for (const section of secs) {
 for (const block of section?.blocks ?? []) {
 if (block?.type === 'finding_ref') {
 targetId = (block as FindingRefBlock).content?.findingId ?? null;
 break outer;
 }
 }
 }
 if (!targetId) return;
 const pick = SIMULATION_STATES[Math.floor(Math.random() * SIMULATION_STATES.length)];
 updateFindingScore(targetId, pick.score, pick.severity);
 };

 return (
 <>
 <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
 <header className="no-print report-editor-toolbar sticky top-0 z-50 bg-surface/70 backdrop-blur-md border-b border-slate-200 shadow-sm">
 <div className="flex items-center justify-between h-14 px-4 gap-4">
 <div className="flex items-center gap-3 min-w-0">
 <button
 onClick={() => navigate(-1)}
 className="flex-shrink-0 flex items-center gap-1.5 text-sm font-sans font-medium text-slate-500 hover:text-primary transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-100"
 >
 <ArrowLeft size={16} />
 <span className="hidden sm:inline">Geri</span>
 </button>

 <div className="w-px h-5 bg-slate-200" />

 <div className="flex items-center gap-2.5 min-w-0">
 <h1 className="font-sans font-semibold text-primary text-sm truncate max-w-xs lg:max-w-md">
 {activeReport?.title ?? 'Rapor Yükleniyor...'}
 </h1>
 <span
 className={clsx(
 'flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-sans font-medium border',
 statusCfg.className,
 )}
 >
 {statusCfg.label}
 </span>
 </div>
 </div>

 <div className="flex items-center gap-2 flex-shrink-0">
 {collabCtx && (
 <>
 <PresenceBar userMeta={collabCtx.userMeta} peers={collabCtx.peers} />
 <div className="w-px h-5 bg-slate-200" />
 </>
 )}

 <button
 onClick={() => setSearchOpen(true)}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-sans font-medium text-slate-600 hover:bg-slate-100 hover:text-primary transition-colors border border-transparent hover:border-slate-200"
 title="Raporda ara (Cmd+K)"
 >
 <Search size={15} className="text-slate-500" />
 <span className="hidden md:inline">Ara</span>
 <kbd className="hidden lg:inline ml-1 px-1 py-0.5 text-[10px] font-mono bg-slate-100 border border-slate-200 rounded text-slate-400">⌘K</kbd>
 </button>

 <div className="w-px h-5 bg-slate-200" />

 <button
 onClick={handleSimulate}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-sans font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
 title="Canlı veri bağını test etmek için bulgular üzerinde skor değişimi simüle eder"
 >
 <Zap size={14} className="text-amber-600" />
 <span className="hidden md:inline">Simüle Et</span>
 </button>

 <div className="w-px h-5 bg-slate-200" />

 <button
 onClick={onTraceabilityToggle}
 className={clsx(
 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-sans font-medium transition-colors border',
 traceabilityOpen
 ? 'bg-amber-500 text-white border-amber-400 shadow-sm'
 : 'text-slate-600 hover:bg-slate-100 border-transparent hover:border-slate-200',
 )}
 title="Altın İplik — İzlenebilirlik Zinciri"
 >
 <GitBranch size={15} />
 <span className="hidden md:inline">Altın İplik</span>
 </button>

 <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-sans font-medium text-slate-600 hover:bg-slate-100 hover:text-primary transition-colors">
 <Sparkles size={15} className="text-blue-500" />
 <span className="hidden md:inline">AI ile Özetle</span>
 </button>

 <div className="relative" ref={dropdownRef}>
 <button
 onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
 disabled={isExporting}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-sans font-medium text-slate-600 hover:bg-slate-100 hover:text-primary transition-colors disabled:opacity-50"
 >
 {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
 <span className="hidden md:inline">Dışa Aktar</span>
 <ChevronDown size={14} className={clsx("transition-transform", isExportMenuOpen && "rotate-180")} />
 </button>

 {isExportMenuOpen && (
 <div className="absolute top-full right-0 mt-2 w-64 bg-white/80 backdrop-blur-xl border border-slate-200 shadow-xl rounded-xl overflow-hidden py-1 z-50">
 <button
 onClick={exportToWord}
 className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100/80 transition-colors"
 >
 <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
 <FileText size={16} className="text-blue-600" />
 </div>
 <div>
 <p className="font-semibold text-slate-800">Taslak Olarak İndir</p>
 <p className="text-[10px] text-slate-500">Word (.docx) formatında</p>
 </div>
 </button>
 <button
 onClick={exportToForensicPDF}
 className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100/80 transition-colors border-t border-slate-100"
 >
 <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
 <Lock size={16} className="text-rose-600" />
 </div>
 <div>
 <p className="font-semibold text-slate-800">Adli Kopya İndir</p>
 <p className="text-[10px] text-slate-500">Mühürlü PDF formatında</p>
 </div>
 </button>
 </div>
 )}
 </div>

 <button
 onClick={publishReport}
 disabled={activeReport?.status === 'published'}
 className={clsx(
 'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-sans font-medium transition-colors',
 activeReport?.status === 'published'
 ? 'bg-emerald-50 text-emerald-700 cursor-default'
 : 'bg-slate-900 text-white hover:bg-slate-700',
 )}
 >
 <Send size={15} />
 <span>{activeReport?.status === 'published' ? 'Yayında' : 'Yayınla'}</span>
 </button>
 </div>
 </div>
 </header>
 </>
 );
}
