/**
 * SENTINEL GRC v3.0 — Unified Warmth System  v2
 *
 * Single source of truth for ALL reading surfaces:
 * ZenEditor, ZenReaderWidget, Report Editor, Executive Summary, Board Deck, etc.
 *
 * The 0-100 "warmth" value maps to paper tones in three categories:
 *
 * ── COOL ─────────────────────────────────────────────────────────────────
 *   0  Arctic White   #FFFFFF  — pure digital white
 *   8  Cloud          #F4F6F8  — Apple Books "White" (slight cool tint)
 *  17  Stone          #EAEBEB  — muted neutral grey
 *
 * ── WARM ─────────────────────────────────────────────────────────────────
 *  28  Newsprint      #F5F1EB  — classic NYT / newspaper
 *  42  Cream          #EDE3D1  — Kindle comfortable default
 *  55  Parchment      #E2D3BC  — Remarkable tablet feel
 *  67  Honey          #D0BFA0  — rich warm honey
 *
 * ── VINTAGE ──────────────────────────────────────────────────────────────
 *  79  Sepia          #C0A884  — old paperback book
 *  90  Deep Sepia     #A8906E  — vintage leather bound
 * 100  Antique        #8B7355  — antique parchment (dramatic)
 *
 * Special: Night Mode is a separate boolean toggle, not on the 0-100 scale.
 *
 * Text contrast is auto-adjusted so legibility is always maintained.
 */

export interface WarmthStyle {
  backgroundColor: string;
  color: string;
  /** Subtle seam / border color for dividers */
  borderColor: string;
  /** Section background overlay (inset cards) */
  insetBg: string;
  /** True if this style is "dark" (for toggling CSS variables) */
  isDark: boolean;
}

/** Named presets exportable for UI pickers */
export interface WarmthPreset {
  id: string;
  label: string;
  labelTr: string;
  value: number;
  hex: string;
  category: 'cool' | 'warm' | 'vintage';
  description: string;
}

export const WARMTH_PRESETS: WarmthPreset[] = [
  // COOL
  { id: 'arctic',    label: 'Arctic',    labelTr: 'Buz',       value: 0,   hex: '#FFFFFF', category: 'cool',    description: 'Dijital beyaz — kontrast maksimum' },
  { id: 'cloud',     label: 'Cloud',     labelTr: 'Bulut',     value: 8,   hex: '#F4F6F8', category: 'cool',    description: 'Apple Books "White" — hafif serin' },
  { id: 'stone',     label: 'Stone',     labelTr: 'Taş',       value: 17,  hex: '#EAEBEB', category: 'cool',    description: 'Nötr, göz dostu gri — uzun oturumlar için' },
  // WARM
  { id: 'pearl',     label: 'Pearl',     labelTr: 'Sedef',     value: 22,  hex: '#F8F4EF', category: 'warm',    description: 'Kırık beyaz — saf fildişi, kıkırdı krem' },
  { id: 'newsprint', label: 'Newsprint', labelTr: 'Gazete',    value: 30,  hex: '#F5F1EB', category: 'warm',    description: 'NYT / klasik gazete kağıdı hissi' },
  { id: 'cream',     label: 'Cream',     labelTr: 'Krem',      value: 44,  hex: '#EDE3D1', category: 'warm',    description: 'Kindle varsayılan — günlük okuma konforu' },
  { id: 'parchment', label: 'Parchment', labelTr: 'Perk.', value: 56,  hex: '#E2D3BC', category: 'warm',    description: 'Remarkable tablet — sıcak kağıt hissi' },
  { id: 'honey',     label: 'Honey',     labelTr: 'Bal',       value: 68,  hex: '#D0BFA0', category: 'warm',    description: 'Zengin sıcak bal — akşam okuma' },
  // VINTAGE
  { id: 'sepia',     label: 'Sepia',     labelTr: 'Sepya',     value: 79,  hex: '#C0A884', category: 'vintage', description: 'Eski kitap tonu — nostaljik' },
  { id: 'deepsepia', label: 'Deep Sepia',labelTr: 'K.Sepya',  value: 90,  hex: '#A8906E', category: 'vintage', description: 'Deri ciltli kitap tonu — dramatik' },
  { id: 'antique',   label: 'Antique',   labelTr: 'Antik',     value: 100, hex: '#8B7355', category: 'vintage', description: 'Antik parşömen — gece okuma modu' },
];

