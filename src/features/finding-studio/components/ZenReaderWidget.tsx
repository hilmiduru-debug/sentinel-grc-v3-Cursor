import { cn } from '@/shared/utils/cn';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
 AlertTriangle,
 Bookmark,
 CheckCircle2,
 GitPullRequestArrow,
 Quote,
 Scale,
 Search,
 Target
} from 'lucide-react';
import React from 'react';

// --- Types ---
interface ZenReaderWidgetProps {
 data: any; 
 layout: 'flow' | 'book';
 warmth?: number; // 0-50
}

// --- Dynamic Paper Color ---
const getPaperStyle = (w: number = 0) => {
 const r = 255;
 const g = Math.max(240, Math.floor(255 - (w * 0.2)));
 const b = Math.max(220, Math.floor(255 - (w * 0.6)));
 
 return {
 backgroundColor: `rgb(${r}, ${g}, ${b})`,
 color: '#1e293b' // Slate-800 for high contrast
 };
};

// --- Helper: Risk Badge Calculation ---
const getRiskBadge = (data: any) => {
 const score = data.risk_score || (data.impact * data.likelihood) || 0;
 let severity = data.severity || 'LOW';
 
 if (!data.severity) {
 if (score >= 20) severity = 'CRITICAL';
 else if (score >= 12) severity = 'HIGH';
 else if (score >= 6) severity = 'MEDIUM';
 else severity = 'LOW';
 }

 const badges: Record<string, { label: string, classes: string, icon: any }> = {
 'CRITICAL': { label: 'KRİTİK', classes: 'bg-rose-100 text-rose-700 border-rose-200', icon: AlertTriangle },
 'HIGH': { label: 'YÜKSEK', classes: 'bg-orange-100 text-orange-700 border-orange-200', icon: AlertTriangle },
 'MEDIUM': { label: 'ORTA', classes: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle },
 'LOW': { label: 'DÜŞÜK', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
 'OBSERVATION': { label: 'GÖZLEM', classes: 'bg-slate-100 text-slate-700 border-slate-200', icon: Search },
 };

 return badges[severity] || badges['LOW'];
};

// --- Helper Components ---
const SectionBlock = ({ title, icon: Icon, content, colorClass }: any) => {
 if (!content || content === '<p><br></p>') return null;
 return (
 <section className="mb-8 group">
 <div className="flex items-center gap-2 mb-3 border-b border-black/5 pb-1">
 <Icon size={16} className={cn("opacity-70", colorClass)} />
 <h3 className="font-sans text-[10px] font-bold uppercase tracking-widest opacity-50">
 {title}
 </h3>
 </div>
 <div 
 className="font-serif text-base leading-relaxed opacity-90 prose prose-slate max-w-none"
 dangerouslySetInnerHTML={{ __html: content }} 
 />
 </section>
 );
};

export const ZenReaderWidget: React.FC<ZenReaderWidgetProps> = ({ 
 data, 
 layout, 
 warmth = 0 
}) => {
 const paperStyle = getPaperStyle(warmth);
 const riskInfo = getRiskBadge(data);
 const RiskIcon = riskInfo.icon;

 // --- SOL SAYFA: BULGU DETAYI ---
 const LeftPage = () => (
 <article 
 className={cn(
 "relative p-10 md:p-14 transition-all duration-500",
 layout === 'book' 
 ? "h-full overflow-y-auto custom-scrollbar rounded-l-2xl" 
 : "h-auto rounded-xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] ring-1 ring-black/5 hover:shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] transition-shadow"
 )}
 style={paperStyle}
 >
 {/* Header */}
 <header className="mb-10 border-b-2 border-black/10 pb-6">
 <div className="flex items-start justify-between mb-4">
 <div className="flex flex-col gap-2">
 <span className={cn(
 "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border w-fit",
 riskInfo.classes
 )}>
 <RiskIcon size={10} />
 {riskInfo.label} RİSK
 </span>
 <span className="font-mono text-[9px] uppercase tracking-[0.2em] opacity-40 ml-1">
 REF: {data.id?.toUpperCase()}
 </span>
 </div>
 <Bookmark size={20} className="opacity-10 text-primary" />
 </div>
 
 {/* Font küçültüldü: text-3xl */}
 <h1 className="font-serif text-3xl md:text-4xl font-bold leading-tight mb-4 text-primary">
 {data.title || 'Başlıksız Bulgu'}
 </h1>
 
 <div className="flex flex-wrap gap-2 text-[10px] font-medium opacity-60">
 <span className="flex items-center gap-1 px-2 py-1 bg-black/5 rounded">
 <AlertTriangle size={10} /> Etki: {data.impact}/5
 </span>
 <span className="flex items-center gap-1 px-2 py-1 bg-black/5 rounded">
 <Target size={10} /> Olasılık: {data.likelihood}/5
 </span>
 </div>
 </header>

 {/* 5C İçerik */}
 <div className="space-y-1">
 <SectionBlock title="Kriter" icon={Scale} content={data.criteria} colorClass="text-blue-600" />
 <SectionBlock title="Tespit" icon={Search} content={data.condition} colorClass="text-amber-600" />
 <SectionBlock title="Kök Neden" icon={GitPullRequestArrow} content={data.cause} colorClass="text-rose-600" />
 <SectionBlock title="Risk / Etki" icon={AlertTriangle} content={data.consequence} colorClass="text-orange-600" />
 <SectionBlock title="Öneri" icon={CheckCircle2} content={data.corrective_action} colorClass="text-emerald-600" />
 </div>

 {/* Footer Decoration */}
 <div className="mt-12 flex justify-center opacity-10">
 <Quote size={24} />
 </div>
 </article>
 );

 // --- SAĞ SAYFA: AKSİYON PLANI ---
 const RightPage = () => (
 <aside 
 className={cn(
 "relative p-10 md:p-12 transition-all duration-500 flex flex-col",
 layout === 'book' 
 ? "h-full overflow-y-auto custom-scrollbar rounded-r-2xl" 
 : "h-auto rounded-xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] ring-1 ring-black/5 hover:shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] transition-shadow mt-8"
 )}
 style={layout === 'book' ? paperStyle : { backgroundColor: '#fff' }}
 >
 <div className="mb-6 pb-4 border-b border-black/5">
 <h3 className="font-sans font-bold text-xs uppercase tracking-widest opacity-50 flex items-center gap-2">
 <Target size={14} /> Yönetim Aksiyon Planı
 </h3>
 </div>

 <div className="space-y-6 flex-1">
 <div className="p-4 bg-black/5 rounded-lg border border-black/5">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <div className="text-[9px] uppercase opacity-50 mb-1">Sorumlu</div>
 <div className="font-serif text-sm font-semibold">Ahmet Yılmaz</div>
 </div>
 <div>
 <div className="text-[9px] uppercase opacity-50 mb-1">Vade</div>
 <div className="font-serif text-sm font-semibold">
 {data.target_date && !isNaN(new Date(data.target_date).getTime()) ? format(new Date(data.target_date), 'dd MMM yyyy', {locale: tr}) : '-'}
 </div>
 </div>
 </div>
 </div>

 <div className="prose prose-sm prose-slate max-w-none">
 <h4 className="font-serif text-base font-bold opacity-80 mb-2">Alınacak Aksiyonlar</h4>
 <p className="opacity-70 italic text-sm leading-relaxed">
 {data.action_plan_description || "Henüz bir aksiyon planı girilmemiştir."}
 </p>
 </div>
 </div>
 
 <div className="mt-auto pt-8 text-center text-[10px] opacity-30 font-mono">
 Sayfa 2 / 2
 </div>
 </aside>
 );

 // --- RENDER LAYOUT ---
 
 if (layout === 'book') {
 return (
 <div className="flex w-full h-[calc(100vh-140px)] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] ring-1 ring-black/5 rounded-2xl overflow-hidden gap-0 my-4 transform transition-transform hover:-translate-y-1 duration-500 bg-transparent relative">
 {/* LEFT PANE CONTAINER */}
 <div className="w-1/2 h-full relative z-10">
 {/* SOL GÖLGE (Daha hafif) */}
 <div className="absolute top-0 right-0 bottom-0 w-16 bg-gradient-to-l from-black/5 via-transparent to-transparent pointer-events-none z-20 mix-blend-multiply" />
 <LeftPage />
 </div>

 {/* RIGHT PANE CONTAINER */}
 <div className="w-1/2 h-full relative z-0">
 {/* SAĞ GÖLGE (Daha hafif) */}
 <div className="absolute top-0 left-0 bottom-0 w-16 bg-gradient-to-r from-black/5 via-transparent to-transparent pointer-events-none z-20 mix-blend-multiply" />
 <RightPage />
 </div>
 </div>
 );
 }

 // Flow Layout
 return (
 <div className="w-full max-w-5xl mx-auto pb-20 space-y-12 pt-4">
 <LeftPage />
 <RightPage />
 </div>
 );
};