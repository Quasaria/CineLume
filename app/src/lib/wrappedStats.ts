import type { SeenMovie } from '@/types/movie';
import { dateKey as toDateKey, monthKey as toMonthKey } from './watchStats';

export type WrappedPeriod = 'month' | 'year';

export type TopFilm = SeenMovie;

export interface WrappedStats {
  period: WrappedPeriod;
  /** Anchor de la periode (mois 0-11 ignore si period === 'year'). */
  year: number;
  month: number;
  periodLabel: string;
  periodKey: string;
  /** Nombre de films vus dans la periode. */
  total: number;
  /** Films de la periode dans l'ordre chronologique (du + ancien au + recent). */
  films: SeenMovie[];
  /** Top films a montrer (les 5 derniers vus). */
  topFilms: TopFilm[];
  /** Top genres avec leur count et leur pourcentage du total. */
  topGenres: Array<{ id: number; count: number; pct: number }>;
  /** Plus longue serie de jours consecutifs avec au moins 1 film vu dans la periode. */
  longestStreak: number;
  /** Jour ou tu as vu le plus de films dans la periode. */
  bestDay: { dateKey: string; count: number } | null;
  /** Nombre de jours distincts ou tu as vu au moins 1 film. */
  daysWithFilm: number;
  /** Annual uniquement : films par mois. */
  byMonth?: Array<{ ym: string; monthIdx: number; count: number }>;
  /** Repartition par jour de la semaine (index 0 = lundi -> 6 = dimanche). */
  byDayOfWeek: number[];
  /** Decade dominante des films vus (1990, 2000, etc.) selon release_date. */
  topDecade: { decade: number; count: number } | null;
  /** Decennie la plus ancienne et la plus recente parcourues. */
  decadeRange: { min: number; max: number } | null;
  /** Total de la periode precedente equivalente (mois-1 ou annee-1) pour comparaison. */
  prevPeriodTotal: number;
  /** Pourcentage de changement vs periode precedente (-100 a +inf, null si prev = 0). */
  prevPeriodDelta: number | null;
  /** Premier et dernier film vus dans la periode (pour storytelling). */
  firstFilm: SeenMovie | null;
  lastFilm: SeenMovie | null;
}

const DAY_MS = 86400000;

function decadeOf(releaseDate: string | undefined): number | null {
  if (!releaseDate || releaseDate.length < 4) return null;
  const y = parseInt(releaseDate.slice(0, 4), 10);
  if (!Number.isFinite(y)) return null;
  return Math.floor(y / 10) * 10;
}

/** Index 0 = lundi, 6 = dimanche (cohrent avec le reste du code). */
function dayOfWeekIdx(d: Date): number {
  return (d.getDay() + 6) % 7;
}

interface PeriodBounds {
  startTs: number;
  endTs: number;
  prevStartTs: number;
  prevEndTs: number;
  periodLabel: string;
  periodKey: string;
}

function periodBounds(
  period: WrappedPeriod,
  year: number,
  month: number,
  lang: string,
): PeriodBounds {
  if (period === 'year') {
    const startTs = new Date(year, 0, 1, 0, 0, 0, 0).getTime();
    const endTs = new Date(year + 1, 0, 1, 0, 0, 0, 0).getTime();
    const prevStartTs = new Date(year - 1, 0, 1, 0, 0, 0, 0).getTime();
    const prevEndTs = startTs;
    return {
      startTs,
      endTs,
      prevStartTs,
      prevEndTs,
      periodLabel: String(year),
      periodKey: String(year),
    };
  }
  const startTs = new Date(year, month, 1, 0, 0, 0, 0).getTime();
  const endTs = new Date(year, month + 1, 1, 0, 0, 0, 0).getTime();
  const prevStartTs = new Date(year, month - 1, 1, 0, 0, 0, 0).getTime();
  const prevEndTs = startTs;
  const periodLabel = new Date(year, month, 1).toLocaleDateString(lang || 'fr', {
    month: 'long',
    year: 'numeric',
  });
  return {
    startTs,
    endTs,
    prevStartTs,
    prevEndTs,
    periodLabel,
    periodKey: toMonthKey(startTs),
  };
}

