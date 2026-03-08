/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"], // Finansal veriler için
      },
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        // --- DARKSIDE COLOR INVERSION ENGINE ---
        white: "rgb(var(--tw-white) / <alpha-value>)",
        black: "rgb(var(--tw-black) / <alpha-value>)",
        slate: {
          50: "rgb(var(--tw-slate-50) / <alpha-value>)",
          100: "rgb(var(--tw-slate-100) / <alpha-value>)",
          200: "rgb(var(--tw-slate-200) / <alpha-value>)",
          300: "rgb(var(--tw-slate-300) / <alpha-value>)",
          400: "rgb(var(--tw-slate-400) / <alpha-value>)",
          500: "rgb(var(--tw-slate-500) / <alpha-value>)",
          600: "rgb(var(--tw-slate-600) / <alpha-value>)",
          700: "rgb(var(--tw-slate-700) / <alpha-value>)",
          800: "rgb(var(--tw-slate-800) / <alpha-value>)",
          900: "rgb(var(--tw-slate-900) / <alpha-value>)",
          950: "rgb(var(--tw-slate-950) / <alpha-value>)",
        },
        gray: {
          50: "rgb(var(--tw-gray-50) / <alpha-value>)",
          100: "rgb(var(--tw-gray-100) / <alpha-value>)",
          200: "rgb(var(--tw-gray-200) / <alpha-value>)",
          300: "rgb(var(--tw-gray-300) / <alpha-value>)",
          400: "rgb(var(--tw-gray-400) / <alpha-value>)",
          500: "rgb(var(--tw-gray-500) / <alpha-value>)",
          600: "rgb(var(--tw-gray-600) / <alpha-value>)",
          700: "rgb(var(--tw-gray-700) / <alpha-value>)",
          800: "rgb(var(--tw-gray-800) / <alpha-value>)",
          900: "rgb(var(--tw-gray-900) / <alpha-value>)",
          950: "rgb(var(--tw-gray-950) / <alpha-value>)",
        },
        zinc: {
          50: "rgb(var(--tw-zinc-50) / <alpha-value>)",
          100: "rgb(var(--tw-zinc-100) / <alpha-value>)",
          200: "rgb(var(--tw-zinc-200) / <alpha-value>)",
          300: "rgb(var(--tw-zinc-300) / <alpha-value>)",
          400: "rgb(var(--tw-zinc-400) / <alpha-value>)",
          500: "rgb(var(--tw-zinc-500) / <alpha-value>)",
          600: "rgb(var(--tw-zinc-600) / <alpha-value>)",
          700: "rgb(var(--tw-zinc-700) / <alpha-value>)",
          800: "rgb(var(--tw-zinc-800) / <alpha-value>)",
          900: "rgb(var(--tw-zinc-900) / <alpha-value>)",
          950: "rgb(var(--tw-zinc-950) / <alpha-value>)",
        },
        
        // --- CHAMELEON ENGINE ---
        // RGB formatında tanımlıyoruz ki Tailwind opacity değiştirebilsin (bg-primary/20)
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
        },
        sidebar: {
          DEFAULT: "rgb(var(--sidebar-bg) / <alpha-value>)",
          foreground: "rgb(var(--sidebar-fg) / <alpha-value>)",
          border: "rgb(var(--sidebar-border) / <alpha-value>)",
        },

        // --- TEMA MOTORU: CSS Değişkeni Tokenları ---
        // Kullanım: bg-canvas, bg-surface, text-primary, border-default vb.
        canvas:      'var(--bg-canvas)',
        surface:     'var(--bg-surface)',
        'surface-alt': 'var(--bg-surface-alt)',
        elevated:    'var(--bg-elevated)',
        'glass-bg':  'var(--glass-bg)',

        'text-primary':   'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted':     'var(--text-muted)',

        'accent-primary': 'var(--accent-primary)',
        'accent-subtle':  'var(--accent-subtle)',

        // --- RISK & AI PALETTE ---
        risk: {
          critical: "#E11D48", // Rose-600
          high: "#F97316",     // Orange-500
          medium: "#EAB308",   // Yellow-500
          low: "#10B981",      // Emerald-500
        },
        brain: {
          gen: "#6366F1",      // Indigo (Yaratıcı)
          calc: "#F59E0B",     // Amber (Hesaplamalı)
        }
      },
      boxShadow: {
        'glass':       '0 4px 30px rgba(0, 0, 0, 0.03)',
        'glass-hover': '0 10px 40px -10px rgba(79, 70, 229, 0.15)',
        'theme':       'var(--glass-shadow)',
      },
      borderColor: {
        'default': 'var(--border-default)',
        'strong':  'var(--border-strong)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
}