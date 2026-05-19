import type { Movie, MovieDetails, Genre } from '@/types/movie';
import { tmdbLang } from '@/i18n';

const ENV_KEY = import.meta.env.VITE_TMDB_KEY as string | undefined;
const BASE = 'https://api.themoviedb.org/3';
export const IMG = 'https://image.tmdb.org/t/p/w500';
export const BACK = 'https://image.tmdb.org/t/p/w1280';
export const PROF = 'https://image.tmdb.org/t/p/w185';
export const ORIG = 'https://image.tmdb.org/t/p/original';

const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p';

// Cache la cle API en memoire pour eviter un acces localStorage par appel
// (le filtrage en cascade fait 20 getMovieReleaseDates par page change).
let _cachedKey: string | null = null;

export function posterSrcSet(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return [185, 342, 500].map((w) => `${TMDB_IMG_BASE}/w${w}${path} ${w}w`).join(', ');
}

export function backdropSrcSet(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return [780, 1280].map((w) => `${TMDB_IMG_BASE}/w${w}${path} ${w}w`).join(', ');
}

export function profileSrcSet(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return [`${TMDB_IMG_BASE}/w45${path} 45w`, `${TMDB_IMG_BASE}/w185${path} 185w`].join(', ');
}
export const TMDB_SITE = 'https://www.themoviedb.org/movie';

function getApiKey(): string {
  if (_cachedKey !== null) return _cachedKey;
  const stored = localStorage.getItem('tmdb_key');
  _cachedKey = stored || ENV_KEY || '';
  return _cachedKey;
}

// A appeler depuis SettingsModal quand l'utilisateur change/efface sa cle.
export function invalidateApiKeyCache() {
  _cachedKey = null;
}

// Type d'erreur enrichi pour distinguer cle invalide, rate limit et autres
// erreurs reseau (utile pour les messages user-facing et le retry policy).
export class TMDBError extends Error {
  status: number;
  retryable: boolean;
  constructor(status: number, message: string, retryable: boolean) {
    super(message);
    this.name = 'TMDBError';
    this.status = status;
    this.retryable = retryable;
  }
}

function handleResponseError(res: Response): TMDBError {
  if (res.status === 401 || res.status === 403) {
    return new TMDBError(res.status, 'Clé API TMDB invalide ou expirée', false);
  }
  if (res.status === 429) {
    return new TMDBError(res.status, 'Trop de requêtes TMDB, ralentis un peu', true);
  }
  if (res.status >= 500) {
    return new TMDBError(res.status, 'TMDB indisponible, réessaie plus tard', true);
  }
  return new TMDBError(res.status, 'Erreur de connexion TMDB', false);
}

export interface DiscoverParams {
  region?: string;
  genre?: string;
  startDate: string;
  endDate: string;
  page: number;
  releaseMode?: 'theater' | 'platform' | 'all';
  provider?: string;
  personId?: number | null;
  sortBy?: 'popularity' | 'date' | 'rating';
  runtimeMax?: number | null;
}

export interface PersonSearchResult {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
  known_for?: { id: number; title?: string; name?: string; media_type: string }[];
}

export interface Provider {
  id: string;
  name: string;
  color: string;
  initial: string;
  textColor?: string;
}

export const PROVIDERS: Provider[] = [
  { id: '8', name: 'Netflix', color: '#e50914', initial: 'N' },
  { id: '119', name: 'Prime Video', color: '#00a8e1', initial: 'P' },
  { id: '337', name: 'Disney+', color: '#0e47a1', initial: 'D+' },
  { id: '350', name: 'Apple TV+', color: '#000000', initial: 'tv' },
  { id: '1899', name: 'Max', color: '#002be7', initial: 'M' },
  { id: '531', name: 'Paramount+', color: '#0064ff', initial: 'P+' },
  { id: '381', name: 'Canal+', color: '#000000', initial: 'C+' },
];

