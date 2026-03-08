/**
 * Sentinel GRC v3.0 — Dinamik Tema Motoru: Zustand Store
 *
 * Kullanıcının seçtiği tema kimliğini tutar ve localStorage'a kalıcı olarak yazar.
 * ThemeProvider bu store'u dinleyerek <html data-theme="..."> niteliğini günceller.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Mevcut açık tema tanımlayıcıları */
export type LightThemeId = 'zen' | 'cloud' | 'enterprise' | 'ice';
/** Mevcut koyu tema tanımlayıcıları */
export type DarkThemeId = 'obsidian' | 'abyss' | 'nebula' | 'matrix';

export type ThemeId = LightThemeId | DarkThemeId;

export interface ThemeOption {
  id: ThemeId;
 /** Kullanıcıya gösterilen başlık */
 label: string;
 /** Açıklama metni */
 description: string;
 /** Arka plan rengi önizlemesi */
 previewCanvas: string;
 /** Yüzey rengi önizlemesi */
 previewSurface: string;
 /** Vurgu rengi */
 previewAccent: string;
}

/** Açık temalar */
export const LIGHT_THEMES: ThemeOption[] = [
  {
    id: 'zen',
    label: 'Zen Paper',
    description: 'Sıcak kırık beyaz — odaklı denetim çalışması için sakin zemin',
    previewCanvas: '#FDFBF7',
    previewSurface: '#FFFFFF',
    previewAccent: '#3B82F6',
  },
  {
    id: 'cloud',
    label: 'Cloud Slate',
    description: 'Teknolojik serin mat gri — BT ve CCM modülleri için',
    previewCanvas: '#F8FAFC',
    previewSurface: '#F1F5F9',
    previewAccent: '#0EA5E9',
  },
  {
    id: 'enterprise',
    label: 'Enterprise Clean',
    description: 'Saf ve keskin kurumsal beyaz — sunum ve raporlama için',
    previewCanvas: '#FFFFFF',
    previewSurface: '#F9FAFB',
    previewAccent: '#1D4ED8',
  },
  {
    id: 'ice',
    label: 'Ice Glass',
    description: 'Buz mavisi cam efekti — risk ve uyum panolarında odak',
    previewCanvas: '#F0F9FF',
    previewSurface: '#E0F2FE',
    previewAccent: '#0284C7',
  },
];

/** Koyu temalar */
export const DARK_THEMES: ThemeOption[] = [
  {
    id: 'obsidian',
    label: 'Obsidian Dark',
    description: 'Derin uzay grisi — Göz yormayan analitik odaklı karanlık',
    previewCanvas: '#020617',
    previewSurface: '#0F172A',
    previewAccent: '#3B82F6',
  },
  {
    id: 'abyss',
    label: 'Navy Abyss',
    description: 'Derin okyanus laciverti — Kurumsal gece vardiyası',
    previewCanvas: '#030712',
    previewSurface: '#111827',
    previewAccent: '#6366F1',
  },
  {
    id: 'nebula',
    label: 'Purple Nebula',
    description: 'Mor ötesi karanlık uzay — Siber güvenlik ve sızma testleri için',
    previewCanvas: '#0A0A0A',
    previewSurface: '#171717',
    previewAccent: '#9333EA',
  },
  {
    id: 'matrix',
    label: 'Matrix Green',
    description: 'Terminal hacker yeşili — Kod denetimi izole ortamı',
    previewCanvas: '#052E16',
    previewSurface: '#064E3B',
    previewAccent: '#10B981',
  },
];

export const THEME_OPTIONS: ThemeOption[] = [...LIGHT_THEMES, ...DARK_THEMES];

interface ThemeStore {
  /** Aktif tema modu (açık / koyu) */
  mode: 'light' | 'dark';
  /** Aktif tema kimliği */
  activeTheme: ThemeId;
  /** Mod değiştir */
  setMode: (mode: 'light' | 'dark') => void;
 /** Tema değiştir */
 setTheme: (theme: ThemeId) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      mode: 'light',
      activeTheme: 'zen',
      setMode: (mode) =>
        set((state) => {
          if (state.mode === mode) return state;
          return {
            mode,
            activeTheme: mode === 'dark' ? 'obsidian' : 'zen',
          };
        }),
      setTheme: (theme) => set({ activeTheme: theme }),
    }),
    {
      name: 'sentinel-theme',
    }
  )
);
