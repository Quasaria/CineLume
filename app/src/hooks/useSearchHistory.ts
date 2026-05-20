import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'cinelume_search_history';
const MAX_ITEMS = 8;

/**
 * Petit historique des recherches recentes en localStorage. Permet de
 * reproposer les queries au focus quand l'input est vide, pour eviter
 * de retaper "Dune" trois fois par session.
 */
export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
    } catch {
      return [];
    }
  });

  const push = useCallback((query: string) => {
    const q = query.trim();
    if (q.length < 2) return;
    setHistory((curr) => {
      // Dedupe (case-insensitive), met en tete, cap a MAX_ITEMS.
      const filtered = curr.filter((x) => x.toLowerCase() !== q.toLowerCase());
      return [q, ...filtered].slice(0, MAX_ITEMS);
    });
  }, []);

  const remove = useCallback((query: string) => {
    setHistory((curr) => curr.filter((x) => x !== query));
  }, []);

  const clear = useCallback(() => {
    setHistory([]);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // quota plein, on ignore
    }
  }, [history]);

  return { history, push, remove, clear };
}

/**
 * Surligne les portions du texte qui matchent le query en
 * insensible-a-la-casse. Renvoie un tableau de bouts (string ou span
 * marque) pour rendu dans React.
 */
export function highlightMatch(text: string, query: string): Array<{ text: string; match: boolean }> {
  const q = query.trim();
  if (!q) return [{ text, match: false }];
  const lower = text.toLowerCase();
  const lowerQ = q.toLowerCase();
  const parts: Array<{ text: string; match: boolean }> = [];
  let i = 0;
  while (i < text.length) {
    const idx = lower.indexOf(lowerQ, i);
    if (idx === -1) {
      parts.push({ text: text.slice(i), match: false });
      break;
    }
    if (idx > i) parts.push({ text: text.slice(i, idx), match: false });
    parts.push({ text: text.slice(idx, idx + q.length), match: true });
    i = idx + q.length;
  }
  return parts;
}
