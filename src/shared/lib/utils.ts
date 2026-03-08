import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
 return twMerge(clsx(inputs));
}

export function isLowPerformanceDevice(): boolean {
 if (typeof window === "undefined") return false;
 return window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
 (navigator.hardwareConcurrency ? navigator.hardwareConcurrency < 4 : false);
}

export const formatCurrency = (amount: number) => {
 return new Intl.NumberFormat('tr-TR', {
 style: 'currency',
 currency: 'TRY',
 }).format(amount);
};

export const getContrastYIQ = (hexcolor: string) => {
  if (!hexcolor) return 'dark';
  hexcolor = hexcolor.replace("#", "");
  if (hexcolor.length === 3) {
    hexcolor = hexcolor.split("").map((h) => h + h).join("");
  }
  const r = parseInt(hexcolor.substring(0, 2), 16);
  const g = parseInt(hexcolor.substring(2, 4), 16);
  const b = parseInt(hexcolor.substring(4, 6), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 128 ? 'light' : 'dark';
};
