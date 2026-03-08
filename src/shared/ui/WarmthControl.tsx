/**
 * WarmthControl — Shared Unified Paper Warmth Picker
 *
 * Displays a categorized preset grid (Cool / Warm / Vintage) + a continuous
 * slider + a Night Mode toggle. Uses warmth.ts as SSOT.
 *
 * Props:
 *   warmth    — 0-100 numeric value
 *   nightMode — boolean night toggle
 *   onChange  — (warmth: number, nightMode: boolean) => void
 */
import { useState } from 'react';
import { Moon, Sun, X } from 'lucide-react';
import {
  WARMTH_PRESETS,
  NIGHT_PRESET,
  getWarmthStyle,
  getWarmthLabel,
} from '@/shared/utils/warmth';
import { cn } from '@/shared/utils/cn';

interface WarmthControlProps {
  warmth: number;
  nightMode?: boolean;
  onChange: (warmth: number, nightMode: boolean) => void;
  /** Compact mode: only shows the trigger button, no label */
  compact?: boolean;
  /** Extra CSS on the trigger button */
  className?: string;
}

const CATEGORIES = [
  { key: 'cool',    label: 'Serin',   desc: 'Minimal & Go\u00fcz Dostu' },
  { key: 'warm',    label: 'S\u0131cak',   desc: 'Ka\u011f\u0131t Konforu' },
  { key: 'vintage', label: 'Vintage', desc: 'Antik & Sepya' },
] as const;

export function WarmthControl({
  warmth,
  nightMode = false,
  onChange,
  compact = false,
  className,
}: WarmthControlProps) {
  const [open, setOpen] = useState(false);
  const ws = getWarmthStyle(warmth, nightMode);
  const label = getWarmthLabel(warmth, nightMode);
  const isWarm = warmth > 30 || nightMode;

  return (
    <div className={cn('relative flex items-center', className)}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Kağıt sıcaklığını ayarla"
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-medium border transition-all',
          open
            ? 'bg-amber-500 border-amber-400 text-white shadow-md shadow-amber-200'
            : nightMode
            ? 'bg-slate-900 border-slate-700 text-amber-300 hover:bg-slate-800'
            : isWarm
            ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100',
        )}
      >
        {nightMode ? <Moon size={13} /> : <Sun size={13} />}
        {!compact && <span className="hidden sm:inline">{label}</span>}
      </button>

      {/* Popover */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          <div className="absolute right-0 top-full mt-2 z-50 bg-white/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/60 p-5 w-80 animate-in slide-in-from-top-2 fade-in duration-200 ring-1 ring-black/[0.04]">

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-0.5">Kağıt Sıcaklığı</p>
                <p className="text-[10px] text-slate-400">Remarkable · NYT · Kindle · Gece Modu</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={13} />
              </button>
            </div>

            {/* Live Paper Preview */}
            <div
              className="mb-5 h-12 rounded-xl flex flex-col items-center justify-center transition-all duration-500 relative overflow-hidden border"
              style={{
                backgroundColor: ws.backgroundColor,
                borderColor: ws.borderColor,
              }}
            >
              <span
                className="text-[11px] font-serif font-medium tracking-wide"
                style={{ color: ws.color }}
              >
                Sentinel GRC — Rapor & Bulgu Stüdyosu
              </span>
              <span
                className="text-[9px] mt-0.5 font-mono opacity-50"
                style={{ color: ws.color }}
              >
                {label}
              </span>
            </div>

            {/* Category rows */}
            {CATEGORIES.map((cat) => {
              const presets = WARMTH_PRESETS.filter(p => p.category === cat.key);
              return (
                <div key={cat.key} className="mb-4">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">{cat.label}</span>
                    <span className="text-[9px] text-slate-300">{cat.desc}</span>
                  </div>
                  <div className="flex gap-1">
                    {presets.map((p) => {
                      const isActive = !nightMode && Math.abs(warmth - p.value) < 4;
                      return (
                        <button
                          key={p.id}
                          onClick={() => onChange(p.value, false)}
                          title={p.description}
                          className={cn(
                            'group flex-1 rounded-lg h-9 flex flex-col items-center justify-end pb-1 pt-0.5 border-2 transition-all shadow-sm',
                            isActive
                              ? 'border-amber-500 scale-105 shadow-amber-200 shadow-md'
                              : 'border-transparent hover:border-amber-300/70 hover:scale-[1.03]',
                          )}
                          style={{ backgroundColor: p.hex }}
                        >
                          <span
                            className="text-[8px] font-bold tracking-wide leading-none"
                            style={{ color: p.value >= 67 ? '#6B5A3E' : '#6B7280' }}
                          >
                            {p.labelTr}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Night Mode */}
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">Gece</span>
                <span className="text-[9px] text-slate-300">Zararsız okuma modu</span>
              </div>
              <button
                onClick={() => onChange(warmth, !nightMode)}
                className={cn(
                  'w-full h-9 rounded-lg flex items-center justify-center gap-2 border-2 transition-all text-xs font-medium',
                  nightMode
                    ? 'bg-slate-900 border-amber-500 text-amber-300 scale-[1.01] shadow-md'
                    : 'bg-slate-800 border-transparent text-slate-400 hover:border-amber-400/50 hover:text-amber-300',
                )}
                style={{ backgroundColor: nightMode ? NIGHT_PRESET.hex : '#1E1E1C' }}
              >
                <Moon size={14} className={nightMode ? 'text-amber-400' : 'text-slate-500'} />
                <span style={{ color: nightMode ? NIGHT_PRESET.textColor : '#6B7280' }}>
                  {nightMode ? 'Gece Modu Aktif' : 'Gece Modunu Etkinleştir'}
                </span>
                {nightMode && (
                  <span className="ml-auto text-amber-500 text-[10px]">✓</span>
                )}
              </button>
            </div>

            {/* Continuous Slider */}
            <div className="border-t border-slate-100 pt-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">Hassas Ayar</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-300 font-light">A</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={warmth}
                  disabled={nightMode}
                  onChange={(e) => onChange(Number(e.target.value), false)}
                  className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer disabled:opacity-40"
                  style={{
                    background: nightMode
                      ? '#374151'
                      : 'linear-gradient(to right, #FFFFFF 0%, #F4F6F8 8%, #EAEBEB 17%, #F5F1EB 28%, #EDE3D1 42%, #E2D3BC 55%, #D0BFA0 67%, #C0A884 79%, #A8906E 90%, #8B7355 100%)',
                    accentColor: '#F59E0B',
                  }}
                />
                <span className="text-[10px] text-amber-700 font-bold">A</span>
              </div>
              <p className="mt-1.5 text-center text-[9px] text-slate-400">
                {label}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
