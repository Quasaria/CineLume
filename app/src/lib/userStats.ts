import type { FavoriteMovie, CustomList } from '@/types/movie';

/**
 * Calcule des statistiques personnelles a partir des donnees locales
 * (favoris + watchlist + listes). Tout est compute side-ride, aucune
 * requete TMDB necessaire (les genres_ids ne sont pas dans FavoriteMovie,
 * donc on travaille avec ce qu'on a : counts, dates, ratings TMDB).
 */

export interface UserStats {
  totalTracked: number;       // favorites + watchlist (dedup par id)
  favoritesCount: number;
  watchlistCount: number;
  customListsCount: number;
  upcomingThisMonth: number;  // films suivis qui sortent dans les 30 prochains jours
  thisWeek: number;           // films suivis qui sortent dans les 7 prochains jours
  alreadyReleased: number;
  avgVoteAverage: number | null;  // moyenne des vote_average TMDB sur l'ensemble suivi
  oldestTracked: FavoriteMovie | null;
  nextUpcoming: FavoriteMovie | null;
}

function parseLocalDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const parts = s.split('-').map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

export function computeUserStats(
  favorites: FavoriteMovie[],
  watchlist: FavoriteMovie[],
  customLists: CustomList[],
): UserStats {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);
  const monthEnd = new Date(today);
  monthEnd.setDate(today.getDate() + 30);

  // Dedup par id pour le total et la moyenne (un film peut etre dans les 2 listes)
  const allMap = new Map<number, FavoriteMovie>();
  for (const f of [...favorites, ...watchlist]) {
    allMap.set(f.id, f);
  }
  const all = Array.from(allMap.values());

  let upcomingThisMonth = 0;
  let thisWeek = 0;
  let alreadyReleased = 0;
  let voteSum = 0;
  let voteCount = 0;
  let oldestTracked: FavoriteMovie | null = null;
  let oldestDate: Date | null = null;
  let nextUpcoming: FavoriteMovie | null = null;
  let nextDate: Date | null = null;

  for (const f of all) {
    if (f.vote_average > 0) {
      voteSum += f.vote_average;
      voteCount += 1;
    }
    const d = parseLocalDate(f.release_date);
    if (!d) continue;
    if (d < today) {
      alreadyReleased += 1;
      if (!oldestDate || d < oldestDate) {
        oldestDate = d;
        oldestTracked = f;
      }
    } else {
      if (d <= weekEnd) thisWeek += 1;
      if (d <= monthEnd) upcomingThisMonth += 1;
      if (!nextDate || d < nextDate) {
        nextDate = d;
        nextUpcoming = f;
      }
    }
  }

  return {
    totalTracked: all.length,
    favoritesCount: favorites.length,
    watchlistCount: watchlist.length,
    customListsCount: customLists.length,
    upcomingThisMonth,
    thisWeek,
    alreadyReleased,
    avgVoteAverage: voteCount > 0 ? voteSum / voteCount : null,
    oldestTracked,
    nextUpcoming,
  };
}
