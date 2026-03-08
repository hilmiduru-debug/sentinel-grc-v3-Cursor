/**
 * Sentinel GRC v3.0 — ThemeProvider
 *
 * Zustand theme-store'u dinleyerek <html> üzerindeki [data-theme] niteliğini
 * güncelleyen hafif bir React sağlayıcısıdır.
 * CSS değişkenleri (Design Tokens) bu nitelik değişiminde otomatik devreye girer.
 */

import { useThemeStore } from '@/shared/stores/theme-store';
import { useEffect } from 'react';

interface ThemeProviderProps {
 children: React.ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
 const { activeTheme, mode } = useThemeStore();

 useEffect(() => {
 // <html data-theme="..."> and <html data-theme-mode="..."> attributes
 document.documentElement.setAttribute('data-theme', activeTheme);
 document.documentElement.setAttribute('data-theme-mode', mode);

 // Tailwind dark: class toggle fallback
 if (mode === 'dark') {
   document.documentElement.classList.add('dark');
 } else {
   document.documentElement.classList.remove('dark');
 }
 }, [activeTheme, mode]);

 return <>{children}</>;
};
