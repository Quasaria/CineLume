import type { FavoriteMovie } from '@/types/movie';
import { searchMovies } from '@/lib/tmdb';

/**
 * Helpers pour interagir avec Letterboxd sans API officielle (pas d'OAuth
 * public, leur API est restreinte aux partenaires). On passe par :
 * - deep links via /tmdb/{id}/ (Letterboxd redirige automatiquement)
 * - import CSV depuis l'export Letterboxd Settings > Import & Export
 * - export CSV au format simple que Letterboxd accepte a l'import
 */

export const LETTERBOXD_BASE = 'https://letterboxd.com';

export function letterboxdUrl(tmdbId: number): string {
  return `${LETTERBOXD_BASE}/tmdb/${tmdbId}/`;
}

/**
 * Parse minimal de CSV (RFC 4180-ish) : gere les champs quotes, les
 * double-quotes escape, les CRLF. Suffisant pour les exports Letterboxd
 * qui sont bien formes.
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuote = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuote = true;
      } else if (c === ',') {
        cur.push(field);
        field = '';
      } else if (c === '\n') {
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = '';
      } else if (c === '\r') {
        // skip CR du CRLF, le LF declenche la nouvelle ligne
      } else {
        field += c;
      }
    }
  }
  if (field || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

interface LetterboxdRow {
  name: string;
  year: number | null;
}

/**
 * Extrait Name + Year d'un CSV d'export Letterboxd. Marche pour
 * watchlist.csv (Date, Name, Year, Letterboxd URI) ou films.csv
 * (Date, Name, Year, Letterboxd URI, Rating) etc.
 */
export function parseLetterboxdCSV(text: string): LetterboxdRow[] {
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const nameIdx = header.indexOf('name');
  const yearIdx = header.indexOf('year');
  if (nameIdx === -1) return [];

  return rows.slice(1)
    .map((r) => ({
      name: (r[nameIdx] || '').trim(),
      year: yearIdx >= 0 && r[yearIdx] ? parseInt(r[yearIdx], 10) : null,
    }))
    .filter((r) => !!r.name);
}

interface ImportResult {
  imported: FavoriteMovie[];
  skipped: { name: string; reason: 'no-match' | 'error' }[];
}

interface ImportOptions {
  onProgress?: (current: number, total: number, currentTitle: string) => void;
  signal?: AbortSignal;
  concurrency?: number;
}

/**
 * Import : pour chaque ligne du CSV, on cherche le film dans TMDB par
 * titre, on filtre les resultats par annee (+/- 1 an pour tolerance des
 * sortie nationale), on garde le plus populaire qui matche.
 *
 * Avec concurrence limitee pour respecter le rate limit TMDB
 * (40 req/10s). Default 4 parallel. AbortSignal pour cancel l'import.
 */
export async function importFromLetterboxd(
  rows: LetterboxdRow[],
  options: ImportOptions = {},
): Promise<ImportResult> {
  const { onProgress, signal, concurrency = 4 } = options;
  const imported: FavoriteMovie[] = [];
  const skipped: ImportResult['skipped'] = [];
  let done = 0;

  async function processOne(row: LetterboxdRow): Promise<void> {
    if (signal?.aborted) return;
    onProgress?.(done, rows.length, row.name);
    try {
      const res = await searchMovies(row.name, 1, signal);
      let candidates = res.results.filter((m) => !!m.poster_path);
      if (row.year !== null) {
        const yearFiltered = candidates.filter((m) => {
          if (!m.release_date) return false;
          const y = parseInt(m.release_date.slice(0, 4), 10);
          return Math.abs(y - row.year!) <= 1;
        });
        if (yearFiltered.length > 0) {
          candidates = yearFiltered;
        }
      }
      const best = candidates[0];
      if (!best) {
        skipped.push({ name: row.name, reason: 'no-match' });
      } else {
        imported.push({
          id: best.id,
          title: best.title,
          poster_path: best.poster_path,
          release_date: best.release_date,
          vote_average: best.vote_average,
          overview: best.overview,
        });
      }
    } catch {
      skipped.push({ name: row.name, reason: 'error' });
    } finally {
      done += 1;
      onProgress?.(done, rows.length, row.name);
    }
  }

  // Worker pool : on fait avancer N requetes en parallele en piochant
  // dans la queue.
  const queue = [...rows];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0 && !signal?.aborted) {
      const row = queue.shift();
      if (!row) break;
      await processOne(row);
    }
  });
  await Promise.all(workers);

  return { imported, skipped };
}

/**
 * Export au format CSV minimal accepte par Letterboxd a l'import. Trois
 * colonnes : tmdbID, Title, Year. Pas de Date, pas de Rating (on n'en a
 * pas dans FavoriteMovie sauf vote_average qui n'a rien a voir).
 */
export function exportToLetterboxdCSV(films: FavoriteMovie[]): string {
  const escape = (s: string) => {
    if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = ['tmdbID', 'Title', 'Year'];
  const lines = [header.join(',')];
  for (const f of films) {
    const year = f.release_date ? f.release_date.slice(0, 4) : '';
    lines.push([String(f.id), escape(f.title), year].join(','));
  }
  return lines.join('\r\n');
}
