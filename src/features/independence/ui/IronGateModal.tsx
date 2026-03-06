/**
 * SENTINEL GRC v3.0 — Iron Gate: Bağımsızlık Beyanı Modal
 * =========================================================
 * GIAS 2025 Standard II.1 — Bağımsızlık ve Tarafsızlık
 *
 * Bu modal engagement'a tıklanınca açılır, eğer ilgili denetçinin
 * `auditor_declarations` tablosunda onaylı beyanı YOKSA Drawer açılmaz.
 * Denetçi "Bağımsızlık ve Çıkar Çatışması Yoktur" beyanını bu modalden imzalar.
 *
 * UI: Glassmorphism + Koyu/Yaldızlı C-Level tema
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, AlertTriangle, CheckCircle2, X, Lock, Loader2,
  Scale, Eye, FileText, ChevronRight
} from 'lucide-react';
import clsx from 'clsx';
import { useSignDeclaration } from '@/entities/independence/api/declarations-api';

// ─── Tür Tanımları ─────────────────────────────────────────────────────────────

interface IronGateModalProps {
  engagementId: string;
  engagementTitle: string;
  userId: string;
  onGateCleared: () => void; // Beyan imzalandı → Drawer açılabilir
  onClose: () => void;
}

// ─── Beyan Metni (GIAS 2025 Standart Uyumlu) ──────────────────────────────────

const DECLARATION_TEXT = `Ben, aşağıda imzası bulunan denetçi olarak;
Türkiye Bankacılık Düzenleme ve Denetleme Kurumu (BDDK) düzenlemeleri ve
Küresel İç Denetim Standartları (GIAS 2025) Standart II.1 çerçevesinde,

1. Atandığım denetim göreviyle ilgili herhangi bir çıkar çatışmamın bulunmadığını,
2. Denetlenecek birim, süreç veya varlıkla doğrudan veya dolaylı finansal ilişkim, akrabalık bağım,
   yönetim görevim ya da taraflılık yaratabilecek başka bir ilişkimin olmadığını,
3. Bu denetimi bağımsız, tarafsız ve nesnel bir şekilde yürüteceğimi,
4. Denetim süresince herhangi bir çıkar çatışması durumu oluşması halinde, derhal Teftiş Kurulu
   Başkanlığı'na bildireceğimi,
5. Sunum, bulgu ve tavsiyelerin tamamen Sentinel GRC kılavuzları ve GIAS 2025 standartlarına
   uygun olarak hazırlanacağını

BEYAN, TAAHHÜT VE KABUL EDERİM.`;

// ─── Ana Bileşen ───────────────────────────────────────────────────────────────

export function IronGateModal({
  engagementId,
  engagementTitle,
  userId,
  onGateCleared,
  onClose,
}: IronGateModalProps) {
  const [step, setStep] = useState<'declaration' | 'conflict-check' | 'signing' | 'done'>(
    'declaration'
  );
  const [hasConflict, setHasConflict] = useState<boolean | null>(null);
  const [conflictDescription, setConflictDescription] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);

  const { mutate: signDeclaration, isPending: isSigning } = useSignDeclaration();

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 20;
    if (atBottom) setIsScrolled(true);
  };

  const handleSign = () => {
    if (!confirmChecked) return;
    if (hasConflict === null) return;

    signDeclaration(
      {
        engagement_id: engagementId,
        user_id: userId,
        has_conflict: hasConflict,
        conflict_description: hasConflict ? conflictDescription : undefined,
        declaration_text: DECLARATION_TEXT,
      },
      {
        onSuccess: () => {
          setStep('done');
          setTimeout(() => {
            onGateCleared();
          }, 1800);
        },
      }
    );
  };

  return (
    <AnimatePresence>
      {/* ─── Backdrop ─────────────────────────────────────────────────────── */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* ─── Modal Panel ──────────────────────────────────────────────────── */}
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="pointer-events-auto w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            boxShadow: '0 0 0 1px rgba(251,191,36,0.1), 0 32px 64px rgba(0,0,0,0.8)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ─── Header ──────────────────────────────────────────────────── */}
          <div
            className="px-8 py-6 flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(251,191,36,0.08) 0%, transparent 60%)',
              borderBottom: '1px solid rgba(148,163,184,0.1)',
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #b45309, #78350f)',
                    boxShadow: '0 4px 16px rgba(180,83,9,0.4)',
                  }}
                >
                  <Lock size={22} className="text-amber-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-amber-400 tracking-widest uppercase">
                      GIAS 2025 · STANDART II.1
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  </div>
                  <h2 className="text-lg font-black text-white leading-tight">
                    Iron Gate — Bağımsızlık Beyanı
                  </h2>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Bu denetim görevine erişmeden önce beyanınız gereklidir
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Engagement Bilgisi */}
            <div
              className="mt-4 px-4 py-3 rounded-xl flex items-center gap-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <FileText size={14} className="text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Denetim Görevi</p>
                <p className="text-sm font-bold text-white">{engagementTitle ?? '—'}</p>
              </div>
            </div>
          </div>

          {/* ─── İçerik ──────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-hidden flex flex-col">

            {/* ADIM: Beyan Metni */}
            {step === 'declaration' && (
              <div className="flex-1 flex flex-col p-6 gap-4">
                <div className="flex items-center gap-2 mb-1">
                  <Eye size={14} className="text-amber-400" />
                  <span className="text-xs font-bold text-amber-300 tracking-wide">
                    Lütfen beyan metnini sonuna kadar okuyun
                  </span>
                </div>

                {/* Beyan Metni Scroll Alanı */}
                <div
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto rounded-xl p-5 text-sm leading-relaxed text-slate-300 space-y-2 max-h-48"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    fontFamily: 'Georgia, serif',
                    lineHeight: '1.8',
                  }}
                >
                  <pre className="whitespace-pre-wrap font-serif text-xs text-slate-300">
                    {DECLARATION_TEXT}
                  </pre>
                </div>

                {/* Scroll uyarısı */}
                {!isScrolled && (
                  <p className="text-[10px] text-amber-500 flex items-center gap-1">
                    <AlertTriangle size={10} />
                    Devam için beyan metnini sonuna kadar kaydırın
                  </p>
                )}

                <button
                  disabled={!isScrolled}
                  onClick={() => setStep('conflict-check')}
                  className={clsx(
                    'w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all',
                    isScrolled
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  )}
                >
                  Okudum, Devam Et
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* ADIM: Çıkar Çatışması Sorusu */}
            {step === 'conflict-check' && (
              <div className="flex-1 flex flex-col p-6 gap-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Scale size={14} className="text-amber-400" />
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                      Çıkar Çatışması Beyanı
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                    Bu denetim görevi kapsamındaki birim, süreç veya varlıklarla doğrudan ya da
                    dolaylı bir <strong className="text-white">çıkar çatışmanız</strong> var mı?
                  </p>
                </div>

                {/* Seçenekler */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      value: false,
                      label: 'HAYIR — Çıkar Çatışmam Yok',
                      icon: CheckCircle2,
                      color: 'border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-500/10',
                      activeColor: 'border-emerald-400 bg-emerald-500/15',
                      iconColor: 'text-emerald-400',
                    },
                    {
                      value: true,
                      label: 'EVET — Açıklamam Var',
                      icon: AlertTriangle,
                      color: 'border-red-500/40 hover:border-red-400 hover:bg-red-500/10',
                      activeColor: 'border-red-400 bg-red-500/15',
                      iconColor: 'text-red-400',
                    },
                  ].map((opt) => (
                    <button
                      key={String(opt.value)}
                      onClick={() => setHasConflict(opt.value)}
                      className={clsx(
                        'p-4 rounded-xl border-2 transition-all text-left flex flex-col gap-2',
                        hasConflict === opt.value ? opt.activeColor : opt.color
                      )}
                      style={{ background: 'rgba(255,255,255,0.02)' }}
                    >
                      <opt.icon size={20} className={opt.iconColor} />
                      <span className="text-xs font-bold text-white leading-tight">{opt.label}</span>
                    </button>
                  ))}
                </div>

                {/* Çatışma Açıklaması */}
                {hasConflict === true && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="overflow-hidden"
                  >
                    <label className="text-xs text-slate-400 font-medium mb-1.5 block">
                      Çıkar çatışmasını açıklayın (zorunlu)
                    </label>
                    <textarea
                      value={conflictDescription}
                      onChange={(e) => setConflictDescription(e.target.value)}
                      rows={3}
                      placeholder="Çatışma durumunu, ilgili tarafları ve niteliğini açıklayın..."
                      className="w-full rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    />
                    <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
                      <AlertTriangle size={10} />
                      Çatışma beyanı durumunda CAE derhal bilgilendirilecektir.
                    </p>
                  </motion.div>
                )}

                {/* Onay Checkbox */}
                {hasConflict !== null && (
                  <motion.label
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-start gap-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={confirmChecked}
                      onChange={(e) => setConfirmChecked(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-amber-500 cursor-pointer"
                    />
                    <span className="text-xs text-slate-400 leading-relaxed">
                      Yukarıdaki beyanın tamamını okudum, içeriğini anlıyorum ve tüm bilgilerin
                      doğru olduğunu <strong className="text-white">elektronik imzamla</strong> onaylıyorum.
                    </span>
                  </motion.label>
                )}

                <button
                  disabled={
                    hasConflict === null ||
                    !confirmChecked ||
                    (hasConflict === true && !conflictDescription.trim())
                  }
                  onClick={handleSign}
                  className={clsx(
                    'w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all',
                    hasConflict !== null && confirmChecked
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  )}
                >
                  {isSigning ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      İmzalanıyor...
                    </>
                  ) : (
                    <>
                      <Shield size={16} />
                      Beyanı İmzala ve Göreve Giriş Yap
                    </>
                  )}
                </button>
              </div>
            )}

            {/* ADIM: Başarılı */}
            {step === 'done' && (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 15 }}
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                  style={{
                    background: 'linear-gradient(135deg, #065f46, #047857)',
                    boxShadow: '0 8px 32px rgba(4,120,87,0.5)',
                  }}
                >
                  <CheckCircle2 size={40} className="text-emerald-200" />
                </motion.div>
                <h3 className="text-xl font-black text-white mb-2">Beyan İmzalandı</h3>
                <p className="text-sm text-slate-400 text-center max-w-xs">
                  Bağımsızlık beyanınız blockchain-benzeri imza hash'i ile kaydedildi.
                  Denetim görevi açılıyor...
                </p>
                <div className="mt-4 flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-emerald-500"
                      style={{ animation: `pulse 1s ease-in-out ${i * 0.3}s infinite` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─── Footer ──────────────────────────────────────────────────── */}
          <div
            className="px-8 py-3 flex-shrink-0 flex items-center justify-between"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center gap-2">
              <Shield size={11} className="text-amber-500" />
              <span className="text-[10px] text-slate-600">
                GIAS 2025 Standard II.1 · Dijital İmza Kayıt Sistemi
              </span>
            </div>
            <span className="text-[10px] text-slate-600">
              Sentinel GRC v3.0
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