export const NIGHT_PRESET = {
  id: 'night',
  label: 'Night',
  labelTr: 'Gece',
  hex: '#1A1A18',
  textColor: '#D9C9A8', // warm off-white, easy on eyes
  description: 'Karanlık arka plan — gece zararsız okuma',
};

/** The 10 colour stops in the warmth spectrum */
const WARMTH_STOPS: Array<{ at: number; r: number; g: number; b: number }> = [
  { at: 0,   r: 255, g: 255, b: 255 }, // Arctic White
  { at: 8,   r: 244, g: 246, b: 248 }, // Cloud (slight cool tint)
  { at: 17,  r: 234, g: 235, b: 235 }, // Stone (warm neutral grey)
  { at: 22,  r: 248, g: 244, b: 239 }, // Pearl / Kırık Beyaz (warm tinted white)
  { at: 30,  r: 245, g: 241, b: 235 }, // Newsprint / NYT
  { at: 44,  r: 237, g: 227, b: 209 }, // Cream / Kindle
  { at: 56,  r: 226, g: 211, b: 188 }, // Parchment / Remarkable
  { at: 68,  r: 208, g: 191, b: 160 }, // Honey
  { at: 79,  r: 192, g: 168, b: 132 }, // Sepia
  { at: 90,  r: 168, g: 144, b: 110 }, // Deep Sepia
  { at: 100, r: 139, g: 115, b:  85 }, // Antique parchment
];

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

/** Interpolate between stops for smooth gradation. */
function interpolateWarmth(value: number): { r: number; g: number; b: number } {
  const clamped = Math.max(0, Math.min(100, value));

  let lo = WARMTH_STOPS[0];
  let hi = WARMTH_STOPS[WARMTH_STOPS.length - 1];

  for (let i = 0; i < WARMTH_STOPS.length - 1; i++) {
    if (clamped >= WARMTH_STOPS[i].at && clamped <= WARMTH_STOPS[i + 1].at) {
      lo = WARMTH_STOPS[i];
      hi = WARMTH_STOPS[i + 1];
      break;
    }
  }

  const range = hi.at - lo.at;
  const t = range === 0 ? 0 : (clamped - lo.at) / range;

  return {
    r: lerp(lo.r, hi.r, t),
    g: lerp(lo.g, hi.g, t),
    b: lerp(lo.b, hi.b, t),
  };
}

/**
 * Compute warmth-based style for any reading surface.
 * Pass `nightMode = true` to get the night-reading dark theme.
 *
 * @param value     0–100 (0 = Arctic white, 100 = Antique parchment)
 * @param nightMode boolean – enables dark night reading mode
 */
export function getWarmthStyle(value: number = 0, nightMode = false): WarmthStyle {
  if (nightMode) {
    return {
      backgroundColor: NIGHT_PRESET.hex,
      color: NIGHT_PRESET.textColor,
      borderColor: '#2E2E2C',
      insetBg: '#141412',
      isDark: true,
    };
  }

  const { r, g, b } = interpolateWarmth(value);

  // Text: stays very dark but gets slightly warmer as paper warms
  const textWarm = Math.round(value * 0.08);
  const textColor = `rgb(${22 + textWarm}, ${20 + textWarm}, ${16 + textWarm})`;

  // Inset bg: slightly darker than paper surface
  const insetR = Math.max(0, r - 9);
  const insetG = Math.max(0, g - 11);
  const insetB = Math.max(0, b - 14);

  // Border color: a warm seam line
  const borderR = Math.max(0, r - 20);
  const borderG = Math.max(0, g - 22);
  const borderB = Math.max(0, b - 26);

  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    color: textColor,
    borderColor: `rgb(${borderR}, ${borderG}, ${borderB})`,
    insetBg: `rgb(${insetR}, ${insetG}, ${insetB})`,
    isDark: false,
  };
}

/**
 * Convenience: returns CSSProperties with backgroundColor + color.
 * Compatible with old `getPaperStyle` API.
 */
export function getPaperStyle(warmth: number = 0, nightMode = false): React.CSSProperties {
  const s = getWarmthStyle(warmth, nightMode);
  return {
    backgroundColor: s.backgroundColor,
    color: s.color,
  };
}

/**
 * Human-readable label for the current warmth value.
 */
export function getWarmthLabel(value: number, nightMode = false): string {
  if (nightMode) return 'Gece Modu';
  const match = [...WARMTH_PRESETS].sort((a, b) =>
    Math.abs(a.value - value) - Math.abs(b.value - value)
  )[0];
  return match?.labelTr ?? 'Krem';
}
