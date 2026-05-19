import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import i18n from "@/i18n"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmtDateLocalized(s: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }): string {
  if (!s) return i18n.t('common.unknownDate');
  // TMDB peut renvoyer des dates au format ISO "2026-05-20T00:00:00.000Z" :
  // on garde uniquement la partie date avant le T avant de splitter.
  const cleaned = s.split('T')[0];
  const parts = cleaned.split('-').map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return i18n.t('common.unknownDate');
  const [y, m, d] = parts;
  return new Date(y, m - 1, d).toLocaleDateString(i18n.language || 'fr', opts);
}
