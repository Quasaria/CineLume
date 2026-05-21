import type { SeenMovie } from '@/types/movie';

export interface WatchStats {
  total: number;
  thisYear: number;
  thisMonth: number;
  currentStreak: number;
  maxStreak: number;
  topMonth: { ym: string; count: number } | null;
  topGenres: Array<{ id: number; count: number }>;
  firstWatchAt: number | null;
  byMonth: Array<{ ym: string; films: SeenMovie[] }>;
}

function dateKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export { dateKey, monthKey };

/**
 * Calcule un ensemble de stats agrégées sur l'historique des films vus.
 * Streak = nombre de jours consecutifs (ou non) avec au moins 1 visionnage.
 * Top month / top genres : pour la section "tendances perso".
 */
export function computeWatchStats(seen: SeenMovie[]): WatchStats {
  if (seen.length === 0) {
    return {
      total: 0, thisYear: 0, thisMonth: 0,
      currentStreak: 0, maxStreak: 0,
      topMonth: null, topGenres: [], firstWatchAt: null, byMonth: [],
    };
  }

  const now = new Date();
  const thisYearN = now.getFullYear();
  const thisMonthN = now.getMonth();

  let thisYear = 0;
  let thisMonth = 0;
  let firstWatchAt = Number.MAX_SAFE_INTEGER;

  const daysWithFilm = new Set<string>();
  const byMonthMap = new Map<string, SeenMovie[]>();
  const byGenreCount = new Map<number, number>();

  for (const s of seen) {
    const d = new Date(s.watchedAt);
    if (d.getFullYear() === thisYearN) thisYear++;
    if (d.getFullYear() === thisYearN && d.getMonth() === thisMonthN) thisMonth++;
    if (s.watchedAt < firstWatchAt) firstWatchAt = s.watchedAt;
    daysWithFilm.add(dateKey(s.watchedAt));
    const ym = monthKey(s.watchedAt);
    const arr = byMonthMap.get(ym);
    if (arr) arr.push(s);
    else byMonthMap.set(ym, [s]);
    for (const g of (s.genre_ids || [])) {
      byGenreCount.set(g, (byGenreCount.get(g) || 0) + 1);
    }
  }

  // Current streak : nombre de jours consecutifs en partant d'aujourd'hui
  // en arriere, jusqu'au premier jour sans film.
  let currentStreak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (daysWithFilm.has(dateKey(cursor.getTime()))) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Max streak. On compare via Math.round((b - a) / 86400000) === 1 plutot
  // que strict ===, parce qu'aux jours de changement d'heure (DST) deux
  // minuits consecutifs sont espaces de 23 ou 25h, pas 24. Le round arrondit
  // au jour calendaire le plus proche.
  const sortedDays = Array.from(daysWithFilm).sort();
  let maxStreak = 0;
  let currentRun = 0;
  let prevDay: Date | null = null;
  for (const dk of sortedDays) {
    const [y, m, d] = dk.split('-').map(Number);
    const day = new Date(y, m - 1, d);
    if (prevDay && Math.round((day.getTime() - prevDay.getTime()) / 86400000) === 1) {
      currentRun++;
    } else {
      currentRun = 1;
    }
    if (currentRun > maxStreak) maxStreak = currentRun;
    prevDay = day;
  }

  // Top month
  let topMonth: { ym: string; count: number } | null = null;
  for (const [ym, films] of byMonthMap) {
    if (!topMonth || films.length > topMonth.count) {
      topMonth = { ym, count: films.length };
    }
  }

  // Top genres (5)
  const topGenres = Array.from(byGenreCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ id, count }));

  // ByMonth ordonne du plus recent au plus ancien
  const byMonth = Array.from(byMonthMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([ym, films]) => ({
      ym,
      films: films.sort((a, b) => b.watchedAt - a.watchedAt),
    }));

  return {
    total: seen.length,
    thisYear,
    thisMonth,
    currentStreak,
    maxStreak,
    topMonth,
    topGenres,
    firstWatchAt: firstWatchAt === Number.MAX_SAFE_INTEGER ? null : firstWatchAt,
    byMonth,
  };
}

/**
 * Construit la grille de la heatmap : 7 jours (rangees) x ~53 semaines
 * (colonnes), en partant du Lundi il y a ~12 mois jusqu'a aujourd'hui.
 * Retourne un tableau plat avec chaque cell {date, count, weekIdx, dayIdx}
 * pour rendu en CSS Grid.
 */
export interface HeatmapCell {
  date: Date;
  dateKey: string;
  count: number;
  weekIdx: number;
  dayIdx: number;
}

export function computeHeatmap(seen: SeenMovie[]): { cells: HeatmapCell[]; weeks: number } {
  const counts = new Map<string, number>();
  for (const s of seen) {
    const k = dateKey(s.watchedAt);
    counts.set(k, (counts.get(k) || 0) + 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // On part du lundi d'il y a 52 semaines pour avoir un alignement propre
  const start = new Date(today);
  start.setDate(start.getDate() - 7 * 52);
  // Aligne sur lundi (jour 1, dimanche = 0 -> on recule jusqu'au lundi)
  const dayOfWeek = (start.getDay() + 6) % 7; // 0=lundi, 6=dimanche
  start.setDate(start.getDate() - dayOfWeek);

  const cells: HeatmapCell[] = [];
  const cursor = new Date(start);
  let weekIdx = 0;
  while (cursor <= today) {
    const dayIdx = (cursor.getDay() + 6) % 7;
    const k = dateKey(cursor.getTime());
    cells.push({
      date: new Date(cursor),
      dateKey: k,
      count: counts.get(k) || 0,
      weekIdx,
      dayIdx,
    });
    if (dayIdx === 6) weekIdx++;
    cursor.setDate(cursor.getDate() + 1);
  }

  return { cells, weeks: weekIdx + 1 };
}