export async function discoverMovies(params: DiscoverParams, signal?: AbortSignal): Promise<{ results: Movie[]; total_pages: number; total_results: number }> {
  const apiKey = getApiKey();
  const region = params.region || 'FR';
  const mode = params.releaseMode || 'theater';
  const genreQ = params.genre ? `&with_genres=${params.genre}` : '';

  let releaseTypeQ = '';
  let providerQ = '';
  if (mode === 'theater') {
    releaseTypeQ = '&with_release_type=1|2|3';
  } else if (mode === 'platform') {
    releaseTypeQ = '&with_release_type=4|6';
    if (params.provider) {
      providerQ = `&with_watch_providers=${params.provider}&watch_region=${region}`;
    }
  } else {
    releaseTypeQ = '&with_release_type=1|2|3|4|6';
  }

  const personQ = params.personId ? `&with_people=${params.personId}` : '';

  // Filtre par release_date dans la region selectionnee. TMDB retourne les
  // films qui ont au moins une sortie correspondante en FR (ou region) dans
  // la fenetre semaine. En mode filmographie : pas de filtre date.
  const dateQ = params.personId
    ? ''
    : `&release_date.gte=${params.startDate}&release_date.lte=${params.endDate}`;

  // Sort_by : par defaut popularity.desc. En mode filmographie on garde
  // primary_release_date.desc (carriere chronologique inversee).
  let sortQ: string;
  if (params.personId) {
    sortQ = 'primary_release_date.desc';
  } else if (params.sortBy === 'date') {
    sortQ = 'primary_release_date.asc';
  } else if (params.sortBy === 'rating') {
    sortQ = 'vote_average.desc';
  } else {
    sortQ = 'popularity.desc';
  }

  // Runtime max : TMDB support with_runtime.lte en minutes. On ne filtre
  // pas en mode filmographie ni quand pas defini.
  const runtimeQ = !params.personId && params.runtimeMax
    ? `&with_runtime.lte=${params.runtimeMax}`
    : '';

  // Vote count minimum quand on sort par rating : sinon on aurait des
  // films notes 10/10 par 3 personnes en haut.
  const voteCountQ = params.sortBy === 'rating' && !params.personId
    ? '&vote_count.gte=50'
    : '';

  const url = `${BASE}/discover/movie?api_key=${apiKey}&language=${tmdbLang()}&region=${region}${genreQ}${releaseTypeQ}${providerQ}${personQ}${dateQ}${runtimeQ}${voteCountQ}&sort_by=${sortQ}&page=${params.page}`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw handleResponseError(res);
  return res.json();
}

export async function searchMovies(query: string, page: number, signal?: AbortSignal): Promise<{ results: Movie[]; total_pages: number; total_results: number }> {
  const apiKey = getApiKey();
  const url = `${BASE}/search/movie?api_key=${apiKey}&language=${tmdbLang()}&query=${encodeURIComponent(query)}&page=${page}&include_adult=false`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw handleResponseError(res);
  return res.json();
}

export async function searchPersons(query: string, signal?: AbortSignal): Promise<{ results: PersonSearchResult[]; total_results: number }> {
  const apiKey = getApiKey();
  const url = `${BASE}/search/person?api_key=${apiKey}&language=${tmdbLang()}&query=${encodeURIComponent(query)}&page=1&include_adult=false`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw handleResponseError(res);
  return res.json();
}

export async function getPersonDetails(id: number, signal?: AbortSignal): Promise<{ id: number; name: string; profile_path: string | null; known_for_department: string; biography?: string }> {
  const apiKey = getApiKey();
  const url = `${BASE}/person/${id}?api_key=${apiKey}&language=${tmdbLang()}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw handleResponseError(res);
  return res.json();
}

export async function getMovieDetails(id: number, signal?: AbortSignal): Promise<MovieDetails> {
  const apiKey = getApiKey();
  const cacheKey = `md_${id}_${tmdbLang()}`;
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed.exp > Date.now()) return parsed.data;
    } catch {
      // entree corrompue, on la jette
      localStorage.removeItem(cacheKey);
    }
  }

  const url = `${BASE}/movie/${id}?api_key=${apiKey}&language=${tmdbLang()}&append_to_response=credits,videos,release_dates`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw handleResponseError(res);
  const data = await res.json();

  try {
    localStorage.setItem(cacheKey, JSON.stringify({ data, exp: Date.now() + 1800000 }));
  } catch {
    // localStorage full ou indisponible : on ignore, ce n'est qu'un cache
  }
  return data;
}

export interface MovieReleaseDates {
  id?: number;
  results: Array<{
    iso_3166_1: string;
    release_dates: Array<{
      certification?: string;
      iso_639_1?: string;
      release_date: string;
      type: number;
      note?: string;
    }>;
  }>;
}

export async function getMovieReleaseDates(id: number, signal?: AbortSignal): Promise<MovieReleaseDates> {
  const apiKey = getApiKey();
  const cacheKey = `rd_v2_${id}`;
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed.exp > Date.now()) return parsed.data as MovieReleaseDates;
    } catch {
      localStorage.removeItem(cacheKey);
    }
  }

  const url = `${BASE}/movie/${id}/release_dates?api_key=${apiKey}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw handleResponseError(res);
  const data = (await res.json()) as MovieReleaseDates;

  try {
    localStorage.setItem(cacheKey, JSON.stringify({ data, exp: Date.now() + 86400000 }));
  } catch {
    // localStorage probablement plein, on tente une eviction LRU des plus
    // anciennes entrees rd_v2_ pour faire de la place et on retente une fois.
    evictOldCacheEntries('rd_v2_', 50);
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ data, exp: Date.now() + 86400000 }));
    } catch {
      // tant pis
    }
  }
  return data;
}

