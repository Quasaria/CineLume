import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmtDateFR(s: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }): string {
  if (!s) return 'Date inconnue';
  const parts = s.split('-').map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return 'Date inconnue';
  const [y, m, d] = parts;
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', opts);
}
