import { CheckCircle2, Lock, PanelRightOpen, Shield, ShieldAlert } from 'lucide-react';
import type { ControlRow } from '../WorkpaperGrid/types';
import clsx from 'clsx';
import { ProgressBar } from '../WorkpaperGrid/cells/ProgressBar';

interface WorkpaperCardsProps {
  data: ControlRow[];
  onOpenDrawer: (row: ControlRow) => void;
}

export function WorkpaperCards({ data, onOpenDrawer }: WorkpaperCardsProps) {
  if (!data || data.length === 0) {
    return (
      <div className="py-16 text-center bg-surface border border-slate-200 rounded-xl shadow-sm">
        <p className="text-slate-500 font-medium">No controls match your search</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    if (status === 'EFFECTIVE') return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    if (status === 'INEFFECTIVE') return 'bg-red-100 text-red-700 border-red-300';
    if (status === 'N/A') return 'bg-slate-100 text-slate-500 border-slate-200';
    return 'bg-slate-50 text-slate-500 border-slate-200';
  };

  const getStatusLabel = (status: string) => {
    if (status === 'EFFECTIVE') return 'Effective';
    if (status === 'INEFFECTIVE') return 'Ineffective';
    if (status === 'N/A') return 'N/A';
    return 'Not Started';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {((data as ControlRow[]) || []).map((row) => {
        const RiskIcon = row.risk_level === 'HIGH' ? ShieldAlert : Shield;
        const riskColor = row.risk_level === 'HIGH' ? 'text-red-600 bg-red-50' : row.risk_level === 'MEDIUM' ? 'text-amber-500 bg-amber-50' : 'text-slate-500 bg-slate-50';
        const isReviewed = row.approval_status === 'reviewed';
        const isPrepared = row.approval_status === 'prepared';

        return (
          <div
            key={row.id}
            onClick={() => onOpenDrawer(row)}
            className="bg-surface border border-slate-200 rounded-xl hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group flex flex-col overflow-hidden"
          >
            {/* Header / Top */}
            <div className="p-4 border-b border-slate-100 flex flex-col gap-2 relative">
              <div className="flex items-center justify-between">
                <code className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded">
                  {row.control_id}
                </code>
                <div className="flex items-center gap-1.5">
                  <div className={clsx('p-1.5 rounded-full', riskColor)} title={`${row.risk_level} Risk`}>
                    <RiskIcon size={14} />
                  </div>
                  {isReviewed ? (
                    <div className="p-1.5 bg-emerald-100 rounded-full" title="Tam Onayli">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                    </div>
                  ) : isPrepared ? (
                    <div className="p-1.5 bg-blue-100 rounded-full" title="Hazirlayan Onayladi">
                      <Lock size={14} className="text-blue-600" />
                    </div>
                  ) : null}
                </div>
              </div>
              <h3 className="text-sm font-bold text-slate-800 line-clamp-2 mt-1 leading-snug group-hover:text-blue-700 transition-colors">
                {row.title}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {row.category}
              </p>
            </div>

            {/* Body / Stats */}
            <div className="p-4 flex-1 flex flex-col gap-3 bg-slate-50/50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">ToD Testi</span>
                <span className={clsx('px-2 py-0.5 rounded text-[10px] font-bold border', getStatusColor(row.tod))}>
                  {getStatusLabel(row.tod)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">ToE Testi</span>
                <span className={clsx('px-2 py-0.5 rounded text-[10px] font-bold border', getStatusColor(row.toe))}>
                  {getStatusLabel(row.toe)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-auto pt-2">
                <span className="text-slate-500 font-medium">Örneklem</span>
                <span className="font-mono font-bold text-slate-700">{row.sample_size}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 bg-surface flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm', row.auditor.color)}>
                  {row.auditor.initials}
                </div>
                <span className="text-[11px] font-medium text-slate-600">{row.auditor.name}</span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); onOpenDrawer(row); }}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title="Detayları Aç"
              >
                <PanelRightOpen size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