export function computeWrappedStats(
  allSeen: SeenMovie[],
  period: WrappedPeriod,
  year: number,
  month: number,
  lang: string = 'fr',
): WrappedStats {
  const { startTs, endTs, prevStartTs, prevEndTs, periodLabel, periodKey } = periodBounds(
    period,
    year,
    month,
    lang,
  );

  const films = allSeen
    .filter((s) => s.watchedAt >= startTs && s.watchedAt < endTs)
    .sort((a, b) => a.watchedAt - b.watchedAt);

  const prevPeriodTotal = allSeen.filter(
    (s) => s.watchedAt >= prevStartTs && s.watchedAt < prevEndTs,
  ).length;

  if (films.length === 0) {
    return {
      period,
      year,
      month,
      periodLabel,
      periodKey,
      total: 0,
      films: [],
      topFilms: [],
      topGenres: [],
      longestStreak: 0,
      bestDay: null,
      daysWithFilm: 0,
      byMonth: period === 'year' ? Array.from({ length: 12 }, (_, i) => ({
        ym: `${year}-${String(i + 1).padStart(2, '0')}`,
        monthIdx: i,
        count: 0,
      })) : undefined,
      byDayOfWeek: [0, 0, 0, 0, 0, 0, 0],
      topDecade: null,
      decadeRange: null,
      prevPeriodTotal,
      prevPeriodDelta: null,
      firstFilm: null,
      lastFilm: null,
    };
  }

  const dayCounts = new Map<string, number>();
  const monthCounts = new Map<string, number>();
  const genreCounts = new Map<number, number>();
  const decadeCounts = new Map<number, number>();
  const dowCounts = [0, 0, 0, 0, 0, 0, 0];
  let totalGenreTags = 0;
  let minDecade: number | null = null;
  let maxDecade: number | null = null;

  for (const s of films) {
    const dk = toDateKey(s.watchedAt);
    dayCounts.set(dk, (dayCounts.get(dk) || 0) + 1);
    const mk = toMonthKey(s.watchedAt);
    monthCounts.set(mk, (monthCounts.get(mk) || 0) + 1);
    dowCounts[dayOfWeekIdx(new Date(s.watchedAt))]++;
    for (const g of s.genre_ids || []) {
      genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
      totalGenreTags++;
    }
    const dec = decadeOf(s.release_date);
    if (dec !== null) {
      decadeCounts.set(dec, (decadeCounts.get(dec) || 0) + 1);
      if (minDecade === null || dec < minDecade) minDecade = dec;
      if (maxDecade === null || dec > maxDecade) maxDecade = dec;
    }
  }

  // Plus longue serie de jours consecutifs au sein de la periode. On compare
  // via Math.round((b - a) / 86400000) === 1 pour etre robuste au DST.
  const sortedDays = Array.from(dayCounts.keys()).sort();
  let longestStreak = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const dk of sortedDays) {
    const [y, m, d] = dk.split('-').map(Number);
    const day = new Date(y, m - 1, d);
    if (prev && Math.round((day.getTime() - prev.getTime()) / DAY_MS) === 1) {
      run++;
    } else {
      run = 1;
    }
    if (run > longestStreak) longestStreak = run;
    prev = day;
  }

  let bestDay: { dateKey: string; count: number } | null = null;
  for (const [dk, count] of dayCounts) {
    if (!bestDay || count > bestDay.count) bestDay = { dateKey: dk, count };
  }

  const topGenres = Array.from(genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({
      id,
      count,
      pct: totalGenreTags > 0 ? Math.round((count / totalGenreTags) * 100) : 0,
    }));

  const sortedByMostRecent = [...films].sort((a, b) => b.watchedAt - a.watchedAt);
  const topFilms = sortedByMostRecent.slice(0, 5);

  let byMonth: WrappedStats['byMonth'];
  if (period === 'year') {
    byMonth = Array.from({ length: 12 }, (_, i) => {
      const ym = `${year}-${String(i + 1).padStart(2, '0')}`;
      return { ym, monthIdx: i, count: monthCounts.get(ym) || 0 };
    });
  }

  let topDecade: WrappedStats['topDecade'] = null;
  for (const [dec, count] of decadeCounts) {
    if (!topDecade || count > topDecade.count) topDecade = { decade: dec, count };
  }

  const decadeRange =
    minDecade !== null && maxDecade !== null ? { min: minDecade, max: maxDecade } : null;

  const prevPeriodDelta =
    prevPeriodTotal === 0
      ? null
      : Math.round(((films.length - prevPeriodTotal) / prevPeriodTotal) * 100);

  return {
    period,
    year,
    month,
    periodLabel,
    periodKey,
    total: films.length,
    films,
    topFilms,
    topGenres,
    longestStreak,
    bestDay,
    daysWithFilm: dayCounts.size,
    byMonth,
    byDayOfWeek: dowCounts,
    topDecade,
    decadeRange,
    prevPeriodTotal,
    prevPeriodDelta,
    firstFilm: films[0],
    lastFilm: films[films.length - 1],
  };
}

/** Label court du jour de la semaine pour les visualisations. */
export function dayOfWeekLabel(idx: number, lang: string = 'fr'): string {
  // index 0 = lundi
  const ref = new Date(2024, 0, 1); // 2024-01-01 etait un lundi
  ref.setDate(ref.getDate() + idx);
  return ref.toLocaleDateString(lang || 'fr', { weekday: 'short' });
}
