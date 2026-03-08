import React, { useState } from 'react';
import { cn } from '@/shared/utils/cn';
import { ChevronRight, ChevronLeft, Save, Shield, Crosshair, Target, AlertCircle } from 'lucide-react';

interface Props {
  finding: any;
  updateField: (field: string, value: any) => void;
  saveFinding: () => void;
}

const STEPS = [
  { id: 'criteria', label: 'Standart / Kriter', icon: Shield, desc: 'Hangi standart veya mevzuat ihlâl edildi?' },
  { id: 'condition', label: 'Mevcut Durum', icon: Crosshair, desc: 'Sahada tam olarak ne tespit ettiniz?' },
  { id: 'cause', label: 'Kök Neden', icon: AlertCircle, desc: 'Bu aykırılık neden ortaya çıktı?' },
  { id: 'consequence', label: 'Olası Etki', icon: Target, desc: 'Bu durumun yaratacağı riskler nelerdir?' },
  { id: 'corrective_action', label: 'Aksiyon Önerisi', icon: Target, desc: 'Sorunun çözümü için ne tavsiye edersiniz?' }
];

export const FindingWizardWidget: React.FC<Props> = ({ finding, updateField, saveFinding }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const step = STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(s => s + 1);
  };
  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Wizard Header / Progress */}
      <div className="shrink-0 p-8 border-b border-slate-200 bg-white shadow-sm z-10">
        <h2 className="text-2xl font-black text-slate-800 mb-2">Bulgu Asistanı</h2>
        <p className="text-slate-500 mb-8 max-w-2xl">Rehberli adımları takip ederek eksiksiz ve güçlü bir denetim bulgusu oluşturun. Her adım bulgunuzun kalitesini artıracaktır.</p>
        
        <div className="flex items-center gap-2">
          {STEPS.map((s, idx) => {
            const isActive = idx === currentStep;
            const isCompleted = idx < currentStep;
            return (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-2 flex-1 relative">
                  <button 
                    onClick={() => setCurrentStep(idx)}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ring-4 cursor-pointer hover:scale-110",
                      isActive ? "bg-indigo-600 text-white ring-indigo-100" : 
                      isCompleted ? "bg-emerald-500 text-white ring-emerald-50" : "bg-slate-100 text-slate-400 ring-transparent"
                    )}
                  >
                    {idx + 1}
                  </button>
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider text-center", isActive ? "text-indigo-600" : isCompleted ? "text-emerald-600" : "text-slate-400")}>
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={cn("h-1 flex-1 rounded-full transition-all", isCompleted ? "bg-emerald-500" : "bg-slate-200")} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 p-8 overflow-y-auto flex justify-center items-start bg-slate-50/50">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-100 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl shadow-inner">
              <step.icon size={28} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">{step.label}</h3>
              <p className="text-slate-500 text-sm mt-1">{step.desc}</p>
            </div>
          </div>
          
          <textarea
            value={finding[step.id] || ''}
            onChange={e => updateField(step.id, e.target.value)}
            placeholder="Detaylı açıklamayı buraya yazınız..."
            className="w-full h-72 p-6 text-base text-slate-700 bg-slate-50/50 border border-slate-200 hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 rounded-2xl outline-none transition-all resize-none shadow-sm placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Footer / Controls */}
      <div className="shrink-0 p-6 bg-white border-t border-slate-200 flex justify-between items-center z-10">
        <button
          onClick={handlePrev}
          disabled={currentStep === 0}
          className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent flex items-center gap-2 transition-all"
        >
          <ChevronLeft size={18} /> Önceki Adım
        </button>
        
        {currentStep === STEPS.length - 1 ? (
          <button
            onClick={saveFinding}
            className="px-8 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 flex items-center gap-2 transition-all active:scale-95"
          >
            <Save size={18} /> Kaydet ve Tamamla
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-8 py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-300 flex items-center gap-2 transition-all active:scale-95"
          >
            Sonraki Adım <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
};