// Suppression best-effort des plus anciennes entrees d'un prefixe pour
// liberer du localStorage quand il est plein. Trie par exp croissant et
// retire les n plus vieilles.
function evictOldCacheEntries(prefix: string, count: number) {
  const entries: Array<{ key: string; exp: number }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;
    try {
      const v = localStorage.getItem(key);
      if (!v) continue;
      const parsed = JSON.parse(v);
      entries.push({ key, exp: parsed.exp ?? 0 });
    } catch {
      // entree corrompue, on la jette d'office
      localStorage.removeItem(key);
    }
  }
  entries.sort((a, b) => a.exp - b.exp);
  entries.slice(0, count).forEach((e) => localStorage.removeItem(e.key));
}

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface WatchProvidersByRegion {
  link?: string;
  flatrate?: WatchProvider[];   // streaming inclus dans l'abonnement
  rent?: WatchProvider[];        // location
  buy?: WatchProvider[];         // achat
}

export interface WatchProvidersResponse {
  id?: number;
  results: Record<string, WatchProvidersByRegion>;  // par code pays
}

export async function getWatchProviders(id: number, signal?: AbortSignal): Promise<WatchProvidersResponse> {
  const apiKey = getApiKey();
  const cacheKey = `wp_${id}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed.exp > Date.now()) return parsed.data as WatchProvidersResponse;
    } catch {
      localStorage.removeItem(cacheKey);
    }
  }
  const url = `${BASE}/movie/${id}/watch/providers?api_key=${apiKey}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw handleResponseError(res);
  const data = (await res.json()) as WatchProvidersResponse;
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ data, exp: Date.now() + 86400000 * 7 }));
  } catch {
    // ignore
  }
  return data;
}

export async function getSimilarMovies(id: number, signal?: AbortSignal): Promise<{ results: Movie[] }> {
  const apiKey = getApiKey();
  const cacheKey = `sim_${id}_${tmdbLang()}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed.exp > Date.now()) return parsed.data as { results: Movie[] };
    } catch {
      localStorage.removeItem(cacheKey);
    }
  }
  const url = `${BASE}/movie/${id}/recommendations?api_key=${apiKey}&language=${tmdbLang()}&page=1`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw handleResponseError(res);
  const data = (await res.json()) as { results: Movie[] };
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ data, exp: Date.now() + 86400000 * 3 }));
  } catch {
    // ignore
  }
  return data;
}

export async function getGenres(signal?: AbortSignal): Promise<Genre[]> {
  const apiKey = getApiKey();
  const cacheKey = `genres_cache_${tmdbLang()}`;
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed.exp > Date.now()) return parsed.data;
    } catch {
      localStorage.removeItem(cacheKey);
    }
  }

  const url = `${BASE}/genre/movie/list?api_key=${apiKey}&language=${tmdbLang()}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw handleResponseError(res);
  const data = await res.json();

  try {
    localStorage.setItem(cacheKey, JSON.stringify({ data: data.genres, exp: Date.now() + 86400000 }));
  } catch {
    // ignore
  }
  return data.genres;
}
